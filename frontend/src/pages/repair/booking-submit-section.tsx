import React from 'react';

interface Props {
    acceptedTerms: boolean;
    error?: string;
    isSubmitting: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onShowTerms: () => void;
}

/** Điều khoản + ghi chú chi phí + nút gửi của form đặt lịch (tách khỏi BookingPage để giữ file gọn). */
export const BookingSubmitSection: React.FC<Props> = ({ acceptedTerms, error, isSubmitting, onChange, onShowTerms }) => (
    <div className="bg-white p-5 sm:p-6 rounded-lg shadow">
        <div className="mb-4">
            <label className="flex items-start">
                <input
                    type="checkbox"
                    name="acceptedTerms"
                    checked={acceptedTerms}
                    onChange={onChange}
                    className="mt-1 mr-2"
                />
                <span className="text-sm">
                    Tôi đồng ý với{' '}
                    <button type="button" onClick={onShowTerms} className="text-accent font-semibold hover:underline">
                        điều khoản dịch vụ sửa chữa
                    </button>{' '}
                    của Quang Hưởng Computer *
                </span>
            </label>
            {error && <p className="mt-1 text-xs text-red-500 ml-5">{error}</p>}
        </div>

        <div className="bg-red-50 border border-red-100 p-4 rounded-lg mb-4 text-sm text-gray-700 space-y-1">
            <div className="font-semibold text-gray-900">Chi phí dự kiến</div>
            <p>
                Kỹ thuật viên kiểm tra và báo giá bằng VNĐ trước khi sửa; bạn đồng ý thì mới thực hiện.
                Đặt lịch không phát sinh chi phí.
            </p>
            <p>
                Trường hợp thiết bị còn bảo hành: cửa hàng chịu chi phí sửa chữa và vận chuyển hai chiều.
            </p>
        </div>

        <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            {isSubmitting ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lịch'}
        </button>
    </div>
);
