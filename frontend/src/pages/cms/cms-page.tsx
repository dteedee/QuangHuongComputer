/**
 * `/:slug` — trang CMS tự do do chủ cửa hàng soạn (hướng dẫn mua hàng, câu hỏi thường gặp...).
 * Nội dung HTML đi qua `SafeHtml` (DOMPurify). Slug không có trang đã xuất bản -> `NotFoundPage`
 * (SEO shell đã trả 404 thật cho bot). Slug thuộc trang cố định / chính sách -> `<Navigate>` về URL
 * chuẩn, khớp 301 của shell (`cms-page-paths.ts`).
 */
import { Navigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SEO from '../../components/SEO';
import { Breadcrumb, SafeHtml, Skeleton, SkeletonText } from '../../components/ui';
import { contentPublicApi } from '../../api/content/public';
import { queryKeys } from '../../lib/query-keys';
import { ROUTES } from '../../routes/route-paths';
import { NotFoundPage } from '../NotFoundPage';
import { cmsCanonicalPath } from './cms-page-paths';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function excerpt(html: string): string {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 159).trimEnd()}…` : text;
}

export default function CmsPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const valid = SLUG.test(slug);
  const canonical = cmsCanonicalPath(slug);

  const pageQuery = useQuery({
    queryKey: queryKeys.content.detail(`page:${slug}`),
    queryFn: () => contentPublicApi.getPage(slug),
    enabled: valid && canonical === `/${slug}`,
    retry: false,
  });

  if (!valid) return <NotFoundPage />;
  if (canonical !== `/${slug}`) return <Navigate to={canonical} replace />;
  if (pageQuery.isError) return <NotFoundPage />;

  const page = pageQuery.data;
  const crumbs = [{ label: 'Trang chủ', to: ROUTES.HOME }, { label: page?.title ?? 'Đang tải' }];

  return (
    <div className="min-h-screen bg-bg pb-16">
      {page && <SEO title={page.title} description={page.summary || excerpt(page.content)} />}
      <div className="mx-auto w-full max-w-4xl px-4 pt-4">
        <Breadcrumb items={crumbs} />
        <article className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-xs lg:p-8">
          {page ? (
            <>
              <h1 className="mb-4 text-2xl font-bold leading-tight text-fg lg:text-3xl">{page.title}</h1>
              <SafeHtml html={page.content} />
            </>
          ) : (
            <div aria-busy="true">
              <Skeleton className="mb-4 h-8 w-2/3" />
              <SkeletonText lines={6} />
            </div>
          )}
        </article>
      </div>
    </div>
  );
}
