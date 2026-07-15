import { SelfProfileService } from './self-profile.service';
export declare class SelfProfileController {
    private readonly selfProfileService;
    constructor(selfProfileService: SelfProfileService);
    getMyProfile(): Promise<import("./self-profile.service").MyFullProfileResponse>;
    getEmployeeProfile(contactId: number): Promise<import("./self-profile.service").MyFullProfileResponse>;
}
