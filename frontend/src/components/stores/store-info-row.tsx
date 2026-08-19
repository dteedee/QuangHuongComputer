interface StoreInfoRowProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

/** Labeled info row used inside the store detail modal. */
export default function StoreInfoRow({ icon, label, children }: StoreInfoRowProps) {
  return (
    <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold flex items-center gap-1.5 mb-1">
        <span className="text-gray-400">{icon}</span>
        {label}
      </p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}
