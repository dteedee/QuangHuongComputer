import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PcBuildGalleryAdminPage } from './pc-build-gallery-admin-page';

const api = vi.hoisted(() => ({ list: vi.fn(), promote: vi.fn(), update: vi.fn(), remove: vi.fn() }));
vi.mock('../../../api/pcbuilder-gallery', async (orig) => ({
    ...(await orig<typeof import('../../../api/pcbuilder-gallery')>()),
    pcBuildGalleryAdminApi: api,
}));
vi.mock('../../../context/ConfirmContext', () => ({ useConfirm: () => vi.fn().mockResolvedValue(true) }));

const renderPage = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter><PcBuildGalleryAdminPage /></MemoryRouter>
    </QueryClientProvider>,
);

describe('PcBuildGalleryAdminPage', () => {
    beforeEach(() => {
        // jsdom không có scrollIntoView — danh sách tuỳ chọn của Select gọi nó khi mở.
        Element.prototype.scrollIntoView = vi.fn();
        Object.values(api).forEach((fn) => fn.mockReset());
        api.list.mockResolvedValue([]);
    });

    it('thêm từ cấu hình đã lưu gửi đúng payload (mã viết hoa, nhu cầu, cờ)', async () => {
        api.promote.mockResolvedValue({ id: 'g1', buildCode: 'NEW12345' });
        renderPage();

        await userEvent.click((await screen.findAllByRole('button', { name: 'Thêm từ cấu hình đã lưu' }))[0]);
        await userEvent.type(screen.getByLabelText(/Mã cấu hình/), 'ab12cd34');
        await userEvent.type(screen.getByLabelText(/Tiêu đề/), 'PC Văn phòng 10 triệu');
        // Chỉ có một ô chọn trong hộp thoại: "Nhu cầu".
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(await screen.findByRole('option', { name: 'Văn phòng' }));
        await userEvent.click(screen.getByRole('switch', { name: /Nổi bật/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Thêm vào gallery' }));

        await waitFor(() => expect(api.promote).toHaveBeenCalledTimes(1));
        expect(api.promote).toHaveBeenCalledWith({
            buildCode: 'AB12CD34', title: 'PC Văn phòng 10 triệu', useCaseTag: 'van-phong',
            sortOrder: 0, isFeatured: true, isPublic: true,
        });
    });

    it('thiếu tiêu đề thì báo lỗi, không gọi API', async () => {
        renderPage();
        await userEvent.click((await screen.findAllByRole('button', { name: 'Thêm từ cấu hình đã lưu' }))[0]);
        await userEvent.type(screen.getByLabelText(/Mã cấu hình/), 'AB12CD34');
        await userEvent.click(screen.getByRole('button', { name: 'Thêm vào gallery' }));

        expect(await screen.findByText('Nhập tiêu đề')).toBeInTheDocument();
        expect(api.promote).not.toHaveBeenCalled();
    });
});
