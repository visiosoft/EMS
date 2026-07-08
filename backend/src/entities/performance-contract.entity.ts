import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'PerformanceContracts', schema: 'dbo' })
export class PerformanceContract {
  @PrimaryGeneratedColumn({ name: 'ContractID' })
  contractId!: number;

  @Column({ name: 'CreatedAt', type: 'datetime2', default: () => 'GETDATE()' })
  createdAt!: Date;

  @Column({ name: 'EngagementID', type: 'int', nullable: true })
  engagementId!: number | null;

  @Column({ name: 'Agency', type: 'nvarchar', length: 255, nullable: true })
  agency!: string | null;

  @Column({ name: 'Agent', type: 'nvarchar', length: 255, nullable: true })
  agent!: string | null;

  @Column({ name: 'Attraction', type: 'nvarchar', length: 255, nullable: true })
  attraction!: string | null;

  @Column({ name: 'VenueName', type: 'nvarchar', length: 255, nullable: true })
  venueName!: string | null;

  @Column({ name: 'VenueAddress', type: 'nvarchar', length: 500, nullable: true })
  venueAddress!: string | null;

  @Column({ name: 'VenueCity', type: 'nvarchar', length: 100, nullable: true })
  venueCity!: string | null;

  @Column({ name: 'VenueState', type: 'nvarchar', length: 100, nullable: true })
  venueState!: string | null;

  @Column({ name: 'VenueCountry', type: 'nvarchar', length: 100, nullable: true })
  venueCountry!: string | null;

  @Column({ name: 'Producer', type: 'nvarchar', length: 255, nullable: true })
  producer!: string | null;

  @Column({ name: 'ProducerAddress', type: 'nvarchar', length: 500, nullable: true })
  producerAddress!: string | null;

  @Column({ name: 'ProducerFedID', type: 'nvarchar', length: 50, nullable: true })
  producerFedId!: string | null;

  @Column({ name: 'GuaranteeAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  guaranteeAmount!: string | null;

  @Column({ name: 'GuaranteeCurrency', type: 'nvarchar', length: 10, nullable: true })
  guaranteeCurrency!: string | null;

  @Column({ name: 'DepositAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  depositAmount!: string | null;

  @Column({ name: 'DepositDueDate', type: 'date', nullable: true })
  depositDueDate!: string | null;

  @Column({ name: 'BalanceAmount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  balanceAmount!: string | null;

  @Column({ name: 'BalanceDueDate', type: 'date', nullable: true })
  balanceDueDate!: string | null;

  @Column({ name: 'RoyaltyDescription', type: 'nvarchar', length: 'max', nullable: true })
  royaltyDescription!: string | null;

  @Column({ name: 'OverageDescription', type: 'nvarchar', length: 'max', nullable: true })
  overageDescription!: string | null;

  @Column({ name: 'PaymentTerms', type: 'nvarchar', length: 'max', nullable: true })
  paymentTerms!: string | null;

  @Column({ name: 'PaymentMethodType', type: 'nvarchar', length: 100, nullable: true })
  paymentMethodType!: string | null;

  @Column({ name: 'PaymentPayableTo', type: 'nvarchar', length: 255, nullable: true })
  paymentPayableTo!: string | null;

  @Column({ name: 'PaymentBankName', type: 'nvarchar', length: 255, nullable: true })
  paymentBankName!: string | null;

  /** JSON-encoded PerformanceItem[] (see contract-extraction.service.ts) — CRUD goes through raw SQL in EngagementService, not this entity. */
  @Column({ name: 'Performances', type: 'nvarchar', length: 'max', nullable: true })
  performances!: string | null;

  /** JSON-encoded string[], Agency always first — see engagement.service.ts parseJsonArrayColumn. */
  @Column({ name: 'AdditionallyInsured', type: 'nvarchar', length: 'max', nullable: true })
  additionallyInsured!: string | null;

  @Column({ name: 'AnnotatedPdfBlobName', type: 'nvarchar', length: 500, nullable: true })
  annotatedPdfBlobName!: string | null;

  @Column({ name: 'OriginalFilename', type: 'nvarchar', length: 500, nullable: true })
  originalFilename!: string | null;

  @Column({ name: 'OneDrivePdfUrl', type: 'nvarchar', length: 1000, nullable: true })
  oneDrivePdfUrl!: string | null;
}
