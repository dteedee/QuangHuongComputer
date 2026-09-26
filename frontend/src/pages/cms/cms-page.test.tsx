import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import CmsPage from './cms-page';

const getPage = vi.hoisted(() => vi.fn());
vi.mock('../../api/content/public', () => ({ contentPublicApi: { getPage } }));

function renderAt(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/gio-hang" element={<p>trang giỏ hàng</p>} />
            <Route path="/chinh-sach/:type" element={<p>trang chính sách</p>} />
            <Route path="/:slug" element={<CmsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

describe('/:slug (trang CMS)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('vẽ tiêu đề và nội dung đã lọc qua SafeHtml', async () => {
    getPage.mockResolvedValue({
      id: 'p1', slug: 'huong-dan-mua-hang', title: 'Hướng dẫn mua hàng', type: 'Custom', isPublished: true,
      createdAt: '2026-09-01T00:00:00Z',
      content: '<p>Bước 1: chọn sản phẩm</p><img src=x onerror="window.__xss=1">',
    });
    renderAt('/huong-dan-mua-hang');

    expect(await screen.findByRole('heading', { level: 1, name: 'Hướng dẫn mua hàng' })).toBeInTheDocument();
    expect(screen.getByText('Bước 1: chọn sản phẩm')).toBeInTheDocument();
    expect(document.querySelector('img[onerror]')).toBeNull();
    expect(getPage).toHaveBeenCalledWith('huong-dan-mua-hang');
  });

  it('slug không có trang -> 404', async () => {
    getPage.mockRejectedValue(Object.assign(new Error('404'), { response: { status: 404 } }));
    renderAt('/khong-ton-tai');

    expect(await screen.findByText('Không tìm thấy trang')).toBeInTheDocument();
  });

  it('route tĩnh vẫn thắng catch-all', () => {
    renderAt('/gio-hang');
    expect(screen.getByText('trang giỏ hàng')).toBeInTheDocument();
    expect(getPage).not.toHaveBeenCalled();
  });

  it('slug chính sách chuyển về /chinh-sach/:slug, không gọi API', () => {
    renderAt('/huong-dan-thanh-toan');
    expect(screen.getByText('trang chính sách')).toBeInTheDocument();
    expect(getPage).not.toHaveBeenCalled();
  });
});
