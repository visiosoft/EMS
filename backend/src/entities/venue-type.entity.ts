import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'VenueType', schema: 'dbo' })
export class VenueType {
  @PrimaryGeneratedColumn({ name: 'VenueTypeID' })
  venueTypeId: number;

  @Column({ name: 'VenueTypeName', type: 'nvarchar', length: 100 })
  venueTypeName: string;
}
