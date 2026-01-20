import { useState } from 'react';
import { CrudListPage } from '../../../components/crud/CrudListPage';
import { CrudFormModal } from '../../../components/crud/CrudFormModal';
import { ActionButtons } from '../../../components/crud/ActionButtons';
import { SearchInput } from '../../../components/crud/SearchInput';
import { Column } from '../../../components/crud/DataTable';
import { SupplierForm } from '../../../components/inventory/SupplierForm';
import { useCrudList } from '../../../hooks/useCrudList';
import { useCrudCreate } from '../../../hooks/useCrudCreate';
import { useCrudUpdate } from '../../../hooks/useCrudUpdate';
import { useCrudDelete } from '../../../hooks/useCrudDelete';
import { usePermissions } from '../../../hooks/usePermissions';
import { inventoryApi, Supplier } from '../../../api/inventory';
import { CreateSupplierInput, UpdateSupplierInput } from '../../../schemas/supplierSchema';
import { CheckCircle, XCircle } from 'lucide-react';

export function SuppliersPage() {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Permissions
  const canCreate = hasPermission('inventory.suppliers.create');
  const canEdit = hasPermission('inventory.suppliers.update');
  const canDelete = hasPermission('inventory.suppliers.delete');

  // List hook
  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    search,
    handlePageChange,
    handleSearch,
    handleSort,
    refetch,
  } = useCrudList({
    queryKey: ['suppliers'],
    fetchFn: inventoryApi.getSuppliers,
    initialPageSize: 20,
  });

  // Create hook
  const { create, isCreating } = useCrudCreate({
    mutationKey: ['createSupplier'],
    createFn: inventoryApi.createSupplier,
    invalidateKeys: [['suppliers']],
    successMessage: 'Supplier created successfully',
    onSuccess: () => {
      setIsModalOpen(false);
      refetch();
    },
  });

  // Update hook
  const { update, isUpdating } = useCrudUpdate({
    mutationKey: ['updateSupplier'],
    updateFn: inventoryApi.updateSupplier,
    invalidateKeys: [['suppliers']],
    successMessage: 'Supplier updated successfully',
    onSuccess: () => {
      setIsModalOpen(false);
      setEditingSupplier(null);
      refetch();
    },
  });

  // Delete hook
  const { deleteWithConfirm, isDeleting } = useCrudDelete({
    mutationKey: ['deleteSupplier'],
    deleteFn: inventoryApi.deleteSupplier,
    invalidateKeys: [['suppliers']],
    successMessage: 'Supplier deleted successfully',
    confirmMessage: 'Are you sure you want to delete this supplier? This action cannot be undone.',
    onSuccess: () => {
      refetch();
    },
  });

  // Table columns
  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      sortable: true,
      render: (supplier) => (
        <div className="font-medium text-gray-900">{supplier.name}</div>
      ),
    },
    {
      key: 'contactPerson',
      header: 'Contact Person',
      sortable: true,
      render: (supplier) => (
        <div className="text-gray-700">{supplier.contactPerson}</div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (supplier) => (
        <a
          href={`mailto:${supplier.email}`}
          className="text-blue-600 hover:text-blue-800 hover:underline"
        >
          {supplier.email}
        </a>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      sortable: true,
      render: (supplier) => (
        <a
          href={`tel:${supplier.phone}`}
          className="text-gray-700 hover:text-blue-600"
        >
          {supplier.phone}
        </a>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      sortable: true,
      render: (supplier) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
            supplier.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {supplier.isActive ? (
            <>
              <CheckCircle size={14} />
              Active
            </>
          ) : (
            <>
              <XCircle size={14} />
              Inactive
            </>
          )}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      sortable: true,
      render: (supplier) => (
        <div className="text-sm text-gray-500">
          {new Date(supplier.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  // Handlers
  const handleAdd = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    deleteWithConfirm(supplier.id);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleFormSubmit = async (data: CreateSupplierInput | UpdateSupplierInput) => {
    if (editingSupplier) {
      update({ id: editingSupplier.id, data: data as UpdateSupplierInput });
    } else {
      create(data as CreateSupplierInput);
    }
  };

  // Action buttons renderer
  const renderActions = (supplier: Supplier) => (
    <ActionButtons
      onEdit={canEdit ? () => handleEdit(supplier) : undefined}
      onDelete={canDelete ? () => handleDelete(supplier) : undefined}
      canEdit={canEdit}
      canDelete={canDelete}
    />
  );

  // Filters
  const filters = (
    <div className="flex items-center gap-4">
      <div className="flex-1 max-w-md">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Search by name or email..."
        />
      </div>
    </div>
  );

  return (
    <>
      <CrudListPage
        title="Suppliers"
        subtitle="Manage your suppliers and their contact information"
        columns={columns}
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onSort={handleSort}
        isLoading={isLoading}
        onAdd={canCreate ? handleAdd : undefined}
        actions={renderActions}
        filters={filters}
        addButtonLabel="Add Supplier"
        canAdd={canCreate}
      />

      {/* Create/Edit Modal */}
      <CrudFormModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        onSubmit={handleFormSubmit}
        isSubmitting={isCreating || isUpdating}
        submitLabel={editingSupplier ? 'Update' : 'Create'}
      >
        <SupplierForm
          initialData={editingSupplier || undefined}
          onSubmit={handleFormSubmit}
          isSubmitting={isCreating || isUpdating}
        />
      </CrudFormModal>
    </>
  );
}
