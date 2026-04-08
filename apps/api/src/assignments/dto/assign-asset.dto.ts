import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class AssignAssetDto {
  @IsUUID()
  assetId!: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsDateString()
  expectedReturnAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
