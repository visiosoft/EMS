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

  @Column({ name: 'DMAID', type: 'int', nullable: true })
  dmaid: number | null;

  @Column({ name: 'TaxAgencyID', type: 'int', nullable: true })
  taxAgencyId: number | null;

  @Column({ name: 'WithholdingLinkID', type: 'int', nullable: true })
  withholdingLinkId: number | null;

  @Column({ name: 'ArtistWaiverInstructionsID', type: 'int', nullable: true })
  artistWaiverInstructionsId: number | null;

  @Column({ name: 'IAEWaiverInstructionsID', type: 'int', nullable: true })
  iaeWaiverInstructionsId: number | null;
}
