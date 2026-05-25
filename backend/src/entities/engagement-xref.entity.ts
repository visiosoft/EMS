import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * dbo.EngagementXref stores stable source-system keys for an engagement.
 * Project conversion uses a namespaced source key: `EngagementProject:<id>`.
 */
@Entity({ name: 'EngagementXref', schema: 'dbo' })
export class EngagementXref {
  @PrimaryColumn({ name: 'SourceEngagementID', type: 'nvarchar', length: 100 })
  sourceEngagementId: string;

  @Column({ name: 'EngagementID', type: 'int' })
  engagementId: number;
}
