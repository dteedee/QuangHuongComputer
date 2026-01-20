import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';
import { AuthProvider } from '../context/AuthContext';

// Mock the AuthContext
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      register: vi.fn(),
      user: null,
      token: null,
      isAuthenticated: false,
    }),
  };
});

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderRegisterPage = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form with all required fields', () => {
    renderRegisterPage();

    expect(screen.getByPlaceholderText('Nhập họ và tên của bạn')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@gmail.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Tối thiểu 6 ký tự')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập lại mật khẩu')).toBeInTheDocument();
  });

  it('has a checkbox for accepting terms', () => {
    renderRegisterPage();

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('has a link to terms page', () => {
    renderRegisterPage();

    const termsLink = screen.getByText('Điều khoản sử dụng');
    expect(termsLink).toBeInTheDocument();
    expect(termsLink.closest('a')).toHaveAttribute('href', '/policy/terms');
  });

  it('validates that password fields match', async () => {
    renderRegisterPage();

    const fullNameInput = screen.getByPlaceholderText('Nhập họ và tên của bạn');
    const emailInput = screen.getByPlaceholderText('name@gmail.com');
    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu');
    const checkbox = screen.getByRole('checkbox');
    const submitButton = screen.getByText('Đăng ký tài khoản');

    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    });
  });

  it('validates minimum password length', async () => {
    renderRegisterPage();

    const fullNameInput = screen.getByPlaceholderText('Nhập họ và tên của bạn');
    const emailInput = screen.getByPlaceholderText('name@gmail.com');
    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu');
    const checkbox = screen.getByRole('checkbox');
    const submitButton = screen.getByText('Đăng ký tài khoản');

    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: '123' } });
    fireEvent.click(checkbox);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Mật khẩu phải có ít nhất 6 ký tự')).toBeInTheDocument();
    });
  });

  it('requires terms acceptance before submission', async () => {
    renderRegisterPage();

    const fullNameInput = screen.getByPlaceholderText('Nhập họ và tên của bạn');
    const emailInput = screen.getByPlaceholderText('name@gmail.com');
    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự');
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu');
    const submitButton = screen.getByText('Đăng ký tài khoản');

    fireEvent.change(fullNameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Vui lòng đồng ý với điều khoản sử dụng')).toBeInTheDocument();
    });
  });

  it('has a link to login page', () => {
    renderRegisterPage();

    const loginLink = screen.getByText('Đăng nhập ngay');
    expect(loginLink).toBeInTheDocument();
    expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('validates email format', () => {
    renderRegisterPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com') as HTMLInputElement;
    expect(emailInput.type).toBe('email');
  });

  it('validates password fields are password type', () => {
    renderRegisterPage();

    const passwordInput = screen.getByPlaceholderText('Tối thiểu 6 ký tự') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Nhập lại mật khẩu') as HTMLInputElement;

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');
  });
});
