interface ProductDescriptionTabProps {
  description?: string;
}

export default function ProductDescriptionTab({ description }: ProductDescriptionTabProps) {
  return (
    <div className="prose max-w-none text-gray-700">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Giới thiệu sản phẩm</h3>
      <div className="bg-white p-6 rounded-xl border border-gray-100">
        <p className="leading-relaxed whitespace-pre-line text-sm text-gray-700">
          {description || 'Chưa có mô tả sản phẩm.'}
        </p>
      </div>
    </div>
  );
}
