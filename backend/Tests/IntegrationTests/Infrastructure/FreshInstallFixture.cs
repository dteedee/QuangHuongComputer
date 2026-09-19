using Xunit;

namespace IntegrationTests.Infrastructure;

/// <summary>
/// Database RIÊNG cho bài test "cài mới".
///
/// Lý do tồn tại: <see cref="IntegrationTestCollection"/> dùng chung một database và các test
/// nghiệp vụ trong đó tự tạo danh mục / sản phẩm / tồn kho (<see cref="TestCatalogData"/>).
/// Một bài test mà tiền đề là "database vừa cài mới" thì không thể khẳng định điều gì trên một
/// database đã bị test khác ghi vào: kết quả phụ thuộc THỨ TỰ CHẠY. Cụ thể, bước seed
/// <c>catalog.products</c> nạp tồn đầu kỳ cho MỌI sản phẩm trong bảng, nên sản phẩm do test khác
/// tạo (đã có sẵn dòng InventoryItems của riêng nó) làm bước seed đổ vỡ.
///
/// Cách chữa là cô lập thật sự, không phải nới lỏng khẳng định: collection riêng -> fixture riêng
/// -> container + database riêng, chỉ có host này ghi vào đó. Bộ test đã tắt chạy song song
/// (AssemblyInfo.cs) nên hai container không bao giờ tồn tại cùng lúc.
/// </summary>
public sealed class FreshInstallFixture : IntegrationTestFixture
{
    public FreshInstallFixture() : base("qh_fresh_install") { }
}

[CollectionDefinition(FreshInstallCollection.Name)]
public sealed class FreshInstallCollection : ICollectionFixture<FreshInstallFixture>
{
    public const string Name = "qh-fresh-install";
}
