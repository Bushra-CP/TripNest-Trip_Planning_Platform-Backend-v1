import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
/*
SignOptions is a TypeScript type from jsonwebtoken that defines the valid configuration options for jwt.sign(), 
such as expiresIn, issuer, audience, and algorithm. It provides type safety and better IDE autocompletion 
when creating JWTs.
*/
import { env } from "../config/env.js";

export interface TokenPayload {
  userId: string;
  role: string;
}

export class JwtService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as SignOptions);
  }

  static generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    } as SignOptions);
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  }
}
