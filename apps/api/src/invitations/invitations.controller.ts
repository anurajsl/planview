import {
  Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { TenantId, CurrentUser, Public, Roles } from '../common/decorators';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Invite a user to the organization' })
  async invite(
    @TenantId() tenantId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: { email: string; role?: string },
  ) {
    return this.invitationsService.invite(tenantId, userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'List all invitations' })
  async findAll(@TenantId() tenantId: string) {
    return this.invitationsService.findAll(tenantId);
  }

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation (public — no auth needed)' })
  async accept(@Body() dto: { token: string; name: string; password: string }) {
    return this.invitationsService.accept(dto.token, { name: dto.name, password: dto.password });
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  async revoke(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitationsService.revoke(tenantId, id);
  }
}
