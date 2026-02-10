using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Mvc;

namespace Content;

public static class MediaEndpoints
{
    public static void MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/media");

        // Upload single file
        group.MapPost("/upload", async (IFormFile file, IWebHostEnvironment env) =>
        {
            if (file == null || file.Length == 0)
                return Results.BadRequest("No file uploaded");

            // Validate file extension
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return Results.BadRequest("Invalid file type. Only images are allowed.");

            // Create uploads directory
            var uploadsDir = Path.Combine(env.WebRootPath ?? "wwwroot", "uploads");
            if (!Directory.Exists(uploadsDir))
                Directory.CreateDirectory(uploadsDir);

            // Generate unique filename
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsDir, fileName);

            // Save file
            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Return relative URL
            var url = $"/uploads/{fileName}";
            return Results.Ok(new { url, fileName });
        })
        .DisableAntiforgery() // Needed for file upload in minimal APIs
        .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));

        // Upload multiple files
        group.MapPost("/upload-multiple", async (IFormFileCollection files, IWebHostEnvironment env) =>
        {
            if (files == null || files.Count == 0)
                return Results.BadRequest("No files uploaded");

            var results = new List<object>();
            var uploadsDir = Path.Combine(env.WebRootPath ?? "wwwroot", "uploads");
            if (!Directory.Exists(uploadsDir))
                Directory.CreateDirectory(uploadsDir);

            foreach (var file in files)
            {
                if (file.Length > 0)
                {
                    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                    var fileName = $"{Guid.NewGuid()}{extension}";
                    var filePath = Path.Combine(uploadsDir, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await file.CopyToAsync(stream);
                    }

                    results.Add(new { url = $"/uploads/{fileName}", originalName = file.FileName });
                }
            }

            return Results.Ok(results);
        })
        .DisableAntiforgery()
        .RequireAuthorization(policy => policy.RequireRole("Admin", "Manager"));
    }
}
