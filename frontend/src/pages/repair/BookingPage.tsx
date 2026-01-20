import React, { useState } from 'react';
import { repairApi, ServiceType, TimeSlot, ServiceLocation, getTimeSlotLabel } from '../../api/repair';
import { useAuth } from '../../context/AuthContext';

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
    const [onSiteFee] = useState(50.00);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImageFiles(Array.from(e.target.files));
        }
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setVideoFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError('');

        try {
            // Validation
            if (!formData.deviceModel || !formData.issueDescription) {
                throw new Error('Device model and issue description are required');
            }

            if (!formData.preferredDate) {
                throw new Error('Preferred date is required');
            }

            if (!formData.customerName || !formData.customerPhone) {
                throw new Error('Contact information is required');
            }

            if (serviceType === 'OnSite' && !formData.serviceAddress) {
                throw new Error('Service address is required for on-site service');
            }

            if (!formData.acceptedTerms) {
                throw new Error('You must accept the terms and conditions');
            }

            // For demo purposes, we'll create the booking without actual file uploads
            // In production, you would upload files to a storage service first
            const imageUrls: string[] = [];
            const videoUrls: string[] = [];

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
                imageUrls,
                videoUrls,
            });

            setSubmitSuccess(true);
            // Reset form
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
        } catch (error: any) {
            setSubmitError(error.response?.data?.error || error.message || 'Failed to create booking');
        } finally {
            setIsSubmitting(false);
        }
    };

    const minDate = new Date().toISOString().split('T')[0];

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Book Repair Service</h1>

            {submitSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    Booking created successfully! We'll contact you soon.
                </div>
            )}

            {submitError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {submitError}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Type Selection */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Select Service Type</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setServiceType('InShop')}
                            className={`p-4 border-2 rounded-lg transition ${
                                serviceType === 'InShop'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-blue-300'
                            }`}
                        >
                            <div className="text-lg font-medium">At Store</div>
                            <div className="text-sm text-gray-600">Bring device to our shop</div>
                            <div className="text-sm font-semibold text-green-600 mt-2">Free</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceType('OnSite')}
                            className={`p-4 border-2 rounded-lg transition ${
                                serviceType === 'OnSite'
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-300 hover:border-blue-300'
                            }`}
                        >
                            <div className="text-lg font-medium">On-Site Service</div>
                            <div className="text-sm text-gray-600">We come to you</div>
                            <div className="text-sm font-semibold text-blue-600 mt-2">+${onSiteFee} service fee</div>
                        </button>
                    </div>
                </div>

                {/* Device Information */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Device Information</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Device Model *</label>
                            <input
                                type="text"
                                name="deviceModel"
                                value={formData.deviceModel}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g., iPhone 14 Pro, Dell XPS 15"
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Serial Number (optional)</label>
                            <input
                                type="text"
                                name="serialNumber"
                                value={formData.serialNumber}
                                onChange={handleInputChange}
                                placeholder="Device serial number if available"
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Issue Description *</label>
                            <textarea
                                name="issueDescription"
                                value={formData.issueDescription}
                                onChange={handleInputChange}
                                required
                                rows={4}
                                placeholder="Please describe the issue in detail..."
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Media Upload */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Upload Photos/Videos (optional)</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Images</label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="w-full border rounded-lg px-3 py-2"
                            />
                            {imageFiles.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                    {imageFiles.length} file(s) selected
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Videos</label>
                            <input
                                type="file"
                                accept="video/*"
                                multiple
                                onChange={handleVideoUpload}
                                className="w-full border rounded-lg px-3 py-2"
                            />
                            {videoFiles.length > 0 && (
                                <div className="mt-2 text-sm text-gray-600">
                                    {videoFiles.length} file(s) selected
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scheduling */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Preferred Schedule</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Date *</label>
                            <input
                                type="date"
                                name="preferredDate"
                                value={formData.preferredDate}
                                onChange={handleInputChange}
                                required
                                min={minDate}
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Time Slot *</label>
                            <select
                                name="timeSlot"
                                value={formData.timeSlot}
                                onChange={handleInputChange}
                                required
                                className="w-full border rounded-lg px-3 py-2"
                            >
                                <option value="Morning">{getTimeSlotLabel('Morning')}</option>
                                <option value="Afternoon">{getTimeSlotLabel('Afternoon')}</option>
                                <option value="Evening">{getTimeSlotLabel('Evening')}</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Location (On-Site Only) */}
                {serviceType === 'OnSite' && (
                    <div className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Service Location</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Address *</label>
                                <input
                                    type="text"
                                    name="serviceAddress"
                                    value={formData.serviceAddress}
                                    onChange={handleInputChange}
                                    required={serviceType === 'OnSite'}
                                    placeholder="Full address"
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Location Type *</label>
                                <select
                                    name="locationType"
                                    value={formData.locationType}
                                    onChange={handleInputChange}
                                    required={serviceType === 'OnSite'}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="CustomerHome">Home</option>
                                    <option value="CustomerOffice">Office</option>
                                    <option value="School">School</option>
                                    <option value="Government">Government/UBND</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Additional Notes</label>
                                <textarea
                                    name="locationNotes"
                                    value={formData.locationNotes}
                                    onChange={handleInputChange}
                                    rows={2}
                                    placeholder="Special instructions, landmarks, etc."
                                    className="w-full border rounded-lg px-3 py-2"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Contact Information */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                            <input
                                type="text"
                                name="customerName"
                                value={formData.customerName}
                                onChange={handleInputChange}
                                required
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Phone Number *</label>
                            <input
                                type="tel"
                                name="customerPhone"
                                value={formData.customerPhone}
                                onChange={handleInputChange}
                                required
                                placeholder="0123456789"
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Email *</label>
                            <input
                                type="email"
                                name="customerEmail"
                                value={formData.customerEmail}
                                onChange={handleInputChange}
                                required
                                className="w-full border rounded-lg px-3 py-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Terms and Submit */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <div className="mb-4">
                        <label className="flex items-start">
                            <input
                                type="checkbox"
                                name="acceptedTerms"
                                checked={formData.acceptedTerms}
                                onChange={handleInputChange}
                                required
                                className="mt-1 mr-2"
                            />
                            <span className="text-sm">
                                I accept the{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowTermsModal(true)}
                                    className="text-blue-600 hover:underline"
                                >
                                    Terms and Conditions
                                </button>{' '}
                                for repair service *
                            </span>
                        </label>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <div className="font-semibold mb-2">Estimated Cost Summary:</div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span>Service Fee:</span>
                                <span>${serviceType === 'OnSite' ? onSiteFee.toFixed(2) : '0.00'}</span>
                            </div>
                            <div className="text-xs text-gray-600">
                                * Final cost will be determined after diagnosis
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Booking'}
                    </button>
                </div>
            </form>

            {/* Terms Modal */}
            {showTermsModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl max-h-[80vh] overflow-y-auto p-6">
                        <h2 className="text-2xl font-bold mb-4">Repair Service Terms and Conditions</h2>
                        <div className="space-y-4 text-sm">
                            <p>1. We will diagnose your device and provide a quote before proceeding with repairs.</p>
                            <p>2. On-site service fee is non-refundable.</p>
                            <p>3. Repairs are guaranteed for 30 days from completion date.</p>
                            <p>4. Customer is responsible for backing up all data before repair.</p>
                            <p>5. We are not liable for data loss during repair process.</p>
                            <p>6. Payment is due upon completion of service.</p>
                            <p>7. Unclaimed devices after 30 days will be disposed of.</p>
                        </div>
                        <button
                            onClick={() => setShowTermsModal(false)}
                            className="mt-6 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingPage;
