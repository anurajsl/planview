import { IsString, IsOptional, IsBoolean, IsIn, IsUrl, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegrationDto {
  @ApiProperty({ enum: ['jira', 'gitlab', 'slack', 'teams', 'google_chat'] })
  @IsIn(['jira', 'gitlab', 'slack', 'teams', 'google_chat'])
  provider: string;

  @ApiProperty({ example: 'https://yourteam.atlassian.net or webhook URL' })
  @IsString()
  @MinLength(8)
  baseUrl: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  apiToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectKey?: string;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LinkStoryDto {
  @ApiProperty()
  @IsString()
  storyId: string;

  @ApiProperty({ enum: ['jira', 'gitlab'] })
  @IsIn(['jira', 'gitlab'])
  provider: string;

  @ApiProperty({ enum: ['issue', 'merge_request', 'branch'] })
  @IsIn(['issue', 'merge_request', 'branch'])
  linkType: string;

  @ApiProperty()
  @IsString()
  externalId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}
