import { CrudFormDialog, NumberField, SelectField, SwitchField, TextField } from '../../../components/form';
import { PC_USE_CASE_TAGS, type PcGalleryBuild } from '../../../api/pcbuilder-gallery';
import {
    emptyPromoteValues, galleryEditSchema, galleryPromoteSchema,
    type GalleryEditValues, type GalleryPromoteValues,
} from './pc-build-gallery-schema';

const tagOptions = PC_USE_CASE_TAGS.map((t) => ({ value: t.value, label: t.label }));

interface PromoteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (values: GalleryPromoteValues) => Promise<void>;
}

/** "Thêm từ cấu hình đã lưu": nhân viên dán mã chia sẻ (8 ký tự) của một build đã lưu. */
export function PromoteGalleryDialog({ open, onOpenChange, onSubmit }: PromoteProps) {
    return (
        <CrudFormDialog<GalleryPromoteValues>
            open={open} onOpenChange={onOpenChange}
            title="Thêm từ cấu hình đã lưu"
            description="Hệ thống tạo bản sao thuộc cửa hàng — cấu hình gốc của khách không bị thay đổi."
            schema={galleryPromoteSchema} defaultValues={emptyPromoteValues}
            knownFields={['buildCode', 'title', 'useCaseTag', 'sortOrder']}
            submitLabel="Thêm vào gallery"
            onSubmit={(values) => onSubmit(values)}
        >
            {(form) => (
                <div className="grid gap-3">
                    <TextField name="buildCode" control={form.control} label="Mã cấu hình" required placeholder="VD: A1B2C3D4" />
                    <GalleryFields control={form.control} />
                </div>
            )}
        </CrudFormDialog>
    );
}

interface EditProps {
    build: PcGalleryBuild | null;
    onClose: () => void;
    onSubmit: (build: PcGalleryBuild, values: GalleryEditValues) => Promise<void>;
}

export function EditGalleryDialog({ build, onClose, onSubmit }: EditProps) {
    return (
        <CrudFormDialog<GalleryEditValues>
            open={build !== null} onOpenChange={(open) => { if (!open) onClose(); }}
            title="Sửa cấu hình mẫu" schema={galleryEditSchema}
            defaultValues={build ? {
                title: build.title, useCaseTag: build.useCaseTag as GalleryEditValues['useCaseTag'],
                sortOrder: build.sortOrder, isFeatured: build.isFeatured, isPublic: build.isPublic,
            } : undefined}
            knownFields={['title', 'useCaseTag', 'sortOrder']}
            onSubmit={(values) => (build ? onSubmit(build, values) : Promise.resolve())}
        >
            {(form) => <div className="grid gap-3"><GalleryFields control={form.control} /></div>}
        </CrudFormDialog>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dùng chung cho hai schema cùng tập trường
function GalleryFields({ control }: { control: any }) {
    return (
        <>
            <TextField name="title" control={control} label="Tiêu đề" required placeholder="VD: PC Gaming 20 triệu chiến mọi game" />
            <div className="grid gap-3 sm:grid-cols-2">
                <SelectField name="useCaseTag" control={control} label="Nhu cầu" required options={tagOptions} />
                <NumberField name="sortOrder" control={control} label="Thứ tự" min={0} />
            </div>
            <SwitchField name="isFeatured" control={control} label="Nổi bật" description="Đứng đầu trang cấu hình mẫu" />
            <SwitchField name="isPublic" control={control} label="Hiện trên website" description="Khách xem được tại /cau-hinh-mau" />
        </>
    );
}
