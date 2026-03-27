using System.Text.Json;

namespace Catalog.Domain;

public static class PCBuilderEngine
{
    /// <summary>
    /// Evaluates the compatibility of a list of PC components.
    /// Expects components to include their parsed specifications and type.
    /// </summary>
    public static PcCompatibilityResult Evaluate(List<PcComponentData> components)
    {
        var result = new PcCompatibilityResult();
        var issues = new List<string>();

        // Find primary components
        var cpu = components.FirstOrDefault(c => string.Equals(c.Type, "CPU", StringComparison.OrdinalIgnoreCase));
        var motherboard = components.FirstOrDefault(c => string.Equals(c.Type, "Motherboard", StringComparison.OrdinalIgnoreCase) || string.Equals(c.Type, "Mainboard", StringComparison.OrdinalIgnoreCase));
        var rams = components.Where(c => string.Equals(c.Type, "RAM", StringComparison.OrdinalIgnoreCase)).ToList();
        var psu = components.FirstOrDefault(c => string.Equals(c.Type, "PSU", StringComparison.OrdinalIgnoreCase) || string.Equals(c.Type, "Nguồn", StringComparison.OrdinalIgnoreCase));
        var caseComp = components.FirstOrDefault(c => string.Equals(c.Type, "Case", StringComparison.OrdinalIgnoreCase) || string.Equals(c.Type, "Vỏ case", StringComparison.OrdinalIgnoreCase));

        // 1. CPU & Motherboard Socket Compatibility
        if (cpu != null && motherboard != null)
        {
            var cpuSocket = GetSpecValue(cpu.Specs, "Socket");
            var mbSocket = GetSpecValue(motherboard.Specs, "Socket");

            if (!string.IsNullOrEmpty(cpuSocket) && !string.IsNullOrEmpty(mbSocket))
            {
                if (!cpuSocket.Equals(mbSocket, StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add($"Lỗi tương thích Socket: CPU dùng socket {cpuSocket} nhưng Mainboard hỗ trợ socket {mbSocket}.");
                }
            }
            else
            {
                // Missing data, can't fully verify.
                // issues.Add("Cảnh báo: Không thể xác minh tương thích Socket do thiếu thông số.");
            }
        }

        // 2. Motherboard & RAM Type Compatibility
        if (motherboard != null && rams.Any())
        {
            var mbMemoryType = GetSpecValue(motherboard.Specs, "MemoryType") ?? GetSpecValue(motherboard.Specs, "Loại RAM");
            
            foreach (var ram in rams)
            {
                var ramType = GetSpecValue(ram.Specs, "MemoryType") ?? GetSpecValue(ram.Specs, "Loại RAM") ?? GetSpecValue(ram.Specs, "Type");
                if (!string.IsNullOrEmpty(mbMemoryType) && !string.IsNullOrEmpty(ramType))
                {
                    // DDR4 vs DDR5 check
                    if (mbMemoryType.Contains("DDR5", StringComparison.OrdinalIgnoreCase) && !ramType.Contains("DDR5", StringComparison.OrdinalIgnoreCase))
                    {
                        issues.Add($"Lỗi tương thích RAM: Mainboard yêu cầu DDR5 nhưng RAM là {ramType}.");
                    }
                    else if (mbMemoryType.Contains("DDR4", StringComparison.OrdinalIgnoreCase) && !ramType.Contains("DDR4", StringComparison.OrdinalIgnoreCase))
                    {
                        issues.Add($"Lỗi tương thích RAM: Mainboard yêu cầu DDR4 nhưng RAM là {ramType}.");
                    }
                }
            }
        }

        // 3. Form Factor Compatibility (Motherboard & Case)
        if (motherboard != null && caseComp != null)
        {
            var mbFormFactor = GetSpecValue(motherboard.Specs, "FormFactor") ?? GetSpecValue(motherboard.Specs, "Kích thước");
            var caseSupportedForms = GetSpecValue(caseComp.Specs, "SupportedMotherboards") ?? GetSpecValue(caseComp.Specs, "Hỗ trợ Mainboard");

            if (!string.IsNullOrEmpty(mbFormFactor) && !string.IsNullOrEmpty(caseSupportedForms))
            {
                if (!caseSupportedForms.Contains(mbFormFactor, StringComparison.OrdinalIgnoreCase))
                {
                    issues.Add($"Lỗi kích thước: Vỏ case không hỗ trợ chuẩn mainboard {mbFormFactor}.");
                }
            }
        }

        // 4. Power Requirement (Wattage)
        var estimatedWattage = 0;
        foreach (var comp in components)
        {
            var tdpStr = GetSpecValue(comp.Specs, "TDP") ?? GetSpecValue(comp.Specs, "Công suất");
            if (!string.IsNullOrEmpty(tdpStr))
            {
                if (int.TryParse(new string(tdpStr.Where(char.IsDigit).ToArray()), out int wattage))
                {
                    estimatedWattage += wattage * comp.Quantity;
                }
            }
        }
        
        // Add arbitrary 50W base for motherboard/fans if TDP strictly covers CPU/GPU
        if (estimatedWattage > 0) estimatedWattage += 50; 
        
        result.EstimatedWattage = estimatedWattage;

        if (psu != null && estimatedWattage > 0)
        {
            var psuWattageStr = GetSpecValue(psu.Specs, "Wattage") ?? GetSpecValue(psu.Specs, "Công suất tối đa");
            if (!string.IsNullOrEmpty(psuWattageStr))
            {
                if (int.TryParse(new string(psuWattageStr.Where(char.IsDigit).ToArray()), out int psuWattage))
                {
                    // Recommendation: PSU wattage should be >= 1.2x estimated wattage
                    if (psuWattage < estimatedWattage * 1.2)
                    {
                        issues.Add($"Cảnh báo nguồn: Cấu hình yêu cầu ~{estimatedWattage}W. Nguồn {psuWattage}W có thể gây thiếu ổn định. Khuyến nghị nguồn {(int)(estimatedWattage * 1.3)}W trở lên.");
                    }
                    if (psuWattage < estimatedWattage)
                    {
                        issues.Add($"LỖI NGUỒN: Nguồn ({psuWattage}W) không đủ đáp ứng công suất tiêu thụ ({estimatedWattage}W).");
                    }
                }
            }
        }

        result.IsCompatible = issues.Count == 0 || !issues.Any(i => i.Contains("Lỗi") || i.Contains("LỖI"));
        result.Issues = issues;
        
        return result;
    }

    private static string? GetSpecValue(Dictionary<string, string> specs, string key)
    {
        if (specs == null) return null;
        
        // Exact match
        if (specs.TryGetValue(key, out var exactMatch))
            return exactMatch;
            
        // Case insensitive match
        var matchedKey = specs.Keys.FirstOrDefault(k => string.Equals(k, key, StringComparison.OrdinalIgnoreCase));
        if (matchedKey != null)
            return specs[matchedKey];
            
        // Contains match (e.g., "Socket CPU" -> "Socket")
        matchedKey = specs.Keys.FirstOrDefault(k => k.Contains(key, StringComparison.OrdinalIgnoreCase));
        if (matchedKey != null)
            return specs[matchedKey];
            
        return null;
    }
}

public class PcComponentData
{
    public Guid ProductId { get; set; }
    public string Type { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public Dictionary<string, string> Specs { get; set; } = new();
    
    // Helper to parse JSON string to dictionary
    public static Dictionary<string, string> ParseSpecs(string? jsonString)
    {
        if (string.IsNullOrWhiteSpace(jsonString)) return new Dictionary<string, string>();
        
        try
        {
            var doc = JsonDocument.Parse(jsonString);
            var result = new Dictionary<string, string>();
            
            foreach (var element in doc.RootElement.EnumerateObject())
            {
                result[element.Name] = element.Value.ValueKind == JsonValueKind.String 
                                        ? element.Value.GetString() ?? "" 
                                        : element.Value.GetRawText();
            }
            return result;
        }
        catch
        {
            return new Dictionary<string, string>();
        }
    }
}

public class PcCompatibilityResult
{
    public bool IsCompatible { get; set; }
    public int EstimatedWattage { get; set; }
    public List<string> Issues { get; set; } = new();
}
