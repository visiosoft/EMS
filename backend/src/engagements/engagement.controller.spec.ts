import { Test, TestingModule } from '@nestjs/testing';
import { ContractExtractionService } from './contract-extraction.service';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';

describe('EngagementController', () => {
  let controller: EngagementController;
  let service: jest.Mocked<Partial<EngagementService>>;

  beforeEach(async () => {
    service = {
      upsertFinance: jest.fn().mockResolvedValue(undefined),
      updateNonResidentWithholding: jest.fn().mockResolvedValue(undefined),
      updateVenueTabPerVenue: jest.fn().mockResolvedValue(undefined),
      upsertEngagementLink: jest.fn().mockResolvedValue({ engagementLinkId: 1, linkId: 10 }),
      removeEngagementLink: jest.fn().mockResolvedValue(undefined),
      getDepositTerms: jest.fn().mockResolvedValue({ depositAmount: 5000, depositDueDate: '2026-08-15' }),
      updateDepositTerms: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EngagementController],
      providers: [
        { provide: EngagementService, useValue: service },
        { provide: ContractExtractionService, useValue: { extractFromFile: jest.fn() } },
      ],
    }).compile();

    controller = module.get<EngagementController>(EngagementController);
  });

  describe('updateNonResidentWithholding', () => {
    it('should delegate to service with nrwId and dto', async () => {
      const dto = {
        withholdingArea: 'NY',
        withholdingTaxRate: 5.5,
        withholdingAgencyName: 'Tax Agency',
        iaeWaiverSubmissionDate: '2026-01-15',
        iaeWaiverAppNumber: 'APP-123',
      };

      await controller.updateNonResidentWithholding(42, dto);

      expect(service.updateNonResidentWithholding).toHaveBeenCalledWith(42, dto);
    });

    it('should handle partial dto with only withholdingArea', async () => {
      const dto = { withholdingArea: 'CA' };

      await controller.updateNonResidentWithholding(7, dto);

      expect(service.updateNonResidentWithholding).toHaveBeenCalledWith(7, dto);
    });

    it('should handle null values in dto', async () => {
      const dto = { withholdingArea: null, withholdingTaxRate: null };

      await controller.updateNonResidentWithholding(1, dto);

      expect(service.updateNonResidentWithholding).toHaveBeenCalledWith(1, dto);
    });
  });

  describe('upsertEngagementLink', () => {
    it('should delegate to service and return created link', async () => {
      const dto = { linkUrl: 'https://example.com/contract.pdf', linkName: 'Contract', linkPurpose: 'Contract' };

      const result = await controller.upsertEngagementLink(100, dto);

      expect(service.upsertEngagementLink).toHaveBeenCalledWith(100, dto);
      expect(result).toEqual({ engagementLinkId: 1, linkId: 10 });
    });

    it('should work without linkName', async () => {
      const dto = { linkUrl: 'https://example.com/forecast.xlsx', linkPurpose: 'Forecast' };

      await controller.upsertEngagementLink(5, dto);

      expect(service.upsertEngagementLink).toHaveBeenCalledWith(5, dto);
    });
  });

  describe('removeEngagementLink', () => {
    it('should delegate to service with engagement id and link id', async () => {
      await controller.removeEngagementLink(10, 55);

      expect(service.removeEngagementLink).toHaveBeenCalledWith(10, 55);
    });
  });

  // ── Deposit Terms (commit 0c8cf8e) ──────────────────────────────────────

  describe('getDepositTerms', () => {
    it('should delegate to service and return deposit terms', async () => {
      const result = await controller.getDepositTerms(42);

      expect(service.getDepositTerms).toHaveBeenCalledWith(42);
      expect(result).toEqual({ depositAmount: 5000, depositDueDate: '2026-08-15' });
    });
  });

  describe('updateDepositTerms', () => {
    it('should delegate to service with id and dto', async () => {
      const dto = { depositAmount: 3000, depositDueDate: '2026-09-01' };

      await controller.updateDepositTerms(7, dto);

      expect(service.updateDepositTerms).toHaveBeenCalledWith(7, dto);
    });

    it('should handle partial dto with only depositAmount', async () => {
      const dto = { depositAmount: 1500 };

      await controller.updateDepositTerms(3, dto);

      expect(service.updateDepositTerms).toHaveBeenCalledWith(3, dto);
    });

    it('should handle null values', async () => {
      const dto = { depositAmount: null, depositDueDate: null };

      await controller.updateDepositTerms(1, dto);

      expect(service.updateDepositTerms).toHaveBeenCalledWith(1, dto);
    });
  });
});
