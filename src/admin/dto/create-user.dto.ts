import { IsEmail, IsString, IsArray, IsOptional, ArrayContains } from "class-validator";
import { Role, ROLE_VALUES } from "src/common/constants/roles";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsArray()
    @ArrayContains(ROLE_VALUES)
    roles?: Role[];

    @IsOptional()
    @IsString()
    tempPassword?: string;
}