"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueMarketingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const venue_style_guide_entity_1 = require("../entities/venue-style-guide.entity");
const venue_marketing_specs_entity_1 = require("../entities/venue-marketing-specs.entity");
const venue_marketing_specs_localization_entity_1 = require("../entities/venue-marketing-specs-localization.entity");
const venue_marketing_specs_tag_entity_1 = require("../entities/venue-marketing-specs-tag.entity");
const venue_marketing_specs_file_spec_entity_1 = require("../entities/venue-marketing-specs-file-spec.entity");
const placement_category_entity_1 = require("../entities/placement-category.entity");
const medium_entity_1 = require("../entities/medium.entity");
const localization_option_entity_1 = require("../entities/localization-option.entity");
const tag_option_entity_1 = require("../entities/tag-option.entity");
const file_spec_option_entity_1 = require("../entities/file-spec-option.entity");
const file_format_option_entity_1 = require("../entities/file-format-option.entity");
const link_entity_1 = require("../entities/link.entity");
const venue_marketing_controller_1 = require("./venue-marketing.controller");
const venue_marketing_service_1 = require("./venue-marketing.service");
let VenueMarketingModule = class VenueMarketingModule {
};
exports.VenueMarketingModule = VenueMarketingModule;
exports.VenueMarketingModule = VenueMarketingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                venue_style_guide_entity_1.VenueStyleGuide,
                venue_marketing_specs_entity_1.VenueMarketingSpecs,
                venue_marketing_specs_localization_entity_1.VenueMarketingSpecsLocalization,
                venue_marketing_specs_tag_entity_1.VenueMarketingSpecsTag,
                venue_marketing_specs_file_spec_entity_1.VenueMarketingSpecsFileSpec,
                placement_category_entity_1.PlacementCategory,
                medium_entity_1.Medium,
                localization_option_entity_1.LocalizationOption,
                tag_option_entity_1.TagOption,
                file_spec_option_entity_1.FileSpecOption,
                file_format_option_entity_1.FileFormatOption,
                link_entity_1.Link,
            ]),
        ],
        controllers: [venue_marketing_controller_1.VenueMarketingController],
        providers: [venue_marketing_service_1.VenueMarketingService],
        exports: [venue_marketing_service_1.VenueMarketingService],
    })
], VenueMarketingModule);
//# sourceMappingURL=venue-marketing.module.js.map