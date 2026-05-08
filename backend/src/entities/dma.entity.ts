import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'DMA', schema: 'dbo' })
export class Dma {
  @PrimaryGeneratedColumn({ name: 'DMAID' })
  dmaid: number;

  @Column({ name: 'MarketName', type: 'nvarchar', length: 200 })
  marketName: string;

  @Column({ name: 'PostalCode', type: 'nvarchar', length: 20 })
  postalCode: string;
}
