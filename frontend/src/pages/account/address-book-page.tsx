import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from '../../api/ai';
import toast from 'react-hot-toast';

const MAX_ADDRESSES = 10;

interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  streetAddress: string;
  ward: string;
  district: string;
  province: string;
  isDefault: boolean;
}

const emptyForm = {
  label: '',
  fullName: '',
  phone: '',
  streetAddress: '',
  ward: '',
  district: '',
  province: '',
};

export default function AddressBookPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const data = await getAddresses();
      setAddresses(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Không thể tải sổ địa chỉ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      toast.error(`Tối đa ${MAX_ADDRESSES} địa chỉ`);
      return;
    }
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setForm({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      streetAddress: addr.streetAddress,
      ward: addr.ward,
      district: addr.district,
      province: addr.province,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateAddress(editingId, form);
        toast.success('Đã cập nhật địa chỉ');
      } else {
        await addAddress(form);
        toast.success('Đã thêm địa chỉ mới');
      }
      setShowForm(false);
      await load();
    } catch {
      toast.error('Lưu địa chỉ thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa địa chỉ này?')) return;
    try {
      await deleteAddress(id);
      toast.success('Đã xóa địa chỉ');
      await load();
    } catch {
      toast.error('Xóa địa chỉ thất bại');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAddress(id);
      toast.success('Đã đặt làm địa chỉ mặc định');
      await load();
    } catch {
      toast.error('Cập nhật thất bại');
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-400 transition-colors';

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 mb-1 block">
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Sổ địa chỉ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{addresses.length}/{MAX_ADDRESSES} địa chỉ</p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Thêm địa chỉ
        </button>
      </div>

      {addresses.length >= MAX_ADDRESSES && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          Bạn đã đạt giới hạn {MAX_ADDRESSES} địa chỉ. Xóa bớt để thêm mới.
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Đang tải...</div>
      ) : addresses.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <p className="text-gray-500 font-medium">Chưa có địa chỉ nào</p>
          <p className="text-sm text-gray-400 mt-1">Thêm địa chỉ để thanh toán nhanh hơn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map(addr => (
            <div key={addr.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-900">{addr.label || 'Địa chỉ'}</span>
                    {addr.isDefault && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{addr.fullName} — {addr.phone}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {[addr.streetAddress, addr.ward, addr.district, addr.province].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefault(addr.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mặc định
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(addr)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                {editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <input
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                placeholder="Nhãn (VD: Nhà, Công ty)"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Họ và tên *"
                  className={inputCls}
                />
                <input
                  required
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="Số điện thoại *"
                  className={inputCls}
                />
              </div>
              <input
                required
                value={form.streetAddress}
                onChange={e => setForm(f => ({ ...f, streetAddress: e.target.value }))}
                placeholder="Địa chỉ chi tiết *"
                className={inputCls}
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={form.ward}
                  onChange={e => setForm(f => ({ ...f, ward: e.target.value }))}
                  placeholder="Phường/Xã"
                  className={inputCls}
                />
                <input
                  value={form.district}
                  onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                  placeholder="Quận/Huyện"
                  className={inputCls}
                />
                <input
                  required
                  value={form.province}
                  onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                  placeholder="Tỉnh/TP *"
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Đang lưu...' : 'Lưu địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
