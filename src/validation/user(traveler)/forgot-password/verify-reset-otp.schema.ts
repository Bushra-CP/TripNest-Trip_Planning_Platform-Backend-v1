import { z } from "zod";

export const verifyResetOtpSchema = z.object({
  body: z.object({
    email: z.string().trim().email("Invalid email"),

    otp: z.string().length(6, "OTP must contain 6 digits"),
  }),
});
