import { Breadcrumb } from '@fluentui/react';
import type { IBreadcrumbItem } from '@fluentui/react';
import type { BreadcrumbItem } from '../types';

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
};

export function DocumentBreadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  const breadcrumbItems: IBreadcrumbItem[] = items.map((item, index) => ({
    key: item.path,
    text: item.name,
    isCurrentItem: index === items.length - 1,
    onClick: index < items.length - 1 ? () => onNavigate(item.path) : undefined,
  }));

  return (
    <div style={{ padding: '0 0 8px 0' }}>
      <Breadcrumb
        items={breadcrumbItems}
        styles={{
          root: {
            margin: 0,
            '.ms-Breadcrumb-list': {
              alignItems: 'center',
            },
          },
          itemLink: {
            fontSize: 14,
            color: '#0078d4',
            selectors: {
              ':hover': {
                backgroundColor: '#e6f2fa',
                color: '#004578',
              },
            },
          },
          item: {
            fontSize: 14,
          },
          chevron: {
            fontSize: 10,
          },
        }}
      />
    </div>
  );
}
