import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

export const ContactPage = () => {
    return (
        <div className="bg-gray-50 min-h-screen pb-10">
            <div className="bg-white py-3 border-b border-gray-200">
                <div className="container mx-auto px-4 text-sm text-gray-500 flex items-center gap-1">
                    <Link to="/" className="hover:text-[#D70018]">Trang chủ</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">Liên hệ</span>
                </div>
            </div>

            <div className="container mx-auto px-4 mt-8">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center uppercase text-[#D70018]">Liên hệ với chúng tôi</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Info */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-gray-800 border-l-4 border-[#D70018] pl-3">Thông tin liên hệ</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="bg-red-50 p-2 rounded text-[#D70018]"><MapPin /></div>
                                    <div>
                                        <b className="block text-gray-900">Địa chỉ:</b>
                                        <p className="text-gray-600">Số 91 Nguyễn Xiển, Thanh Xuân, Hà Nội</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-red-50 p-2 rounded text-[#D70018]"><Phone /></div>
                                    <div>
                                        <b className="block text-gray-900">Hotline:</b>
                                        <p className="text-[#D70018] font-bold text-lg">1800.6321</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-red-50 p-2 rounded text-[#D70018]"><Mail /></div>
                                    <div>
                                        <b className="block text-gray-900">Email:</b>
                                        <p className="text-gray-600">contact@minhancomputer.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-red-50 p-2 rounded text-[#D70018]"><Clock /></div>
                                    <div>
                                        <b className="block text-gray-900">Giờ làm việc:</b>
                                        <p className="text-gray-600">8:00 - 21:00 (Tất cả các ngày trong tuần)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="bg-gray-50 p-6 rounded-lg">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Gửi tin nhắn cho chúng tôi</h3>
                            <form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
                                        <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-[#D70018] outline-none" placeholder="Nguyễn Văn A" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại *</label>
                                        <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-[#D70018] outline-none" placeholder="09xxx..." />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-[#D70018] outline-none" placeholder="email@example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung</label>
                                    <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-32 focus:border-[#D70018] outline-none" placeholder="Nội dung cần tư vấn..."></textarea>
                                </div>
                                <button className="w-full bg-[#D70018] text-white font-bold py-3 rounded hover:bg-red-700 transition uppercase shadow-lg">Gửi liên hệ</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
