import { DataSource } from 'typeorm';
import { AccessLevel } from './access-level.enum';
export declare class AccessLevelService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    resolveAccessLevel(email: string | null | undefined): Promise<AccessLevel>;
}
