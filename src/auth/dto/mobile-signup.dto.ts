import { IsEmail, IsString, MinLength, IsOptional, IsIn } from "class-validator";
import * as platforms from "src/common/constants/platforms";
import { MobileAuthDto } from "./mobile-device.dto";

export class MobileSignupDto extends MobileAuthDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsOptional()
    @IsString()
    inviteCode?: string;
}