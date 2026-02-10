import { useState } from 'react';
import {
    Layout, Image as ImageIcon, FileText, Share2,
    Plus, Search, Edit3, Trash2, Globe, Eye,
    Sparkles, RefreshCcw, Zap, X, Check, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi, type Post, type Page } from '../../api/content';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export const CMSPortal = () => {
    const [activeTab, setActiveTab] = useState('Pages');
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Post | Page | null>(null);
    const [editorContent, setEditorContent] = useState('');
    const queryClient = useQueryClient();

    const { data: posts = [], isLoading: postsLoading } = useQuery({
        queryKey: ['admin-posts'],
        queryFn: () => contentApi.admin.getPosts(),
    });

    const { data: pages = [], isLoading: pagesLoading } = useQuery({
        queryKey: ['admin-pages'],
        queryFn: contentApi.admin.getPages,
    });

    const createMutation = useMutation<any, Error, any>({
        mutationFn: (data: any) => activeTab === 'Pages' ? contentApi.admin.createPage(data) : contentApi.admin.createPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeTab === 'Pages' ? 'admin-pages' : 'admin-posts'] });
            toast.success('Đã tạo nội dung!');
            setIsPostModalOpen(false);
        }
    });

    const updateMutation = useMutation<any, Error, { id: string, data: any }>({
        mutationFn: ({ id, data }: { id: string, data: any }) => activeTab === 'Pages' ? contentApi.admin.updatePage(id, data) : contentApi.admin.updatePost(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [activeTab === 'Pages' ? 'admin-pages' : 'admin-posts'] });
            toast.success('Đã cập nhật!');
            setIsPostModalOpen(false);
            setEditingItem(null);
        }
    });

    const deleteMutation = useMutation<any, Error, string>({
        mutationFn: (id: string) => activeTab === 'Pages' ? Promise.reject('Không thể xóa trang hệ thống') : contentApi.admin.deletePost(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            toast.success('Đã xóa!');
        },
        onError: (err) => toast.error(String(err))
    });

    const seedMutation = useMutation({
        mutationFn: contentApi.admin.seed,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            queryClient.invalidateQueries({ queryKey: ['admin-pages'] });
            toast.success('Đã khởi tạo dữ liệu mẫu!');
        }
    });

    const handleOpenModal = (item: Post | Page | null = null) => {
        setEditingItem(item);
        setEditorContent(item?.content || (item as Post)?.content || '');
        setIsPostModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        let data: any = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            content: editorContent,
            body: editorContent,
            isPublished: formData.get('isPublished') === 'true'
        };

        if (activeTab === 'Pages') {
            data.type = formData.get('type');
        } else {
            data.type = formData.get('type');
        }

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const filteredContent = activeTab === 'Pages'
        ? pages
        : posts.filter(p => {
            if (activeTab === 'Blog Posts') return p.type === 'Article';
            if (activeTab === 'Banners') return p.type === 'Banner';
            return true;
        });

    const isLoading = activeTab === 'Pages' ? pagesLoading : postsLoading;

    return (
        <div className="space-y-10 pb-20 animate-fade-in admin-area">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-3">
                        Quản trị <span className="text-[#D70018]">Nội dung</span>
                    </h1>
                    <p className="text-gray-700 font-black uppercase text-xs tracking-widest flex items-center gap-2">
                        Quản lý giao diện, bài viết và tài nguyên marketing
                    </p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => seedMutation.mutate()}
                        className="flex items-center gap-3 px-6 py-4 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl active:scale-95"
                    >
                        <RefreshCcw size={20} className={seedMutation.isPending ? 'animate-spin' : ''} />
                        Khởi tạo dữ liệu
                    </button>
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                    >
                        <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                        Tạo nội dung mới
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Sidebar Tabs */}
                <div className="lg:col-span-1 space-y-3">
                    {[
                        { name: 'Pages', label: 'Trang tĩnh', icon: <Layout size={20} /> },
                        { name: 'Blog Posts', label: 'Bài viết Blog', icon: <FileText size={20} /> },
                        { name: 'Banners', label: 'Banner quảng cáo', icon: <ImageIcon size={20} /> },
                        { name: 'Media', label: 'Thư viện Media', icon: <Share2 size={20} /> },
                        { name: 'SEO', label: 'Cấu hình SEO', icon: <Globe size={20} /> }
                    ].map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`w-full flex justify-between items-center px-6 py-5 rounded-[1.5rem] transition-all border-2 duration-300 shadow-sm ${activeTab === tab.name
                                ? 'bg-gray-950 border-gray-950 text-white translate-x-3 shadow-xl'
                                : 'bg-white border-gray-50 text-gray-400 hover:text-gray-900 hover:border-gray-200'
                                }`}
                        >
                            <span className="flex items-center gap-5 font-black uppercase text-xs tracking-tight italic">
                                <span>{tab.icon}</span>
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content List */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="premium-card overflow-hidden border-2 bg-white">
                        <div className="p-10 border-b-2 border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/30">
                            <h3 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">
                                Danh sách: <span className="text-[#D70018]">{activeTab}</span>
                            </h3>
                        </div>
                        <div className="divide-y-2 divide-gray-50">
                            {isLoading ? (
                                <div className="p-24 text-center">
                                    <Loader2 className="mx-auto animate-spin text-[#D70018]" size={48} />
                                    <p className="mt-4 text-gray-950 font-black uppercase italic tracking-widest text-sm">Đang tải dữ liệu...</p>
                                </div>
                            ) : filteredContent.length === 0 ? (
                                <div className="p-24 text-center">
                                    <Sparkles className="mx-auto text-gray-100 mb-6" size={80} />
                                    <p className="text-gray-400 font-black uppercase text-sm tracking-widest italic font-sans px-10">Mục bài viết này hiện đang trống. Hãy bắt đầu tạo nội dung đầu tiên của bạn!</p>
                                </div>
                            ) : filteredContent.map((item) => (
                                <div key={item.id} className="p-10 flex items-start md:items-center justify-between hover:bg-gray-50 transition-all group cursor-pointer">
                                    <div className="flex items-start md:items-center gap-8">
                                        <div className="w-20 h-20 rounded-[1.5rem] bg-gray-950 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            {item.type === 'Article' ? <FileText size={32} /> : <Layout size={32} />}
                                        </div>
                                        <div className="max-w-xl">
                                            <h4 className="font-black text-gray-950 text-xl group-hover:text-[#D70018] transition-colors uppercase italic tracking-tight leading-tight">{item.title}</h4>
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest border px-2 py-0.5 rounded-lg border-gray-100">#{item.type}</span>
                                                <span className="text-[10px] font-black text-[#D70018] uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 italic">Slug: /{item.slug}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col md:flex-row items-end md:items-center gap-6">
                                        <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic border-2 shadow-sm ${item.isPublished ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                            {item.isPublished ? 'Live' : 'Bản nháp'}
                                        </span>
                                        <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            <button onClick={() => handleOpenModal(item)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all shadow-md active:scale-90"><Edit3 size={20} /></button>
                                            <button onClick={() => { if (window.confirm('Xác nhận xóa nội dung này?')) deleteMutation.mutate(item.id) }} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-gray-100 text-gray-400 hover:text-red-600 hover:border-red-200 transition-all shadow-md active:scale-90"><Trash2 size={20} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Post Modal */}
            <AnimatePresence>
                {isPostModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPostModalOpen(false)} className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" />
                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden border-4 border-gray-100">
                            <div className="p-10 border-b-2 border-gray-50 flex items-center justify-between bg-gray-50/30">
                                <div>
                                    <h2 className="text-3xl font-black text-gray-950 uppercase italic tracking-tighter">
                                        {editingItem ? 'Cấu hình' : 'Thiết kế'} <span className="text-[#D70018]">Nội dung</span>
                                    </h2>
                                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">Hệ thống quản trị nội dung CMS</p>
                                </div>
                                <button onClick={() => setIsPostModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border-2 border-gray-100 text-gray-400 hover:bg-red-50 hover:text-[#D70018] hover:border-red-100 transition-all shadow-sm"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Tiêu đề bài viết / trang</label>
                                        <input name="title" defaultValue={editingItem?.title} required className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-base font-bold text-gray-950 focus:outline-none focus:border-[#D70018] shadow-sm transition-all" placeholder="Nhập tiêu đề hấp dẫn..." />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Đường dẫn tĩnh (Slug)</label>
                                        <input name="slug" defaultValue={editingItem?.slug} required className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-black text-[#D70018] focus:outline-none focus:border-[#D70018] shadow-sm font-mono" placeholder="my-awesome-post" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Phân loại</label>
                                        <select name="type" defaultValue={editingItem?.type || (activeTab === 'Pages' ? 'Custom' : 'Article')} className="w-full px-6 py-5 bg-white border-2 border-gray-100 rounded-2xl text-sm font-black text-gray-950 focus:outline-none focus:border-[#D70018] appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%23000000%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:24px] bg-[right_1.5rem_center] bg-no-repeat shadow-sm">
                                            {activeTab === 'Pages' ? (
                                                <>
                                                    <option value="Custom">Custom Page</option>
                                                    <option value="About">Chính sách chung</option>
                                                    <option value="Warranty">Bảo hành</option>
                                                    <option value="Returns">Đổi trả</option>
                                                    <option value="Shipping">Vận chuyển</option>
                                                </>
                                            ) : (
                                                <>
                                                    <option value="Article">Bài viết Blog</option>
                                                    <option value="Promotion">Khuyến mãi</option>
                                                    <option value="Banner">Banner quảng cáo</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-3">
                                        <label className="text-xs font-black text-gray-950 uppercase tracking-widest ml-1">Nội dung chi tiết (Markdown / HTML)</label>
                                        <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden shadow-sm focus-within:border-[#D70018] transition-all">
                                            <ReactQuill
                                                theme="snow"
                                                value={editorContent}
                                                onChange={setEditorContent}
                                                modules={{
                                                    toolbar: [
                                                        ['bold', 'italic', 'underline', 'strike'],
                                                        [{ 'color': [] }, { 'background': [] }],
                                                        [{ 'header': [1, 2, 3, false] }],
                                                        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                                        ['link', 'image'],
                                                        ['clean']
                                                    ]
                                                }}
                                                className="h-64 mb-12"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 p-6 bg-gray-50 rounded-2xl border-2 border-gray-100 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-gray-900 uppercase tracking-widest">Trạng thái xuất bản</span>
                                            <span className="text-[10px] font-bold text-gray-500 uppercase mt-1 italic">Nội dung sẽ được hiển thị ngay nếu chọn "Live"</span>
                                        </div>
                                        <select name="isPublished" defaultValue={editingItem?.isPublished ? 'true' : 'false'} className="px-8 py-3 bg-white border-2 border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-950 focus:border-[#D70018] outline-none shadow-sm">
                                            <option value="true">LIVE</option>
                                            <option value="false">DRAFT</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-6 pt-6 sticky bottom-0 bg-white">
                                    <button type="button" onClick={() => setIsPostModalOpen(false)} className="flex-1 py-5 text-xs font-black uppercase tracking-widest bg-gray-100 text-gray-500 rounded-2xl hover:bg-gray-200 transition-all font-sans">Hủy thao tác</button>
                                    <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] flex items-center justify-center gap-4 py-5 text-xs font-black uppercase tracking-widest bg-[#D70018] text-white rounded-2xl shadow-2xl shadow-red-500/30 hover:bg-[#b50014] transition-all active:scale-95 disabled:opacity-50">
                                        {createMutation.isPending || updateMutation.isPending ? <Loader2 size={24} className="animate-spin" /> : <Check size={24} />}
                                        Xác nhận lưu nội dung
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
