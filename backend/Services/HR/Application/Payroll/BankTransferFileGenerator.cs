using System.Globalization;
using System.Text;
using HR.Domain;
using HR.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HR.Application.Payroll;

/// <summary>
/// Sinh file CSV chuyển khoản hàng loạt (định dạng chung Vietcombank/BIDV).
/// Cột: STT, MSNV, TênNhânViên, SốTKThụHưởng, NgânHàng, SốTiền, NộiDung
/// </summary>
public class BankTransferFileGenerator
{
    private readonly HRDbContext _db;

    public BankTransferFileGenerator(HRDbContext db) => _db = db;

    public async Task<string> GenerateCsvAsync(Guid payrollRunId, CancellationToken ct = default)
    {
        var run = await _db.PayrollRuns
            .FirstOrDefaultAsync(r => r.Id == payrollRunId, ct)
            ?? throw new InvalidOperationException($"Không tìm thấy kỳ lương {payrollRunId}.");
        if (run.Status != PayrollRunStatus.Approved && run.Status != PayrollRunStatus.Paid)
            throw new InvalidOperationException(
                $"Kỳ lương phải Approved/Paid mới xuất được file chuyển khoản, hiện tại {run.Status}.");

        var payrolls = await _db.Payrolls
            .Include(p => p.Employee)
            .Where(p => p.PayrollRunId == payrollRunId)
            .ToListAsync(ct);

        var sb = new StringBuilder();
        sb.AppendLine("STT,MSNV,TenNhanVien,SoTaiKhoan,NganHang,SoTien,NoiDung");

        var stt = 0;
        foreach (var p in payrolls.OrderBy(p => p.Employee?.EmployeeCode ?? ""))
        {
            stt++;
            var name = Escape(p.Employee?.FullName ?? "");
            var code = Escape(p.Employee?.EmployeeCode ?? "");
            var account = Escape(p.Employee?.BankAccount ?? "");
            var bank = Escape(p.Employee?.BankName ?? "");
            var amount = p.NetPay.ToString("F0", CultureInfo.InvariantCulture);
            var note = Escape($"Luong T{p.Month:D2}/{p.Year} - {p.Employee?.FullName}");
            sb.AppendLine($"{stt},{code},{name},{account},{bank},{amount},{note}");
        }
        return sb.ToString();
    }

    private static string Escape(string s)
    {
        if (string.IsNullOrEmpty(s)) return "";
        var needQuote = s.Contains(',') || s.Contains('"') || s.Contains('\n');
        var esc = s.Replace("\"", "\"\"");
        return needQuote ? $"\"{esc}\"" : esc;
    }
}
