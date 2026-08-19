import { Sparkles } from 'lucide-react';

interface CatalogAiSearchBannerProps {
  aiResult: string | null;
  loadingAiResult: boolean;
  searchQuery: string;
}

/** AI natural-language search result banner shown above the catalog. */
export default function CatalogAiSearchBanner({ aiResult, loadingAiResult, searchQuery }: CatalogAiSearchBannerProps) {
  if (!((aiResult || loadingAiResult) && searchQuery)) return null;

  return (
    <div className="mb-6 bg-gradient-to-r from-red-50 to-white p-5 rounded-2xl border border-red-100 shadow-sm animate-fade-in-down relative overflow-hidden">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 text-accent">
          <Sparkles className="w-5 h-5 flex-shrink-0" />
          <h3 className="font-bold text-sm uppercase tracking-wide">Trợ lý AI phân tích</h3>
        </div>
        {loadingAiResult ? (
          <div className="space-y-2">
            <div className="h-4 bg-red-100/50 rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-red-100/50 rounded w-1/2 animate-pulse"></div>
          </div>
        ) : (
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">{aiResult}</p>
        )}
      </div>
      {/* Decorative blob */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-100/30 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
    </div>
  );
}
