import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TourMarketingService } from './tour-marketing.service';
import { Tour } from '../entities/tour.entity';
import { TourTicketingOfferCode } from '../entities/tour-ticketing-offer-code.entity';
import {
  OFFER_CODE_ASSIGNED_TO_VALUES,
  OFFER_CODE_IAESMS_VALUES,
  OFFER_CODE_PURPOSE_VALUES,
} from './dto/save-tour-marketing.dto';

describe('TourMarketingService', () => {
  let service: TourMarketingService;
  let tourRepo: jest.Mocked<Partial<Repository<Tour>>>;
  let offerCodeRepo: jest.Mocked<Partial<Repository<TourTicketingOfferCode>>>;
  let dataSource: jest.Mocked<Partial<DataSource>>;

  beforeEach(async () => {
    tourRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    offerCodeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, offerCodeId: 99 })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    dataSource = {
      query: jest.fn().mockResolvedValue([]),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue([]),
        manager: {
          save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
          delete: jest.fn().mockResolvedValue({ affected: 1 }),
          update: jest.fn().mockResolvedValue({ affected: 1 }),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TourMarketingService,
        { provide: getRepositoryToken(Tour), useValue: tourRepo },
        { provide: getRepositoryToken(TourTicketingOfferCode), useValue: offerCodeRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<TourMarketingService>(TourMarketingService);
  });

  describe('getOfferCodeOptions', () => {
    it('should return all offer code option arrays', () => {
      const result = service.getOfferCodeOptions();

      expect(result.assignedToOptions).toEqual(OFFER_CODE_ASSIGNED_TO_VALUES);
      expect(result.iaeSmsOptions).toEqual(OFFER_CODE_IAESMS_VALUES);
      expect(result.purposeOptions).toEqual(OFFER_CODE_PURPOSE_VALUES);
    });

    it('should return non-empty arrays', () => {
      const result = service.getOfferCodeOptions();

      expect(result.assignedToOptions.length).toBeGreaterThan(0);
      expect(result.iaeSmsOptions.length).toBeGreaterThan(0);
      expect(result.purposeOptions.length).toBeGreaterThan(0);
    });
  });

  describe('getTourMarketing', () => {
    it('should throw NotFoundException when tour does not exist', async () => {
      tourRepo.findOne!.mockResolvedValue(null);

      await expect(service.getTourMarketing(999)).rejects.toThrow(NotFoundException);
    });

    it('should return marketing data with empty collections when no data exists', async () => {
      tourRepo.findOne!.mockResolvedValue({
        tourId: 1,
        audienceGender: null,
        talentAgencyCompanyId: null,
      } as any);

      const result = await service.getTourMarketing(1);

      expect(result.tourId).toBe(1);
      expect(result.marketingDirector).toBeNull();
      expect(result.audienceGender).toBeNull();
      expect(result.audienceAgeRangeIds).toEqual([]);
      expect(result.audienceAgeRangeLabels).toEqual([]);
      expect(result.mediaMix).toEqual([]);
      expect(result.offerCodes).toEqual([]);
    });

    it('should query marketing director from talent agency company', async () => {
      tourRepo.findOne!.mockResolvedValue({
        tourId: 5,
        audienceGender: 'Mixed',
        talentAgencyCompanyId: 100,
      } as any);
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([{ fullName: 'Jane Smith', email: 'jane@test.com', phone: '555-1234' }]) // director
        .mockResolvedValueOnce([]) // age ranges
        .mockResolvedValueOnce([]); // media mix

      const result = await service.getTourMarketing(5);

      expect(result.marketingDirector).toEqual({
        name: 'Jane Smith',
        email: 'jane@test.com',
        phone: '555-1234',
      });
      expect(result.audienceGender).toBe('Mixed');
    });

    it('should return offer codes from repository', async () => {
      tourRepo.findOne!.mockResolvedValue({
        tourId: 3,
        audienceGender: null,
        talentAgencyCompanyId: null,
      } as any);
      offerCodeRepo.find!.mockResolvedValue([
        { offerCodeId: 1, tourId: 3, code: 'PROMO1', assignedTo: 'IAE - Sign Up', iaeSms: null, purpose: 'Presale' },
        { offerCodeId: 2, tourId: 3, code: 'DISC10', assignedTo: null, iaeSms: 'Venue - Members', purpose: 'Discount' },
      ] as any);

      const result = await service.getTourMarketing(3);

      expect(result.offerCodes).toHaveLength(2);
      expect(result.offerCodes[0]).toEqual({
        offerCodeId: 1,
        code: 'PROMO1',
        assignedTo: 'IAE - Sign Up',
        iaeSms: null,
        purpose: 'Presale',
      });
    });

    it('should return audience age range IDs and labels', async () => {
      tourRepo.findOne!.mockResolvedValue({
        tourId: 2,
        audienceGender: 'Female',
        talentAgencyCompanyId: null,
      } as any);
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([
          { ageRangeId: 1, ageRangeLabel: '18-24' },
          { ageRangeId: 2, ageRangeLabel: '25-34' },
        ]) // age ranges
        .mockResolvedValueOnce([]); // media mix

      const result = await service.getTourMarketing(2);

      expect(result.audienceAgeRangeIds).toEqual([1, 2]);
      expect(result.audienceAgeRangeLabels).toEqual(['18-24', '25-34']);
    });

    it('should return media mix entries', async () => {
      tourRepo.findOne!.mockResolvedValue({
        tourId: 4,
        audienceGender: null,
        talentAgencyCompanyId: null,
      } as any);
      (dataSource.query as jest.Mock)
        .mockResolvedValueOnce([]) // age ranges
        .mockResolvedValueOnce([
          {
            tourMediaMixId: 10,
            advertisingSubTypeId: 5,
            subTypeName: 'Radio Ad',
            parentCategory: 'Audio',
            companyId: 200,
            companyName: 'Radio Corp',
          },
        ]); // media mix

      const result = await service.getTourMarketing(4);

      expect(result.mediaMix).toHaveLength(1);
      expect(result.mediaMix[0]).toEqual({
        tourMediaMixId: 10,
        advertisingSubTypeId: 5,
        subTypeName: 'Radio Ad',
        parentCategory: 'Audio',
        companyId: 200,
        companyName: 'Radio Corp',
      });
    });
  });

  describe('saveTourMarketing', () => {
    it('should throw NotFoundException when tour does not exist', async () => {
      tourRepo.findOne!.mockResolvedValue(null);

      await expect(
        service.saveTourMarketing(999, { audienceGender: 'Mixed' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update audience gender on tour', async () => {
      const tour = { tourId: 1, audienceGender: null } as any;
      tourRepo.findOne!.mockResolvedValue(tour);
      // For the final getTourMarketing call after save
      tourRepo.findOne!.mockResolvedValue({ ...tour, audienceGender: 'Female' });

      await service.saveTourMarketing(1, { audienceGender: 'Female' });

      const qr = (dataSource.createQueryRunner as jest.Mock)();
      expect(qr.manager.save).toHaveBeenCalled();
    });

    it('should replace audience age range IDs', async () => {
      tourRepo.findOne!.mockResolvedValue({ tourId: 2, audienceGender: null, talentAgencyCompanyId: null } as any);

      await service.saveTourMarketing(2, { audienceAgeRangeIds: [1, 3, 5] });

      const qr = (dataSource.createQueryRunner as jest.Mock)();
      // Should delete existing and insert new
      expect(qr.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dbo.TourAudienceAgeRange'),
        expect.anything(),
      );
    });

    it('should replace media mix entries', async () => {
      tourRepo.findOne!.mockResolvedValue({ tourId: 3, audienceGender: null, talentAgencyCompanyId: null } as any);

      await service.saveTourMarketing(3, {
        mediaMix: [{ advertisingSubTypeId: 10, companyId: 200 }],
      });

      const qr = (dataSource.createQueryRunner as jest.Mock)();
      expect(qr.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dbo.TourMediaMix'),
        expect.anything(),
      );
    });

    it('should rollback on error', async () => {
      tourRepo.findOne!.mockResolvedValue({ tourId: 4, audienceGender: null } as any);
      const qr = (dataSource.createQueryRunner as jest.Mock)();
      qr.manager.save.mockRejectedValueOnce(new Error('DB error'));

      await expect(
        service.saveTourMarketing(4, { audienceGender: 'Male' }),
      ).rejects.toThrow('DB error');

      expect(qr.rollbackTransaction).toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalled();
    });
  });

  describe('deleteOfferCode', () => {
    it('should throw NotFoundException when offer code does not exist', async () => {
      offerCodeRepo.findOne!.mockResolvedValue(null);

      await expect(service.deleteOfferCode(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should delete the offer code when it exists', async () => {
      offerCodeRepo.findOne!.mockResolvedValue({
        offerCodeId: 5,
        tourId: 1,
        code: 'TEST',
        assignedTo: null,
        iaeSms: null,
        purpose: null,
      } as any);

      await service.deleteOfferCode(1, 5);

      expect(offerCodeRepo.delete).toHaveBeenCalledWith({ offerCodeId: 5 });
    });

    it('should not delete offer code belonging to different tour', async () => {
      offerCodeRepo.findOne!.mockResolvedValue(null); // findOne with tourId filter returns null

      await expect(service.deleteOfferCode(2, 5)).rejects.toThrow(NotFoundException);
    });
  });
});
