import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { InvitationEntity, UserEntity, TenantEntity } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([InvitationEntity, UserEntity, TenantEntity])],
  providers: [InvitationsService],
  controllers: [InvitationsController],
  exports: [InvitationsService],
})
export class InvitationsModule {}
