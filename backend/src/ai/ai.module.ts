import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiToolsExecutor } from './ai-tools.executor';

@Module({
    controllers: [AiController],
    providers: [AiService, AiToolsExecutor],
    exports: [AiService, AiToolsExecutor],
})
export class AiModule { }
