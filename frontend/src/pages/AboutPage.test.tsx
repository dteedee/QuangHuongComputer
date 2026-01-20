import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import { AboutPage } from './AboutPage';

describe('AboutPage Component', () => {
  it('should render without error', () => {
    render(<AboutPage />);
    expect(screen.getByText('Giới thiệu công ty')).toBeInTheDocument();
  });

  describe('Breadcrumb', () => {
    it('should display breadcrumb with home link', () => {
      render(<AboutPage />);

      const homeLink = screen.getByRole('link', { name: /trang chủ/i });
      expect(homeLink).toBeInTheDocument();
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should display current page in breadcrumb', () => {
      render(<AboutPage />);
      expect(screen.getByText('Giới thiệu')).toBeInTheDocument();
    });
  });

  describe('Page Title', () => {
    it('should display main heading', () => {
      render(<AboutPage />);
      const heading = screen.getByRole('heading', { name: /giới thiệu công ty/i, level: 1 });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Company Information', () => {
    it('should display company name', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Công ty Cổ phần Máy tính Quang Hưởng/i)).toBeInTheDocument();
    });

    it('should display company address', () => {
      render(<AboutPage />);
      expect(screen.getByText(/91 Nguyễn Xiển, Hạ Đình, Thanh Xuân, Hà Nội/i)).toBeInTheDocument();
    });

    it('should display company tax ID', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Mã số thuế:/i)).toBeInTheDocument();
      expect(screen.getByText(/0123456789/i)).toBeInTheDocument();
    });

    it('should display hotline', () => {
      render(<AboutPage />);
      const hotlineElements = screen.getAllByText(/1800.6321/i);
      expect(hotlineElements.length).toBeGreaterThan(0);
    });

    it('should display email', () => {
      render(<AboutPage />);
      expect(screen.getByText(/kinhdoanh@qhcomputer.com/i)).toBeInTheDocument();
    });

    it('should display business hours', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Giờ làm việc:/i)).toBeInTheDocument();
      expect(screen.getByText(/Thứ 2 - Chủ nhật: 8:00 - 21:00/i)).toBeInTheDocument();
    });
  });

  describe('Mission and Vision', () => {
    it('should display mission section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /sứ mệnh/i })).toBeInTheDocument();
    });

    it('should display vision section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /tầm nhìn/i })).toBeInTheDocument();
    });
  });

  describe('Core Values', () => {
    it('should display core values section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /giá trị cốt lõi/i })).toBeInTheDocument();
    });

    it('should display quality value', () => {
      render(<AboutPage />);
      const qualityElements = screen.getAllByText(/Chất lượng/i);
      expect(qualityElements.length).toBeGreaterThan(0);
    });

    it('should display reputation value', () => {
      render(<AboutPage />);
      const reputationElements = screen.getAllByText(/Uy tín/i);
      expect(reputationElements.length).toBeGreaterThan(0);
    });

    it('should display dedication value', () => {
      render(<AboutPage />);
      const dedicationElements = screen.getAllByText(/Tận tâm/i);
      expect(dedicationElements.length).toBeGreaterThan(0);
    });

    it('should display innovation value', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Đổi mới/i)).toBeInTheDocument();
    });
  });

  describe('Team Section', () => {
    it('should display team section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /đội ngũ của chúng tôi/i })).toBeInTheDocument();
    });
  });

  describe('Products and Services', () => {
    it('should display products and services section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /sản phẩm & dịch vụ/i })).toBeInTheDocument();
    });

    it('should display product categories', () => {
      render(<AboutPage />);
      const productElements = screen.getAllByText(/Sản phẩm/i);
      expect(productElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Laptop, PC Gaming/i)).toBeInTheDocument();
    });

    it('should display services', () => {
      render(<AboutPage />);
      const serviceElements = screen.getAllByText(/Dịch vụ/i);
      expect(serviceElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Xây dựng cấu hình PC/i)).toBeInTheDocument();
    });

    it('should display support services', () => {
      render(<AboutPage />);
      const supportElements = screen.getAllByText(/Hỗ trợ/i);
      expect(supportElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/Tư vấn miễn phí/i)).toBeInTheDocument();
    });
  });

  describe('Commitments', () => {
    it('should display commitments section', () => {
      render(<AboutPage />);
      expect(screen.getByRole('heading', { name: /cam kết của chúng tôi/i })).toBeInTheDocument();
    });

    it('should display genuine product commitment', () => {
      render(<AboutPage />);
      expect(screen.getByText(/100% sản phẩm chính hãng/i)).toBeInTheDocument();
    });

    it('should display competitive pricing commitment', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Giá cả cạnh tranh nhất thị trường/i)).toBeInTheDocument();
    });

    it('should display warranty commitment', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Bảo hành chính hãng, hỗ trợ tận tâm/i)).toBeInTheDocument();
    });

    it('should display return policy commitment', () => {
      render(<AboutPage />);
      expect(screen.getByText(/Đổi trả dễ dàng trong 7 ngày/i)).toBeInTheDocument();
    });
  });

  describe('Contact Information Box', () => {
    it('should have link to contact page', () => {
      render(<AboutPage />);
      const contactLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href') === '/contact'
      );
      expect(contactLinks.length).toBeGreaterThan(0);
    });

    it('should have hotline link', () => {
      render(<AboutPage />);
      const hotlineLinks = screen.getAllByRole('link').filter(link =>
        link.getAttribute('href') === 'tel:18006321'
      );
      expect(hotlineLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Content Requirements', () => {
    it('should display company introduction', () => {
      render(<AboutPage />);
      expect(screen.getByText(/một trong những đơn vị hàng đầu tại Việt Nam/i)).toBeInTheDocument();
    });

    it('should mention company experience', () => {
      render(<AboutPage />);
      expect(screen.getByText(/hơn 10 năm kinh nghiệm/i)).toBeInTheDocument();
    });
  });
});
