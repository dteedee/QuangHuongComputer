// SUPERSEDED by W2-5 — thư mục CQRS chết: không call site nào gửi query này
// (grep GetStockQuery trên toàn backend = 0 hit ngoài chính 2 file ở đây).
// Đọc tồn kho đi qua Endpoints/StockEndpoints.cs.
// Gate chạy: git rm -r backend/Services/Inventory/Application/Stock/Queries
