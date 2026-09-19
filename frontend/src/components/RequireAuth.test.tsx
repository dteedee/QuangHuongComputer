import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';

/**
 * Cổng gating phía client (UX only - biên bảo mật thật là backend, W1-1).
 * Bảo vệ đúng regression: route lộ ra dù thiếu quyền/role, hoặc bị điều hướng âm thầm
 * mất URL đang cố truy cập.
 */
const mockAuth = vi.hoisted(() => ({ isAuthenticated: false }));
const mockPermissions = vi.hoisted(() => ({ hasPermission: vi.fn(), hasAnyRole: vi.fn() }));

vi.mock('../context/AuthContext', () => ({ useAuth: () => mockAuth }));
vi.mock('../hooks/usePermissions', () => ({ usePermissions: () => mockPermissions }));

function renderGuarded(props: { permission?: string; allowedRoles?: readonly string[] }) {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
        <Route
          path="/protected"
          element={
            <RequireAuth {...props}>
              <div>Nội dung được bảo vệ</div>
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RequireAuth', () => {
  beforeEach(() => {
    mockAuth.isAuthenticated = false;
    mockPermissions.hasPermission.mockReset().mockReturnValue(false);
    mockPermissions.hasAnyRole.mockReset().mockReturnValue(false);
  });

  it('chưa đăng nhập -> điều hướng tới trang đăng nhập, KHÔNG render nội dung', () => {
    renderGuarded({ permission: 'catalog.view' });
    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument();
    expect(screen.queryByText('Nội dung được bảo vệ')).not.toBeInTheDocument();
  });

  it('đã đăng nhập nhưng THIẾU quyền yêu cầu -> hiện trang 403, không render nội dung', () => {
    mockAuth.isAuthenticated = true;
    mockPermissions.hasPermission.mockReturnValue(false);
    renderGuarded({ permission: 'catalog.delete' });
    expect(screen.queryByText('Nội dung được bảo vệ')).not.toBeInTheDocument();
  });

  it('đã đăng nhập và CÓ quyền yêu cầu -> render nội dung', () => {
    mockAuth.isAuthenticated = true;
    mockPermissions.hasPermission.mockReturnValue(true);
    renderGuarded({ permission: 'catalog.view' });
    expect(screen.getByText('Nội dung được bảo vệ')).toBeInTheDocument();
  });

  it('dùng allowedRoles thay vì permission -> role không nằm trong danh sách bị chặn (403)', () => {
    mockAuth.isAuthenticated = true;
    mockPermissions.hasAnyRole.mockReturnValue(false);
    renderGuarded({ allowedRoles: ['Admin'] });
    expect(screen.queryByText('Nội dung được bảo vệ')).not.toBeInTheDocument();
    expect(mockPermissions.hasAnyRole).toHaveBeenCalledWith(['Admin']);
  });

  it('không truyền permission lẫn allowedRoles -> chỉ cần đăng nhập là render (trang tài khoản chung)', () => {
    mockAuth.isAuthenticated = true;
    renderGuarded({});
    expect(screen.getByText('Nội dung được bảo vệ')).toBeInTheDocument();
  });
});
