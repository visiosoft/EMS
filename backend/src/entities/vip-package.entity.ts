import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VIPPackage', schema: 'dbo' })
export class VIPPackage {
  @PrimaryGeneratedColumn({ name: 'VIPPackageID', type: 'int' })
  vipPackageId: number;

  @Column({ name: 'PerformanceID', type: 'int' })
  performanceId: number;

  @Column({ name: 'IsOffered', type: 'bit' })
  isOffered: boolean;

  @Column({ name: 'PackageName', type: 'nvarchar', length: 255, nullable: true })
  packageName: string | null;
}
