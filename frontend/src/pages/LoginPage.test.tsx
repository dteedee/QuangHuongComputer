import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/utils';
import userEvent from '@testing-library/user-event';
import { LoginPage } from './LoginPage';
import * as AuthContext from '../context/AuthContext';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

// Mock Google OAuth
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: any) => (
    <button onClick={() => onSuccess({ credential: 'mock-token' })}>
      Google Login Mock
    </button>
  ),
}));

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (AuthContext.useAuth as any).mockReturnValue({
      login: mockLogin,
    });
  });

  it('renders login form', () => {
    render(<LoginPage />);

    expect(screen.getByText('Đăng nhập tài khoản')).toBeInTheDocument();
    expect(screen.getByLabelText('Địa chỉ Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đăng nhập ngay/i })).toBeInTheDocument();
  });

  it('renders register link', () => {
    render(<LoginPage />);
    expect(screen.getByText('Đăng ký ngay')).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<LoginPage />);
    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /đăng nhập ngay/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email là bắt buộc')).toBeInTheDocument();
    });
  });

  it.skip('shows email validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Địa chỉ Email');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'somepassword');

    const submitButton = screen.getByRole('button', { name: /đăng nhập ngay/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email không hợp lệ')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('submits form with valid credentials', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    localStorage.setItem('user', JSON.stringify({ roles: ['Customer'] }));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Địa chỉ Email');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /đăng nhập ngay/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Địa chỉ Email');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');

    const submitButton = screen.getByRole('button', { name: /đăng nhập ngay/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Tài khoản hoặc mật khẩu không chính xác')).toBeInTheDocument();
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    mockLogin.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Địa chỉ Email');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /đăng nhập ngay/i });
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('navigates to correct page based on user role', async () => {
    const user = userEvent.setup();
    mockLogin.mockResolvedValue(undefined);
    localStorage.setItem('user', JSON.stringify({ roles: ['Admin'] }));

    render(<LoginPage />);

    const emailInput = screen.getByLabelText('Địa chỉ Email');
    const passwordInput = screen.getByPlaceholderText('••••••••');

    await user.type(emailInput, 'admin@example.com');
    await user.type(passwordInput, 'password123');

    const submitButton = screen.getByRole('button', { name: /đăng nhập ngay/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/backoffice/admin');
    });
  });
});
