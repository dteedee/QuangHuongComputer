import { useState, useEffect } from 'react';
import { getAddresses } from '../api/ai';

interface SavedAddress {
  id: string;
  label?: string;
  fullName?: string;
  phone?: string;
  streetAddress?: string;
  ward?: string;
  district?: string;
  province?: string;
  isDefault?: boolean;
}

interface AddressBookSelectorProps {
  onSelect: (address: SavedAddress) => void;
}

export default function AddressBookSelector({ onSelect }: AddressBookSelectorProps) {
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    getAddresses()
      .then(data => setAddresses(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  if (addresses.length === 0) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-blue-600 text-sm hover:underline font-medium"
      >
        📋 Chọn từ sổ địa chỉ ({addresses.length})
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-sm bg-white">
          {addresses.map(addr => (
            <button
              key={addr.id}
              type="button"
              onClick={() => { onSelect(addr); setOpen(false); }}
              className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors"
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-medium text-sm text-gray-900">
                  {addr.label || 'Địa chỉ'} {addr.isDefault && '⭐'}
                </span>
                <span className="text-xs text-gray-500">{addr.phone}</span>
              </div>
              <p className="text-xs text-gray-600 line-clamp-1">
                {[addr.fullName, addr.streetAddress, addr.ward, addr.district, addr.province]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
