import { IsOptional, IsString } from "class-validator";
import { IntersectionType } from "@nestjs/mapped-types";
import { CredentialsDto } from "../base/credentials.dto";
import { MobileAuthDto } from "./mobile-auth.dto"; 

/**
 * Mobile Signup = Credentials + Device + optional invite
 */
export class MobileSignupDto extends IntersectionType(CredentialsDto, MobileAuthDto) {
  @IsOptional()
  @IsString()
  inviteCode?: string;
}