import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DependenciesService } from './dependencies.service';
import { DependenciesController } from './dependencies.controller';
import { DependencyEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([DependencyEntity])],
  providers: [DependenciesService],
  controllers: [DependenciesController],
})
export class DependenciesModule {}
