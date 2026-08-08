import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber } from 'class-validator';

export class SubmitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  feedback!: string;

  @IsOptional()
  @IsNumber()
  rating?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

export class ActivityDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  activityType!: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class RevealContactDto {
  @IsString()
  @IsNotEmpty()
  portionId!: string;
}
