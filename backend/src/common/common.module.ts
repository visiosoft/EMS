import { Global, Module } from '@nestjs/common';
import { AccessLevelService } from './access-level.service';
import { AccessLevelGuard } from './access-level.guard';
import { AdminOrSelfGuard } from './admin-or-self.guard';

@Global()
@Module({
  providers: [AccessLevelService, AccessLevelGuard, AdminOrSelfGuard],
  exports: [AccessLevelService, AccessLevelGuard, AdminOrSelfGuard],
})
export class CommonModule {}
