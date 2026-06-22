import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Link } from './link.entity';

@Entity({ name: 'EngagementLink', schema: 'dbo' })
export class EngagementLink {
  @PrimaryGeneratedColumn({ name: 'EngagementLinkID' })
  engagementLinkId: number;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;

  @Column({ name: 'LinkID', type: 'int' })
  linkId: number;

  @ManyToOne(() => Link, { eager: true })
  @JoinColumn({ name: 'LinkID' })
  link: Link;

  @Column({ name: 'LinkPurpose', type: 'nvarchar', length: 100, nullable: true })
  linkPurpose: string | null;
}
