namespace BuildingBlocks.Validation;

/// <summary>
/// Vietnamese validation messages for API validation
/// </summary>
public static class VietnameseValidationMessages
{
    #region Common Messages
    public const string Required = "Trường này là bắt buộc";
    public const string Invalid = "Giá trị không hợp lệ";
    public const string TooShort = "Giá trị quá ngắn";
    public const string TooLong = "Giá trị quá dài";
    public const string FormatInvalid = "Định dạng không hợp lệ";
    public const string RangeInvalid = "Giá trị nằm ngoài phạm vi cho phép";
    public const string CompareInvalid = "Giá trị không khớp";
    public const string CustomInvalid = "Giá trị không hợp lệ";
    public const string FileTooLarge = "Tệp tin quá lớn";
    public const string FileInvalidType = "Loại tệp không được hỗ trợ";
    #endregion

    #region String Validation
    public static string RequiredField(string fieldName)
    {
        return $"Trường '{fieldName}' là bắt buộc";
    }

    public static string StringTooShort(string fieldName, int minLength)
    {
        return $"Trường '{fieldName}' phải có ít nhất {minLength} ký tự";
    }

    public static string StringTooLong(string fieldName, int maxLength)
    {
        return $"Trường '{fieldName}' không được vượt quá {maxLength} ký tự";
    }

    public static string InvalidEmail(string fieldName = "Email")
    {
        return $"Định dạng {fieldName} không hợp lệ";
    }

    public static string InvalidPhone(string fieldName = "Số điện thoại")
    {
        return $"Định dạng {fieldName} không hợp lệ";
    }

    public static string InvalidUrl(string fieldName = "URL")
    {
        return $"Định dạng {fieldName} không hợp lệ";
    }

    public static string InvalidPassword(string fieldName = "Mật khẩu")
    {
        return $"{fieldName} phải chứa ít nhất 1 ký tự chữ hoa, 1 ký tự thường, 1 số và 1 ký tự đặc biệt";
    }
    #endregion

    #region Number Validation
    public static string NumberTooSmall(string fieldName, decimal minValue)
    {
        return $"{fieldName} phải lớn hơn hoặc bằng {minValue}";
    }

    public static string NumberTooLarge(string fieldName, decimal maxValue)
    {
        return $"{fieldName} phải nhỏ hơn hoặc bằng {maxValue}";
    }

    public static string NumberOutOfRange(string fieldName, decimal minValue, decimal maxValue)
    {
        return $"{fieldName} phải nằm trong khoảng từ {minValue} đến {maxValue}";
    }

    public static string InvalidDecimal(string fieldName = "Số thập phân")
    {
        return $"Định dạng {fieldName} không hợp lệ";
    }
    #endregion

    #region Date Validation
    public static string InvalidDate(string fieldName = "Ngày")
    {
        return $"Định dạng {fieldName} không hợp lệ";
    }

    public static string DateInFuture(string fieldName = "Ngày")
    {
        return $"{fieldName} không thể là ngày trong tương lai";
    }

    public static string DateInPast(string fieldName = "Ngày")
    {
        return $"{fieldName} không thể là ngày trong quá khứ";
    }

    public static string DateTooEarly(string fieldName, DateTime minDate)
    {
        return $"{fieldName} không sớm hơn {minDate:dd/MM/yyyy}";
    }

    public static string DateTooLate(string fieldName, DateTime maxDate)
    {
        return $"{fieldName} không muộn hơn {maxDate:dd/MM/yyyy}";
    }

    public static string AgeTooYoung(int minAge)
    {
        return $"Tuổi phải lớn hơn hoặc bằng {minAge} tuổi";
    }

    public static string AgeTooOld(int maxAge)
    {
        return $"Tuổi phải nhỏ hơn hoặc等于 {maxAge} tuổi";
    }
    #endregion

    #region File Validation
    public static string FileSizeExceeds(string fieldName, long maxSizeInBytes)
    {
        var maxSizeInMB = maxSizeInBytes / (1024 * 1024);
        return $"Kích thước {fieldName} không được vượt quá {maxSizeInMB} MB";
    }

    public static string InvalidFileType(string fieldName, string allowedTypes)
    {
        return $"{fieldName} chỉ chấp nhận các định dạng: {allowedTypes}";
    }

    public static string FileRequired(string fieldName)
    {
        return $"Vui lòng chọn {fieldName}";
    }

    public static string TooManyFiles(string fieldName, int maxCount)
    {
        return $"Số lượng {fieldName} không được vượt quá {maxCount} tệp";
    }
    #endregion

    #region Collection Validation
    public static string CollectionEmpty(string fieldName)
    {
        return $"{fieldName} không được để trống";
    }

    public static string CollectionTooSmall(string fieldName, int minCount)
    {
        return $"{fieldName} phải chứa ít nhất {minCount} mục";
    }

    public static string CollectionTooLarge(string fieldName, int maxCount)
    {
        return $"{fieldName} không được chứa quá {maxCount} mục";
    }

    public static string DuplicateItem(string fieldName)
    {
        return $"{fieldName} chứa mục trùng lặp";
    }
    #endregion

    #region Business Validation
    public static string InsufficientStock(string productName, int availableStock)
    {
        return $"Sản phẩm {productName} chỉ còn {availableStock} sản phẩm trong kho";
    }

    public static string ProductOutOfStock(string productName)
    {
        return $"Sản phẩm {productName} hiện hết hàng";
    }

    public static string InvalidOrderStatus(string currentStatus, string action)
    {
        return $"Không thể thực hiện {action} với đơn hàng ở trạng thái {currentStatus}";
    }

    public static string OrderAlreadyProcessed(string orderId)
    {
        return $"Đơn hàng {orderId} đã được xử lý";
    }

    public static string InsufficientFunds(decimal available, decimal required)
    {
        return $"Số dư không đủ. Hiện có: {available:0,0 'đ'} - Yêu cầu: {required:0,0 'đ'}";
    }

    public static string InvalidCouponCode(string couponCode)
    {
        return $"Mã giảm giá {couponCode} không hợp lệ hoặc đã hết hạn";
    }

    public static string CouponUsageExceeded(string couponCode)
    {
        return $"Đã vượt quá số lần sử dụng cho mã giảm giá {couponCode}";
    }
    #endregion

    #region Security Validation
    public static string InvalidToken(string tokenType = "token")
    {
        return $"{tokenType} không hợp lệ hoặc đã hết hạn";
    }

    public static string UnauthorizedAccess(string resource)
    {
        return $"Bạn không có quyền truy cập {resource}";
    }

    public static string AccountLocked(string accountType = "Tài khoản")
    {
        return $"{accountType} đã bị khóa. Vui lòng liên hệ quản trị viên";
    }

    public static string WeakPassword()
    {
        return "Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn";
    }

    public static string PasswordMismatch()
    {
        return "Mật khẩu xác nhận không khớp";
    }

    public static string AccountInactive(string accountType = "Tài khoản")
    {
        return $"{accountType} chưa được kích hoạt";
    }
    #endregion

    #region Custom Error Messages
    public static string CustomError(string fieldName, string message)
    {
        return $"{fieldName}: {message}";
    }

    public static string ServerError()
    {
        return "Đã xảy ra lỗi trên máy chủ. Vui lòng thử lại sau";
    }

    public static string NetworkError()
    {
        return "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet";
    }

    public static string TimeoutError()
    {
        return "Yêu cầu đã hết thời gian. Vui lòng thử lại";
    }

    public static string ConflictError(string resourceName)
    {
        return $"{resourceName} đã tồn tại hoặc có xung đột";
    }
    #endregion

    #region Form Validation
    public static string FormValidationError(List<string> errors)
    {
        if (errors.Count == 1)
            return errors[0];
        
        return "Form chứa các lỗi sau:\n" + string.Join("\n", errors);
    }

    public static string PasswordPolicyNotMet()
    {
        return "Mật khẩu phải: \n- Có ít nhất 8 ký tự\n- Chứa ít nhất 1 chữ hoa\n- Chứa ít nhất 1 chữ thường\n- Chứa ít nhất 1 số\n- Chứa ít nhất 1 ký tự đặc biệt";
    }

    public static string UsernameInvalid()
    {
        return "Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới, phải bắt đầu bằng chữ cái";
    }
    #endregion

    #region Entity Specific
    public static string EntityNotFound(string entityName, object id)
    {
        return $"{entityName} với ID '{id}' không tồn tại";
    }

    public static string EntityAlreadyExists(string entityName, object identifier)
    {
        return $"{entityName} với định danh '{identifier}' đã tồn tại";
    }

    public static string EntityDeleted(string entityName, object id)
    {
        return $"{entityName} với ID '{id}' đã bị xóa";
    }

    public static string EntityInactive(string entityName, object id)
    {
        return $"{entityName} với ID '{id}' hiện không hoạt động";
    }
    #endregion
}