import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
/*
SignOptions is a TypeScript type from jsonwebtoken that defines the valid configuration options for jwt.sign(), 
such as expiresIn, issuer, audience, and algorithm. It provides type safety and better IDE autocompletion 
when creating JWTs.
*/
import { injectable } from "inversify";

import { env } from "../../config/env.js";
import { IJwtService, JwtPayload } from "./IJwtService.js";

@injectable()
export class JwtService implements IJwtService {
  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRY,
    } as SignOptions);
  }

  generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRY,
    } as SignOptions);
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
  }

  verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  }
}
