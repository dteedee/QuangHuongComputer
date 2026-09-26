import { useState } from 'react';
import { Badge, DataTable, Select, type DataTableColumn } from '../../../components/ui';
import { urlRedirectsApi, type UrlRedirectImportResult } from '../../../api/content/url-redirects';
import { ImportWizardShell } from '../../backoffice/bulk-tools/import-wizard-shell';

type ImportError = UrlRedirectImportResult['errors'][number];

const ERROR_COLUMNS: DataTableColumn<ImportError>[] = [
  { id: 'row', header: 'Dòng', align: 'right', width: '4rem', cell: (e) => <span className="num">{e.row}</span> },
  { id: 'column', header: 'Cột', cell: (e) => e.column ?? '—' },
  { id: 'message', header: 'Lỗi', nowrap: false, cell: (e) => e.message },
];

/**
 * Nhập hàng loạt link của web cũ (CSV hoặc XLSX, tối đa 5.000 dòng/tệp). Luôn kiểm tra trước;
 * chỉ ghi khi MỌI dòng hợp lệ — chuỗi/vòng lặp/trùng giữa các dòng trong tệp cũng bị bắt.
 */
export default function UrlRedirectImportPage() {
  const [onDuplicate, setOnDuplicate] = useState<'skip' | 'update'>('skip');

  return (
    <ImportWizardShell<UrlRedirectImportResult>
      title="Nhập chuyển hướng URL"
      description="Tải tệp mẫu, dán danh sách link cũ → link mới, kiểm tra rồi mới ghi."
      acceptExtensions={['.csv', '.xlsx']}
      templateFileName="mau-chuyen-huong-url.csv"
      onDownloadTemplate={urlRedirectsApi.downloadTemplate}
      onImport={(file, mode) => urlRedirectsApi.import(file, mode, onDuplicate)}
      getErrorToken={() => null}
      canCommit={(r) => r.errors.length === 0 && r.created + r.updated > 0}
      warning={
        <>
          Cột <b>Đường dẫn cũ</b> nhận cả URL đầy đủ của web cũ (chỉ phần đường dẫn được giữ). Bỏ trống
          <b> Mã chuyển hướng</b> = 301. Tệp CSV phải lưu mã hoá UTF-8.
        </>
      }
      extraControls={
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          Đường dẫn cũ đã có:
          <Select
            className="w-40"
            options={[{ value: 'skip', label: 'Bỏ qua' }, { value: 'update', label: 'Cập nhật' }]}
            value={onDuplicate}
            onChange={(e) => setOnDuplicate(e.target.value as 'skip' | 'update')}
          />
        </label>
      }
      renderResult={(r) => (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge>{r.totalRows} dòng</Badge>
            <Badge variant="success">{r.created} tạo mới</Badge>
            <Badge variant="info">{r.updated} cập nhật</Badge>
            <Badge>{r.skipped} bỏ qua</Badge>
            {r.errors.length > 0 && <Badge variant="danger">{r.errors.length} lỗi — chưa ghi dòng nào</Badge>}
            {r.committed && <Badge variant="success">Đã ghi vào hệ thống</Badge>}
          </div>
          {r.errors.length > 0 && (
            <DataTable
              density="compact"
              caption="Lỗi theo dòng"
              columns={ERROR_COLUMNS}
              rows={r.errors}
              rowKey={(e) => `${e.row}-${e.column ?? ''}-${e.message}`}
            />
          )}
        </div>
      )}
    />
  );
}
