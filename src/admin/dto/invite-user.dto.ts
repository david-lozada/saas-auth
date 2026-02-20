import { IsEmail, IsArray, IsOptional, IsString } from "class-validator";
import { Role } from "src/common/constants/roles";

export class InviteUserDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roles?: Role[];

    @IsOptional()
    @IsString()
    redirectUrl?: string;
}