"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlacementCategory = void 0;
const typeorm_1 = require("typeorm");
const medium_entity_1 = require("./medium.entity");
let PlacementCategory = class PlacementCategory {
    placementCategoryId;
    placementName;
    mediumId;
    medium;
    sizeUnit;
    isActive;
    sortOrder;
};
exports.PlacementCategory = PlacementCategory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'PlacementCategoryID' }),
    __metadata("design:type", Number)
], PlacementCategory.prototype, "placementCategoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'PlacementName', type: 'nvarchar', length: 100 }),
    __metadata("design:type", String)
], PlacementCategory.prototype, "placementName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'MediumID', type: 'int' }),
    __metadata("design:type", Number)
], PlacementCategory.prototype, "mediumId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => medium_entity_1.Medium),
    (0, typeorm_1.JoinColumn)({ name: 'MediumID' }),
    __metadata("design:type", medium_entity_1.Medium)
], PlacementCategory.prototype, "medium", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SizeUnit', type: 'nvarchar', length: 20, nullable: true }),
    __metadata("design:type", Object)
], PlacementCategory.prototype, "sizeUnit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'IsActive', type: 'bit' }),
    __metadata("design:type", Boolean)
], PlacementCategory.prototype, "isActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'SortOrder', type: 'int', nullable: true }),
    __metadata("design:type", Object)
], PlacementCategory.prototype, "sortOrder", void 0);
exports.PlacementCategory = PlacementCategory = __decorate([
    (0, typeorm_1.Entity)({ name: 'PlacementCategory', schema: 'dbo' })
], PlacementCategory);
//# sourceMappingURL=placement-category.entity.js.map