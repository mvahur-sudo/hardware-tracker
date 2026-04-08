import { IsString, IsUUID } from 'class-validator';

export class ReportIssueDto {
  @IsUUID()
  assetId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;
}
