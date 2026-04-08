import { AssetCondition } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ReturnAssetDto {
  @IsOptional()
  @IsEnum(AssetCondition)
  returnCondition?: AssetCondition;

  @IsOptional()
  @IsString()
  notes?: string;
}
