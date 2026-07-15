import { DataSource } from 'typeorm';
export declare class AppService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getApiStatus(): {
        message: string;
        service: string;
        timestamp: string;
    };
    getDatabaseStatus(): Promise<{
        connected: boolean;
        latencyMs?: number;
        serverTime?: string | null;
        error?: string;
    }>;
}
