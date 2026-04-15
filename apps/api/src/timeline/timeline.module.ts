import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimelineService } from './timeline.service';
import { TimelineController } from './timeline.controller';
import {
  StoryEntity, SubtaskEntity, FeatureEntity, DependencyEntity,
  ProjectMemberEntity, UserEntity,
} from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoryEntity, SubtaskEntity, FeatureEntity,
      DependencyEntity, ProjectMemberEntity, UserEntity,
    ]),
  ],
  providers: [TimelineService],
  controllers: [TimelineController],
})
export class TimelineModule {}
