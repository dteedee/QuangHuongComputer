/**
 * Mô hình cây ngành hàng — tách khỏi component để file chỉ export component
 * (quy tắc Fast Refresh của ESLint) và để logic dựng cây test được riêng.
 */
import type { Category } from '../../../api/catalog/types';

export interface CategoryNode extends Category {
  children: CategoryNode[];
  depth: number;
}

/** Dựng cây từ danh sách phẳng `GET /categories` trả về (có `parentId`). */
export function buildCategoryTree(rows: Category[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [], depth: 0 }));
  const roots: CategoryNode[] = [];
  byId.forEach((node) => {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  const sortRec = (nodes: CategoryNode[], depth: number) => {
    nodes.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.name.localeCompare(b.name, 'vi'));
    nodes.forEach((n) => {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    });
  };
  sortRec(roots, 0);
  return roots;
}
