import type { SelectQueryBuilder } from 'typeorm';
import type { Venue } from '../entities/venue.entity';
import {
  ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL,
  applyAllVenuesSort,
} from './venue-directory-sort';

describe('applyAllVenuesSort', () => {
  function makeMockQb() {
    const calls: { method: string; args: unknown[] }[] = [];
    const qb = {
      orderBy: jest.fn((...args: unknown[]) => {
        calls.push({ method: 'orderBy', args });
        return qb;
      }),
      addOrderBy: jest.fn((...args: unknown[]) => {
        calls.push({ method: 'addOrderBy', args });
        return qb;
      }),
      _calls: calls,
    };
    return qb as unknown as SelectQueryBuilder<Venue> & {
      _calls: typeof calls;
    };
  }

  it('orders by venue name + company id by default', () => {
    const qb = makeMockQb();
    applyAllVenuesSort(qb, undefined, undefined);
    expect(qb._calls[0]).toEqual({
      method: 'orderBy',
      args: ['v.venueName', 'ASC'],
    });
    expect(qb._calls[1]).toEqual({
      method: 'addOrderBy',
      args: ['v.companyId', 'ASC'],
    });
  });

  it('orders by venue type then venue name', () => {
    const qb = makeMockQb();
    applyAllVenuesSort(qb, 'type', 'desc');
    expect(qb._calls[0]).toEqual({
      method: 'orderBy',
      args: ['vt.venueTypeName', 'DESC'],
    });
    expect(qb._calls[1]).toEqual({
      method: 'addOrderBy',
      args: ['v.venueName', 'ASC'],
    });
  });

  it('orders by dma market then venue name', () => {
    const qb = makeMockQb();
    applyAllVenuesSort(qb, 'dma', 'asc');
    expect(qb._calls[0]).toEqual({
      method: 'orderBy',
      args: ['d.marketName', 'ASC'],
    });
    expect(qb._calls[1]).toEqual({
      method: 'addOrderBy',
      args: ['v.venueName', 'ASC'],
    });
  });

  it('orders by capacity then venue name', () => {
    const qb = makeMockQb();
    applyAllVenuesSort(qb, 'capacity', 'desc');
    expect(qb._calls[0]).toEqual({
      method: 'orderBy',
      args: ['v.seatingCapacity', 'DESC'],
    });
    expect(qb._calls[1]).toEqual({
      method: 'addOrderBy',
      args: ['v.venueName', 'ASC'],
    });
  });

  it('orders by entertainment complex subquery (not a bare alias)', () => {
    const qb = makeMockQb();
    applyAllVenuesSort(qb, 'complex', 'asc');
    expect(qb._calls[0].method).toBe('orderBy');
    expect(qb._calls[0].args[0]).toBe(
      ALL_VENUES_ENTERTAINMENT_COMPLEX_NAMES_SQL,
    );
    expect(qb._calls[0].args[1]).toBe('ASC');
    expect(qb._calls[1]).toEqual({
      method: 'addOrderBy',
      args: ['v.venueName', 'ASC'],
    });
  });
});
