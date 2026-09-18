import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardBody, IconButton, RowActions } from '../../../components/ui';
import { Can } from '../../../components/Can';
import { PERMISSIONS } from '../../../constants/permissions';
import type { SpecificationAttribute, SpecificationGroup } from '../../../api/catalog/types';

const TYPE_LABEL: Record<string, string> = {
  Text: 'Chữ', Number: 'Số', Boolean: 'Có / Không', Enum: 'Danh sách',
};

interface Props {
  group: SpecificationGroup;
  categoryLabel: string;
  onAddAttribute: () => void;
  onEditGroup: () => void;
  onDeleteGroup: () => void;
  onEditAttribute: (attr: SpecificationAttribute) => void;
  onDeleteAttribute: (attr: SpecificationAttribute) => void;
}

/** Một nhóm thông số + danh sách thuộc tính của nó. */
export function SpecGroupCard({
  group, categoryLabel, onAddAttribute, onEditGroup, onDeleteGroup, onEditAttribute, onDeleteAttribute,
}: Props) {
  return (
    <Card padded>
      <CardBody className="space-y-3">
        <div className="group/row flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-fg">{group.name}</p>
            <p className="text-xs text-fg-subtle">{categoryLabel}</p>
          </div>
          <RowActions>
            <Can permission={PERMISSIONS.CATALOG_MANAGE}>
              <Button size="sm" variant="dashed" onClick={onAddAttribute}>
                <Plus size={14} /> Thuộc tính
              </Button>
              <IconButton aria-label="Sửa nhóm" size="sm" variant="ghost" onClick={onEditGroup}>
                <Pencil size={15} />
              </IconButton>
              <IconButton aria-label="Xoá nhóm" size="sm" variant="ghost" onClick={onDeleteGroup}>
                <Trash2 size={15} />
              </IconButton>
            </Can>
          </RowActions>
        </div>

        {group.attributes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-center text-xs text-fg-subtle">
            Nhóm này chưa có thuộc tính nào.
          </p>
        ) : (
          <ul className="divide-y divide-line/70 rounded-xl border border-line">
            {[...group.attributes].sort((a, b) => a.sortOrder - b.sortOrder).map((attr) => (
              <li key={attr.id} className="group/row flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-13 font-medium text-fg">{attr.name}</p>
                  <p className="num truncate text-xs text-fg-subtle">{attr.key}</p>
                </div>
                <Badge variant="neutral">{TYPE_LABEL[attr.dataType] ?? attr.dataType}</Badge>
                {attr.unit && <Badge variant="neutral">{attr.unit}</Badge>}
                {attr.isFilterable && <Badge variant="info">Lọc được</Badge>}
                {attr.isComparable && <Badge variant="violet">So sánh</Badge>}
                <RowActions>
                  <Can permission={PERMISSIONS.CATALOG_MANAGE}>
                    <IconButton aria-label="Sửa thuộc tính" size="sm" variant="ghost" onClick={() => onEditAttribute(attr)}>
                      <Pencil size={15} />
                    </IconButton>
                    <IconButton aria-label="Xoá thuộc tính" size="sm" variant="ghost" onClick={() => onDeleteAttribute(attr)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </Can>
                </RowActions>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
