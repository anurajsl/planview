import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto {
  @ApiProperty({ enum: ['viewer', 'member', 'manager', 'admin', 'owner'] })
  @IsIn(['viewer', 'member', 'manager', 'admin', 'owner'])
  role: string;
}
