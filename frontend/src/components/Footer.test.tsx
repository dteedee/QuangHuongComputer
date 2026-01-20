import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import { Footer } from './Footer';

describe('Footer Component', () => {
  describe('Company Information', () => {
    it('should render company name', () => {
      render(<Footer />);

      expect(screen.getByText('QUANG HƯỞNG')).toBeInTheDocument();
      expect(screen.getByText('COMPUTER')).toBeInTheDocument();
    });

    it('should render company address', () => {
      render(<Footer />);

      const addressElement = screen.getByTestId('company-address');
      expect(addressElement).toBeInTheDocument();
      expect(addressElement).toHaveTextContent('91 Nguyễn Xiển, Hạ Đình, Thanh Xuân, Hà Nội');
    });

    it('should render company phone number', () => {
      render(<Footer />);

      const phoneElement = screen.getByTestId('company-phone');
      expect(phoneElement).toBeInTheDocument();
      expect(phoneElement).toHaveTextContent('1800.6321');
    });

    it('should render company email', () => {
      render(<Footer />);

      const emailElement = screen.getByTestId('company-email');
      expect(emailElement).toBeInTheDocument();
      expect(emailElement).toHaveTextContent('kinhdoanh@qhcomputer.com');
    });

    it('should render company tax ID', () => {
      render(<Footer />);

      const taxElement = screen.getByTestId('company-tax');
      expect(taxElement).toBeInTheDocument();
      expect(taxElement).toHaveTextContent('MST:');
      expect(taxElement).toHaveTextContent('0123456789');
    });
  });

  describe('Policy Links', () => {
    it('should render warranty policy link with correct href', () => {
      render(<Footer />);

      const warrantyLink = screen.getByTestId('policy-warranty-link');
      expect(warrantyLink).toBeInTheDocument();
      expect(warrantyLink).toHaveAttribute('href', '/policy/warranty');
      expect(warrantyLink).toHaveTextContent('Chính sách bảo hành');
    });

    it('should render return policy link with correct href', () => {
      render(<Footer />);

      const returnLink = screen.getByTestId('policy-return-link');
      expect(returnLink).toBeInTheDocument();
      expect(returnLink).toHaveAttribute('href', '/policy/return');
      expect(returnLink).toHaveTextContent('Chính sách đổi trả');
    });

    it('should render terms link with correct href', () => {
      render(<Footer />);

      const termsLink = screen.getByTestId('terms-link');
      expect(termsLink).toBeInTheDocument();
      expect(termsLink).toHaveAttribute('href', '/terms');
      expect(termsLink).toHaveTextContent('Điều khoản sử dụng');
    });

    it('should render privacy policy link with correct href', () => {
      render(<Footer />);

      const privacyLink = screen.getByTestId('privacy-link');
      expect(privacyLink).toBeInTheDocument();
      expect(privacyLink).toHaveAttribute('href', '/privacy');
      expect(privacyLink).toHaveTextContent('Chính sách bảo mật');
    });

    it('should render contact link with correct href', () => {
      render(<Footer />);

      const contactLink = screen.getByTestId('contact-link');
      expect(contactLink).toBeInTheDocument();
      expect(contactLink).toHaveAttribute('href', '/contact');
      expect(contactLink).toHaveTextContent('Liên hệ');
    });
  });

  describe('All Required Links Present', () => {
    it('should have all required policy links', () => {
      render(<Footer />);

      // Check all required links exist
      expect(screen.getByTestId('policy-warranty-link')).toBeInTheDocument();
      expect(screen.getByTestId('policy-return-link')).toBeInTheDocument();
      expect(screen.getByTestId('terms-link')).toBeInTheDocument();
      expect(screen.getByTestId('privacy-link')).toBeInTheDocument();
      expect(screen.getByTestId('contact-link')).toBeInTheDocument();
    });

    it('should verify all link hrefs are correct', () => {
      render(<Footer />);

      const links = [
        { testId: 'policy-warranty-link', href: '/policy/warranty' },
        { testId: 'policy-return-link', href: '/policy/return' },
        { testId: 'terms-link', href: '/terms' },
        { testId: 'privacy-link', href: '/privacy' },
        { testId: 'contact-link', href: '/contact' },
      ];

      links.forEach(({ testId, href }) => {
        const link = screen.getByTestId(testId);
        expect(link).toHaveAttribute('href', href);
      });
    });
  });

  describe('Product Categories', () => {
    it('should render product category links', () => {
      render(<Footer />);

      expect(screen.getByText('Laptop - Máy tính xách tay')).toBeInTheDocument();
      expect(screen.getByText('Máy tính chơi Game')).toBeInTheDocument();
      expect(screen.getByText('Máy tính đồ họa')).toBeInTheDocument();
      expect(screen.getByText('Linh kiện máy tính')).toBeInTheDocument();
      expect(screen.getByText('Màn hình máy tính')).toBeInTheDocument();
    });
  });

  describe('Newsletter Section', () => {
    it('should render newsletter signup section', () => {
      render(<Footer />);

      expect(screen.getByText('Đăng ký nhận tin khuyến mãi')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Nhập email của bạn...')).toBeInTheDocument();
    });

    it('should render submit button for newsletter', () => {
      render(<Footer />);

      const submitButton = screen.getByText('Gửi ngay');
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('Social Links', () => {
    it('should render social media section heading', () => {
      render(<Footer />);

      expect(screen.getByText('Kết nối với chúng tôi')).toBeInTheDocument();
    });
  });

  describe('Copyright', () => {
    it('should render copyright notice', () => {
      render(<Footer />);

      expect(screen.getByText(/© 2026 Bản quyền thuộc về Công ty Cổ phần Máy tính Quang Hưởng/)).toBeInTheDocument();
    });
  });
});
