import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { StoryEntity, UserEntity, ProjectEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([StoryEntity, UserEntity, ProjectEntity])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
