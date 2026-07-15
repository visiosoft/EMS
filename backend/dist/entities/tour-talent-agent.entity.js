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
exports.TourTalentAgent = void 0;
const typeorm_1 = require("typeorm");
const audit_columns_1 = require("../audit/audit-columns");
const contact_entity_1 = require("./contact.entity");
const tour_entity_1 = require("./tour.entity");
let TourTalentAgent = class TourTalentAgent extends audit_columns_1.AuditColumns {
    tourTalentAgentId;
    tourId;
    tour;
    contactId;
    contact;
};
exports.TourTalentAgent = TourTalentAgent;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ name: 'TourTalentAgentID' }),
    __metadata("design:type", Number)
], TourTalentAgent.prototype, "tourTalentAgentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'TourID', type: 'int' }),
    __metadata("design:type", Number)
], TourTalentAgent.prototype, "tourId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tour_entity_1.Tour),
    (0, typeorm_1.JoinColumn)({ name: 'TourID' }),
    __metadata("design:type", tour_entity_1.Tour)
], TourTalentAgent.prototype, "tour", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ContactID', type: 'int' }),
    __metadata("design:type", Number)
], TourTalentAgent.prototype, "contactId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => contact_entity_1.Contact),
    (0, typeorm_1.JoinColumn)({ name: 'ContactID' }),
    __metadata("design:type", contact_entity_1.Contact)
], TourTalentAgent.prototype, "contact", void 0);
exports.TourTalentAgent = TourTalentAgent = __decorate([
    (0, typeorm_1.Entity)({ name: 'TourTalentAgent', schema: 'dbo' })
], TourTalentAgent);
//# sourceMappingURL=tour-talent-agent.entity.js.map