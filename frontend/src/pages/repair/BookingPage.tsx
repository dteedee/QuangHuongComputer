import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { repairApi } from '../../api/repair';
import type { TimeSlot, ServiceLocation } from '../../api/repair';
import type { PublicRepairServiceType } from '../../api/repair/service-types';
import { queryKeys } from '../../lib/query-keys';
import { BookingServicePicker } from './booking-service-picker';
import { BookingSubmitSection } from './booking-submit-section';
import { useAuth } from '../../context/AuthContext';
import { z } from 'zod';
import { validationMessages as msg } from '../../lib/validation/messages';
import BookingServiceTermsModal from './booking-service-terms-modal';
import {
    BookingContactSection,
    BookingDeviceSection,
    BookingLocationSection,
    BookingMediaSection,
    BookingScheduleSection,
} from './booking-form-field-sections';

/**
 * Trang đặt lịch sửa chữa của khách (`/booking`).
 *
 * W0 gate: trang này trước đây hoàn toàn tiếng Anh và hiển thị "+$50 service fee" trên một
 * storefront tiếng Việt/VND (vi phạm standing rule 8). Nay toàn bộ nội dung là tiếng Việt và
 * KHÔNG hiển thị bất kỳ con số phí nào: quyết định D08 không quy định mức phí dịch vụ tận nơi
 * (§3 chỉ nêu on-site là tuỳ chọn cấu hình, mặc định TẮT), và số 50 trong code là hằng số bịa
 * ở backend (`Repair/Domain/ServiceBooking.cs:75` — đã ghi vào integration-requests-w0.md).
 * Chi phí thật đến từ báo giá sau chẩn đoán (`RepairQuote`), luôn tính bằng VNĐ.
 */
export const BookingPage: React.FC = () => {
    const { user } = useAuth();
    const [service, setService] = useState<PublicRepairServiceType | null>(null);
    const isOnSite = service?.isOnSite ?? false;
    const [formData, setFormData] = useState({
        deviceModel: '',
        serialNumber: '',
        issueDescription: '',
        preferredDate: '',
        timeSlot: 'Morning' as TimeSlot,
        serviceAddress: '',
        locationType: 'CustomerHome' as ServiceLocation,
        locationNotes: '',
        customerName: user?.fullName || '',
        customerPhone: '',
        customerEmail: user?.email || '',
        acceptedTerms: false,
    });
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [videoFiles, setVideoFiles] = useState<File[]>([]);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Khung giờ đã kín của ngày đang chọn — chỉ để báo sớm; server kiểm lại khi gửi (có khoá).
    const slots = useQuery({
        queryKey: [...queryKeys.repair.all, 'booking-slots', formData.preferredDate],
        queryFn: () => repairApi.booking.getSlots(formData.preferredDate),
        enabled: !!formData.preferredDate && !!user,
    });
    const fullSlots = (slots.data?.slots ?? []).filter((x) => x.isFull).map((x) => x.slot);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');

        try {
            const schema = z.object({
                deviceModel: z.string().min(1, msg.requireInput('tên thiết bị')),
                issueDescription: z.string().min(1, msg.requireInput('mô tả lỗi')),
                preferredDate: z.string().min(1, msg.requireInput('ngày hẹn')),
                customerName: z.string().min(1, msg.requireInput('họ và tên')),
                customerPhone: z.string().min(1, msg.requireInput('số điện thoại')),
                customerEmail: z.string().min(1, msg.requireInput('email')),
                acceptedTerms: z.literal(true, {
                    errorMap: () => ({ message: 'Vui lòng đồng ý điều khoản dịch vụ sửa chữa' }),
                }),
                serviceAddress: isOnSite
                    ? z.string().min(1, msg.requireInput('địa chỉ'))
                    : z.string().optional(),
            });
            if (!service) {
                setErrors({ serviceTypeId: 'Vui lòng chọn dịch vụ' });
                setSubmitError('Vui lòng chọn dịch vụ.');
                return;
            }
            if (fullSlots.includes(formData.timeSlot)) {
                setErrors({ timeSlot: 'Khung giờ này đã kín lịch' });
                setSubmitError('Khung giờ bạn chọn đã kín lịch. Vui lòng chọn khung giờ hoặc ngày khác.');
                return;
            }

            const result = schema.safeParse(formData);
            if (!result.success) {
                const fieldErrors: Record<string, string> = {};
                result.error.issues.forEach(issue => {
                    const path = issue.path[0]?.toString();
                    if (path) fieldErrors[path] = issue.message;
                });
                setErrors(fieldErrors);
                return;
            }
            setErrors({});

            // Upload media chưa được nối vào storage service — gửi danh sách rỗng thay vì URL bịa.
            const created = await repairApi.booking.create({
                serviceTypeId: service.id,
                deviceModel: formData.deviceModel,
                serialNumber: formData.serialNumber || undefined,
                issueDescription: formData.issueDescription,
                preferredDate: formData.preferredDate,
                timeSlot: formData.timeSlot,
                serviceAddress: isOnSite ? formData.serviceAddress : undefined,
                locationType: isOnSite ? formData.locationType : undefined,
                locationNotes: isOnSite ? formData.locationNotes : undefined,
                acceptedTerms: formData.acceptedTerms,
                customerName: formData.customerName,
                customerPhone: formData.customerPhone,
                customerEmail: formData.customerEmail,
                imageUrls: [],
                videoUrls: [],
            });

            setSubmitSuccess(created.bookingNumber);
            setFormData({
                deviceModel: '',
                serialNumber: '',
                issueDescription: '',
                preferredDate: '',
                timeSlot: 'Morning',
                serviceAddress: '',
                locationType: 'CustomerHome',
                locationNotes: '',
                customerName: user?.fullName || '',
                customerPhone: '',
                customerEmail: user?.email || '',
                acceptedTerms: false,
            });
            setImageFiles([]);
            setVideoFiles([]);
            void slots.refetch();
        } catch (error) {
            const apiError = (error as { response?: { data?: { error?: string } }; message?: string });
            setSubmitError(
                apiError.response?.data?.error
                || apiError.message
                || 'Không tạo được lịch hẹn. Vui lòng thử lại hoặc gọi hotline để được hỗ trợ.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const minDate = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Đặt lịch sửa chữa</h1>
            <p className="text-sm text-gray-600 mb-6">
                Gửi yêu cầu để kỹ thuật viên Quang Hưởng kiểm tra thiết bị. Chúng tôi báo giá bằng VNĐ
                trước khi sửa và chỉ tiến hành khi bạn đồng ý.
            </p>

            {submitSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Đã gửi yêu cầu đặt lịch <strong className="font-mono">{submitSuccess}</strong>. Cửa hàng sẽ liên hệ với bạn để xác nhận
                    trong thời gian sớm nhất — hãy giữ số lịch hẹn này khi liên hệ.
                </div>
            )}

            {submitError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <BookingServicePicker value={service?.id ?? null} onChange={setService} />

                <BookingDeviceSection
                    deviceModel={formData.deviceModel}
                    serialNumber={formData.serialNumber}
                    issueDescription={formData.issueDescription}
                    errors={errors}
                    onChange={handleInputChange}
                />

                <BookingMediaSection
                    imageCount={imageFiles.length}
                    videoCount={videoFiles.length}
                    onImageChange={e => setImageFiles(e.target.files ? Array.from(e.target.files) : [])}
                    onVideoChange={e => setVideoFiles(e.target.files ? Array.from(e.target.files) : [])}
                />

                <BookingScheduleSection
                    preferredDate={formData.preferredDate}
                    timeSlot={formData.timeSlot}
                    minDate={minDate}
                    errors={errors}
                    onChange={handleInputChange}
                    onTimeSlotChange={val => setFormData(prev => ({ ...prev, timeSlot: val }))}
                    fullSlots={fullSlots}
                />

                {isOnSite && (
                    <BookingLocationSection
                        serviceAddress={formData.serviceAddress}
                        locationType={formData.locationType}
                        locationNotes={formData.locationNotes}
                        errors={errors}
                        onChange={handleInputChange}
                        onLocationTypeChange={val => setFormData(prev => ({ ...prev, locationType: val }))}
                    />
                )}

                <BookingContactSection
                    customerName={formData.customerName}
                    customerPhone={formData.customerPhone}
                    customerEmail={formData.customerEmail}
                    errors={errors}
                    onChange={handleInputChange}
                />

                <BookingSubmitSection
                    acceptedTerms={formData.acceptedTerms}
                    error={errors.acceptedTerms}
                    isSubmitting={isSubmitting}
                    onChange={handleInputChange}
                    onShowTerms={() => setShowTermsModal(true)}
                />
            </form>

            {showTermsModal && <BookingServiceTermsModal onClose={() => setShowTermsModal(false)} />}
        </div>
    );
};

export default BookingPage;
