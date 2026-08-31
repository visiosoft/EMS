import { describe, expect, it } from 'vitest';
import { toDepartmentTags } from './departmentTags';

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
