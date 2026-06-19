import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateEngagementFinanceDto } from './update-engagement-finance.dto';

describe('UpdateEngagementFinanceDto – final attraction compensation fields', () => {
  async function validateDto(plain: Record<string, unknown>) {
    const dto = plainToInstance(UpdateEngagementFinanceDto, plain);
    return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  }

  it('should accept valid finalGuaranteeAmount', async () => {
    const errors = await validateDto({ finalGuaranteeAmount: 1500.50 });
    const fieldErrors = errors.filter((e) => e.property === 'finalGuaranteeAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept null finalGuaranteeAmount', async () => {
    const errors = await validateDto({ finalGuaranteeAmount: null });
    const fieldErrors = errors.filter((e) => e.property === 'finalGuaranteeAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept valid finalRoyaltyAmount', async () => {
    const errors = await validateDto({ finalRoyaltyAmount: 2000.00 });
    const fieldErrors = errors.filter((e) => e.property === 'finalRoyaltyAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept valid finalOverageAmount', async () => {
    const errors = await validateDto({ finalOverageAmount: 300.75 });
    const fieldErrors = errors.filter((e) => e.property === 'finalOverageAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept valid finalBuyoutAmount', async () => {
    const errors = await validateDto({ finalBuyoutAmount: 5000 });
    const fieldErrors = errors.filter((e) => e.property === 'finalBuyoutAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept valid finalDirectCompanyCharges', async () => {
    const errors = await validateDto({ finalDirectCompanyCharges: 800.99 });
    const fieldErrors = errors.filter((e) => e.property === 'finalDirectCompanyCharges');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept valid finalReimbursables', async () => {
    const errors = await validateDto({ finalReimbursables: 120.50 });
    const fieldErrors = errors.filter((e) => e.property === 'finalReimbursables');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept string numbers via transform', async () => {
    const errors = await validateDto({ finalGuaranteeAmount: '2500.00' });
    const fieldErrors = errors.filter((e) => e.property === 'finalGuaranteeAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should accept empty string as null via transform', async () => {
    const dto = plainToInstance(UpdateEngagementFinanceDto, { finalGuaranteeAmount: '' });
    const errors = await validate(dto, { whitelist: true });
    // Transform converts '' to null which is valid
    const fieldErrors = errors.filter((e) => e.property === 'finalGuaranteeAmount');
    expect(fieldErrors).toHaveLength(0);
  });

  it('should reject too many decimal places', async () => {
    const errors = await validateDto({ finalGuaranteeAmount: 100.123 });
    const fieldErrors = errors.filter((e) => e.property === 'finalGuaranteeAmount');
    expect(fieldErrors.length).toBeGreaterThan(0);
  });

  it('should allow all fields simultaneously', async () => {
    const errors = await validateDto({
      finalGuaranteeAmount: 1000,
      finalRoyaltyAmount: 2000,
      finalOverageAmount: 500,
      finalBuyoutAmount: 3000,
      finalDirectCompanyCharges: 400,
      finalReimbursables: 100,
    });
    const relevantErrors = errors.filter((e) =>
      e.property.startsWith('final'),
    );
    expect(relevantErrors).toHaveLength(0);
  });
});
