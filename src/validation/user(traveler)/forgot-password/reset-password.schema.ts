import { z } from "zod";

export const resetPasswordSchema = z.object({
  body: z.object({
    resetToken: z.string(),

    password: z
      .string()
      .min(8)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[!@#$%^&*(),.?":{}|<>]/),
  }),
});
