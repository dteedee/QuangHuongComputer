import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Mock the AuthContext
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      login: vi.fn(),
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

const renderLoginPage = () => {
  return render(
    <GoogleOAuthProvider clientId="test-client-id">
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form with email and password fields', () => {
    renderLoginPage();

    expect(screen.getByPlaceholderText('name@gmail.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('displays required error when email is empty', async () => {
    renderLoginPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com');
    const submitButton = screen.getByText('Đăng nhập ngay');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(emailInput).toBeRequired();
    });
  });

  it('displays required error when password is empty', async () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText('••••••••');
    const submitButton = screen.getByText('Đăng nhập ngay');

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(passwordInput).toBeRequired();
    });
  });

  it('has a link to forgot password page', () => {
    renderLoginPage();

    const forgotPasswordLink = screen.getByText('Quên mật khẩu?');
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.closest('a')).toHaveAttribute('href', '/forgot-password');
  });

  it('has a link to register page', () => {
    renderLoginPage();

    const registerLink = screen.getByText('Đăng ký ngay');
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest('a')).toHaveAttribute('href', '/register');
  });

  it('validates email format', () => {
    renderLoginPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com') as HTMLInputElement;
    expect(emailInput.type).toBe('email');
  });

  it('validates password field is password type', () => {
    renderLoginPage();

    const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });
});
