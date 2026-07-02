import { Global, Module } from '@nestjs/common';
import { AccessLevelService } from './access-level.service';
import { AccessLevelGuard } from './access-level.guard';

@Global()
@Module({
  providers: [AccessLevelService, AccessLevelGuard],
  exports: [AccessLevelService, AccessLevelGuard],
})
export class CommonModule {}
