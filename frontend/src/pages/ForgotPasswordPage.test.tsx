import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ForgotPasswordPage } from './ForgotPasswordPage';
import client from '../api/client';

// Mock the client
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

const renderForgotPasswordPage = () => {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );
};

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders forgot password form with email field', () => {
    renderForgotPasswordPage();

    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@gmail.com')).toBeInTheDocument();
    expect(screen.getByText('Gửi link đặt lại')).toBeInTheDocument();
  });

  it('has a link back to login page', () => {
    renderForgotPasswordPage();

    const backLink = screen.getByText('Quay lại đăng nhập');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/login');
  });

  it('validates email is required', () => {
    renderForgotPasswordPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com') as HTMLInputElement;
    expect(emailInput).toBeRequired();
  });

  it('validates email format', () => {
    renderForgotPasswordPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com') as HTMLInputElement;
    expect(emailInput.type).toBe('email');
  });

  it('shows success message after submission', async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: { message: 'Success' } });

    renderForgotPasswordPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com');
    const submitButton = screen.getByText('Gửi link đặt lại');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Email đã được gửi!')).toBeInTheDocument();
    });
  });

  it('calls API with correct email', async () => {
    vi.mocked(client.post).mockResolvedValueOnce({ data: { message: 'Success' } });

    renderForgotPasswordPage();

    const emailInput = screen.getByPlaceholderText('name@gmail.com');
    const submitButton = screen.getByText('Gửi link đặt lại');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(client.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'test@example.com' });
    });
  });
});
