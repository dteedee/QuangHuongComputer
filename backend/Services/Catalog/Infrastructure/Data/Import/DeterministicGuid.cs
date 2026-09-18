using System.Security.Cryptography;
using System.Text;

namespace Catalog.Infrastructure.Data.Import;

/// <summary>
/// RFC 4122 version 5 (SHA-1, name-based) UUIDs.
///
/// Why the importer needs this: <c>Product</c>'s constructor hard-assigns
/// <c>Id = Guid.NewGuid()</c> (<c>Product.cs:136</c>), so a re-run would create a second row
/// with a different id for the same SKU. Deriving the id from the SKU makes the import
/// idempotent across machines and across a purge-and-reimport, which is what D03 requires
/// and what W1-4's reference seed has to reproduce byte for byte.
///
/// Convention (do not change it - ids already written depend on it):
///   namespace = RFC 4122 URL namespace 6ba7b811-9dad-11d1-80b4-00c04fd430c8
///   name      = "product:&lt;SKU&gt;"  (SKU verbatim, UTF-8, no trimming, no case folding)
/// </summary>
public static class DeterministicGuid
{
    /// <summary>RFC 4122 URL namespace.</summary>
    public static readonly Guid UrlNamespace = new("6ba7b811-9dad-11d1-80b4-00c04fd430c8");

    public static Guid ForProductSku(string sku) => Create(UrlNamespace, "product:" + sku);

    public static Guid ForWarehouseCode(string code) => Create(UrlNamespace, "warehouse:" + code);

    public static Guid ForInventoryItem(string sku, string warehouseCode)
        => Create(UrlNamespace, $"inventory:{warehouseCode}:{sku}");

    public static Guid ForProductMedia(string sku, string relativePath)
        => Create(UrlNamespace, $"media:{sku}:{relativePath}");

    /// <summary>Version 5 (SHA-1) name-based UUID.</summary>
    public static Guid Create(Guid namespaceId, string name)
    {
        var namespaceBytes = ToBigEndian(namespaceId);
        var nameBytes = Encoding.UTF8.GetBytes(name);

        var buffer = new byte[namespaceBytes.Length + nameBytes.Length];
        Buffer.BlockCopy(namespaceBytes, 0, buffer, 0, namespaceBytes.Length);
        Buffer.BlockCopy(nameBytes, 0, buffer, namespaceBytes.Length, nameBytes.Length);

        // SHA-1 here is a UUID derivation defined by RFC 4122, not a security primitive.
        byte[] hash = SHA1.HashData(buffer);

        var result = new byte[16];
        Buffer.BlockCopy(hash, 0, result, 0, 16);
        result[6] = (byte)((result[6] & 0x0F) | 0x50); // version 5
        result[8] = (byte)((result[8] & 0x3F) | 0x80); // RFC 4122 variant

        return FromBigEndian(result);
    }

    /// <summary>.NET lays the first three Guid fields out little-endian; RFC 4122 is big-endian.</summary>
    private static byte[] ToBigEndian(Guid value)
    {
        var bytes = value.ToByteArray();
        SwapNetworkOrder(bytes);
        return bytes;
    }

    private static Guid FromBigEndian(byte[] bigEndian)
    {
        var bytes = (byte[])bigEndian.Clone();
        SwapNetworkOrder(bytes);
        return new Guid(bytes);
    }

    private static void SwapNetworkOrder(byte[] b)
    {
        (b[0], b[3]) = (b[3], b[0]);
        (b[1], b[2]) = (b[2], b[1]);
        (b[4], b[5]) = (b[5], b[4]);
        (b[6], b[7]) = (b[7], b[6]);
    }
}
