import { IsOptional, IsString } from "class-validator";
import { CredentialsDto } from "../base/credentials.dto";

/**
 * Web Signup = Credentials + optional invite
 */
export class WebSignupDto extends CredentialsDto {
  @IsOptional()
  @IsString()
  inviteCode?: string;

  @IsOptional()
  @IsString()
  redirectUrl?: string;
}