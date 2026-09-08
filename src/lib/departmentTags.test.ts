import { describe, expect, it } from 'vitest';
import { toDepartmentTags, getDepartmentBadges, getDepartmentFilterNames } from './departmentTags';

describe('toDepartmentTags', () => {
  it('renders department 1 and department 2 as separate tags', () => {
    expect(toDepartmentTags('Sales', 'Ticketing')).toEqual(['Sales', 'Ticketing']);
  });

  it('keeps a department whose name contains a comma as a single tag', () => {
    expect(toDepartmentTags('Art, Graphic Design', 'Marketing')).toEqual([
      'Art, Graphic Design',
      'Marketing',
    ]);
  });

  it('renders a single tag when only department 1 is set', () => {
    expect(toDepartmentTags('Executive', '')).toEqual(['Executive']);
  });

  it('dedupes case-insensitively and keeps the first spelling seen', () => {
    expect(toDepartmentTags('Sales', 'sales')).toEqual(['Sales']);
  });

  it('drops blanks and nullish sources', () => {
    expect(toDepartmentTags('  ', 'Sales', null, undefined)).toEqual(['Sales']);
  });

  it('returns an empty list when nothing is set', () => {
    expect(toDepartmentTags(null, undefined)).toEqual([]);
  });
});

describe('getDepartmentBadges', () => {
  it('returns independent primary and secondary badges', () => {
    expect(getDepartmentBadges('Sales', 'Ticketing')).toEqual([
      { name: 'Sales', isSecondary: false },
      { name: 'Ticketing', isSecondary: true },
    ]);
  });

  it('splits comma-separated departmentName into separate badges without duplicating secondary', () => {
    expect(
      getDepartmentBadges(
        'Developer New 445589, Development & Testing',
        'Developer New 445589',
      ),
    ).toEqual([
      { name: 'Development & Testing', isSecondary: false },
      { name: 'Developer New 445589', isSecondary: true },
    ]);
  });

  it('returns only primary badge when secondary matches primary case-insensitively', () => {
    expect(getDepartmentBadges('Sales', 'sales')).toEqual([
      { name: 'Sales', isSecondary: false },
    ]);
  });

  it('handles null/undefined secondary department', () => {
    expect(getDepartmentBadges('Executive', null)).toEqual([
      { name: 'Executive', isSecondary: false },
    ]);
  });
});

describe('getDepartmentFilterNames', () => {
  it('returns separate filter names for joined assignments and secondary department', () => {
    expect(
      getDepartmentFilterNames(
        'Developer New 445589, Development & Testing',
        'Developer New 445589',
      ),
    ).toEqual(['Development & Testing', 'Developer New 445589']);
  });

  it('falls back to Unassigned when no department names are present', () => {
    expect(getDepartmentFilterNames(null, '')).toEqual(['Unassigned']);
  });
});
