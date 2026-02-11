namespace BuildingBlocks.Localization;

/// <summary>
/// Vietnamese resource strings for common messages and UI elements
/// </summary>
public static class VietnameseResources
{
    #region Common Messages
    public static string Success = "Thành công";
    public static string Error = "Lỗi";
    public static string Warning = "Cảnh báo";
    public static string Info = "Thông tin";
    public static string NotFound = "Không tìm thấy";
    public static string AlreadyExists = "Đã tồn tại";
    public static string Invalid = "Không hợp lệ";
    public static string Required = "Bắt buộc";
    public static string Confirm = "Xác nhận";
    public static string Cancel = "Hủy bỏ";
    public static string Save = "Lưu";
    public static string Delete = "Xóa";
    public static string Edit = "Sửa";
    public static string Create = "Tạo mới";
    public static string Search = "Tìm kiếm";
    public static string Filter = "Lọc";
    public static string Export = "Xuất";
    public static string Import = "Nhập";
    public static string Submit = "Gửi";
    public static string Reset = "Đặt lại";
    public static string Next = "Tiếp theo";
    public static string Previous = "Trước";
    public static string Close = "Đóng";
    public static string Back = "Quay lại";
    public static string Loading = "Đang tải...";
    public static string Processing = "Đang xử lý...";
    public static string Completed = "Hoàn thành";
    public static string Pending = "Chờ xử lý";
    public static string Failed = "Thất bại";
    #endregion

    #region Authentication Messages
    public static string LoginSuccess = "Đăng nhập thành công";
    public static string LoginFailed = "Đăng nhập thất bại";
    public static string LogoutSuccess = "Đăng xuất thành công";
    public static string InvalidCredentials = "Thông tin đăng nhập không chính xác";
    public static string AccountLocked = "Tài khoản đã bị khóa";
    public static string AccountNotFound = "Tài khoản không tồn tại";
    public static string PasswordExpired = "Mật khẩu đã hết hạn";
    public static string PasswordResetSuccess = "Đặt lại mật khẩu thành công";
    public static string PasswordResetFailed = "Đặt lại mật khẩu thất bại";
    public static string EmailSent = "Email đã được gửi";
    public static string EmailFailed = "Gửi email thất bại";
    public static string InvalidToken = "Token không hợp lệ";
    public static string TokenExpired = "Token đã hết hạn";
    public static string AccountCreated = "Tạo tài khoản thành công";
    public static string AccountCreationFailed = "Tạo tài khoản thất bại";
    public static string EmailVerificationRequired = "Yêu cầu xác thực email";
    public static string EmailVerified = "Email đã được xác thực";
    #endregion

    #region Validation Messages
    public static string RequiredField = "Trường này là bắt buộc";
    public static string InvalidEmail = "Email không hợp lệ";
    public static string InvalidPhone = "Số điện thoại không hợp lệ";
    public static string InvalidPassword = "Mật khẩu không hợp lệ";
    public static string PasswordTooShort = "Mật khẩu phải có ít nhất 6 ký tự";
    public static string PasswordTooLong = "Mật khẩu không được vượt quá 100 ký tự";
    public static string PasswordConfirmMismatch = "Mật khẩu xác nhận không khớp";
    public static string InvalidUsername = "Tên người dùng không hợp lệ";
    public static string UsernameTooShort = "Tên người dùng phải có ít nhất 3 ký tự";
    public static string UsernameTooLong = "Tên người dùng không được vượt quá 50 ký tự";
    public static string InvalidFullName = "Họ và tên không hợp lệ";
    public static string FullNameTooShort = "Họ và tên phải có ít nhất 3 ký tự";
    public static string FullNameTooLong = "Họ và tên không được vượt quá 100 ký tự";
    public static string InvalidDateOfBirth = "Ngày sinh không hợp lệ";
    public static string DateOfBirthFuture = "Ngày sinh không được là ngày trong tương lai";
    public static string InvalidIdCard = "Số CMT/CCCD không hợp lệ";
    public static string InvalidAddress = "Địa chỉ không hợp lệ";
    public static string StringTooLong = "Giá trị không được vượt quá {0} ký tự";
    public static String StringTooShort = "Giá trị phải có ít nhất {0} ký tự";
    public static string NumberOutOfRange = "Giá trị phải nằm trong khoảng từ {0} đến {1}";
    public static string InvalidFormat = "Định dạng không hợp lệ";
    public static string FileTooLarge = "Tệp tin quá lớn (tối đa {0} MB)";
    public static string InvalidFileType = "Loại tệp không được hỗ trợ";
    #endregion

    #region Common UI Messages
    public static string DeleteConfirm = "Bạn có chắc chắn muốn xóa mục này không?";
    public static string DeleteSuccess = "Xóa thành công";
    public static string DeleteFailed = "Xóa thất bại";
    public static string SaveSuccess = "Lưu thành công";
    public static string SaveFailed = "Lưu thất bại";
    public static string UpdateSuccess = "Cập nhật thành công";
    public static string UpdateFailed = "Cập nhật thất bại";
    public static string CreateSuccess = "Tạo mới thành công";
    public static string CreateFailed = "Tạo mới thất bại";
    public static string AccessDenied = "Bạn không có quyền truy cập";
    public static string SessionExpired = "Phiên làm việc đã hết hạn";
    public static string NetworkError = "Lỗi kết nối mạng";
    public static string ServerError = "Lỗi máy chủ";
    public static string UnknownError = "Đã xảy ra lỗi không xác định";
    public static string PleaseWait = "Vui lòng chờ...";
    public static string NoDataFound = "Không có dữ liệu";
    public static string LoadingData = "Đang tải dữ liệu...";
    public static string RefreshData = "Làm mới dữ liệu";
    public static string ExportSuccess = "Xuất thành công";
    public static string ExportFailed = "Xuất thất bại";
    public static string ImportSuccess = "Nhập thành công";
    public static string ImportFailed = "Nhập thất bại";
    #endregion

    #region Error Messages
    public static string GeneralError = "Đã xảy ra lỗi. Vui lòng thử lại sau.";
    public static string DatabaseError = "Lỗi cơ sở dữ liệu. Vui lòng liên hệ quản trị viên.";
    public static string TimeoutError = "Yêu cầu đã hết thời gian. Vui lòng thử lại.";
    public static string ConflictError = "Xung đột dữ liệu. Vui lòng thử lại.";
    public static string ValidationError = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.";
    public static string UnauthorizedError = "Bạn chưa được xác thực. Vui lòng đăng nhập lại.";
    public static string ForbiddenError = "Bạn không có quyền thực hiện thao tác này.";
    public static string NotFoundError = "Nguồn yêu cầu không được tìm thấy.";
    public static string TooManyRequests = "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
    #endregion

    #region Sales Related Messages
    public static string CartEmpty = "Giỏ hàng của bạn đang trống";
    public static string AddToCartSuccess = "Đã thêm vào giỏ hàng";
    public static string AddToCartFailed = "Thêm vào giỏ hàng thất bại";
    public static string RemoveFromCartSuccess = "Đã xóa khỏi giỏ hàng";
    public static string RemoveFromCartFailed = "Xóa khỏi giỏ hàng thất bại";
    public static string UpdateCartSuccess = "Cập nhật giỏ hàng thành công";
    public static string UpdateCartFailed = "Cập nhật giỏ hàng thất bại";
    public static string CheckoutSuccess = "Thanh toán thành công";
    public static string CheckoutFailed = "Thanh toán thất bại";
    public static string OrderCreated = "Đơn hàng đã được tạo";
    public static string OrderNotFound = "Đơn hàng không tồn tại";
    public static string OrderCompleted = "Đơn hàng đã hoàn thành";
    public static string OrderCancelled = "Đơn hàng đã bị hủy";
    public static string PaymentSuccess = "Thanh toán thành công";
    public static string PaymentFailed = "Thanh toán thất bại";
    public static string InsufficientStock = "Sản phẩm không đủ số lượng";
    public static string ProductNotFound = "Sản phẩm không tồn tại";
    #endregion

    #region Inventory Related Messages
    public static string StockUpdated = "Cập nhật kho thành công";
    public static string StockUpdatedFailed = "Cập nhật kho thất bại";
    public static string StockLow = "Sản phẩm sắp hết hàng";
    public static string StockOut = "Sản phẩm hết hàng";
    public static string PurchaseOrderCreated = "Đơn hàng nhập đã được tạo";
    public static string PurchaseOrderCompleted = "Đơn hàng nhập đã hoàn thành";
    public static string TransferCreated = "Chuyển kho đã được tạo";
    public static string TransferCompleted = "Chuyển kho đã hoàn thành";
    #endregion

    #region User Messages
    public static string ProfileUpdated = "Cập nhật hồ sơ thành công";
    public static string ProfileUpdateFailed = "Cập nhật hồ sơ thất bại";
    public static string PasswordChanged = "Đổi mật khẩu thành công";
    public static string PasswordChangeFailed = "Đổi mật khẩu thất bại";
    public static string EmailChanged = "Email đã được thay đổi";
    public static string EmailChangeFailed = "Thay đổi email thất bại";
    public static string UserActivated = "Người dùng đã được kích hoạt";
    public static string UserDeactivated = "Người dùng đã bị vô hiệu hóa";
    public static string UserDeleted = "Người dùng đã bị xóa";
    #endregion
}