import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EngagementService } from './engagement.service';
import { EngagementLink } from '../entities/engagement-link.entity';
import { Link } from '../entities/link.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

/**
 * Unit tests covering the new methods added in the engagement-module-tabs-enhancement branch.
 * These are isolated unit tests with mocked repositories.
 */
describe('EngagementService – new methods', () => {
  let service: EngagementService;
  let engagementLinkRepo: jest.Mocked<Partial<Repository<EngagementLink>>>;
  let linkRepo: jest.Mocked<Partial<Repository<Link>>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;

  beforeEach(async () => {
    engagementLinkRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, engagementLinkId: 1 })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, engagementLinkId: entity.engagementLinkId ?? 1 })),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    linkRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, linkId: 100 })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, linkId: entity.linkId ?? 100 })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    dataSource = {
      query: jest.fn().mockResolvedValue([]),
      manager: { query: jest.fn().mockResolvedValue([]) } as any,
    };

    // We create a partial mock of the service to only test specific methods
    // without needing all 30+ repository injections.
    const mockProviders = Array.from({ length: 30 }, (_, i) => ({
      provide: `MOCK_REPO_${i}`,
      useValue: {},
    }));

    // Directly instantiate a partial service with required deps
    service = Object.create(EngagementService.prototype);
    (service as any).engagementLinkRepo = engagementLinkRepo;
    (service as any).linkRepo = linkRepo;
    (service as any).dataSource = dataSource;
    (service as any).engagementRepo = {
      findOne: jest.fn().mockResolvedValue({ engagementId: 1, tourId: null }),
    };
    (service as any).engagementProductionRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, productionId: 1 })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };
  });

  describe('updateNonResidentWithholding', () => {
    it('should execute UPDATE query with valid fields', async () => {
      const dto = {
        withholdingArea: 'New York',
        withholdingTaxRate: 3.5,
        withholdingAgencyName: 'NY Tax Agency',
      };

      await service.updateNonResidentWithholding(10, dto);

      expect(dataSource.query).toHaveBeenCalledTimes(1);
      const sql = (dataSource.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('UPDATE dbo.NonResidentWithholding');
      expect(sql).toContain('[WithholdingArea]');
      expect(sql).toContain('[WithholdingTaxRate]');
      expect(sql).toContain('[WithholdingAgencyName]');
      expect(sql).toContain('WHERE [WithholdingID] = 10');
    });

    it('should set NULL for null values', async () => {
      const dto = { withholdingArea: null };

      await service.updateNonResidentWithholding(5, dto);

      const sql = (dataSource.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('[WithholdingArea] = NULL');
    });

    it('should not execute query when no fields are provided', async () => {
      await service.updateNonResidentWithholding(5, {});

      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('should not execute query for invalid ID', async () => {
      await service.updateNonResidentWithholding(0, { withholdingArea: 'TX' });

      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('should not execute query for negative ID', async () => {
      await service.updateNonResidentWithholding(-1, { withholdingArea: 'TX' });

      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('should handle iaeWaiverSubmissionDate and iaeWaiverAppNumber', async () => {
      const dto = {
        iaeWaiverSubmissionDate: '2026-03-15',
        iaeWaiverAppNumber: 'WVR-2026-001',
      };

      await service.updateNonResidentWithholding(8, dto);

      const sql = (dataSource.query as jest.Mock).mock.calls[0][0] as string;
      expect(sql).toContain('[IAEWaiverSubmissionDate]');
      expect(sql).toContain('[IAEWaiverAppNumber]');
    });
  });

  describe('upsertEngagementLink', () => {
    beforeEach(() => {
      // Mock assertEngagementExists
      (service as any).assertEngagementExists = jest.fn().mockResolvedValue(undefined);
    });

    it('should create a new link and engagement link when none exists', async () => {
      engagementLinkRepo.findOne!.mockResolvedValue(null);

      const result = await service.upsertEngagementLink(1, {
        linkUrl: 'https://sharepoint.com/contract.pdf',
        linkName: 'Contract 2026',
        linkPurpose: 'Contract',
      });

      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          linkType: 'SharePoint',
          linkUrl: 'https://sharepoint.com/contract.pdf',
          linkName: 'Contract 2026',
        }),
      );
      expect(linkRepo.save).toHaveBeenCalled();
      expect(engagementLinkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          engagementId: 1,
          linkPurpose: 'Contract',
        }),
      );
      expect(engagementLinkRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('engagementLinkId');
      expect(result).toHaveProperty('linkId');
    });

    it('should update existing link when same purpose already exists', async () => {
      engagementLinkRepo.findOne!.mockResolvedValue({
        engagementLinkId: 5,
        engagementId: 1,
        linkId: 20,
        linkPurpose: 'Forecast',
        link: { linkId: 20, linkUrl: 'old-url', linkName: 'old', linkType: 'SharePoint', linkPath: '' } as any,
      });

      const result = await service.upsertEngagementLink(1, {
        linkUrl: 'https://sharepoint.com/forecast-new.xlsx',
        linkPurpose: 'Forecast',
      });

      expect(linkRepo.update).toHaveBeenCalledWith(
        { linkId: 20 },
        expect.objectContaining({ linkUrl: 'https://sharepoint.com/forecast-new.xlsx' }),
      );
      expect(result).toEqual({ engagementLinkId: 5, linkId: 20 });
    });

    it('should throw BadRequestException when linkUrl is empty', async () => {
      await expect(
        service.upsertEngagementLink(1, { linkUrl: '', linkPurpose: 'Contract' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when linkPurpose is empty', async () => {
      await expect(
        service.upsertEngagementLink(1, { linkUrl: 'https://example.com', linkPurpose: '' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use linkPurpose as linkName when linkName is not provided', async () => {
      engagementLinkRepo.findOne!.mockResolvedValue(null);

      await service.upsertEngagementLink(1, {
        linkUrl: 'https://example.com/doc.pdf',
        linkPurpose: 'Contract',
      });

      expect(linkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          linkName: 'Contract',
        }),
      );
    });
  });

  describe('removeEngagementLink', () => {
    beforeEach(() => {
      (service as any).engagementLinkRepo = engagementLinkRepo;
    });

    it('should remove an existing engagement link', async () => {
      const mockEl = { engagementLinkId: 5, engagementId: 1, linkId: 10, linkPurpose: 'Contract', link: null as any };
      engagementLinkRepo.findOne!.mockResolvedValue(mockEl);

      await service.removeEngagementLink(1, 5);

      expect(engagementLinkRepo.remove).toHaveBeenCalledWith(mockEl);
    });

    it('should throw NotFoundException when link does not exist', async () => {
      engagementLinkRepo.findOne!.mockResolvedValue(null);

      await expect(service.removeEngagementLink(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('mergeAnnouncementDateFromProduction (private, tested via getFinanceDetail)', () => {
    it('should return base when no production row exists', async () => {
      const base = { announcementDate: null } as any;
      const method = (service as any).mergeAnnouncementDateFromProduction.bind(service);

      const result = await method(1, base);

      expect(result.announcementDate).toBeNull();
    });

    it('should return date from production row', async () => {
      (service as any).engagementProductionRepo.find.mockResolvedValue([
        { productionId: 1, engagementId: 1, announcementDate: '2026-06-15' },
      ]);
      const base = { announcementDate: null } as any;
      const method = (service as any).mergeAnnouncementDateFromProduction.bind(service);

      const result = await method(1, base);

      expect(result.announcementDate).toBe('2026-06-15');
    });

    it('should return null for empty string date', async () => {
      (service as any).engagementProductionRepo.find.mockResolvedValue([
        { productionId: 1, engagementId: 1, announcementDate: '   ' },
      ]);
      const base = { announcementDate: null } as any;
      const method = (service as any).mergeAnnouncementDateFromProduction.bind(service);

      const result = await method(1, base);

      expect(result.announcementDate).toBeNull();
    });
  });

  describe('tryPersistAnnouncementDateToProduction (private)', () => {
    it('should not persist when announcementDate is undefined in dto', async () => {
      const method = (service as any).tryPersistAnnouncementDateToProduction.bind(service);

      await method(1, {});

      expect((service as any).engagementProductionRepo.find).not.toHaveBeenCalled();
    });

    it('should create production row when none exists', async () => {
      (service as any).engagementProductionRepo.find.mockResolvedValue([]);
      (service as any).assertYmdOrNull = jest.fn().mockReturnValue('2026-06-20');
      const method = (service as any).tryPersistAnnouncementDateToProduction.bind(service);

      await method(1, { announcementDate: '2026-06-20' });

      expect((service as any).engagementProductionRepo.create).toHaveBeenCalled();
      expect((service as any).engagementProductionRepo.save).toHaveBeenCalled();
    });

    it('should set null when announcementDate is null', async () => {
      const existingProd = { productionId: 5, engagementId: 1, announcementDate: '2026-01-01' };
      (service as any).engagementProductionRepo.find.mockResolvedValue([existingProd]);
      const method = (service as any).tryPersistAnnouncementDateToProduction.bind(service);

      await method(1, { announcementDate: null });

      expect(existingProd.announcementDate).toBeNull();
      expect((service as any).engagementProductionRepo.save).toHaveBeenCalled();
    });

    it('should set null when announcementDate is empty string', async () => {
      const existingProd = { productionId: 5, engagementId: 1, announcementDate: '2026-01-01' };
      (service as any).engagementProductionRepo.find.mockResolvedValue([existingProd]);
      const method = (service as any).tryPersistAnnouncementDateToProduction.bind(service);

      await method(1, { announcementDate: '' });

      expect(existingProd.announcementDate).toBeNull();
    });
  });
});
