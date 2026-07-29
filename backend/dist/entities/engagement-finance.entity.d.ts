import { Engagement } from './engagement.entity';
export declare class EngagementFinances {
    financeId: number;
    engagementId: number;
    engagement: Engagement;
    estimatedBreakeven: string | number | null;
    promoterProfit: string | number | null;
    venueTerms: string | null;
    confirmationPacketApproved: boolean | null;
    iaeWaiverApplicationConfirmationNumber: string | null;
    iaeWaiverApplicationSubmissionDate: string | null;
    iaeApplicationWaiverStatus: string | null;
    dateFundsReceived: string | null;
    fundsDue: string | number | null;
    fundsWithheld: string | number | null;
    fundsOwed: string | number | null;
    receivableBankAccount: string | null;
    requiredNonResidentWithholdingId: number | null;
    artistFinanceId: number | null;
    settlementFinanceId: number | null;
    isCanadaEngagement: boolean | null;
    salesTaxRemittedBy: string | null;
    venueSettlementFileSharePointLink: string | null;
    partnerSettlementFileSharePointLink: string | null;
}
