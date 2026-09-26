import { z } from 'zod';

const base = {
    title: z.string().trim().min(1, 'Nhập tiêu đề').max(150, 'Tối đa 150 ký tự'),
    useCaseTag: z.enum(['gaming', 'van-phong', 'do-hoa', 'streaming'], { errorMap: () => ({ message: 'Chọn nhu cầu' }) }),
    sortOrder: z.number({ invalid_type_error: 'Nhập số thứ tự', required_error: 'Nhập số thứ tự' }).int('Số nguyên').min(0, 'Không âm').max(9999, 'Tối đa 9999'),
    isFeatured: z.boolean(),
    isPublic: z.boolean(),
};

/** Sửa một cấu hình mẫu (PUT /admin/gallery/{id}). */
export const galleryEditSchema = z.object(base);

/** Thêm từ một cấu hình đã lưu theo MÃ CHIA SẺ (POST /admin/gallery). Server tạo bản sao thuộc cửa hàng. */
export const galleryPromoteSchema = z.object({
    buildCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6,20}$/, 'Mã cấu hình gồm 6–20 chữ/số'),
    ...base,
});

export type GalleryEditValues = z.infer<typeof galleryEditSchema>;
export type GalleryPromoteValues = z.infer<typeof galleryPromoteSchema>;

export const emptyPromoteValues: GalleryPromoteValues = {
    buildCode: '', title: '', useCaseTag: 'gaming', sortOrder: 0, isFeatured: false, isPublic: true,
};
