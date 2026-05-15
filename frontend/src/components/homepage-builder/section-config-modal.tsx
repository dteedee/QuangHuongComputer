/**
 * Modal dialog for editing a homepage section's visual configuration.
 * Hosts tab-switching between the config form and a live preview.
 */
import React, { useState } from 'react';
import { Save, Loader2, X } from 'lucide-react';
import { type HomepageSection } from '../../api/content';
import { getSectionConfigForm } from './section-config-forms';
import { SectionPreview } from './section-preview';

export interface SaveMeta { title: string; cssClass: string; }

interface ConfigModalProps {
    section: HomepageSection;
    onSave: (id: string, config: Record<string, unknown>, meta: SaveMeta) => Promise<void>;
    onClose: () => void;
}

function parseConfig(raw: string | null): Record<string, unknown> {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
}

export const ConfigModal: React.FC<ConfigModalProps> = ({ section, onSave, onClose }) => {
    const [config, setConfig] = useState<Record<string, unknown>>(() => parseConfig(section.configuration));
    const [title, setTitle] = useState(section.title);
    const [cssClass, setCssClass] = useState(section.cssClass ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

    const ConfigForm = getSectionConfigForm(section.sectionType);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(section.id, config, { title, cssClass });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <header className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-base font-semibold text-gray-800 uppercase tracking-tight">
                            Configure: <span className="text-blue-600">{section.sectionType.replace(/_/g, ' ')}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">Visual section editor</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        <X size={20} />
                    </button>
                </header>

                {/* Meta fields */}
                <div className="px-6 py-3 bg-gray-50 border-b flex gap-4 shrink-0">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Section Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">CSS Class</label>
                        <input
                            value={cssClass}
                            onChange={e => setCssClass(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="optional"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b shrink-0">
                    {(['config', 'preview'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {tab === 'config' ? 'Configure' : 'Preview'}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'config' ? (
                        <ConfigForm config={config} onChange={setConfig} />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-400 font-medium">Visual approximation of how this section appears on the homepage.</p>
                            <SectionPreview sectionType={section.sectionType} config={config} title={title} />
                            <details className="mt-4">
                                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View raw JSON</summary>
                                <pre className="mt-2 text-[10px] font-mono bg-gray-50 border border-gray-100 rounded-lg p-3 overflow-auto max-h-40 text-gray-600">
                                    {JSON.stringify(config, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <footer className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition text-sm">
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold shadow transition text-sm flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isSaving ? 'Saving...' : 'Save to Server'}
                    </button>
                </footer>
            </div>
        </div>
    );
};
