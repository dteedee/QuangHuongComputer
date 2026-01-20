import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import { PrivacyPage } from './PrivacyPage';

describe('PrivacyPage Component', () => {
  it('should render without error', () => {
    render(<PrivacyPage />);
    const privacyElements = screen.getAllByText('Chính sách bảo mật');
    expect(privacyElements.length).toBeGreaterThan(0);
  });

  describe('Breadcrumb', () => {
    it('should display breadcrumb with home link', () => {
      render(<PrivacyPage />);

      const homeLink = screen.getByRole('link', { name: /trang chủ/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should display current page in breadcrumb', () => {
      render(<PrivacyPage />);
      const breadcrumbItems = screen.getAllByText('Chính sách bảo mật');
      expect(breadcrumbItems.length).toBeGreaterThan(0);
    });
  });

  describe('Page Title', () => {
    it('should display main heading', () => {
      render(<PrivacyPage />);
      const heading = screen.getByRole('heading', { name: /chính sách bảo mật/i, level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Content Sections', () => {
    it('should display information collection section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /1. Thông tin chúng tôi thu thập/i })).toBeInTheDocument();
    });

    it('should display personal information subsection', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /thông tin cá nhân/i })).toBeInTheDocument();
    });

    it('should display automatic information subsection', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /thông tin tự động/i })).toBeInTheDocument();
    });

    it('should display usage purpose section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /2. Mục đích sử dụng thông tin/i })).toBeInTheDocument();
    });

    it('should display information sharing section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /3. Chia sẻ thông tin/i })).toBeInTheDocument();
    });

    it('should display security section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /4. Bảo mật thông tin/i })).toBeInTheDocument();
    });

    it('should display user rights section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /5. Quyền của bạn/i })).toBeInTheDocument();
    });

    it('should display cookie section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /6. Cookie/i })).toBeInTheDocument();
    });

    it('should display data retention section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /7. Thời gian lưu trữ/i })).toBeInTheDocument();
    });

    it('should display policy updates section', () => {
      render(<PrivacyPage />);
      expect(screen.getByRole('heading', { name: /8. Cập nhật chính sách/i })).toBeInTheDocument();
    });
  });

  describe('Security Measures', () => {
    it('should mention SSL encryption', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Mã hóa SSL/i)).toBeInTheDocument();
    });

    it('should mention firewall', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/tường lửa/i)).toBeInTheDocument();
    });
  });

  describe('User Rights', () => {
    it('should mention access rights', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Truy cập:/i)).toBeInTheDocument();
    });

    it('should mention edit rights', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Chỉnh sửa:/i)).toBeInTheDocument();
    });

    it('should mention deletion rights', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Xóa:/i)).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('should have link to contact page', () => {
      render(<PrivacyPage />);
      const contactLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href') === '/contact'
      );
      expect(contactLinks.length).toBeGreaterThan(0);
    });

    it('should display privacy email', () => {
      render(<PrivacyPage />);
      const emailLink = screen.getByRole('link', { name: /privacy@qhcomputer.com/i });
      expect(emailLink).toBeInTheDocument();
      expect(emailLink).toHaveAttribute('href', 'mailto:privacy@qhcomputer.com');
    });
  });

  describe('Content Requirements', () => {
    it('should display introduction about privacy commitment', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/cam kết bảo vệ quyền riêng tư/i)).toBeInTheDocument();
    });

    it('should mention last update date', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/Cập nhật lần cuối:/i)).toBeInTheDocument();
      expect(screen.getByText(/Tháng 1, 2026/i)).toBeInTheDocument();
    });

    it('should state no selling personal information', () => {
      render(<PrivacyPage />);
      expect(screen.getByText(/KHÔNG bán hoặc cho thuê/i)).toBeInTheDocument();
    });
  });
});
