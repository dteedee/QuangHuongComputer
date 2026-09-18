using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using BuildingBlocks.Endpoints;
using BuildingBlocks.Security;

namespace SystemConfig;

/// <summary>
/// Admin listing/download/delete for the Postgres dumps that the offsite `backup`
/// sidecar (deploy/backup/backup.sh, D05 mục 6) writes hourly to the shared backup
/// directory. The API itself no longer shells out to `pg_dump`: the alpine runtime
/// image never had the binary (that was the original bug — D05 bối cảnh), and now
/// the sidecar container is the only thing that ever writes a dump.
///
/// Whole group is OFF by default (`Backup:Enabled=false`, phase-64 bước 8). Note:
/// `frontend/src/pages/backoffice/admin/AuditLogsPage.tsx`'s "Tạo backup" button IS
/// a live consumer of `POST /` (`backupApi.create()`, adversarial verification found
/// this — an earlier draft of this comment claimed 0 consumers, which was wrong).
/// `POST /` is kept below returning 410 Gone so that button gets a deliberate,
/// explained failure instead of a bare framework 405; removing/hiding the button is
/// frontend work outside this file's glob (flagged in integration-requests-w1.md).
/// Every route requires <see cref="Permissions.System.ManageBackups"/> (W1-1's policy
/// for this module, per phase-64's ownership note — was `RequireRole("Admin")` before).
/// </summary>
public static class BackupEndpoints
{
    public static void MapBackupEndpoints(this IEndpointRouteBuilder app)
    {
        var configuration = app.ServiceProvider.GetRequiredService<IConfiguration>();

        var group = app.MapGroup("/api/system/backups")
            .RequireAuthorization(Permissions.System.ManageBackups);

        // Gate the whole group at request time (not just at startup) so a config
        // reload / restart with Backup:Enabled=true takes effect without a redeploy,
        // and so every route — not just the ones we remember to guard — is covered.
        group.AddEndpointFilter(async (context, next) =>
        {
            if (!configuration.GetValue("Backup:Enabled", false))
            {
                return Results.Json(
                    new { error = "Backup:Enabled is false. Dumps are produced by the deploy/backup sidecar (D05); this admin UI is still in the backlog." },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
            }

            return await next(context);
        });

        // ==================== LIST BACKUPS ====================
        group.MapGet("/", (IConfiguration configuration) =>
        {
            var backupDir = GetBackupDir(configuration);
            if (!Directory.Exists(backupDir))
            {
                return Results.Ok(new { backups = Array.Empty<object>(), totalSize = "0 B" });
            }

            var backups = Directory.GetFiles(backupDir, "quanghuong_backup_*.dump")
                .Select(f =>
                {
                    var fi = new FileInfo(f);
                    var baseName = Path.GetFileNameWithoutExtension(f);
                    var sqlGzFile = Path.Combine(backupDir, baseName + ".sql.gz");
                    var metaFile = Path.Combine(backupDir, baseName + ".meta.json");

                    string? metadata = null;
                    if (File.Exists(metaFile))
                    {
                        metadata = File.ReadAllText(metaFile);
                    }

                    return new
                    {
                        fileName = fi.Name,
                        baseName,
                        sizeDump = FormatFileSize(fi.Length),
                        sizeDumpBytes = fi.Length,
                        sizeSqlGz = File.Exists(sqlGzFile) ? FormatFileSize(new FileInfo(sqlGzFile).Length) : null,
                        hasSqlGz = File.Exists(sqlGzFile),
                        createdAt = fi.CreationTimeUtc,
                        lastModified = fi.LastWriteTimeUtc,
                        metadata
                    };
                })
                .OrderByDescending(b => b.createdAt)
                .ToList();

            var totalSize = backups.Sum(b => b.sizeDumpBytes);

            return Results.Ok(new
            {
                backups,
                totalSize = FormatFileSize(totalSize),
                totalSizeBytes = totalSize,
                count = backups.Count
            });
        }).WithName("ListBackups");

        // ==================== CREATE BACKUP (deliberately unsupported) ====================
        // Manual on-demand creation used to shell out to `pg_dump` inside this container, which
        // never had the binary (the original bug this track fixed — D05 bối cảnh). Dumps now come
        // only from the `deploy/backup` sidecar (hourly/nightly cron + `make backup`/`make
        // restore-drill` for on-demand). Kept as a real route (not deleted) so the still-live
        // frontend button (AuditLogsPage.tsx `backupApi.create()`) gets an explained 410 instead
        // of an unexplained 405 Method Not Allowed.
        group.MapPost("/", () => Results.Json(
            new
            {
                error = "Tạo backup thủ công qua API đã được thay bằng sidecar tự động (deploy/backup/backup.sh). " +
                         "Dùng `make backup` trên máy chủ, hoặc đợi lần chạy cron tiếp theo.",
                errorEn = "Manual backup creation via this API is no longer supported. Dumps are produced by the deploy/backup sidecar (cron) or `make backup` on the server."
            },
            statusCode: StatusCodes.Status410Gone)).WithName("CreateBackupUnsupported");

        // ==================== DOWNLOAD BACKUP ====================
        group.MapGet("/download/{fileName}", (string fileName, IConfiguration configuration) =>
        {
            var backupDir = GetBackupDir(configuration);

            // Sanitize filename to prevent path traversal
            fileName = Path.GetFileName(fileName);
            var filePath = Path.Combine(backupDir, fileName);

            if (!File.Exists(filePath))
            {
                return Results.NotFound(new { error = "Backup file not found" });
            }

            var contentType = fileName.EndsWith(".dump") ? "application/octet-stream" : "application/gzip";
            return Results.File(filePath, contentType, fileName);
        }).WithName("DownloadBackup");

        // ==================== DELETE BACKUP ====================
        group.MapDelete("/{baseName}", async (string baseName, IConfiguration configuration, HttpContext httpContext) =>
        {
            var backupDir = GetBackupDir(configuration);

            // Sanitize to prevent path traversal
            baseName = Path.GetFileNameWithoutExtension(baseName);

            var deletedFiles = new List<string>();
            var extensions = new[] { ".dump", ".sql.gz", ".meta.json" };

            foreach (var ext in extensions)
            {
                var filePath = Path.Combine(backupDir, baseName + ext);
                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                    deletedFiles.Add(baseName + ext);
                }
            }

            if (deletedFiles.Count == 0)
            {
                return Results.NotFound(new { error = "Backup not found" });
            }

            await httpContext.LogAuditAsync("Delete", "Backup", baseName,
                $"Deleted backup files: {string.Join(", ", deletedFiles)}",
                module: "System");

            return Results.Ok(new { message = "Backup deleted", deletedFiles });
        }).WithName("DeleteBackup");

        // ==================== GET BACKUP STATS ====================
        group.MapGet("/stats", (IConfiguration configuration) =>
        {
            var backupDir = GetBackupDir(configuration);
            if (!Directory.Exists(backupDir))
            {
                return Results.Ok(new
                {
                    totalBackups = 0,
                    totalSize = "0 B",
                    oldestBackup = (DateTime?)null,
                    newestBackup = (DateTime?)null,
                    backupDirectory = backupDir
                });
            }

            var backupFiles = Directory.GetFiles(backupDir, "quanghuong_backup_*.dump");
            var totalSize = backupFiles.Sum(f => new FileInfo(f).Length);
            var sqlGzFiles = Directory.GetFiles(backupDir, "quanghuong_backup_*.sql.gz");
            totalSize += sqlGzFiles.Sum(f => new FileInfo(f).Length);

            DateTime? oldest = null, newest = null;
            if (backupFiles.Length > 0)
            {
                oldest = backupFiles.Min(f => new FileInfo(f).CreationTimeUtc);
                newest = backupFiles.Max(f => new FileInfo(f).CreationTimeUtc);
            }

            return Results.Ok(new
            {
                totalBackups = backupFiles.Length,
                totalSize = FormatFileSize(totalSize),
                totalSizeBytes = totalSize,
                oldestBackup = oldest,
                newestBackup = newest,
                backupDirectory = backupDir
            });
        }).WithName("GetBackupStats");
    }

    private static string GetBackupDir(IConfiguration configuration)
    {
        var backupDir = configuration["Backup:Directory"];
        if (string.IsNullOrEmpty(backupDir))
        {
            // Default to project root/backups/postgres
            var contentRoot = AppDomain.CurrentDomain.BaseDirectory;
            backupDir = Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "..", "..", "backups", "postgres"));
        }
        return backupDir;
    }

    private static string FormatFileSize(long bytes)
    {
        string[] sizes = { "B", "KB", "MB", "GB", "TB" };
        double len = bytes;
        int order = 0;
        while (len >= 1024 && order < sizes.Length - 1)
        {
            order++;
            len /= 1024;
        }
        return $"{len:0.##} {sizes[order]}";
    }
}
