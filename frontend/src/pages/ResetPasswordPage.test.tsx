import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ResetPasswordPage } from './ResetPasswordPage';
import client from '../api/client';

// Mock the client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderResetPasswordPage = (token?: string) => {
  const path = token ? `/reset-password?token=${token}` : '/reset-password';
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ResetPasswordPage />
    </MemoryRouter>
  );
};

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error when token is missing', () => {
    renderResetPasswordPage();

    expect(screen.getByText('Link không hợp lệ')).toBeInTheDocument();
    expect(screen.getByText('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')).toBeInTheDocument();
  });

  it('renders reset password form when token is present', () => {
    renderResetPasswordPage('valid-token');

    expect(screen.getByText('Đặt lại mật khẩu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu')).toBeInTheDocument();
  });

  it('validates password minimum length', async () => {
    renderResetPasswordPage('valid-token');

    const newPasswordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu');
    const submitButton = screen.getByText('Đặt lại mật khẩu');

    fireEvent.change(newPasswordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu phải có ít nhất 6 ký tự')).toBeInTheDocument();
    });
  });

  it('validates password confirmation matches', async () => {
    renderResetPasswordPage('valid-token');

    const newPasswordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu');
    const submitButton = screen.getByText('Đặt lại mật khẩu');

    fireEvent.change(newPasswordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    });
  });

  it('calls API with token and new password', async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: { message: 'Success' } });

    renderResetPasswordPage('valid-token');

    const newPasswordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu');
    const submitButton = screen.getByText('Đặt lại mật khẩu');

    fireEvent.change(newPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpassword123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'valid-token',
        newPassword: 'newpassword123',
      });
    });
  });

  it('has a link back to login page', () => {
    renderResetPasswordPage('valid-token');

    const backLink = screen.getByText('Quay lại đăng nhập');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('validates password fields are password type', () => {
    renderResetPasswordPage('valid-token');

    const newPasswordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu') as HTMLInputElement;

    expect(newPasswordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });
});
