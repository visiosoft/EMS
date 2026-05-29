import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'News', schema: 'dbo' })
export class News {
  @PrimaryColumn({ name: 'id', type: 'uniqueidentifier' })
  id: string;

  @Column({ name: 'title', type: 'nvarchar', length: 120 })
  title: string;

  @Column({ name: 'summary', type: 'nvarchar', length: 220 })
  summary: string;

  @Column({ name: 'body', type: 'nvarchar', length: 'MAX' })
  body: string;

  @Column({ name: 'created_by', type: 'nvarchar', length: 150, nullable: true })
  createdBy: string | null;

  @Column({ name: 'created_at', type: 'datetime', nullable: true })
  createdAt: Date | null;

  @Column({
    name: 'modified_by',
    type: 'nvarchar',
    length: 150,
    nullable: true,
  })
  modifiedBy: string | null;

  @Column({ name: 'modified_at', type: 'datetime', nullable: true })
  modifiedAt: Date | null;
}
