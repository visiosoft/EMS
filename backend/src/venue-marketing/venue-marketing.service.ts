import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { VenueStyleGuide } from '../entities/venue-style-guide.entity';
import { VenueMarketingSpecs } from '../entities/venue-marketing-specs.entity';
import { VenueMarketingSpecsLocalization } from '../entities/venue-marketing-specs-localization.entity';
import { VenueMarketingSpecsTag } from '../entities/venue-marketing-specs-tag.entity';
import { VenueMarketingSpecsFileSpec } from '../entities/venue-marketing-specs-file-spec.entity';
import { PlacementCategory } from '../entities/placement-category.entity';
import { Medium } from '../entities/medium.entity';
import { LocalizationOption } from '../entities/localization-option.entity';
import { TagOption } from '../entities/tag-option.entity';
import { FileSpecOption } from '../entities/file-spec-option.entity';
import { FileFormatOption } from '../entities/file-format-option.entity';
import { Link } from '../entities/link.entity';
import { SaveVenueMarketingDto } from './dto/save-venue-marketing.dto';

@Injectable()
export class VenueMarketingService {
  constructor(
    @InjectRepository(VenueStyleGuide)
    private readonly styleGuideRepo: Repository<VenueStyleGuide>,
    @InjectRepository(VenueMarketingSpecs)
    private readonly specsRepo: Repository<VenueMarketingSpecs>,
    @InjectRepository(VenueMarketingSpecsLocalization)
    private readonly localizationRepo: Repository<VenueMarketingSpecsLocalization>,
    @InjectRepository(VenueMarketingSpecsTag)
    private readonly tagRepo: Repository<VenueMarketingSpecsTag>,
    @InjectRepository(VenueMarketingSpecsFileSpec)
    private readonly fileSpecRepo: Repository<VenueMarketingSpecsFileSpec>,
    @InjectRepository(PlacementCategory)
    private readonly placementCategoryRepo: Repository<PlacementCategory>,
    @InjectRepository(Medium)
    private readonly mediumRepo: Repository<Medium>,
    @InjectRepository(LocalizationOption)
    private readonly localizationOptionRepo: Repository<LocalizationOption>,
    @InjectRepository(TagOption)
    private readonly tagOptionRepo: Repository<TagOption>,
    @InjectRepository(FileSpecOption)
    private readonly fileSpecOptionRepo: Repository<FileSpecOption>,
    @InjectRepository(FileFormatOption)
    private readonly fileFormatOptionRepo: Repository<FileFormatOption>,
    @InjectRepository(Link)
    private readonly linkRepo: Repository<Link>,
    private readonly dataSource: DataSource,
  ) {}

  // ── Lookups ──────────────────────────────────────────────────────────────

  async getPlacementCategories() {
    return this.placementCategoryRepo.find({
      relations: ['medium'],
      order: { sortOrder: 'ASC', placementName: 'ASC' },
    });
  }

  async getMediums() {
    return this.mediumRepo.find({ order: { mediumName: 'ASC' } });
  }

  async getLocalizationOptions() {
    return this.localizationOptionRepo.find({ order: { sortOrder: 'ASC', localizationName: 'ASC' } });
  }

  async getTagOptions() {
    return this.tagOptionRepo.find({ order: { sortOrder: 'ASC', tagName: 'ASC' } });
  }

  async getFileSpecOptions() {
    return this.fileSpecOptionRepo.find({ order: { sortOrder: 'ASC', fileSpecName: 'ASC' } });
  }

  async getFileFormatOptions() {
    return this.fileFormatOptionRepo.find({ order: { sortOrder: 'ASC', fileFormatName: 'ASC' } });
  }

  // ── GET marketing data for a venue ───────────────────────────────────────

  async getVenueMarketing(venueId: number) {
    const specs = await this.specsRepo.find({
      where: { venueId },
      relations: ['placementCategory', 'placementCategory.medium', 'fileFormat', 'venueStyleGuide'],
      order: { venueMarketingSpecsId: 'ASC' },
    });

    // Style guide is linked through specs — get from the first spec that has one
    const styleGuide = specs.find((s) => s.venueStyleGuide)?.venueStyleGuide ?? null;

    // Logo URL is stored in the Link table, matched by LinkName + LinkPath(=styleGuideId)
    let logoUrl: string | null = null;
    if (styleGuide) {
      const logoLink = await this.linkRepo.findOne({
        where: { linkName: 'VenueStyleGuideLogoUrl', linkPath: String(styleGuide.venueStyleGuideId) },
      });
      logoUrl = logoLink?.linkUrl ?? null;
    }

    const specIds = specs.map((s) => s.venueMarketingSpecsId);

    let localizations: VenueMarketingSpecsLocalization[] = [];
    let tags: VenueMarketingSpecsTag[] = [];
    let fileSpecs: VenueMarketingSpecsFileSpec[] = [];

    if (specIds.length > 0) {
      [localizations, tags, fileSpecs] = await Promise.all([
        this.localizationRepo.find({
          where: { venueMarketingSpecsId: In(specIds) },
          relations: ['localizationOption'],
        }),
        this.tagRepo.find({
          where: { venueMarketingSpecsId: In(specIds) },
          relations: ['tagOption'],
        }),
        this.fileSpecRepo.find({
          where: { venueMarketingSpecsId: In(specIds) },
          relations: ['fileSpecOption'],
        }),
      ]);
    }

    return {
      styleGuideEnabled: specs.length > 0 ? specs[0].styleGuideEnabled : false,
      styleGuide: styleGuide
        ? {
            venueStyleGuideId: styleGuide.venueStyleGuideId,
            font: styleGuide.font,
            primaryColors: styleGuide.primaryColors,
            accentColors: styleGuide.accentColors,
            notes: styleGuide.notes,
            logoUrl,
          }
        : null,
      specs: specs.map((spec) => ({
        venueMarketingSpecsId: spec.venueMarketingSpecsId,
        fileName: spec.fileName,
        placementCategoryId: spec.placementCategoryId,
        placementCategoryName: spec.placementCategory?.placementName ?? null,
        mediumName: spec.placementCategory?.medium?.mediumName ?? null,
        sizeUnit: spec.placementCategory?.sizeUnit ?? null,
        graphicSizeHorizontal: spec.graphicSizeHorizontal,
        graphicSizeVertical: spec.graphicSizeVertical,
        fileFormatOptionId: spec.fileFormatOptionId,
        fileFormatName: spec.fileFormat?.fileFormatName ?? null,
        notes: spec.notes,
        localizations: localizations
          .filter((l) => l.venueMarketingSpecsId === spec.venueMarketingSpecsId)
          .map((l) => ({
            localizationOptionId: l.localizationOptionId,
            localizationName: l.localizationOption?.localizationName ?? null,
            customValue: l.customValue,
          })),
        tags: tags
          .filter((t) => t.venueMarketingSpecsId === spec.venueMarketingSpecsId)
          .map((t) => ({
            tagOptionId: t.tagOptionId,
            tagName: t.tagOption?.tagName ?? null,
          })),
        fileSpecs: fileSpecs
          .filter((f) => f.venueMarketingSpecsId === spec.venueMarketingSpecsId)
          .map((f) => ({
            fileSpecOptionId: f.fileSpecOptionId,
            fileSpecName: f.fileSpecOption?.fileSpecName ?? null,
            customValue: f.customValue,
          })),
      })),
    };
  }

  // ── SAVE (upsert) marketing data ─────────────────────────────────────────

  async saveVenueMarketing(venueId: number, dto: SaveVenueMarketingDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Style Guide — no VenueCompanyID on this table; it's linked via VenueMarketingSpecs.VenueStyleGuideID
      let styleGuideId: number | null = null;
      if (dto.styleGuideEnabled && dto.styleGuide) {
        // Check if there's already a style guide referenced by existing specs for this venue
        const existingSpec = await this.specsRepo.findOne({
          where: { venueId },
          relations: ['venueStyleGuide'],
        });
        const existing = existingSpec?.venueStyleGuide ?? null;

        if (existing) {
          existing.font = dto.styleGuide.font ?? null;
          existing.primaryColors = dto.styleGuide.primaryColors ?? null;
          existing.accentColors = dto.styleGuide.accentColors ?? null;
          existing.notes = dto.styleGuide.notes ?? null;
          const saved = await queryRunner.manager.save(existing);
          styleGuideId = saved.venueStyleGuideId;

          // Upsert logo in Link table
          await this.upsertLogoLink(queryRunner, saved, dto.styleGuide.logoUrl);
        } else {
          const newGuide = this.styleGuideRepo.create({
            font: dto.styleGuide.font ?? null,
            primaryColors: dto.styleGuide.primaryColors ?? null,
            accentColors: dto.styleGuide.accentColors ?? null,
            notes: dto.styleGuide.notes ?? null,
          });
          const saved = await queryRunner.manager.save(newGuide);
          styleGuideId = saved.venueStyleGuideId;

          // Upsert logo in Link table
          await this.upsertLogoLink(queryRunner, saved, dto.styleGuide.logoUrl);
        }

      }

      // Remove old specs that are not in the incoming list
      const existingSpecs = await this.specsRepo.find({ where: { venueId } });
      const incomingIds = dto.specs
        .filter((s) => s.venueMarketingSpecsId != null)
        .map((s) => s.venueMarketingSpecsId!);
      const toDelete = existingSpecs.filter(
        (s) => !incomingIds.includes(s.venueMarketingSpecsId),
      );
      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((s) => s.venueMarketingSpecsId);
        await queryRunner.manager.delete(VenueMarketingSpecsLocalization, {
          venueMarketingSpecsId: In(deleteIds),
        });
        await queryRunner.manager.delete(VenueMarketingSpecsTag, {
          venueMarketingSpecsId: In(deleteIds),
        });
        await queryRunner.manager.delete(VenueMarketingSpecsFileSpec, {
          venueMarketingSpecsId: In(deleteIds),
        });
        await queryRunner.manager.delete(VenueMarketingSpecs, {
          venueMarketingSpecsId: In(deleteIds),
        });
      }

      // If style guide is enabled but no spec rows provided, ensure at least one
      // VenueMarketingSpecs row exists so the style guide is linked to the venue.
      if (dto.styleGuideEnabled && styleGuideId && dto.specs.length === 0) {
        const existingSpecForVenue = await this.specsRepo.findOne({ where: { venueId } });
        if (!existingSpecForVenue) {
          const headerSpec = this.specsRepo.create({
            venueId,
            styleGuideEnabled: true,
            venueStyleGuideId: styleGuideId,
          });
          await queryRunner.manager.save(headerSpec);
        } else {
          // Update existing spec to point to the style guide
          await queryRunner.manager.update(VenueMarketingSpecs, existingSpecForVenue.venueMarketingSpecsId, {
            styleGuideEnabled: true,
            venueStyleGuideId: styleGuideId,
          });
        }
      }

      // Upsert each spec row
      for (const specDto of dto.specs) {
        let specId: number;

        if (specDto.venueMarketingSpecsId) {
          // Update existing
          await queryRunner.manager.update(VenueMarketingSpecs, specDto.venueMarketingSpecsId, {
            styleGuideEnabled: dto.styleGuideEnabled,
            venueStyleGuideId: styleGuideId,
            fileName: specDto.fileName ?? null,
            placementCategoryId: specDto.placementCategoryId ?? null,
            graphicSizeHorizontal: specDto.graphicSizeHorizontal ?? null,
            graphicSizeVertical: specDto.graphicSizeVertical ?? null,
            fileFormatOptionId: specDto.fileFormatOptionId ?? null,
            notes: specDto.notes ?? null,
          });
          specId = specDto.venueMarketingSpecsId;
        } else {
          // Insert new
          const newSpec = this.specsRepo.create({
            venueId,
            styleGuideEnabled: dto.styleGuideEnabled,
            venueStyleGuideId: styleGuideId,
            fileName: specDto.fileName ?? null,
            placementCategoryId: specDto.placementCategoryId ?? null,
            graphicSizeHorizontal: specDto.graphicSizeHorizontal ?? null,
            graphicSizeVertical: specDto.graphicSizeVertical ?? null,
            fileFormatOptionId: specDto.fileFormatOptionId ?? null,
            notes: specDto.notes ?? null,
          });
          const saved = await queryRunner.manager.save(newSpec);
          specId = saved.venueMarketingSpecsId;
        }

        // Replace junction rows for this spec
        await queryRunner.manager.delete(VenueMarketingSpecsLocalization, {
          venueMarketingSpecsId: specId,
        });
        await queryRunner.manager.delete(VenueMarketingSpecsTag, {
          venueMarketingSpecsId: specId,
        });
        await queryRunner.manager.delete(VenueMarketingSpecsFileSpec, {
          venueMarketingSpecsId: specId,
        });

        if (specDto.localizations?.length) {
          const rows = specDto.localizations.map((l) =>
            this.localizationRepo.create({
              venueMarketingSpecsId: specId,
              localizationOptionId: l.localizationOptionId,
              customValue: l.customValue ?? null,
            }),
          );
          await queryRunner.manager.save(rows);
        }

        if (specDto.tags?.length) {
          const rows = specDto.tags.map((t) =>
            this.tagRepo.create({
              venueMarketingSpecsId: specId,
              tagOptionId: t.tagOptionId,
            }),
          );
          await queryRunner.manager.save(rows);
        }

        if (specDto.fileSpecs?.length) {
          const rows = specDto.fileSpecs.map((f) =>
            this.fileSpecRepo.create({
              venueMarketingSpecsId: specId,
              fileSpecOptionId: f.fileSpecOptionId,
              customValue: f.customValue ?? null,
            }),
          );
          await queryRunner.manager.save(rows);
        }
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return this.getVenueMarketing(venueId);
  }

  // ── DELETE a single spec row ─────────────────────────────────────────────

  async deleteSpec(venueId: number, specId: number) {
    const spec = await this.specsRepo.findOne({
      where: { venueMarketingSpecsId: specId, venueId },
    });
    if (!spec) {
      throw new NotFoundException(`Spec ${specId} not found for venue ${venueId}`);
    }
    await this.localizationRepo.delete({ venueMarketingSpecsId: specId });
    await this.tagRepo.delete({ venueMarketingSpecsId: specId });
    await this.fileSpecRepo.delete({ venueMarketingSpecsId: specId });
    await this.specsRepo.delete({ venueMarketingSpecsId: specId });
  }

  // ── Helper: upsert logo in Link table ────────────────────────────────────
  // Uses LinkName='VenueStyleGuideLogoUrl' + LinkPath=<styleGuideId> to identify the row.
  // TODO: Once LogoLinkID column is added to DB, also update styleGuide.logoLinkId here.

  private async upsertLogoLink(
    queryRunner: import('typeorm').QueryRunner,
    styleGuide: VenueStyleGuide,
    logoUrl?: string | null,
  ) {
    const trimmed = logoUrl?.trim() || null;
    const styleGuideIdStr = String(styleGuide.venueStyleGuideId);

    const existingLink = await this.linkRepo.findOne({
      where: { linkName: 'VenueStyleGuideLogoUrl', linkPath: styleGuideIdStr },
    });

    if (trimmed) {
      if (existingLink) {
        existingLink.linkUrl = trimmed;
        await queryRunner.manager.save(existingLink);
      } else {
        const newLink = this.linkRepo.create({
          linkName: 'VenueStyleGuideLogoUrl',
          linkType: 'URL',
          linkUrl: trimmed,
          linkPath: styleGuideIdStr,
        });
        await queryRunner.manager.save(newLink);
      }
    } else if (existingLink) {
      await queryRunner.manager.remove(existingLink);
    }
  }
}
