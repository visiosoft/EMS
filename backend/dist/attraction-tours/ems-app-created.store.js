"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EmsAppCreatedStore_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmsAppCreatedStore = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
let EmsAppCreatedStore = EmsAppCreatedStore_1 = class EmsAppCreatedStore {
    logger = new common_1.Logger(EmsAppCreatedStore_1.name);
    data = {
        attractionIds: [],
        tourIds: [],
        engagementIds: [],
    };
    get filePath() {
        const cwd = process.cwd();
        const base = cwd.endsWith('backend') ? cwd : (0, path_1.join)(cwd, 'backend');
        const dir = (0, path_1.join)(base, 'data');
        return (0, path_1.join)(dir, 'ems-app-created-ids.json');
    }
    onModuleInit() {
        this.load();
    }
    load() {
        const fp = this.filePath;
        try {
            if (!(0, fs_1.existsSync)(fp)) {
                this.data = { attractionIds: [], tourIds: [], engagementIds: [] };
                return;
            }
            const raw = (0, fs_1.readFileSync)(fp, 'utf8');
            const parsed = JSON.parse(raw);
            this.data = {
                attractionIds: Array.isArray(parsed.attractionIds)
                    ? parsed.attractionIds.map(Number).filter((n) => Number.isFinite(n))
                    : [],
                tourIds: Array.isArray(parsed.tourIds)
                    ? parsed.tourIds.map(Number).filter((n) => Number.isFinite(n))
                    : [],
                engagementIds: Array.isArray(parsed.engagementIds)
                    ? parsed.engagementIds.map(Number).filter((n) => Number.isFinite(n))
                    : [],
            };
        }
        catch (e) {
            this.logger.warn(`Could not load ${fp}: ${e}`);
            this.data = { attractionIds: [], tourIds: [], engagementIds: [] };
        }
    }
    persist() {
        const fp = this.filePath;
        try {
            (0, fs_1.mkdirSync)((0, path_1.dirname)(fp), { recursive: true });
            (0, fs_1.writeFileSync)(fp, JSON.stringify(this.data, null, 2), 'utf8');
        }
        catch (e) {
            this.logger.error(`Could not persist EMS app-created IDs: ${e}`);
        }
    }
    recordAttraction(id) {
        if (!this.data.attractionIds.includes(id)) {
            this.data.attractionIds.push(id);
            this.persist();
        }
    }
    recordTour(id) {
        if (!this.data.tourIds.includes(id)) {
            this.data.tourIds.push(id);
            this.persist();
        }
    }
    recordEngagement(id) {
        if (!this.data.engagementIds.includes(id)) {
            this.data.engagementIds.push(id);
            this.persist();
        }
    }
    removeAttraction(id) {
        const idx = this.data.attractionIds.indexOf(id);
        if (idx !== -1) {
            this.data.attractionIds.splice(idx, 1);
            this.persist();
        }
    }
    removeTour(id) {
        const idx = this.data.tourIds.indexOf(id);
        if (idx !== -1) {
            this.data.tourIds.splice(idx, 1);
            this.persist();
        }
    }
    removeEngagement(id) {
        const idx = this.data.engagementIds.indexOf(id);
        if (idx !== -1) {
            this.data.engagementIds.splice(idx, 1);
            this.persist();
        }
    }
    canDeleteAttraction(id) {
        return this.data.attractionIds.includes(id);
    }
    canDeleteTour(id) {
        return this.data.tourIds.includes(id);
    }
    canDeleteEngagement(id) {
        return this.data.engagementIds.includes(id);
    }
};
exports.EmsAppCreatedStore = EmsAppCreatedStore;
exports.EmsAppCreatedStore = EmsAppCreatedStore = EmsAppCreatedStore_1 = __decorate([
    (0, common_1.Injectable)()
], EmsAppCreatedStore);
//# sourceMappingURL=ems-app-created.store.js.map