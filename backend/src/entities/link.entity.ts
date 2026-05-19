import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'Link', schema: 'dbo' })
export class Link {
  @PrimaryGeneratedColumn({ name: 'LinkID' })
  linkId: number;

  @Column({ name: 'LinkType', type: 'nvarchar', length: 50 })
  linkType: string;

  @Column({ name: 'LinkURL', type: 'nvarchar', length: 2048 })
  linkUrl: string;

  @Column({ name: 'LinkName', type: 'nvarchar', length: 255 })
  linkName: string;

  @Column({ name: 'LinkPath', type: 'nvarchar', length: 1024 })
  linkPath: string;
}
