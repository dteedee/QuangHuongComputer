using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using BuildingBlocks.Endpoints;
using System.Diagnostics;
using System.Text.Json;

namespace SystemConfig;

public static class BackupEndpoints
{
    public static void MapBackupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/system/backups")
            .RequireAuthorization(policy => policy.RequireRole("Admin"));

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

                    // Parse metadata if exists
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

        // ==================== CREATE BACKUP (MANUAL) ====================
        group.MapPost("/", async (IConfiguration configuration, HttpContext httpContext) =>
        {
            var backupScript = GetBackupScript(configuration);
            if (!File.Exists(backupScript))
            {
                return Results.BadRequest(new { error = "Backup script not found", path = backupScript });
            }

            try
            {
                var process = new Process
                {
                    StartInfo = new ProcessStartInfo
                    {
                        FileName = "/bin/bash",
                        Arguments = $"{backupScript} backup",
                        RedirectStandardOutput = true,
                        RedirectStandardError = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    }
                };

                process.Start();
                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode == 0)
                {
                    await httpContext.LogAuditAsync("Create", "Backup", "system",
                        "Manual database backup created",
                        module: "System");

                    return Results.Ok(new
                    {
                        message = "Backup tạo thành công!",
                        output,
                        exitCode = process.ExitCode
                    });
                }
                else
                {
                    return Results.BadRequest(new
                    {
                        error = "Backup failed",
                        output,
                        errorOutput = error,
                        exitCode = process.ExitCode
                    });
                }
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = $"Backup failed: {ex.Message}" });
            }
        }).WithName("CreateBackup");

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

    private static string GetBackupScript(IConfiguration configuration)
    {
        var scriptPath = configuration["Backup:ScriptPath"];
        if (string.IsNullOrEmpty(scriptPath))
        {
            var contentRoot = AppDomain.CurrentDomain.BaseDirectory;
            scriptPath = Path.GetFullPath(Path.Combine(contentRoot, "..", "..", "..", "..", "scripts", "backup-database.sh"));
        }
        return scriptPath;
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
