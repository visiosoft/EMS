import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'ServiceProvided', schema: 'dbo' })
export class ServiceProvided {
  @PrimaryGeneratedColumn({ name: 'ServiceProvidedID' })
  serviceProvidedId: number;

  @Column({ name: 'ServiceName', type: 'nvarchar', length: 100 })
  serviceName: string;
}
