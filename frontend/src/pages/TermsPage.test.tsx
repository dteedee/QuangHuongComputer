import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import { TermsPage } from './TermsPage';

describe('TermsPage Component', () => {
  it('should render without error', () => {
    render(<TermsPage />);
    const termsElements = screen.getAllByText('Điều khoản sử dụng');
    expect(termsElements.length).toBeGreaterThan(0);
  });

  describe('Breadcrumb', () => {
    it('should display breadcrumb with home link', () => {
      render(<TermsPage />);

      const homeLink = screen.getByRole('link', { name: /trang chủ/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should display current page in breadcrumb', () => {
      render(<TermsPage />);
      const termsElements = screen.getAllByText('Điều khoản sử dụng');
      expect(termsElements.length).toBeGreaterThan(0);
    });
  });

  describe('Page Title', () => {
    it('should display main heading', () => {
      render(<TermsPage />);
      const heading = screen.getByRole('heading', { name: /điều khoản sử dụng/i, level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Content Sections', () => {
    it('should display intellectual property section', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /1. Quyền sở hữu trí tuệ/i })).toBeInTheDocument();
    });

    it('should display website usage section', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /2. Sử dụng website/i })).toBeInTheDocument();
    });

    it('should display user rights subsection', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /quyền của người dùng/i })).toBeInTheDocument();
    });

    it('should display user responsibilities subsection', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /trách nhiệm của người dùng/i })).toBeInTheDocument();
    });

    it('should display transactions and payment section', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /3. Giao dịch và thanh toán/i })).toBeInTheDocument();
    });

    it('should display liability limitation section', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /4. Giới hạn trách nhiệm/i })).toBeInTheDocument();
    });

    it('should display terms changes section', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /5. Thay đổi điều khoản/i })).toBeInTheDocument();
    });

    it('should display applicable law section', () => {
      render(<TermsPage />);
      expect(screen.getByRole('heading', { name: /6. Luật áp dụng/i })).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('should have link to contact page', () => {
      render(<TermsPage />);
      const contactLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href') === '/contact'
      );
      expect(contactLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Content Requirements', () => {
    it('should display introduction paragraph', () => {
      render(<TermsPage />);
      expect(screen.getByText(/Chào mừng bạn đến với website/i)).toBeInTheDocument();
    });

    it('should mention company name', () => {
      render(<TermsPage />);
      expect(screen.getByText(/Công ty Cổ phần Máy tính Quang Hưởng/i)).toBeInTheDocument();
    });

    it('should mention Vietnam law', () => {
      render(<TermsPage />);
      expect(screen.getByText(/pháp luật Việt Nam/i)).toBeInTheDocument();
    });
  });
});
