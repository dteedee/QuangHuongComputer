namespace Ai.Infrastructure;

public interface IEmbeddingService
{
    Task<float[]> GenerateEmbedding(string text);
}

public class SimpleEmbeddingService : IEmbeddingService
{
    // Simple TF-IDF-like embedding for when no API key configured.
    // In production, replace with OpenAI/Claude API calls.
    public Task<float[]> GenerateEmbedding(string text)
    {
        var words = text.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var vector = new float[128];
        foreach (var word in words)
        {
            var hash = word.GetHashCode();
            for (int i = 0; i < 4; i++)
                vector[Math.Abs((hash + i * 31) % 128)] += 1.0f;
        }
        // Normalize
        var magnitude = (float)Math.Sqrt(vector.Sum(v => v * v));
        if (magnitude > 0) for (int i = 0; i < vector.Length; i++) vector[i] /= magnitude;
        return Task.FromResult(vector);
    }
}
