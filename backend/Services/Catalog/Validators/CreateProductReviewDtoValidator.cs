using BuildingBlocks.Validation;
using FluentValidation;

namespace Catalog.Validators;

/// <summary>Validate request tạo đánh giá sản phẩm — rating 1..5, comment bắt buộc.</summary>
public class CreateProductReviewDtoValidator : AbstractValidator<CreateProductReviewDto>
{
    public CreateProductReviewDtoValidator()
    {
        RuleFor(x => x.Rating)
            .InclusiveBetween(1, 5).WithMessage(VietnameseValidationMessages.NumberOutOfRange("Đánh giá (sao)", 1, 5));

        RuleFor(x => x.Comment)
            .NotEmpty().WithMessage(VietnameseValidationMessages.RequiredField("Nội dung đánh giá"))
            .MinimumLength(10).WithMessage(VietnameseValidationMessages.StringTooShort("Nội dung đánh giá", 10))
            .MaximumLength(2000).WithMessage(VietnameseValidationMessages.StringTooLong("Nội dung đánh giá", 2000));

        RuleFor(x => x.Title)
            .MaximumLength(200).WithMessage(VietnameseValidationMessages.StringTooLong("Tiêu đề", 200))
            .When(x => x.Title != null);

        RuleFor(x => x.Pros)
            .MaximumLength(Domain.ProductReview.MaxProsConsLength)
            .WithMessage(VietnameseValidationMessages.StringTooLong("Ưu điểm", Domain.ProductReview.MaxProsConsLength));
        RuleFor(x => x.Cons)
            .MaximumLength(Domain.ProductReview.MaxProsConsLength)
            .WithMessage(VietnameseValidationMessages.StringTooLong("Nhược điểm", Domain.ProductReview.MaxProsConsLength));

        RuleFor(x => x.Photos)
            .Must(p => p == null || p.Count <= Domain.ReviewPhotoPolicy.MaxPhotos)
            .WithMessage($"Tối đa {Domain.ReviewPhotoPolicy.MaxPhotos} ảnh cho một đánh giá.");
        // Chỉ nhận ảnh của kho media cửa hàng (đã qua kiểm magic bytes + mã hoá lại khi tải lên).
        RuleForEach(x => x.Photos)
            .Must(p => p != null && Domain.ReviewPhotoPolicy.IsAcceptable(new Domain.ReviewPhoto(p.Url, p.ThumbnailUrl)))
            .WithMessage("Ảnh đánh giá phải được tải lên qua trang của cửa hàng.");
    }
}
