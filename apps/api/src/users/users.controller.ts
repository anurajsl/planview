import {
  Controller, Get, Patch, Delete, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/user.dto';
import { TenantId, CurrentUser, Roles } from '../common/decorators';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users in tenant' })
  async findAll(@TenantId() tenantId: string) {
    return this.usersService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.findOne(tenantId, id);
  }

  @Patch(':id/role')
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Update a user role (Owner/Admin only)' })
  async updateRole(
    @TenantId() tenantId: string,
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(tenantId, actorId, id, dto.role);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a user from the tenant (Owner/Admin only)' })
  async remove(
    @TenantId() tenantId: string,
    @CurrentUser('userId') actorId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.usersService.remove(tenantId, actorId, id);
  }
}
