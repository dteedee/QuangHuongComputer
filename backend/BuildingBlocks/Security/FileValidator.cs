using Microsoft.AspNetCore.Http;

namespace BuildingBlocks.Security;

public static class FileValidator
{
    private static readonly Dictionary<string, List<byte[]>> ImageSignatures = new()
    {
        { ".jpg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }, new byte[] { 0xFF, 0xD8, 0xFF, 0xE1 }, new byte[] { 0xFF, 0xD8, 0xFF, 0xE8 } } },
        { ".jpeg", new List<byte[]> { new byte[] { 0xFF, 0xD8, 0xFF, 0xE0 }, new byte[] { 0xFF, 0xD8, 0xFF, 0xE1 }, new byte[] { 0xFF, 0xD8, 0xFF, 0xE8 } } },
        { ".png", new List<byte[]> { new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A } } },
        { ".gif", new List<byte[]> { new byte[] { 0x47, 0x49, 0x46, 0x38 } } },
        { ".webp", new List<byte[]> { new byte[] { 0x52, 0x49, 0x46, 0x46 } } } // RIFF, needs check for WEBP at offset 8
    };

    public static (bool isValid, string? errorMessage) ValidateImage(IFormFile file, long maxSizeBytes = 5242880) // Default 5MB
    {
        if (file == null || file.Length == 0)
            return (false, "No file uploaded.");

        if (file.Length > maxSizeBytes)
            return (false, $"File size exceeds limit of {maxSizeBytes / 1024 / 1024}MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!ImageSignatures.ContainsKey(extension))
            return (false, $"Invalid file extension: {extension}. Only .jpg, .jpeg, .png, .gif, .webp are allowed.");

        // Validate MIME type
        var allowedMimeTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
            return (false, $"Invalid MIME type: {file.ContentType}.");

        // Validate Magic Number (Signature)
        try
        {
            using var reader = new BinaryReader(file.OpenReadStream());
            var signatures = ImageSignatures[extension];
            var headerBytes = reader.ReadBytes(signatures.Max(s => s.Length));

            var isValidSignature = signatures.Any(signature =>
                headerBytes.Take(signature.Length).SequenceEqual(signature));

            // Special check for WEBP
            if (isValidSignature && extension == ".webp")
            {
                // WebP starts with RIFF, then 4 bytes of size, then WEBPVP8
                // We already checked RIFF, now skip 4 bytes and check for WEBP
                file.OpenReadStream().Position = 8;
                var webpHeader = new byte[4];
                file.OpenReadStream().Read(webpHeader, 0, 4);
                var webpStr = System.Text.Encoding.ASCII.GetString(webpHeader);
                if (webpStr != "WEBP")
                    return (false, "Invalid WebP file structure.");
            }

            if (!isValidSignature)
                return (false, "File content does not match its extension (Magic number mismatch). Security risk detected.");

            return (true, null);
        }
        catch (Exception ex)
        {
            return (false, $"Error validating file content: {ex.Message}");
        }
    }
}
