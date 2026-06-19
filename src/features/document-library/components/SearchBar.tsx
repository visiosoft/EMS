import { SearchBox } from '@fluentui/react';

type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function DocumentSearchBar({ value, onChange, placeholder }: SearchBarProps) {
  return (
    <div style={{ maxWidth: 320 }}>
      <SearchBox
        placeholder={placeholder || 'Search'}
        value={value}
        onChange={(_e, newValue) => onChange(newValue || '')}
        onClear={() => onChange('')}
        styles={{
          root: {
            border: '1px solid #d1d1d1',
            borderRadius: 2,
            selectors: {
              ':hover': {
                borderColor: '#a1a1a1',
              },
            },
          },
          field: {
            fontSize: 14,
            fontWeight: 400,
          },
          iconContainer: {
            color: '#0078d4',
          },
        }}
      />
    </div>
  );
}
