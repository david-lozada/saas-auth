import { IntersectionType } from "@nestjs/mapped-types";
import { CredentialsDto } from "../base/credentials.dto";
import { MobileAuthDto } from "./mobile-auth.dto";

/**
 * Mobile Login = Credentials + Device
 */
export class MobileLoginDto extends IntersectionType(CredentialsDto, MobileAuthDto) {}