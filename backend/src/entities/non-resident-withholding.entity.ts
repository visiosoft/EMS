import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'NonResidentWithholding', schema: 'dbo' })
export class NonResidentWithholding {
  @PrimaryGeneratedColumn({ name: 'WithholdingID', type: 'int' })
  withholdingId: number;

  @Column({
    name: 'WithholdingTaxRate',
    type: 'decimal',
    precision: 18,
    scale: 6,
  })
  withholdingTaxRate: string;

  /**
   * Some deployed databases no longer have dbo.NonResidentWithholding.DMAID.
   * Keep this as an undecorated convenience property and access the physical
   * column through guarded raw SQL only.
   */
  dmaid?: number | null;

  @Column({ name: 'TaxAgencyID', type: 'int', nullable: true })
  taxAgencyId: number | null;

  @Column({ name: 'WithholdingLinkID', type: 'int', nullable: true })
  withholdingLinkId: number | null;

  @Column({ name: 'ArtistWaiverInstructionsID', type: 'int', nullable: true })
  artistWaiverInstructionsId: number | null;

  @Column({ name: 'IAEWaiverInstructionsID', type: 'int', nullable: true })
  iaeWaiverInstructionsId: number | null;

  @Column({ name: 'WithholdingArea', type: 'nvarchar', length: 100, nullable: true })
  withholdingArea: string | null;

  @Column({ name: 'WithholdingAgencyName', type: 'nvarchar', length: 200, nullable: true })
  withholdingAgencyName: string | null;

  @Column({ name: 'WithholdingPayee', type: 'nvarchar', length: 200, nullable: true })
  withholdingPayee: string | null;

  @Column({ name: 'PaymentMethod', type: 'nvarchar', length: 300, nullable: true })
  paymentMethod: string | null;

  @Column({ name: 'FormToAttractionURL', type: 'nvarchar', length: 1000, nullable: true })
  formToAttractionUrl: string | null;

  @Column({ name: 'FormToMunicipalityURL', type: 'nvarchar', length: 1000, nullable: true })
  formToMunicipalityUrl: string | null;

  @Column({ name: 'QuickBooksNumber', type: 'nvarchar', length: 100, nullable: true })
  quickBooksNumber: string | null;

  @Column({ name: 'CanApplyForWaiver', type: 'bit', nullable: true })
  canApplyForWaiver: boolean | null;

  @Column({ name: 'IAEWaiverInstructions', type: 'nvarchar', length: 500, nullable: true })
  iaeWaiverInstructionsText: string | null;

  @Column({ name: 'CompletedWaiverURL', type: 'nvarchar', length: 500, nullable: true })
  completedWaiverUrl: string | null;

  @Column({ name: 'IAEWaiverSubmissionDate', type: 'date', nullable: true })
  iaeWaiverSubmissionDate: string | null;

  @Column({ name: 'IAEWaiverAppNumber', type: 'nvarchar', length: 100, nullable: true })
  iaeWaiverAppNumber: string | null;

  @Column({ name: 'IAEWaiverURL', type: 'nvarchar', length: 500, nullable: true })
  iaeWaiverUrl: string | null;

  @Column({ name: 'TourWaiverURL', type: 'nvarchar', length: 500, nullable: true })
  tourWaiverUrl: string | null;

  @Column({ name: 'ExceptionsNotes', type: 'nvarchar', length: 'max' as string, nullable: true })
  exceptionsNotes: string | null;
}
