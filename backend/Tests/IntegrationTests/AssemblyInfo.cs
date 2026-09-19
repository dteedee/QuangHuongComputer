using Xunit;

// Cả bộ test dùng chung MỘT container Postgres và MỘT host: chạy song song sẽ giẫm chân nhau
// về dữ liệu và ngốn RAM trên máy đang có 20+ container của chủ máy.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
