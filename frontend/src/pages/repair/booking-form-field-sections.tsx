import React from 'react';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { TimeSlot, ServiceLocation } from '../../api/repair';

/**
 * Các khối trường của form đặt lịch sửa chữa, tách khỏi `BookingPage.tsx` để giữ mỗi file < 200 LOC.
 * Toàn bộ nhãn là tiếng Việt (standing rule 8). Không có giá trị tiền nào ở đây — mọi chi phí
 * được báo giá sau chẩn đoán (xem `booking-service-terms-modal.tsx`).
 */

/** Khung giờ hiển thị cho khách — thay cho `getTimeSlotLabel` (đang trả chuỗi AM/PM tiếng Anh). */
export const TIME_SLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
    { value: 'Morning', label: 'Buổi sáng (08:00 – 12:00)' },
    { value: 'Afternoon', label: 'Buổi chiều (13:00 – 17:00)' },
    { value: 'Evening', label: 'Buổi tối (17:00 – 20:00)' },
];

export const SERVICE_LOCATION_OPTIONS: { value: ServiceLocation; label: string }[] = [
    { value: 'CustomerHome', label: 'Nhà riêng' },
    { value: 'CustomerOffice', label: 'Văn phòng / công ty' },
    { value: 'School', label: 'Trường học' },
    { value: 'Government', label: 'Cơ quan nhà nước / UBND' },
    { value: 'Other', label: 'Địa điểm khác' },
];

const CARD = 'bg-white p-5 sm:p-6 rounded-lg shadow';
const HEADING = 'text-lg sm:text-xl font-semibold mb-4';
const LABEL = 'block text-sm font-medium mb-1';
const inputClass = (hasError?: boolean) =>
    `w-full border ${hasError ? 'border-red-400 focus:border-red-500' : 'border-gray-200'} rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400`;

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
    message ? <p className="mt-1 text-xs text-red-500">{message}</p> : null;

type ChangeHandler = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;

interface DeviceSectionProps {
    deviceModel: string;
    serialNumber: string;
    issueDescription: string;
    errors: Record<string, string>;
    onChange: ChangeHandler;
}

export const BookingDeviceSection: React.FC<DeviceSectionProps> = ({
    deviceModel, serialNumber, issueDescription, errors, onChange,
}) => (
    <div className={CARD}>
        <h2 className={HEADING}>Thông tin thiết bị</h2>
        <div className="space-y-4">
            <div>
                <label className={LABEL}>Tên / model thiết bị *</label>
                <input
                    type="text" name="deviceModel" value={deviceModel} onChange={onChange}
                    placeholder="Ví dụ: Laptop Dell XPS 15, PC gaming Core i5, màn hình LG 24 inch"
                    className={inputClass(!!errors.deviceModel)}
                />
                <FieldError message={errors.deviceModel} />
            </div>
            <div>
                <label className={LABEL}>Số serial / IMEI (không bắt buộc)</label>
                <input
                    type="text" name="serialNumber" value={serialNumber} onChange={onChange}
                    placeholder="Nhập nếu có — giúp tra bảo hành nhanh hơn"
                    className={inputClass()}
                />
            </div>
            <div>
                <label className={LABEL}>Mô tả tình trạng lỗi *</label>
                <textarea
                    name="issueDescription" value={issueDescription} onChange={onChange} rows={4}
                    placeholder="Mô tả càng chi tiết càng tốt: lỗi xuất hiện khi nào, có tiếng kêu lạ, màn hình báo gì..."
                    className={inputClass(!!errors.issueDescription)}
                />
                <FieldError message={errors.issueDescription} />
            </div>
        </div>
    </div>
);

interface MediaSectionProps {
    imageCount: number;
    videoCount: number;
    onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const BookingMediaSection: React.FC<MediaSectionProps> = ({
    imageCount, videoCount, onImageChange, onVideoChange,
}) => (
    <div className={CARD}>
        <h2 className={HEADING}>Ảnh / video tình trạng máy (không bắt buộc)</h2>
        <div className="space-y-4">
            <div>
                <label className={LABEL}>Ảnh</label>
                <input type="file" accept="image/*" multiple onChange={onImageChange} className={inputClass()} />
                {imageCount > 0 && <div className="mt-2 text-sm text-gray-600">Đã chọn {imageCount} ảnh</div>}
            </div>
            <div>
                <label className={LABEL}>Video</label>
                <input type="file" accept="video/*" multiple onChange={onVideoChange} className={inputClass()} />
                {videoCount > 0 && <div className="mt-2 text-sm text-gray-600">Đã chọn {videoCount} video</div>}
            </div>
        </div>
    </div>
);

interface ScheduleSectionProps {
    preferredDate: string;
    timeSlot: TimeSlot;
    minDate: string;
    errors: Record<string, string>;
    onChange: ChangeHandler;
    onTimeSlotChange: (value: TimeSlot) => void;
}

export const BookingScheduleSection: React.FC<ScheduleSectionProps> = ({
    preferredDate, timeSlot, minDate, errors, onChange, onTimeSlotChange,
}) => (
    <div className={CARD}>
        <h2 className={HEADING}>Thời gian bạn muốn hẹn</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className={LABEL}>Ngày hẹn *</label>
                <input
                    type="date" name="preferredDate" value={preferredDate} onChange={onChange} min={minDate}
                    className={inputClass(!!errors.preferredDate)}
                />
                <FieldError message={errors.preferredDate} />
            </div>
            <div>
                <label className={LABEL}>Khung giờ *</label>
                <SearchableSelect
                    name="timeSlot"
                    value={timeSlot}
                    onChange={(val) => onTimeSlotChange(val as TimeSlot)}
                    options={TIME_SLOT_OPTIONS}
                    placeholder="Chọn khung giờ"
                />
            </div>
        </div>
    </div>
);

interface LocationSectionProps {
    serviceAddress: string;
    locationType: ServiceLocation;
    locationNotes: string;
    errors: Record<string, string>;
    onChange: ChangeHandler;
    onLocationTypeChange: (value: ServiceLocation) => void;
}

export const BookingLocationSection: React.FC<LocationSectionProps> = ({
    serviceAddress, locationType, locationNotes, errors, onChange, onLocationTypeChange,
}) => (
    <div className={CARD}>
        <h2 className={HEADING}>Địa điểm kỹ thuật viên đến</h2>
        <div className="space-y-4">
            <div>
                <label className={LABEL}>Địa chỉ *</label>
                <input
                    type="text" name="serviceAddress" value={serviceAddress} onChange={onChange}
                    placeholder="Số nhà, đường, phường/xã, quận/huyện, Hải Phòng"
                    className={inputClass(!!errors.serviceAddress)}
                />
                <FieldError message={errors.serviceAddress} />
            </div>
            <div>
                <label className={LABEL}>Loại địa điểm *</label>
                <SearchableSelect
                    name="locationType"
                    value={locationType}
                    onChange={(val) => onLocationTypeChange(val as ServiceLocation)}
                    options={SERVICE_LOCATION_OPTIONS}
                    placeholder="Chọn loại địa điểm"
                />
            </div>
            <div>
                <label className={LABEL}>Ghi chú thêm</label>
                <textarea
                    name="locationNotes" value={locationNotes} onChange={onChange} rows={2}
                    placeholder="Chỉ dẫn đường, điểm mốc dễ nhận biết, giờ thuận tiện..."
                    className={inputClass()}
                />
            </div>
        </div>
    </div>
);

interface ContactSectionProps {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    errors: Record<string, string>;
    onChange: ChangeHandler;
}

export const BookingContactSection: React.FC<ContactSectionProps> = ({
    customerName, customerPhone, customerEmail, errors, onChange,
}) => (
    <div className={CARD}>
        <h2 className={HEADING}>Thông tin liên hệ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className={LABEL}>Họ và tên *</label>
                <input
                    type="text" name="customerName" value={customerName} onChange={onChange}
                    placeholder="Nguyễn Văn A"
                    className={inputClass(!!errors.customerName)}
                />
                <FieldError message={errors.customerName} />
            </div>
            <div>
                <label className={LABEL}>Số điện thoại *</label>
                <input
                    type="tel" name="customerPhone" value={customerPhone} onChange={onChange}
                    placeholder="09xxxxxxxx"
                    className={inputClass(!!errors.customerPhone)}
                />
                <FieldError message={errors.customerPhone} />
            </div>
            <div className="md:col-span-2">
                <label className={LABEL}>Email *</label>
                <input
                    type="email" name="customerEmail" value={customerEmail} onChange={onChange}
                    placeholder="email@example.com"
                    className={inputClass(!!errors.customerEmail)}
                />
                <FieldError message={errors.customerEmail} />
            </div>
        </div>
    </div>
);
