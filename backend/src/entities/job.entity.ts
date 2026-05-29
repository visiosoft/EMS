import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Job', schema: 'dbo' })
export class Job {
  @PrimaryGeneratedColumn({ name: 'JobID' })
  jobId: number;

  @Column({ name: 'JobName', type: 'nvarchar', length: 255 })
  jobName: string;

  @Column({ name: 'JobCode', type: 'nvarchar', length: 50, nullable: true })
  jobCode: string | null;

  @Column({ name: 'IsActive', type: 'bit' })
  isActive: boolean;
}
