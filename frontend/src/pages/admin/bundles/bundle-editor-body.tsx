import { useState } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { uploadTaxonomyImage } from '../../../api/catalog/admin-spec-reviews';
import {
    Button, Card, CardBody, CardTitle, IconButton, Img, Money, PageHeader, Radio, RadioGroup, Textarea, notify,
} from '../../../components/ui';
import { DateField, MoneyField, NumberField, SwitchField, TextField } from '../../../components/form';
import { normalizeApiError } from '../../../lib/api-error';
import { BundleItemsEditor } from './bundle-items-editor';
import { listTotal, previewBundlePrice, type BundleEditorValues } from './bundle-editor-schema';

interface Props {
    form: UseFormReturn<BundleEditorValues>;
    isNew: boolean;
    onBack: () => void;
}

/** Thân trình soạn combo: cột trái nội dung + món, cột phải giá / hiệu lực / ảnh. */
export function BundleEditorBody({ form, isNew, onBack }: Props) {
    const values = useWatch({ control: form.control }) as BundleEditorValues;
    const items = values.items ?? [];
    const list = listTotal(items);
    const price = previewBundlePrice({ ...values, items });
    const description = form.register('description');

    return (
        <>
            <PageHeader
                title={isNew ? 'Tạo combo' : 'Sửa combo'}
                description="Giá combo tính lại từ giá lẻ hiện hành mỗi lần khách xem và lúc chốt đơn."
                actions={
                    <>
                        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>Danh sách combo</Button>
                        <Button type="submit" size="sm" loading={form.formState.isSubmitting}>Lưu combo</Button>
                    </>
                }
            />
            <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
                <div className="space-y-4">
                    <Card padded>
                        <CardBody className="grid gap-3">
                            <TextField name="name" control={form.control} label="Tên combo" required placeholder="VD: Laptop + Chuột + Balo" />
                            <Textarea label="Mô tả" rows={3} error={form.formState.errors.description?.message} {...description} />
                        </CardBody>
                    </Card>
                    <Card padded>
                        <CardBody className="space-y-3">
                            <CardTitle>Sản phẩm trong combo</CardTitle>
                            <BundleItemsEditor form={form} />
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card padded>
                        <CardBody className="space-y-3">
                            <CardTitle>Giá combo</CardTitle>
                            <RadioGroup legend="Cách tính giá">
                                <Radio value="fixed" label="Giá cố định cho một bộ" {...form.register('pricingMode')} />
                                <Radio value="percent" label="Giảm % trên tổng giá lẻ" {...form.register('pricingMode')} />
                            </RadioGroup>
                            {values.pricingMode === 'percent'
                                ? <NumberField name="discountPercent" control={form.control} label="Phần trăm giảm" min={1} max={99} required />
                                : <MoneyField name="fixedPrice" control={form.control} label="Giá một bộ" required />}
                            <dl className="grid grid-cols-2 gap-y-1 text-13">
                                <dt className="text-fg-muted">Tổng giá lẻ</dt><dd className="text-right"><Money value={list} /></dd>
                                <dt className="text-fg-muted">Giá combo</dt><dd className="text-right"><Money value={price} /></dd>
                                <dt className="text-fg-muted">Khách tiết kiệm</dt>
                                <dd className="text-right text-savings"><Money value={Math.max(0, list - price)} /></dd>
                            </dl>
                        </CardBody>
                    </Card>
                    <Card padded>
                        <CardBody className="space-y-3">
                            <CardTitle>Hiệu lực</CardTitle>
                            <div className="grid grid-cols-2 gap-3">
                                <DateField name="validFrom" control={form.control} label="Từ ngày" />
                                <DateField name="validTo" control={form.control} label="Đến hết ngày" />
                            </div>
                            <SwitchField name="isActive" control={form.control} label="Đang bán" description="Tắt để ẩn combo mà không xoá." />
                        </CardBody>
                    </Card>
                    <BundleImageCard form={form} />
                </div>
            </div>
        </>
    );
}

function BundleImageCard({ form }: { form: UseFormReturn<BundleEditorValues> }) {
    const imageUrl = useWatch({ control: form.control, name: 'imageUrl' });
    const [uploading, setUploading] = useState(false);

    const onFile = async (file?: File) => {
        if (!file) return;
        setUploading(true);
        try {
            const { url } = await uploadTaxonomyImage(file, 'bundles');
            form.setValue('imageUrl', url, { shouldDirty: true });
        } catch (error) {
            notify.error('Không tải được ảnh', { description: normalizeApiError(error).message });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Card padded>
            <CardBody className="space-y-3">
                <CardTitle>Ảnh combo</CardTitle>
                {imageUrl ? (
                    <div className="relative">
                        <Img src={imageUrl} alt="Ảnh combo" ratio="1/1" fit="contain" blend className="w-full rounded-lg" />
                        <IconButton aria-label="Gỡ ảnh combo" size="sm" variant="ghost" className="absolute right-2 top-2"
                            onClick={() => form.setValue('imageUrl', '', { shouldDirty: true })}>
                            <X size={14} />
                        </IconButton>
                    </div>
                ) : <p className="text-13 text-fg-muted">Chưa có ảnh — trang sản phẩm dùng ảnh từng món.</p>}
                <label className="block">
                    <span className="sr-only">Chọn ảnh combo</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading}
                        onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }} />
                    <Button type="button" variant="outline" size="sm" icon={ImagePlus} loading={uploading}
                        onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement | null)?.click()}>
                        {imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
                    </Button>
                </label>
            </CardBody>
        </Card>
    );
}

export default BundleEditorBody;
