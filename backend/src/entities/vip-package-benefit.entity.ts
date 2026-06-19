import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'VIPPackageBenefit', schema: 'dbo' })
export class VIPPackageBenefit {
  @PrimaryColumn({ name: 'VIPPackageID', type: 'int' })
  vipPackageId: number;

  @PrimaryColumn({ name: 'VIPBenefitID', type: 'int' })
  vipBenefitId: number;
}
