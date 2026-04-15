import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import {
  ProjectEntity, FeatureEntity, StoryEntity, SubtaskEntity,
  DependencyEntity, UserEntity,
} from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([
    ProjectEntity, FeatureEntity, StoryEntity, SubtaskEntity, DependencyEntity, UserEntity,
  ])],
  controllers: [ExportsController],
  providers: [ExportsService],
})
export class ExportsModule {}
