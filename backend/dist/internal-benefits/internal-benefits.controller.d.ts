import { InternalBenefitsService } from './internal-benefits.service';
export declare class InternalBenefitsController {
    private readonly internalBenefitsService;
    constructor(internalBenefitsService: InternalBenefitsService);
    getMyInsurance(): Promise<import("./internal-benefits.service").MyInsuranceResponse>;
    listPlans(): Promise<import("./internal-benefits.service").BenefitPlanRow[]>;
}
