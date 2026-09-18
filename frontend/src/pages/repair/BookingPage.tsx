import React, { useState } from 'react';
import { repairApi } from '../../api/repair';
import type { ServiceType, TimeSlot, ServiceLocation } from '../../api/repair';
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
    const [serviceType, setServiceType] = useState<ServiceType>('InShop');
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
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

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
                serviceAddress: serviceType === 'OnSite'
                    ? z.string().min(1, msg.requireInput('địa chỉ'))
                    : z.string().optional(),
            });

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
            await repairApi.booking.create({
                serviceType,
                deviceModel: formData.deviceModel,
                serialNumber: formData.serialNumber || undefined,
                issueDescription: formData.issueDescription,
                preferredDate: formData.preferredDate,
                timeSlot: formData.timeSlot,
                serviceAddress: serviceType === 'OnSite' ? formData.serviceAddress : undefined,
                locationType: serviceType === 'OnSite' ? formData.locationType : undefined,
                locationNotes: serviceType === 'OnSite' ? formData.locationNotes : undefined,
                acceptedTerms: formData.acceptedTerms,
                customerName: formData.customerName,
                customerPhone: formData.customerPhone,
                customerEmail: formData.customerEmail,
                imageUrls: [],
                videoUrls: [],
            });

            setSubmitSuccess(true);
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
            setTimeout(() => setSubmitSuccess(false), 5000);
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

    const minDate = new Date().toISOString().split('T')[0];
    const serviceCardClass = (active: boolean) =>
        `p-4 border-2 rounded-lg text-left transition ${active ? 'border-accent bg-red-50' : 'border-gray-300 hover:border-red-300'}`;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Đặt lịch sửa chữa</h1>
            <p className="text-sm text-gray-600 mb-6">
                Gửi yêu cầu để kỹ thuật viên Quang Hưởng kiểm tra thiết bị. Chúng tôi báo giá bằng VNĐ
                trước khi sửa và chỉ tiến hành khi bạn đồng ý.
            </p>

            {submitSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Đã gửi yêu cầu đặt lịch! Cửa hàng sẽ liên hệ với bạn để xác nhận trong thời gian sớm nhất.
                </div>
            )}

            {submitError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-white p-5 sm:p-6 rounded-lg shadow">
                    <h2 className="text-lg sm:text-xl font-semibold mb-4">Chọn hình thức phục vụ</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button type="button" onClick={() => setServiceType('InShop')} className={serviceCardClass(serviceType === 'InShop')}>
                            <div className="text-base font-semibold">Mang máy đến cửa hàng</div>
                            <div className="text-sm text-gray-600 mt-1">Bạn mang thiết bị tới cửa hàng Quang Hưởng</div>
                            <div className="text-sm font-semibold text-green-600 mt-2">Miễn phí tiếp nhận và kiểm tra</div>
                        </button>
                        <button type="button" onClick={() => setServiceType('OnSite')} className={serviceCardClass(serviceType === 'OnSite')}>
                            <div className="text-base font-semibold">Kỹ thuật viên đến tận nơi</div>
                            <div className="text-sm text-gray-600 mt-1">Kỹ thuật viên tới địa chỉ của bạn</div>
                            <div className="text-sm font-semibold text-accent mt-2">
                                Phạm vi và phí dịch vụ (nếu có) được nhân viên xác nhận trước khi đi
                            </div>
                        </button>
                    </div>
                </div>

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
                />

                {serviceType === 'OnSite' && (
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

                <div className="bg-white p-5 sm:p-6 rounded-lg shadow">
                    <div className="mb-4">
                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                name="acceptedTerms"
                                checked={formData.acceptedTerms}
                                onChange={handleInputChange}
                                className="mt-1 mr-2"
                            />
                            <span className="text-sm">
                                Tôi đồng ý với{' '}
                                <button type="button" onClick={() => setShowTermsModal(true)} className="text-accent font-semibold hover:underline">
                                    điều khoản dịch vụ sửa chữa
                                </button>{' '}
                                của Quang Hưởng Computer *
                            </span>
                        </label>
                        {errors.acceptedTerms && <p className="mt-1 text-xs text-red-500 ml-5">{errors.acceptedTerms}</p>}
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
            </form>

            {showTermsModal && <BookingServiceTermsModal onClose={() => setShowTermsModal(false)} />}
        </div>
    );
};

export default BookingPage;
