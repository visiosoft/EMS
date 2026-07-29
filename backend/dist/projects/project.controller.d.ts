import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { AddPerformanceOptionDto } from './dto/add-performance-option.dto';
import { AddProjectVenueDto } from './dto/add-project-venue.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdatePerformanceOptionDto } from './dto/update-performance-option.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectVenueDto } from './dto/update-project-venue.dto';
import { ProjectService } from './project.service';
export declare class ProjectController {
    private readonly projectService;
    constructor(projectService: ProjectService);
    projectStagesMeta(): Promise<{
        projectStages: string[];
        source: "application";
    }>;
    offerReviewStatusesMeta(): Promise<{
        offerReviewStatuses: string[];
        source: "application";
    }>;
    venueStatusesMeta(): Promise<{
        venueStatuses: string[];
        source: "application" | "environment";
    }>;
    optionStatusesMeta(): Promise<{
        optionStatuses: string[];
        source: "application" | "environment";
    }>;
    list(offset: number, limit: number, q?: string, projectStage?: string, sortBy?: string, sortDir?: string): Promise<{
        data: Array<{
            engagementProjectId: number;
            tourId: number;
            tourName: string | null;
            tourStartDate: string | null;
            tourEndDate: string | null;
            attractionName: string | null;
            talentAgencyCompanyId: number | null;
            talentAgencyCompanyName: string | null;
            projectStage: string;
            offerReviewStatus: string | null;
            createdDate: Date;
            createdBy: string | null;
            name: null;
            bookerId: null;
            agentContactId: null;
            dmaIds: number[];
            targetOnSale: null;
            notes: null;
        }>;
        total: number;
    }>;
    getOne(id: number): Promise<{
        engagementProjectId: number;
        tourId: number;
        attractionId: number | null;
        tourName: string | null;
        tourStartDate: string | null;
        tourEndDate: string | null;
        attractionName: string | null;
        talentAgencyCompanyId: number | null;
        talentAgencyCompanyName: string | null;
        projectStage: string;
        offerReviewStatus: string | null;
        confirmedOfferLinkId: number | null;
        createdDate: Date;
        createdBy: string | null;
        name: null;
        bookerId: null;
        agentContactId: number | null;
        dmaIds: number[];
        targetOnSale: null;
        notes: null;
        convertedEngagementId: number | null;
        isReadOnly: boolean;
        venues: {
            engagementProjectVenueId: number;
            engagementProjectId: number;
            venueCompanyId: number;
            venueCompanyName: string | null;
            venueName: string | null;
            venueDmaId: number | null;
            venueDmaMarketName: string | null;
            venueStatus: string;
            configName: null;
            dealType: null;
            guarantee: null;
            splitPct: null;
            breakeven: null;
            marketingCoOp: null;
            engagementId: number | null;
            performanceOptions: {
                performanceOptionId: number;
                engagementProjectId: number;
                engagementProjectVenueId: number | null;
                proposedDate: string;
                proposedTime: string | null;
                optionStatus: string;
            }[];
        }[];
    }>;
    create(dto: CreateProjectDto): Promise<{
        engagementProjectId: number;
        engagementId: number | null;
        converted: boolean;
    }>;
    update(id: number, dto: UpdateProjectDto): Promise<{
        engagementId: number | null;
        converted: boolean;
    }>;
    remove(id: number): Promise<void>;
    addVenue(id: number, dto: AddProjectVenueDto): Promise<{
        engagementProjectVenueId: number;
    }>;
    updateVenue(id: number, venueId: number, dto: UpdateProjectVenueDto): Promise<void>;
    removeVenue(id: number, venueId: number): Promise<void>;
    addPerformanceOption(id: number, dto: AddPerformanceOptionDto): Promise<{
        performanceOptionId: number;
    }>;
    updatePerformanceOption(id: number, optionId: number, dto: UpdatePerformanceOptionDto): Promise<void>;
    removePerformanceOption(id: number, optionId: number): Promise<void>;
    uploadConfirmedOfferPdf(id: number, file: Express.Multer.File): Promise<{
        linkId: number;
        linkName: string;
    }>;
    downloadConfirmedOfferPdf(id: number, res: Response): Promise<StreamableFile>;
}
