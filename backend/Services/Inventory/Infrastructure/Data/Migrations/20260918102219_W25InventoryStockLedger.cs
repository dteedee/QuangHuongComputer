// SUPERSEDED — `dotnet ef migrations add` đóng dấu id theo giờ UTC (10:22), mà hai migration của
// W1-11 mang id 20260918170004 / 20260918170012. Id nhỏ hơn nghĩa là EF coi migration này đã "ở
// phía sau" và KHÔNG BAO GIỜ áp dụng nó. Nội dung đã chuyển nguyên vẹn sang
// 20260918180500_W25InventoryStockLedger.cs (+ .Designer.cs).
//
// Agent W2-5 không có quyền xoá file (hook "Irreversible Local Destruction").
// Gate chạy:
//   git rm backend/Services/Inventory/Infrastructure/Data/Migrations/20260918102219_W25InventoryStockLedger.cs
//   git rm backend/Services/Inventory/Infrastructure/Data/Migrations/20260918102219_W25InventoryStockLedger.Designer.cs
