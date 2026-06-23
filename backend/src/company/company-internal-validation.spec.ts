import { ConflictException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { CompanyService } from './company.service';

type InternalCompanyValidator = {
  assertSingleInternalCompany(
    manager: EntityManager,
    excludedCompanyId?: number,
  ): Promise<void>;
};

describe('CompanyService internal-company validation', () => {
  const service = Object.create(
    CompanyService.prototype,
  ) as InternalCompanyValidator;

  it('allows the flag when no other internal company exists', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;

    await expect(
      service.assertSingleInternalCompany(manager, 12),
    ).resolves.toBeUndefined();
  });

  it('returns a friendly conflict naming the current internal company', async () => {
    const query = jest.fn().mockResolvedValue([
      { companyId: 12, companyName: 'Innovation Arts & Entertainment' },
    ]);
    const manager = {
      query,
    } as unknown as EntityManager;

    let error: unknown;
    try {
      await service.assertSingleInternalCompany(manager, 24);
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'INTERNAL_COMPANY_ALREADY_EXISTS',
      message: expect.stringContaining('Innovation Arts & Entertainment'),
      suggestion: expect.stringContaining('uncheck'),
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('CompanyID <> @0'),
      [24],
    );
  });
});
