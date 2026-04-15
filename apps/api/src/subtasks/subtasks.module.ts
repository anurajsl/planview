import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtasksService } from './subtasks.service';
import { SubtasksController } from './subtasks.controller';
import { SubtaskEntity, StoryEntity } from '../database/entities';
import { StoriesModule } from '../stories/stories.module';

@Module({
  imports: [TypeOrmModule.forFeature([SubtaskEntity, StoryEntity]), StoriesModule],
  providers: [SubtasksService],
  controllers: [SubtasksController],
})
export class SubtasksModule {}
