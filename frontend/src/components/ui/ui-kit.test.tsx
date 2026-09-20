/**
 * UI-kit contract tests (W1-12). These assert the promises the phase file's
 * Success Criteria make — the ones a typecheck cannot prove.
 * W4-3 extends this file; do not replace it.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dialog } from './dialog';
import { Drawer } from './drawer';
import { IconButton } from './icon-button';
import { SafeHtml } from './safe-html';
import { Price } from './price';
import { Checkbox } from './checkbox';
import { Switch } from './switch';
import { Breadcrumb } from './breadcrumb';
import { QueryBoundary } from './query-boundary';
import { Input } from './Input';
import { Tooltip } from './tooltip';
import { PageHeader } from './page-header';
import { DataTable } from './data-table';
import { SaveButton } from './save-button';
import { sanitizeImageSrc, sanitizeHtml, pageWindow, initialsOf, formatDong } from './kit-utils';

describe('Dialog', () => {
  it('is an aria modal with an accessible name and a scroll lock', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Cập nhật đơn hàng">
        <button type="button">Bên trong</button>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Cập nhật đơn hàng')).toBeInTheDocument();
    /* Radix locks background scrolling through react-remove-scroll, which marks
     * the body and injects `body[data-scroll-locked]{overflow:hidden!important}`
     * — not an inline style, so assert on the marker + the rule. */
    expect(document.body).toHaveAttribute('data-scroll-locked', '1');
    const injected = Array.from(document.head.querySelectorAll('style'))
      .map((s) => s.textContent ?? '')
      .join('');
    expect(injected).toContain('body[data-scroll-locked]');
    expect(injected).toContain('overflow: hidden');
  });

  it('closes on Escape', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange} title="Xoá sản phẩm?">
        <p>nội dung</p>
      </Dialog>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('moves focus inside the panel when it opens', () => {
    render(
      <Dialog open onOpenChange={() => {}} title="Tiêu đề">
        <button type="button">Bên trong</button>
      </Dialog>,
    );
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});

describe('Drawer', () => {
  it('is a dialog with a close button', () => {
    render(
      <Drawer open onOpenChange={() => {}} title="Giỏ hàng">
        <p>trống</p>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeInTheDocument();
  });
});

describe('IconButton', () => {
  it('always has an accessible name', () => {
    render(
      <IconButton aria-label="Xoá dòng">
        <span aria-hidden>×</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Xoá dòng' })).toBeInTheDocument();
  });
});

describe('SafeHtml / sanitizeHtml', () => {
  it('drops scripts, inline handlers and javascript: links', () => {
    const dirty =
      '<p>ok</p><script>alert(1)</script><img src="x" onerror="alert(1)">' +
      '<a href="javascript:alert(1)">x</a><iframe src="https://evil"></iframe>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<p>ok</p>');
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('javascript:');
    expect(clean).not.toContain('<iframe');
  });

  it('renders nothing for empty input', () => {
    const { container } = render(<SafeHtml html="" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('sanitizeImageSrc', () => {
  it('refuses script-bearing schemes and non-image data URIs', () => {
    expect(sanitizeImageSrc('javascript:alert(1)')).toBe('');
    expect(sanitizeImageSrc('data:text/html;base64,PHNjcmlwdD4=')).toBe('');
    expect(sanitizeImageSrc('data:image/png;base64,iVBOR')).toBe('data:image/png;base64,iVBOR');
    expect(sanitizeImageSrc('https://cdn.example/x.webp')).toBe('https://cdn.example/x.webp');
    expect(sanitizeImageSrc('')).toBe('');
  });
});

describe('Price', () => {
  it('formats integer đồng with tabular numerals and a derived discount', () => {
    const { container } = render(<Price value={27599000} compareAt={31990000} />);
    expect(container.querySelector('.price')?.textContent).toBe('27.599.000₫');
    expect(container.querySelector('.price-old')?.textContent).toBe('31.990.000₫');
    expect(container.textContent).toContain('-14%');
  });

  it('never shows 0 for a missing price', () => {
    render(<Price value={null} />);
    expect(screen.getByText('Liên hệ')).toBeInTheDocument();
  });
});

describe('Checkbox / Switch', () => {
  it('exposes the indeterminate DOM property', () => {
    render(<Checkbox label="Chọn một phần" indeterminate checked={false} onChange={() => {}} />);
    expect((screen.getByRole('checkbox') as HTMLInputElement).indeterminate).toBe(true);
  });

  it('renders a switch role with aria-checked', () => {
    const onChange = vi.fn();
    render(<Switch checked onCheckedChange={onChange} aria-label="Nhận thông báo" />);
    const sw = screen.getByRole('switch', { name: 'Nhận thông báo' });
    expect(sw).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe('Breadcrumb', () => {
  it('marks the last crumb as the current page and does not link it', () => {
    render(
      <MemoryRouter>
        <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Laptop' }]} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Trang chủ' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Laptop' })).toBeNull();
    expect(screen.getByText('Laptop')).toHaveAttribute('aria-current', 'page');
  });
});

describe('QueryBoundary', () => {
  it('shows an error with a retry instead of rendering empty data', () => {
    const refetch = vi.fn();
    render(
      <QueryBoundary
        query={{ data: undefined, isPending: false, isError: true, error: new Error('boom'), refetch }}
      >
        {() => <p>không bao giờ hiện</p>}
      </QueryBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('không bao giờ hiện')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state when the request succeeded with nothing in it', () => {
    render(
      <QueryBoundary
        query={{ data: [] as number[], isPending: false, isError: false }}
        isEmpty={(rows) => rows.length === 0}
        empty={{ title: 'Chưa có đơn hàng' }}
      >
        {(rows) => <p>{rows.length} dòng</p>}
      </QueryBoundary>,
    );
    expect(screen.getByText('Chưa có đơn hàng')).toBeInTheDocument();
  });
});

describe('Input aria wiring (W1-9 FormField contract)', () => {
  it('keeps a caller-supplied aria-describedby AND the error message id', () => {
    render(
      <Input
        label="Email"
        error="Email không hợp lệ"
        aria-describedby="ff-hint"
        defaultValue="x"
        onChange={() => {}}
      />,
    );
    const input = screen.getByLabelText('Email');
    const described = input.getAttribute('aria-describedby') ?? '';
    expect(described.split(' ')).toContain('ff-hint');
    /* the <p role="alert"> holding the message must also be referenced */
    const errorId = screen.getByRole('alert').id;
    expect(described.split(' ')).toContain(errorId);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Tooltip', () => {
  it('describes the control itself, not a wrapper', () => {
    render(
      <Tooltip content="Xuất file Excel" delay={0}>
        <button type="button">Xuất</button>
      </Tooltip>,
    );
    const btn = screen.getByRole('button', { name: 'Xuất' });
    expect(btn).not.toHaveAttribute('aria-describedby');
    fireEvent.focus(btn);
    const tip = screen.getByRole('tooltip');
    expect(btn.getAttribute('aria-describedby')).toBe(tip.id);
  });
});

describe('pure helpers', () => {
  it('formatDong rounds to whole đồng', () => {
    expect(formatDong(1234567.6)).toBe('1.234.568');
  });

  it('initialsOf takes the Vietnamese given name', () => {
    expect(initialsOf('Trần Quang Hưởng')).toBe('QH');
    expect(initialsOf('Bình')).toBe('B');
    expect(initialsOf('   ')).toBe('?');
  });

  it('pageWindow inserts ellipses around the current page', () => {
    expect(pageWindow(6, 20)).toEqual([1, '…', 5, 6, 7, '…', 20]);
    expect(pageWindow(1, 1)).toEqual([1]);
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });
});

/* ==========================================================================
 * W1-8 — mật độ back office & nút lưu 4 trạng thái (design-guidelines §9.2/§9.4)
 * ======================================================================== */

describe('mật độ admin không rò sang storefront', () => {
  it('DataTable mặc định KHÔNG đặt data-density; chỉ density="compact" mới đặt', () => {
    const cols = [{ id: 'a', header: 'A', cell: (r: { a: string }) => r.a }];
    const rows = [{ a: 'x' }];

    const { container, rerender } = render(
      <DataTable caption="mặc định" columns={cols} rows={rows} rowKey={(r) => r.a} />,
    );
    expect(container.querySelector('[data-density]')).toBeNull();

    rerender(
      <DataTable caption="gọn" columns={cols} rows={rows} rowKey={(r) => r.a} density="compact" />,
    );
    expect(container.querySelector('[data-density="compact"]')).not.toBeNull();
  });

  it('PageHeader mặc định giữ H1 storefront (text-3xl); density="compact" mới xuống text-xl', () => {
    const { rerender } = render(<PageHeader title="Sản phẩm" />);
    expect(screen.getByRole('heading', { level: 1 }).className).toContain('text-3xl');

    rerender(<PageHeader title="Sản phẩm" density="compact" />);
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.className).toContain('text-xl');
    expect(h1.className).toContain('font-bold');
  });
});

describe('SaveButton — bốn trạng thái §9.4', () => {
  it('rảnh: là nút bấm được', () => {
    render(<SaveButton status="idle" />);
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
  });

  it('đang lưu: spinner + khoá', () => {
    render(<SaveButton status="saving" />);
    const btn = screen.getByRole('button', { name: /Đang lưu/ });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('đã lưu: KHÔNG phải nút — là dòng chữ có role="status"', () => {
    render(<SaveButton status="saved" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Đã lưu');
  });

  it('lỗi: nút trở lại trạng thái rảnh + thông báo lỗi', () => {
    render(<SaveButton status="error" errorMessage="Mất kết nối" />);
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeEnabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Mất kết nối');
  });
});
