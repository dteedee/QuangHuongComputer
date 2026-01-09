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

            <div className="container mx-auto px-4 mt-8 font-sans">
                <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/50 p-8 md:p-16 border border-gray-50">
                    <h1 className="text-4xl font-black text-gray-900 mb-12 text-center uppercase italic tracking-tighter">Liên hệ với <span className="text-[#D70018]">Quang Hưởng</span></h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-10">
                            <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter border-l-4 border-[#D70018] pl-4">Thông tin hệ thống</h3>
                            <div className="space-y-4">
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><MapPin /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Trụ sở chính:</b>
                                        <p className="text-gray-900 font-bold">Số 91 Nguyễn Xiển, Thanh Xuân, Hà Nội</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><Phone /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Tổng đài hỗ trợ:</b>
                                        <p className="text-[#D70018] font-black text-2xl tracking-tighter">1800.6321</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><Mail /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Email phản hồi:</b>
                                        <p className="text-gray-900 font-bold">contact@quanghuong.com</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-5 group">
                                    <div className="bg-red-50 p-4 rounded-2xl text-[#D70018] group-hover:bg-[#D70018] group-hover:text-white transition-all shadow-sm"><Clock /></div>
                                    <div>
                                        <b className="block text-gray-400 text-[10px] uppercase font-black tracking-widest mb-1 italic">Thời gian phục vụ:</b>
                                        <p className="text-gray-900 font-bold">8:00 - 21:00 (Tất cả các ngày trong tuần)</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="bg-gray-50/50 p-8 md:p-12 rounded-[32px] border border-gray-100 shadow-inner">
                            <h3 className="text-2xl font-black text-gray-900 mb-8 uppercase italic tracking-tighter">Gửi tin nhắn <span className="text-[#D70018]">tư vấn</span></h3>
                            <form className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Họ tên *</label>
                                        <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D70018] outline-none transition-all focus:ring-4 focus:ring-red-500/5" placeholder="Nguyễn Văn A" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Điện thoại *</label>
                                        <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D70018] outline-none transition-all focus:ring-4 focus:ring-red-500/5" placeholder="09xxx..." />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Email</label>
                                    <input type="email" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D70018] outline-none transition-all focus:ring-4 focus:ring-red-500/5" placeholder="email@example.com" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1 italic">Nội dung</label>
                                    <textarea className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold h-32 focus:border-[#D70018] outline-none transition-all focus:ring-4 focus:ring-red-500/5 resize-none" placeholder="Nội dung cần tư vấn..."></textarea>
                                </div>
                                <button className="w-full bg-[#D70018] hover:bg-[#b50014] text-white font-black py-5 rounded-xl transition-all uppercase shadow-xl shadow-red-500/20 active:scale-95 tracking-widest text-xs">Gửi liên hệ ngay</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

