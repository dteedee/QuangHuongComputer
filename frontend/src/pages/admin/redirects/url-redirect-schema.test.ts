import { describe, expect, it } from 'vitest';
import { sourcePathProblem, targetProblem, toWriteDto, urlRedirectFormSchema } from './url-redirect-schema';

const valid = { fromPath: '/laptop-cu.html', toPath: '/san-pham/laptop-moi', statusCode: '301' as const, note: '', isActive: true };

describe('url-redirect-schema', () => {
  it('nhận đường dẫn cũ bắt đầu bằng / hoặc URL đầy đủ của web cũ', () => {
    expect(sourcePathProblem('/laptop-cu.html')).toBeNull();
    expect(sourcePathProblem('https://web-cu.vn/sp.php?id=1')).toBeNull();
  });

  it.each(['laptop-cu', '//evil.com/x', '/', '/api/catalog', '/backoffice/products', '/_shell/x'])(
    'từ chối đường dẫn cũ %s',
    (from) => expect(sourcePathProblem(from)).not.toBeNull(),
  );

  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.com', 'san-pham/x', '/co khoang'])(
    'từ chối đích nguy hiểm/sai %s',
    (to) => expect(targetProblem(to)).not.toBeNull(),
  );

  it('nhận đích tương đối hoặc http(s)', () => {
    expect(targetProblem('/danh-muc/laptop?brand=dell')).toBeNull();
    expect(targetProblem('https://quanghuong.vn/khuyen-mai')).toBeNull();
  });

  it('410 không cần đích; 301 thì bắt buộc', () => {
    expect(urlRedirectFormSchema.safeParse({ ...valid, statusCode: '410', toPath: '' }).success).toBe(true);
    expect(urlRedirectFormSchema.safeParse({ ...valid, toPath: '' }).success).toBe(false);
  });

  it('toWriteDto đổi mã sang số và bỏ đích khi 410', () => {
    expect(toWriteDto({ ...valid, statusCode: '410' })).toEqual({
      fromPath: '/laptop-cu.html', toPath: null, statusCode: 410, note: null, isActive: true,
    });
    expect(toWriteDto(valid).statusCode).toBe(301);
  });
});
