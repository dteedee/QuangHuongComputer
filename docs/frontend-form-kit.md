# Form kit — hợp đồng (Quang Hưởng Computer)

> **Bắt buộc đọc trước khi dựng bất kỳ form nào (wave 3 trở đi).**
> Chủ sở hữu: W1-9. Phụ thuộc: `docs/ui-kit-components.md` (W1-12, primitive input),
> `error.normalized` + query-key factory (W1-13, `lib/api-error.ts` + `lib/query-keys.ts`).
> Mọi thứ nằm ở `frontend/src/components/form/`, import qua đúng một đường dẫn:
> ```ts
> import { Form, CrudFormDialog, TextField, MoneyField, applyServerErrors } from '@/components/form';
> ```

## 0. Vì sao có track này

- Chỉ 4-6/~58 form dùng RHF + Zod trước track này. Đa số schema chết (không ai import).
- Bug mất dữ liệu ở trình sửa sản phẩm là do KIẾN TRÚC: DOM có điều kiện + `FormData` khi submit → tab ẩn không đóng góp gì. Một RHF form state cho toàn trang (`<Form>`/`useAppForm`) sửa tận gốc: `form.getValues()` luôn có đủ mọi tab bất kể tab nào đang hiện. `components/form/form.test.tsx` có test hồi quy cho đúng bug này.
- Money/reason/payment-method trước đây dùng `prompt`/`alert`/`confirm` gốc trình duyệt → `usePrompt` (ConfirmContext) thay thế.
- API layer 38 module, trùng lặp, file > 200 dòng → dọn 3 cặp trùng + tách 6 domain dùng chung theo audience.

## 1. `<Form>` / `useAppForm` — RHF + zod, một form state

```tsx
import { Form } from '@/components/form';
import { productSchema } from '@/schemas/product';

<Form schema={productSchema} defaultValues={product} onSubmit={async (data) => { await catalogAdminApi.updateProduct(id, data); }}>
  {(form) => (
    <Tabs>
      <TabPanel><TextField name="name" control={form.control} label="Tên sản phẩm" /></TabPanel>
      <TabPanel><RichTextField name="description" control={form.control} label="Mô tả" /></TabPanel>
      {/* Tab thứ 2 KHÔNG unmount tab 1 ra khỏi form state — cả hai đều đọc/ghi cùng một `form` */}
    </Tabs>
  )}
</Form>
```

`useAppForm({schema, defaultValues, mode})` là hook dùng chung bên dưới cả `<Form>` lẫn `CrudFormDialog` — cùng một cách wire `zodResolver` + `mode` (`onBlur` mặc định), không lệch nhau.

`children` nhận `ReactNode` HOẶC render-prop `(form) => ReactNode` — dùng render-prop khi cần đọc `form.watch()`/`form.formState` ngay trong JSX.

## 2. `FormField` — nhãn + id tự động, KHÔNG phải nơi render lỗi cho mọi control

`FormField` chỉ chắc chắn làm 2 việc: render `<label htmlFor>` + sinh `id` ổn định qua `useId()`. Việc render text lỗi/hint và wiring `aria-invalid`/`aria-describedby` được giao cho primitive bên dưới **khi primitive đó tự đủ khả năng làm** (đã đúng hợp đồng W1-12 — xem `docs/ui-kit-components.md` §3):

- `Input`/`Textarea` tự sinh `aria-describedby` gộp với id truyền vào, tự render `<p role="alert">` khi có `error` → `TextField`/`NumberField`/`MoneyField`/`DateField` truyền `error` THẲNG vào `Input`, không qua paragraph của `FormField`, để tránh lặp 2 dòng lỗi.
- `Select` cũng tự render lỗi từ prop `error: string` → `SelectField` làm y hệt.
- `SearchableSelect` (`ComboboxField` dùng) chỉ nhận `error: boolean` (không tự render text, và **không có** `aria-describedby` — khoảng hở có sẵn của primitive này, không phải track này gây ra) → `ComboboxField` để `FormField` render dòng lỗi.
- `Switch`, `RichTextField` (Quill không phải input chuẩn) tự quản lý phần chrome riêng của chúng.

Nói cách khác: trang không bao giờ tự tay viết `id`/`htmlFor`/`aria-invalid`/`aria-describedby` — field nào cũng "tự động", chỉ khác nhau ở việc dòng lỗi vật lý nằm trong `Input`/`Select` hay trong `FormField`, tuỳ primitive.

## 3. `form-inputs.tsx` — 9 field

| Field | Bọc | Ghi chú |
|---|---|---|
| `TextField` | `Input` | mọi input dạng chữ (text/email/tel/password qua `type`) |
| `NumberField` | `Input type=number` | chuỗi rỗng → `undefined`, không phải `NaN` |
| `MoneyField` | `Input` | **VND nguyên, đã gồm VAT (D01)** — hiển thị phân tách nghìn, value là số nguyên; suffix mặc định "đ" |
| `SelectField` | `Select` | shape `<select>` cũ, `onChange` sự kiện |
| `ComboboxField` | `SearchableSelect` | có tìm kiếm, `onChange(value: string)` |
| `SwitchField` | `Switch` | bật/tắt có hiệu lực NGAY (không phải "chờ Lưu") |
| `DateField` | `Input type=date` | value = chuỗi ISO `yyyy-mm-dd` của trình duyệt, không dùng thư viện date-picker |
| `FileField` | input file thô | không controlled `value` (giới hạn HTML) — đọc `FileList`/`File` từ `field.value` |
| `RichTextField` | `react-quill` (có sẵn dep) | xem §7 bảo mật |

Mọi field đều nhận `name` (kiểu `FieldPath<T>`) + `control` (kiểu `Control<T>`) + `label`/`required`/`className`; import tất cả từ `@/components/form` (barrel), không import trực tiếp từ file triển khai (`form-text-fields.tsx` v.v. — các file đó bị chia nhỏ chỉ để né rule 200 dòng, không phải API công khai).

## 4. `CrudFormDialog` — mẫu bắt buộc cho mọi màn CRUD wave 3

```tsx
<CrudFormDialog
  open={open} onOpenChange={setOpen}
  title={editing ? 'Sửa danh mục' : 'Thêm danh mục'}
  schema={categorySchema} defaultValues={editing ?? undefined}
  knownFields={['name', 'description']}
  onSubmit={async (data) => { editing ? await catalogAdminApi.updateCategory(editing.id, data) : await catalogAdminApi.createCategory(data); setOpen(false); }}
>
  {(form) => (<>
    <TextField name="name" control={form.control} label="Tên danh mục" required />
    <TextField name="description" control={form.control} label="Mô tả" />
  </>)}
</CrudFormDialog>
```

- Dialog + form + nút Lưu/Huỷ + dirty guard + focus quản lý trong MỘT component. Nút Lưu nằm ở `footer` của `Dialog` (ngoài vùng scroll) nhưng submit đúng `<form>` qua thuộc tính HTML `form={id}` — không cần lồng nút vào trong form.
- Đóng bằng X / Escape / click nền / nút Huỷ đều đi qua `useUnsavedChangesGuard` — form dirty thì hỏi trước (`ConfirmContext`), sạch thì đóng ngay.
- Mở lại dialog (`open` chuyển `false→true`) luôn `form.reset(defaultValues)` — một instance dialog dùng lại được cho cả "thêm" lẫn "sửa" nhiều dòng khác nhau, không cần mount/unmount.
- Submit lỗi → `applyServerErrors` tự map field, tự `form.setFocus()` field lỗi đầu tiên.

## 5. `applyServerErrors` — nối hợp đồng lỗi backend (W1-3) vào RHF

```ts
try { await api.create(data); }
catch (err) { applyServerErrors(form.setError, err, ['name', 'email']); }
```

Đọc `error.normalized.fieldErrors` (gắn sẵn bởi interceptor `api/client.ts`, W1-13). Field backend trả mà form không có trong `knownFields` (nếu truyền) → KHÔNG gọi `setError` (vô ích, không input nào đọc) mà rơi xuống `toast.error`. Không có field error nào (chỉ có message tổng) → toast luôn. Trả về danh sách field đã set, để gọi `form.setFocus(applied[0])`.

## 6. `usePrompt` — thay `window.prompt`/`alert`/`confirm`

`ConfirmContext` (đã dùng ~39 chỗ cho `confirm()`) được mở rộng thêm, KHÔNG có hệ dialog thứ hai:

```tsx
const { promptText, promptAmount, promptSelect } = usePrompt();
const reason = await promptText({ title: 'Từ chối đơn', message: 'Nhập lý do', required: true });
if (reason === null) return; // huỷ
const amount = await promptAmount({ title: 'Số tiền hoàn', min: 0, max: order.total, suffix: 'đ' });
const method = await promptSelect({ title: 'Phương thức', options: [{value:'cash',label:'Tiền mặt'}, {value:'transfer',label:'Chuyển khoản'}] });
```

Trả `null` khi bấm Huỷ/đóng, giá trị đã gõ khi Xác nhận. `useConfirm()` (chỉ `confirm()`) giữ nguyên y hệt trước track này — 39 chỗ dùng cũ không phải sửa.

**Việc còn lại (không thuộc track này):** track này chỉ ship hook. Việc grep-and-replace `window.prompt|alert|confirm` trong các trang ops là của từng track wave-3 sở hữu file đó (đã ghi trong phase spec bước 5).

## 7. Schema per-domain (`schemas/<domain>.ts`)

14 domain: `product` `category` `brand` `user` `hrSchemas` (employee) `expense` `purchase-order` `goods-received-note` `lead` `campaign` `work-order` `warranty-claim` `checkout` `register`. Quy ước:

- Thông điệp tiếng Việt qua `lib/validation/messages.ts` (`validationMessages`/`msg`).
- Mỗi schema có comment trỏ đúng file backend làm căn cứ (EF `HasMaxLength`, FluentValidation, hoặc constructor guard). Nơi backend KHÔNG có validator/constraint cụ thể (đa số domain nghiệp vụ — Expense/PO/Lead/Campaign/WorkOrder/WarrantyClaim không có `AbstractValidator` nào), field bắt buộc bám đúng tham số constructor bắt buộc; giới hạn độ dài ghi rõ là "UX-only cap", không giả vờ là backend enforce.
- Mật khẩu (`schemas/user.ts` → `passwordPolicySchema`, tái dùng ở `schemas/register.ts`): tối thiểu 6 ký tự + ít nhất 1 chữ thường — đúng y hệt `Identity/DependencyInjection.cs:36-39` (`RequireDigit=false, RequiredLength=6, RequireNonAlphanumeric=false, RequireUppercase=false`; `RequireLowercase` KHÔNG bị override nên mặc định ASP.NET Identity `true` vẫn áp dụng).
- `lib/validation/schemas.ts` chỉ còn `loginSchema` + `contactSchema` (2 cái còn được dùng thật) — `registerSchema`/`productSchema`/`userSchema`/`checkoutSchema` cũ đã xoá (0 importer, trùng với schema domain mới).

## 8. API layer (`api/**`, trừ `client.ts`)

### 8.1 Xoá trùng lặp
- `api/reports.ts` (0 importer, trùng `reporting.ts`) — xoá hẳn.
- `api/notifications.ts` (số nhiều, 0 importer, tự ghi chú `@deprecated`, sai path `/communication/notifications`+PUT) — nội dung còn dùng được (send/template) gộp verbatim vào `api/notification.ts` (số ít, đúng path, đang được 2 hook dùng), rồi xoá file cũ.
- `api/promotion.ts` (số ít) và `api/promotions.ts` (số nhiều) hoá ra chính là audience split (§8.2) — xem đó.
- Hàm địa chỉ (`getAddresses`/`addAddress`/...) chuyển từ `api/ai.ts` sang `api/addresses.ts` mới; `api/ai.ts` re-export lại để 2 file gọi cũ không phải sửa.

### 8.2 Tách theo audience (6 domain, `api/<domain>/{...}.ts`)

| Domain cũ | File mới | Ghi chú |
|---|---|---|
| `catalog.ts` | `catalog/{types,public-listing,public-product,admin}.ts` | |
| `content.ts` | `content/{types,public,admin}.ts` (+2 file `admin-*` nội bộ vì > 200 dòng) | |
| `promotion.ts`+`promotions.ts` | `promotions/{types,public,admin}.ts` | 2 file cũ hoá ra ĐÃ audience-split sẵn (số ít = storefront, số nhiều = admin) — chỉ cần dọn vào thư mục đúng chuẩn |
| `sales.ts` | `sales/{types,cart-checkout,account-orders,pos,returns-admin,admin-orders}.ts` | `pos.ts` là file MỚI — sales.ts cũ không có gì cho POS; nối `POST /sales/staff-checkout` (backend có sẵn, FE chưa ai gọi) thay vì để trống |
| `warranty.ts` | `warranty/{types,public,admin-claims,admin-rma-loaner,admin-policies,admin}.ts` | |
| `repair.ts` | `repair/{types,public,admin}.ts` | kỹ thuật viên xếp vào "admin" (nhân viên, không phải khách) |

Mỗi domain: **file phẳng cũ (`api/sales.ts`...) trở thành BARREL** — `export *` từ các file mới + ráp lại đúng shape object cũ (`salesApi = {...}`) để KHÔNG import nào ở ~150 file gọi phải sửa. Code di chuyển verbatim (copy nguyên văn thân hàm), không viết lại logic — rủi ro chuyển sai giảm tối đa.

### 8.3 `types/paging.ts`
`PagingParams` / `QueryParams` / `PagedResult<T>` — một chỗ cho paging thay vì mỗi API tự khai. `hooks/useCrudList.ts` (đã đổi sang import từ đây) là nơi tham chiếu dùng thật; API mới nên dùng thay vì tự khai lại, không bắt buộc retrofit 38 module cũ (YAGNI).

## 9. Trang tham chiếu: `RegisterPage.tsx`

Migrate đầy đủ: `registerSchema` (Zod), `TextField` cho 4 field text, `applyServerErrors` khi backend từ chối, checkbox điều khoản (`useController` tay + `Checkbox` từ UI kit — không có "CheckboxField" trong danh sách 9 field vì spec không yêu cầu, minh hoạ cách wire 1 control chưa có Field bọc sẵn), và checkbox đồng ý **D08/Luật 122/2025 Đ11.4** (`acceptDataPolicy`) — trường + validate do track này ship, **copy/placement cuối cùng là của W3-8**.

## 10. Bảo mật (Security Considerations, không thương lượng)

- Validate client là UX. Server luôn validate độc lập (W1-3 + validator từng module ở wave 2) — **không bao giờ** tắt kiểm tra server vì client đã kiểm.
- `RichTextField` sanitize bằng DOMPurify (`kit-utils.sanitizeHtml`) khi blur — chặn từ nguồn. Nơi HIỂN THỊ html đã lưu (PDP, trang CMS...) **bắt buộc** qua `<SafeHtml html={...} />`, không bao giờ `dangerouslySetInnerHTML` trực tiếp — `RichTextField` không thể ép điều này ở đầu hiển thị, chỉ kiểm soát được đầu nhập.

## 11. Khoảng hở đã biết (ghi lại trung thực, không giấu)

- `SearchableSelect`/`Select` (W1-12) không có prop `aria-describedby`; `ComboboxField` do đó không link được lỗi văn bản tới control qua ARIA dù text lỗi vẫn hiện được (qua `FormField`). Không sửa ở đây (không sở hữu `components/ui/**`) — nêu để W1-12/W4-3 cân nhắc.
- `api/promotions/types.ts`: `Promotion`/`EvaluateRequest`/`EvaluateResponse` KHÔNG hợp nhất giữa `public.ts` và `admin.ts` — 2 file cũ tự khai 2 shape khác nhau cho CÙNG endpoint `POST /promotions/evaluate`, có trước track này. Đã ghi vào `reports/integration-requests-w1.md`, không tự "sửa" vì không xác minh được backend thật trả gì.
- `api/auth.ts`'s `authApi.{addAddress,updateAddress,deleteAddress,getMyAddresses}` (`/auth/me/addresses`) là API sổ địa chỉ THỨ HAI, độc lập với `api/addresses.ts` (`/sales/addresses`) — 2 route backend khác nhau cho cùng tính năng, `AccountPage.tsx` dùng cái này còn `address-book-page.tsx`/`address-book-selector.tsx` dùng cái kia. Phát hiện khi di chuyển `api/addresses.ts`, chưa gộp (cần chủ backend xác nhận route nào là chuẩn).
