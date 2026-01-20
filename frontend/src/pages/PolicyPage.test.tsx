import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { PolicyPage } from './PolicyPage';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Create a custom render for PolicyPage that uses MemoryRouter without other wrappers
const renderPolicyPage = (policyType: string) => {
  return rtlRender(
    <MemoryRouter initialEntries={[`/policy/${policyType}`]}>
      <Routes>
        <Route path="/policy/:type" element={<PolicyPage />} />
      </Routes>
    </MemoryRouter>
  );
};

// Mock window.open for testing
vi.stubGlobal('open', vi.fn());

describe('PolicyPage Component', () => {
  describe('Warranty Policy', () => {
    it('should render without error', () => {
      renderPolicyPage('warranty');
      expect(screen.getByText('Chính sách bảo hành')).toBeInTheDocument();
    });

    it('should display breadcrumb', () => {
      renderPolicyPage('warranty');
      expect(screen.getByText('Trang chủ')).toBeInTheDocument();
      expect(screen.getByText('Chính sách')).toBeInTheDocument();
    });

    it('should display main heading', () => {
      renderPolicyPage('warranty');
      const heading = screen.getByRole('heading', { name: /chính sách bảo hành/i, level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should display warranty conditions section', () => {
      renderPolicyPage('warranty');
      expect(screen.getByRole('heading', { name: /1. Điều kiện bảo hành/i })).toBeInTheDocument();
    });

    it('should display warranty method section', () => {
      renderPolicyPage('warranty');
      expect(screen.getByRole('heading', { name: /2. Phương thức bảo hành/i })).toBeInTheDocument();
    });

    it('should have contact information', () => {
      renderPolicyPage('warranty');
      expect(screen.getByText(/1800.6321/i)).toBeInTheDocument();
    });
  });

  describe('Return Policy', () => {
    it('should render without error', () => {
      renderPolicyPage('return');
      expect(screen.getByText('Chính sách đổi trả')).toBeInTheDocument();
    });

    it('should display main heading', () => {
      renderPolicyPage('return');
      const heading = screen.getByRole('heading', { name: /chính sách đổi trả/i, level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should display return conditions section', () => {
      renderPolicyPage('return');
      expect(screen.getByRole('heading', { name: /1. Điều kiện đổi trả/i })).toBeInTheDocument();
    });

    it('should display return timeline section', () => {
      renderPolicyPage('return');
      expect(screen.getByRole('heading', { name: /2. Thời hạn đổi trả/i })).toBeInTheDocument();
    });

    it('should display return process section', () => {
      renderPolicyPage('return');
      expect(screen.getByRole('heading', { name: /3. Quy trình đổi trả/i })).toBeInTheDocument();
    });
  });

  describe('Shipping Policy', () => {
    it('should render without error', () => {
      renderPolicyPage('shipping');
      expect(screen.getByText('Chính sách vận chuyển')).toBeInTheDocument();
    });

    it('should display delivery time section', () => {
      renderPolicyPage('shipping');
      expect(screen.getByRole('heading', { name: /thời gian giao hàng/i })).toBeInTheDocument();
    });

    it('should display shipping fee section', () => {
      renderPolicyPage('shipping');
      expect(screen.getByRole('heading', { name: /phí vận chuyển/i })).toBeInTheDocument();
    });
  });

  describe('Payment Policy', () => {
    it('should render without error', () => {
      renderPolicyPage('payment');
      expect(screen.getByText('Hướng dẫn thanh toán')).toBeInTheDocument();
    });

    it('should display payment methods section', () => {
      renderPolicyPage('payment');
      expect(screen.getByRole('heading', { name: /phương thức thanh toán/i })).toBeInTheDocument();
    });
  });

  describe('Sidebar Navigation', () => {
    it('should display policy category sidebar', () => {
      renderPolicyPage('warranty');
      expect(screen.getByText('Danh mục chính sách')).toBeInTheDocument();
    });

    it('should display all policy links in sidebar', () => {
      renderPolicyPage('warranty');

      // Find all policy links
      const policyLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href')?.startsWith('/policy/')
      );

      // Should have links for warranty, return, shipping, payment
      expect(policyLinks.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Invalid Policy Type', () => {
    it('should show error message for non-existent policy', () => {
      renderPolicyPage('invalid-policy');
      expect(screen.getByText('Chính sách không tồn tại.')).toBeInTheDocument();
    });
  });

  describe('Breadcrumb Navigation', () => {
    it('should have link to home page in breadcrumb', () => {
      renderPolicyPage('warranty');
      const homeLink = screen.getByRole('link', { name: /trang chủ/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });
  });
});
