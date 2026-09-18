import React from 'react';

/**
 * Điều khoản dịch vụ sửa chữa hiển thị trong trang đặt lịch.
 *
 * Nội dung lấy theo quyết định D08 (`plans/.../decisions/D08-chinh-sach-bao-hanh-doi-tra.md`):
 * - §4(a) thời hạn CÔNG BỐ: thẩm định ≤ 03 ngày làm việc, sửa tại cửa hàng ≤ 15 ngày,
 *   gửi trung tâm bảo hành hãng trong nước ≤ 30 ngày, hàng gửi hãng nước ngoài theo thông báo của hãng.
 * - §4 quá thời hạn công bố hoặc đã bảo hành ≥ 03 lần vẫn lỗi ⇒ đổi mới hoặc thu hồi + hoàn tiền.
 * - §4 cộng bù số ngày giữ máy vào hạn bảo hành.
 * - Luật 19/2023 Đ30.2.e: trường hợp thuộc bảo hành, cửa hàng chịu phí sửa + vận chuyển 2 chiều.
 * - §3 dịch vụ tận nơi là tuỳ chọn cấu hình, mặc định TẮT ⇒ không hứa mức phí cố định ở đây.
 *   D08 KHÔNG quy định số tiền phí tận nơi, nên trang này không hiển thị con số nào.
 */
interface BookingServiceTermsModalProps {
    onClose: () => void;
}

const TERMS: string[] = [
    'Cửa hàng kiểm tra và thông báo kết quả thẩm định trong tối đa 03 ngày làm việc kể từ khi nhận thiết bị, kèm biên nhận ghi rõ thời hạn xử lý của từng trường hợp.',
    'Mọi chi phí đều được báo giá bằng VNĐ trước khi sửa. Kỹ thuật viên chỉ tiến hành sau khi bạn đồng ý báo giá.',
    'Thời hạn xử lý công bố: sửa tại cửa hàng tối đa 15 ngày; gửi trung tâm bảo hành của hãng trong nước tối đa 30 ngày; thiết bị phải gửi hãng ở nước ngoài thì theo thông báo của hãng và được ghi cụ thể trên biên nhận.',
    'Trường hợp thuộc bảo hành: cửa hàng chịu chi phí sửa chữa và chi phí vận chuyển hai chiều. Số ngày cửa hàng giữ máy được cộng bù vào thời hạn bảo hành.',
    'Nếu quá thời hạn xử lý đã công bố mà không sửa được, hoặc thiết bị đã bảo hành từ 03 lần trở lên vẫn tái lỗi, bạn được đổi sản phẩm mới tương đương hoặc cửa hàng thu hồi và hoàn lại tiền.',
    'Vui lòng tự sao lưu dữ liệu trước khi gửi máy. Cửa hàng không bảo hành phần mềm, hệ điều hành và dữ liệu, kể cả trong quá trình sửa chữa.',
    'Dịch vụ tận nơi phụ thuộc phạm vi phục vụ và lịch kỹ thuật viên. Nhân viên sẽ liên hệ xác nhận phạm vi, thời gian và mức phí (nếu có) trước khi kỹ thuật viên lên đường — không thu bất kỳ khoản nào khi bạn chưa đồng ý.',
    'Thanh toán khi dịch vụ hoàn tất. Cửa hàng thông báo và liên hệ hẹn trả máy; vui lòng nhận máy theo thời hạn ghi trên biên nhận.',
];

export const BookingServiceTermsModal: React.FC<BookingServiceTermsModalProps> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4">Điều khoản dịch vụ sửa chữa</h2>
            <ol className="space-y-3 text-sm text-gray-700 list-decimal pl-5">
                {TERMS.map((term, i) => (
                    <li key={i}>{term}</li>
                ))}
            </ol>
            <button
                onClick={onClose}
                className="mt-6 w-full bg-accent text-white py-2.5 rounded-lg font-semibold hover:opacity-90"
            >
                Đã hiểu
            </button>
        </div>
    </div>
);

export default BookingServiceTermsModal;
