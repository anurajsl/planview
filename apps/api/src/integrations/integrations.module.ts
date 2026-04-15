import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { IntegrationEntity, StoryLinkEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([IntegrationEntity, StoryLinkEntity])],
  providers: [IntegrationsService],
  controllers: [IntegrationsController],
  exports: [IntegrationsService],
})
export class IntegrationsModule {}
