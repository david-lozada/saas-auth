import { IsEmail, IsString, MinLength, IsOptional } from "class-validator";
import * as roles from "src/common/constants/roles";

export class LoginDto {
    @IsEmail({}, { message: "Please provide a valid email address" })
    email: string;

    @IsString()
    @MinLength(8, { message: "Password must be at least 8 characters long" })
    password: string;

    @IsOptional()
    @IsString()
    deviceName?: string;

    @IsOptional()
    @IsString()
    deviceToken?: string;

    @IsOptional()
    @IsString()
    platform?: roles.Role;
}