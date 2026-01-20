import { useForm } from 'react-hook-form';
import { createSupplierSchema, updateSupplierSchema, CreateSupplierInput, UpdateSupplierInput } from '../../schemas/supplierSchema';
import { Supplier } from '../../api/inventory';

export interface SupplierFormProps {
  initialData?: Supplier;
  onSubmit: (data: CreateSupplierInput | UpdateSupplierInput) => Promise<void>;
  isSubmitting?: boolean;
}

export function SupplierForm({ initialData, onSubmit, isSubmitting = false }: SupplierFormProps) {
  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<CreateSupplierInput | UpdateSupplierInput>({
    defaultValues: initialData
      ? {
          name: initialData.name,
          contactPerson: initialData.contactPerson,
          email: initialData.email,
          phone: initialData.phone,
          address: initialData.address || '',
        }
      : {
          name: '',
          contactPerson: '',
          email: '',
          phone: '',
          address: '',
        },
  });

  const handleFormSubmit = async (data: CreateSupplierInput | UpdateSupplierInput) => {
    try {
      // Validate with Zod schema
      const schema = isEditMode ? updateSupplierSchema : createSupplierSchema;
      const validatedData = schema.parse(data);
      await onSubmit(validatedData);
    } catch (error: any) {
      // Handle Zod validation errors
      if (error.errors) {
        error.errors.forEach((err: any) => {
          setError(err.path[0] as any, {
            type: 'manual',
            message: err.message,
          });
        });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Supplier Name
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className={`mt-1 block w-full border ${
            errors.name ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Enter supplier name"
          disabled={isSubmitting}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Contact Person Field */}
      <div>
        <label htmlFor="contactPerson" className="block text-sm font-medium text-gray-700">
          Contact Person
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          id="contactPerson"
          {...register('contactPerson')}
          className={`mt-1 block w-full border ${
            errors.contactPerson ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Enter contact person name"
          disabled={isSubmitting}
        />
        {errors.contactPerson && (
          <p className="mt-1 text-sm text-red-600">{errors.contactPerson.message}</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="email"
          id="email"
          {...register('email')}
          className={`mt-1 block w-full border ${
            errors.email ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="supplier@example.com"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Phone Field */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="tel"
          id="phone"
          {...register('phone')}
          className={`mt-1 block w-full border ${
            errors.phone ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="0XXXXXXXXX or +84XXXXXXXXX"
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* Address Field */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <textarea
          id="address"
          {...register('address')}
          rows={3}
          className={`mt-1 block w-full border ${
            errors.address ? 'border-red-300' : 'border-gray-300'
          } rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
          placeholder="Enter supplier address (optional)"
          disabled={isSubmitting}
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
        )}
      </div>
    </form>
  );
}
