import { AppService } from './app.service';
export declare class AppController {
    private readonly appService;
    constructor(appService: AppService);
    getHealth(): {
        message: string;
        service: string;
        timestamp: string;
    };
    getDbHealth(): Promise<{
        db: {
            connected: boolean;
            latencyMs?: number;
            serverTime?: string | null;
            error?: string;
        };
        message: string;
        service: string;
        timestamp: string;
    }>;
    getDbCheckPage(): Promise<string>;
}
