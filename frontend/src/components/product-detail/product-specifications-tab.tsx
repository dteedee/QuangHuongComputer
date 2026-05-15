interface Specification {
  [key: string]: string;
}

interface ProductSpecificationsTabProps {
  specifications: Specification;
}

export default function ProductSpecificationsTab({ specifications }: ProductSpecificationsTabProps) {
  const entries = Object.entries(specifications);

  return (
    <div className="max-w-3xl">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Thong so ky thuat</h3>
      {entries.length > 0 ? (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          {entries.map(([key, value], index) => (
            <div
              key={key}
              className={`grid grid-cols-3 gap-4 py-3.5 px-5 ${
                index % 2 === 0 ? 'bg-gray-50/80' : 'bg-white'
              }`}
            >
              <div className="text-gray-600 font-medium text-sm">{key}</div>
              <div className="col-span-2 text-gray-900 font-semibold text-sm">{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 italic bg-white p-6 rounded-xl border border-gray-100">
          Chua co thong so ky thuat
        </p>
      )}
    </div>
  );
}
