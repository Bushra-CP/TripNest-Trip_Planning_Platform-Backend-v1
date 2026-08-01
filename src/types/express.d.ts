import "express";
import { Multer } from "multer";

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;

      user: {
        userId: string;
        role: UserRole;
      };
    }
  }
}

export {};

/**
 * 
Why do we need express.d.ts?

Express already defines the Request interface.

Internally, it's something like:

interface Request {
  body: any;
  params: any;
  query: any;
  headers: any;
  file?: Express.Multer.File;
}

express.d.ts is used to tell TypeScript about custom 
properties (like user) that our middleware adds to the 
Express Request object. This ensures type safety and 
prevents TypeScript errors when accessing those properties.
 */
