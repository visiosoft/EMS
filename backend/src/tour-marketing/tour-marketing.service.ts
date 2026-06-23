import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Tour } from '../entities/tour.entity';
import { TourTicketingOfferCode } from '../entities/tour-ticketing-offer-code.entity';
import {
  SaveTourMarketingDto,
  OFFER_CODE_ASSIGNED_TO_VALUES,
  OFFER_CODE_IAESMS_VALUES,
  OFFER_CODE_PURPOSE_VALUES,
} from './dto/save-tour-marketing.dto';

@Injectable()
export class TourMarketingService {
  constructor(
    @InjectRepository(Tour)
    private readonly tourRepo: Repository<Tour>,
    @InjectRepository(TourTicketingOfferCode)
    private readonly offerCodeRepo: Repository<TourTicketingOfferCode>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Lookups ──────────────────────────────────────────────────────────────

  getOfferCodeOptions() {
    return {
      assignedToOptions: OFFER_CODE_ASSIGNED_TO_VALUES,
      iaeSmsOptions: OFFER_CODE_IAESMS_VALUES,
      purposeOptions: OFFER_CODE_PURPOSE_VALUES,
    };
  }

  // ── GET Tour Marketing data ──────────────────────────────────────────────

  async getTourMarketing(tourId: number) {
    const tour = await this.tourRepo.findOne({ where: { tourId } });
    if (!tour) throw new NotFoundException(`Tour ${tourId} not found`);

    // Marketing Director: contact from the tour's talent agency company with role 'Marketing Director'
    const directorRows = tour.talentAgencyCompanyId
      ? await this.dataSource.query(
          `SELECT TOP 1
            ci.[FirstName] + ' ' + ci.[LastName] AS fullName,
            ci.[Email] AS email,
            COALESCE(ci.[WorkPhone], ci.[CellPhone]) AS phone
           FROM dbo.ContactAssignment ca
           JOIN dbo.Contact c ON c.[ContactID] = ca.[ContactID]
           JOIN dbo.ContactInfo ci ON ci.[ContactInfoID] = c.[ContactInfoID]
           JOIN dbo.Role r ON r.[RoleID] = ca.[RoleID]
           WHERE ca.[CompanyID] = @0 AND r.[RoleName] = 'Marketing Director'
           ORDER BY ca.[ContactAssignmentID] ASC`,
          [tour.talentAgencyCompanyId],
        )
      : [];
    const director = directorRows.length > 0 ? directorRows[0] : null;

    // Audience age ranges
    const ageRangeRows: { ageRangeId: number; ageRangeLabel: string }[] =
      await this.dataSource.query(
        `SELECT ar.[AgeRangeID] AS ageRangeId, ar.[AgeRangeLabel] AS ageRangeLabel
         FROM dbo.TourAudienceAgeRange tar
         JOIN dbo.AgeRange ar ON ar.[AgeRangeID] = tar.[AgeRangeID]
         WHERE tar.[TourID] = @0
         ORDER BY ar.[SortOrder]`,
        [tourId],
      );

    // Media mix
    const mediaMixRows = await this.dataSource.query(
      `SELECT
        tmm.[TourMediaMixID] AS tourMediaMixId,
        tmm.[AdvertisingSubTypeID] AS advertisingSubTypeId,
        ast.[SubTypeName] AS subTypeName,
        ast.[ParentCategory] AS parentCategory,
        tmm.[CompanyID] AS companyId,
        c.[CompanyName] AS companyName
       FROM dbo.TourMediaMix tmm
       LEFT JOIN dbo.AdvertisingSubType ast ON ast.[AdvertisingSubTypeID] = tmm.[AdvertisingSubTypeID]
       LEFT JOIN dbo.Company c ON c.[CompanyID] = tmm.[CompanyID]
       WHERE tmm.[TourID] = @0
       ORDER BY ast.[ParentCategory], ast.[SubTypeName]`,
      [tourId],
    );

    // Offer codes
    const offerCodes = await this.offerCodeRepo.find({
      where: { tourId },
      order: { offerCodeId: 'ASC' },
    });

    return {
      tourId: tour.tourId,
      marketingDirector: director
        ? {
            name: director.fullName?.trim() || null,
            email: director.email?.trim() || null,
            phone: director.phone?.trim() || null,
          }
        : null,
      audienceGender: tour.audienceGender,
      audienceAgeRangeIds: ageRangeRows.map((r) => r.ageRangeId),
      audienceAgeRangeLabels: ageRangeRows.map((r) => r.ageRangeLabel),
      mediaMix: mediaMixRows.map((r) => ({
        tourMediaMixId: Number(r.tourMediaMixId),
        advertisingSubTypeId: Number(r.advertisingSubTypeId),
        subTypeName: String(r.subTypeName ?? ''),
        parentCategory: r.parentCategory ? String(r.parentCategory).trim() : null,
        companyId: r.companyId != null ? Number(r.companyId) : null,
        companyName: r.companyName ? String(r.companyName).trim() : null,
      })),
      offerCodes: offerCodes.map((c) => ({
        offerCodeId: c.offerCodeId,
        code: c.code,
        assignedTo: c.assignedTo,
        iaeSms: c.iaeSms,
        purpose: c.purpose,
      })),
    };
  }

  // ── SAVE (full replace) ──────────────────────────────────────────────────

  async saveTourMarketing(tourId: number, dto: SaveTourMarketingDto) {
    const tour = await this.tourRepo.findOne({ where: { tourId } });
    if (!tour) throw new NotFoundException(`Tour ${tourId} not found`);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Audience Gender
      if (dto.audienceGender !== undefined) {
        tour.audienceGender = dto.audienceGender ?? null;
        await queryRunner.manager.save(tour);
      }

      // Audience Age Ranges
      if (dto.audienceAgeRangeIds !== undefined) {
        await queryRunner.query(
          `DELETE FROM dbo.TourAudienceAgeRange WHERE [TourID] = @0`,
          [tourId],
        );
        for (const ageRangeId of dto.audienceAgeRangeIds) {
          await queryRunner.query(
            `INSERT INTO dbo.TourAudienceAgeRange ([TourID], [AgeRangeID]) VALUES (@0, @1)`,
            [tourId, ageRangeId],
          );
        }
        // Keep denormalized dbo.Tour.AudienceAgeRange in sync (same as Details tab)
        const labelRows = dto.audienceAgeRangeIds.length
          ? await queryRunner.query(
              `SELECT [AgeRangeLabel] AS label FROM dbo.AgeRange WHERE [AgeRangeID] IN (${dto.audienceAgeRangeIds.map((_, i) => `@${i}`).join(',')}) ORDER BY [SortOrder]`,
              dto.audienceAgeRangeIds,
            ) as { label: string }[]
          : [];
        const ageRangeStr = labelRows.map((r) => r.label).filter(Boolean).join(', ') || null;
        await queryRunner.query(
          `UPDATE dbo.Tour SET [AudienceAgeRange] = @0 WHERE [TourID] = @1`,
          [ageRangeStr, tourId],
        );
      }

      // Media Mix
      if (dto.mediaMix !== undefined) {
        await queryRunner.query(
          `DELETE FROM dbo.TourMediaMix WHERE [TourID] = @0`,
          [tourId],
        );
        for (const entry of dto.mediaMix) {
          await queryRunner.query(
            `INSERT INTO dbo.TourMediaMix ([TourID], [AdvertisingSubTypeID], [CompanyID])
             VALUES (@0, @1, @2)`,
            [tourId, entry.advertisingSubTypeId, entry.companyId ?? null],
          );
        }
      }

      // Offer Codes
      if (dto.offerCodes !== undefined) {
        // Remove codes not in incoming list
        const existingCodes = await this.offerCodeRepo.find({ where: { tourId } });
        const incomingIds = dto.offerCodes
          .filter((c) => c.offerCodeId != null)
          .map((c) => c.offerCodeId!);
        const toDelete = existingCodes.filter(
          (c) => !incomingIds.includes(c.offerCodeId),
        );
        if (toDelete.length > 0) {
          await queryRunner.manager.delete(TourTicketingOfferCode, {
            offerCodeId: In(toDelete.map((c) => c.offerCodeId)),
          });
        }

        for (const codeDto of dto.offerCodes) {
          if (codeDto.offerCodeId) {
            await queryRunner.manager.update(
              TourTicketingOfferCode,
              codeDto.offerCodeId,
              {
                code: codeDto.code,
                assignedTo: codeDto.assignedTo ?? null,
                iaeSms: codeDto.iaeSms ?? null,
                purpose: codeDto.purpose ?? null,
              },
            );
          } else {
            const newCode = this.offerCodeRepo.create({
              tourId,
              code: codeDto.code,
              assignedTo: codeDto.assignedTo ?? null,
              iaeSms: codeDto.iaeSms ?? null,
              purpose: codeDto.purpose ?? null,
            });
            await queryRunner.manager.save(newCode);
          }
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.getTourMarketing(tourId);
  }

  // ── DELETE a single offer code ───────────────────────────────────────────

  async deleteOfferCode(tourId: number, offerCodeId: number) {
    const code = await this.offerCodeRepo.findOne({
      where: { offerCodeId, tourId },
    });
    if (!code) {
      throw new NotFoundException(`Offer code ${offerCodeId} not found for tour ${tourId}`);
    }
    await this.offerCodeRepo.delete({ offerCodeId });
  }
}
