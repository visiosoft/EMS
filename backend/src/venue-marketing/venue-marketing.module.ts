import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
import { VenueMarketingController } from './venue-marketing.controller';
import { VenueMarketingService } from './venue-marketing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VenueStyleGuide,
      VenueMarketingSpecs,
      VenueMarketingSpecsLocalization,
      VenueMarketingSpecsTag,
      VenueMarketingSpecsFileSpec,
      PlacementCategory,
      Medium,
      LocalizationOption,
      TagOption,
      FileSpecOption,
      FileFormatOption,
      Link,
    ]),
  ],
  controllers: [VenueMarketingController],
  providers: [VenueMarketingService],
  exports: [VenueMarketingService],
})
export class VenueMarketingModule {}
