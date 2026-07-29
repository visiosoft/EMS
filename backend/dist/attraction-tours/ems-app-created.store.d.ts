import { OnModuleInit } from '@nestjs/common';
export declare class EmsAppCreatedStore implements OnModuleInit {
    private readonly logger;
    private data;
    private get filePath();
    onModuleInit(): void;
    private load;
    private persist;
    recordAttraction(id: number): void;
    recordTour(id: number): void;
    recordEngagement(id: number): void;
    removeAttraction(id: number): void;
    removeTour(id: number): void;
    removeEngagement(id: number): void;
    canDeleteAttraction(id: number): boolean;
    canDeleteTour(id: number): boolean;
    canDeleteEngagement(id: number): boolean;
}
