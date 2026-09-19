import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Can } from './Can';

const mockPermissions = vi.hoisted(() => ({ hasPermission: vi.fn() }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => mockPermissions }));

/** UX-only gate: hides an action a role has no business seeing (e.g. "Xoá" for Sale). */
describe('Can', () => {
  beforeEach(() => mockPermissions.hasPermission.mockReset());

  it('có quyền -> render children', () => {
    mockPermissions.hasPermission.mockReturnValue(true);
    render(<Can permission="catalog.delete"><button>Xoá</button></Can>);
    expect(screen.getByText('Xoá')).toBeInTheDocument();
  });

  it('không có quyền -> KHÔNG render children, không có fallback mặc định để lộ nút', () => {
    mockPermissions.hasPermission.mockReturnValue(false);
    const { container } = render(<Can permission="catalog.delete"><button>Xoá</button></Can>);
    expect(screen.queryByText('Xoá')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('không có quyền + có fallback -> render fallback thay vì children', () => {
    mockPermissions.hasPermission.mockReturnValue(false);
    render(<Can permission="catalog.delete" fallback={<span>Không có quyền</span>}><button>Xoá</button></Can>);
    expect(screen.getByText('Không có quyền')).toBeInTheDocument();
    expect(screen.queryByText('Xoá')).not.toBeInTheDocument();
  });

  it('gọi đúng permission key được truyền vào usePermissions().hasPermission', () => {
    mockPermissions.hasPermission.mockReturnValue(true);
    render(<Can permission="sales.viewAll"><div /></Can>);
    expect(mockPermissions.hasPermission).toHaveBeenCalledWith('sales.viewAll');
  });
});
