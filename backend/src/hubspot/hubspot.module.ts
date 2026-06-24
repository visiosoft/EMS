import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../entities/company.entity';
import { Contact } from '../entities/contact.entity';
import { HubSpotController } from './hubspot.controller';
import { HubSpotService } from './hubspot.service';

@Module({
  imports: [TypeOrmModule.forFeature([Contact, Company])],
  controllers: [HubSpotController],
  providers: [HubSpotService],
  exports: [HubSpotService],
})
export class HubSpotModule {}
