import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { IntegrationEntity } from '../database/entities';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([IntegrationEntity])],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
