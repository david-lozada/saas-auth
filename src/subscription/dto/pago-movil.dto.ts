import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  Matches,
  IsDateString,
} from 'class-validator';

export class InitiatePagoMovilDto {
  @IsNumber()
  @Min(1)
  @Max(10000)
  amountUSD: number; // User wants to pay this much in USD

  @IsString()
  @Matches(/^04(12|14|16|24|26)\d{7}$/, {
    message: 'Invalid Venezuelan mobile number format (04XX-XXXXXXX)',
  })
  phoneNumber: string; // User's phone number

  @IsString()
  bankCode: string; // User's bank code

  @IsString()
  @Matches(/^\d{4,20}$/, { message: 'Invalid reference number' })
  referenceNumber: string;

  @IsDateString()
  paymentDate: string; // ISO date when they paid

  @IsOptional()
  @IsString()
  notes?: string; // Optional notes from user

  @IsString()
  planId: string;
}

export class SubmitPaymentProofDto {
  @IsString()
  transactionId: string;

  @IsOptional()
  @IsString()
  screenshotUrl?: string; // S3/Cloudinary URL of payment proof
}

export class ReviewPagoMovilDto {
  @IsString()
  transactionId: string;

  @IsString()
  @Matches(/^(approve|reject)$/)
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  adminNotes?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class UpdateExchangeRateDto {
  @IsNumber()
  @Min(1)
  rate: number; // VES per 1 USD
}
