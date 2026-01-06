import { useState } from 'react';
import {
    Layout, Image as ImageIcon, FileText, Share2,
    Plus, Search, Edit3, Trash2, Globe, Eye,
    Sparkles, RefreshCcw, Zap, X, Check, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentApi, Post } from '../../api/content';
import toast from 'react-hot-toast';

export const CMSPortal = () => {
    const [activeTab, setActiveTab] = useState('Pages');
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const queryClient = useQueryClient();

    const { data: posts = [], isLoading } = useQuery({
        queryKey: ['admin-posts'],
        queryFn: contentApi.admin.getPosts,
    });

    const createMutation = useMutation({
        mutationFn: (data: any) => contentApi.admin.createPost(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            toast.success('Đã tạo nội dung!');
            setIsPostModalOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: any }) => contentApi.admin.updatePost(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            toast.success('Đã cập nhật!');
            setIsPostModalOpen(false);
            setEditingPost(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => contentApi.admin.deletePost(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-posts'] });
            toast.success('Đã xóa!');
        }
    });

    const handleOpenModal = (post: Post | null = null) => {
        setEditingPost(post);
        setIsPostModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            body: formData.get('body'),
            type: formData.get('type'),
            isPublished: formData.get('isPublished') === 'true'
        };

        if (editingPost) {
            updateMutation.mutate({ id: editingPost.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const filteredContent = posts.filter(p => {
        if (activeTab === 'Pages') return p.type === 'Page';
        if (activeTab === 'Blog Posts') return p.type === 'Article';
        if (activeTab === 'Banners') return p.type === 'Banner';
        return true;
    });

    return (
        <div className="space-y-10 pb-20 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">
                        Quản trị <span className="text-[#D70018]">Nội dung</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2">
                        Quản lý giao diện, bài viết và tài nguyên marketing
                    </p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-3 px-8 py-4 bg-[#D70018] hover:bg-[#b50014] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 group"
                >
                    <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                    Tạo nội dung mới
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                <div className="lg:col-span-1 space-y-2">
                    {[
                        { name: 'Pages', label: 'Trang tĩnh', icon: <Layout size={18} /> },
                        { name: 'Blog Posts', label: 'Bài viết Blog', icon: <FileText size={18} /> },
                        { name: 'Banners', label: 'Banner quảng cáo', icon: <ImageIcon size={18} /> },
                        { name: 'Media', label: 'Thư viện Media', icon: <Share2 size={18} /> },
                        { name: 'SEO', label: 'Cấu hình SEO', icon: <Globe size={18} /> }
                    ].map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`w-full flex justify-between items-center px-5 py-4 rounded-2xl transition-all border duration-300 ${activeTab === tab.name
                                ? 'bg-white border-gray-100 text-[#D70018] shadow-lg shadow-gray-200/50 translate-x-2'
                                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <span className="flex items-center gap-4 font-black uppercase text-[11px] tracking-tight">
                                <span className={`${activeTab === tab.name ? 'text-[#D70018]' : 'text-gray-300'}`}>{tab.icon}</span>
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-3 space-y-8">
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="premium-card overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 backdrop-blur-sm">
                            <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter">
                                Danh sách: <span className="text-[#D70018]">{activeTab}</span>
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-50">
                            {isLoading ? (
                                <div className="p-20 text-center"><Loader2 className="mx-auto animate-spin text-[#D70018]" /></div>
                            ) : filteredContent.length === 0 ? (
                                <div className="p-20 text-center text-gray-300 font-black uppercase text-[10px] tracking-widest">Không có nội dung nào trong mục này.</div>
                            ) : filteredContent.map((item) => (
                                <div key={item.id} className="p-8 flex items-center justify-between hover:bg-gray-50/50 transition-all group">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-300">
                                            {item.type === 'Article' ? <FileText size={24} /> : <Layout size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-gray-800 text-sm group-hover:text-[#D70018] transition-colors uppercase italic tracking-tight">{item.title}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 flex items-center gap-2">
                                                <span className="text-[#D70018]/50">#{item.type}</span>
                                                <span className="w-1 h-1 bg-gray-300 rounded-full" />
                                                Slug: {item.slug}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic border-2 ${item.isPublished ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                                            {item.isPublished ? 'Published' : 'Draft'}
                                        </span>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button onClick={() => handleOpenModal(item)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-blue-500 transition-all shadow-sm"><Edit3 size={18} /></button>
                                            <button onClick={() => { if (window.confirm('Delete?')) deleteMutation.mutate(item.id) }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-600 transition-all shadow-sm"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Post Modal */}
            <AnimatePresence>
                {isPostModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPostModalOpen(false)} className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter">
                                    {editingPost ? 'Cập nhật' : 'Tạo'} <span className="text-[#D70018]">Nội dung</span>
                                </h2>
                                <button onClick={() => setIsPostModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-[#D70018]"><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tiêu đề</label>
                                        <input name="title" defaultValue={editingPost?.title} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug</label>
                                        <input name="slug" defaultValue={editingPost?.slug} required className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loại nội dung</label>
                                        <select name="type" defaultValue={editingPost?.type || 'Article'} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold">
                                            <option value="Article">Bài viết Blog</option>
                                            <option value="Page">Trang tĩnh</option>
                                            <option value="Banner">Banner</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nội dung</label>
                                        <textarea name="body" defaultValue={editingPost?.body} rows={6} className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold resize-none" />
                                    </div>
                                    <div className="space-y-2 flex items-center gap-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Xuất bản ngay?</label>
                                        <select name="isPublished" defaultValue={editingPost?.isPublished ? 'true' : 'false'} className="px-5 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold">
                                            <option value="true">Có</option>
                                            <option value="false">Không</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsPostModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase bg-gray-50 rounded-2xl">Hủy</button>
                                    <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-[2] py-4 text-[10px] font-black uppercase bg-[#D70018] text-white rounded-2xl shadow-xl shadow-red-500/20">
                                        {createMutation.isPending || updateMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        Lưu nội dung
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
