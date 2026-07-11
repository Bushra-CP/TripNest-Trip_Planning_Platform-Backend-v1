import { z } from "zod";

export const verifyRegistrationSchema = z.object({
  body: z.object({
    userId: z.string().trim().min(1, "User ID is required"),

    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
  }),

  params: z.object({}),

  query: z.object({}),
});