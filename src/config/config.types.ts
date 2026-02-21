export interface AppConfig {
  port: number;
  nodeEnv: string;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  accessExpiry: string;
  refreshExpiry: string;
  mobileAccessExpiry: string;
  mobileRefreshExpiry: string;
}

export interface SecurityConfig {
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
}

export interface DatabaseConfig {
  uri: string;
}