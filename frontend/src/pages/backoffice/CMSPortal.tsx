import { useState } from 'react';
import {
    Layout, Image as ImageIcon, FileText, Share2,
    Plus, Search, Edit3, Trash2, Globe, Eye
} from 'lucide-react';

export const CMSPortal = () => {
    const [activeTab, setActiveTab] = useState('Pages');

    const content = [
        { title: 'Home Page Hero', type: 'Section', author: 'Marketing', status: 'Published', date: '2024-03-20' },
        { title: 'Spring Promotion 2024', type: 'Banner', author: 'Admin', status: 'Draft', date: '2024-03-25' },
        { title: 'Return Policy Update', type: 'Page', author: 'Legal', status: 'Published', date: '2024-03-15' },
        { title: 'New Arrival: RTX 5090', type: 'Product Post', author: 'Sales', status: 'Scheduled', date: '2024-04-01' },
    ];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Content Management</h1>
                    <p className="text-slate-400 mt-1">Manage website content, blogs, and marketing assets.</p>
                </div>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95">
                    <Plus size={20} />
                    New Content
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="lg:col-span-1 space-y-2">
                    {['Pages', 'Blog Posts', 'Banners', 'Media Library', 'SEO Settings'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`w-full flex justify-between items-center px-4 py-3 rounded-2xl transition-all font-bold text-sm ${activeTab === tab ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                                }`}
                        >
                            <span className="flex items-center gap-3">
                                {tab === 'Pages' && <Layout size={18} />}
                                {tab === 'Blog Posts' && <FileText size={18} />}
                                {tab === 'Banners' && <ImageIcon size={18} />}
                                {tab === 'Media Library' && <Share2 size={18} />}
                                {tab === 'SEO Settings' && <Globe size={18} />}
                                {tab}
                            </span>
                            {tab === 'Blog Posts' && <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">3</span>}
                        </button>
                    ))}
                </div>

                {/* Content List */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">{activeTab}</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search content..."
                                    className="pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {content.map((item, i) => (
                                <div key={i} className="p-6 flex items-center justify-between hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                                            {item.type === 'Banner' ? <ImageIcon size={24} /> : <FileText size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{item.title}</h4>
                                            <p className="text-xs text-slate-500">By {item.author} • {item.type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-sm">
                                        <div className="hidden sm:block">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-bold tracking-widest ${item.status === 'Published' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    item.status === 'Draft' ? 'bg-slate-700 text-slate-300' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 text-slate-400 hover:text-white transition-colors"><Eye size={18} /></button>
                                            <button className="p-2 text-slate-400 hover:text-white transition-colors"><Edit3 size={18} /></button>
                                            <button className="p-2 text-rose-500/50 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-blue-500/20 p-8 rounded-3xl">
                            <h4 className="text-white font-bold mb-2">Automated SEO</h4>
                            <p className="text-slate-400 text-sm mb-6">Our AI is currently optimizing 12 product descriptions for better search rankings.</p>
                            <button className="text-blue-400 font-bold text-sm hover:underline">Review AI Suggestions</button>
                        </div>
                        <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-3xl">
                            <h4 className="text-white font-bold mb-2">Social Sync</h4>
                            <p className="text-slate-400 text-sm mb-6">Connect your social media accounts to auto-post new content.</p>
                            <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all">Connect Accounts</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

