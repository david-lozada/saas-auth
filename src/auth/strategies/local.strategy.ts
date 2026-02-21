import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "../auth.service";
import { CredentialsDto } from "../dto/base/credentials.dto";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: "email",
      passReqToCallback: true,
    });
  }

  async validate(req: any, email: string, password: string) {
    const credentials: CredentialsDto = { email, password };
    const user = await this.authService.validateCredentials(req.tenantId, credentials);
    if (!user) throw new UnauthorizedException("Invalid credentials");
    return user;
  }
}