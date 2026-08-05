import { z } from "zod";

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().trim().min(1, "Current password is required"),

    newPassword: z
      .string()
      .trim()
      .min(1, "New password is required")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and be at least 8 characters long",
      ),
  }),
});
