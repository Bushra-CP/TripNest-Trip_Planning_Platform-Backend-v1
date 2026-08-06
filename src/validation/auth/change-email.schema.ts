import { ValidationMessages } from "@/enums/messages.enum";
import { z } from "zod";

export const changeEmailSchema = z.object({
  body: z
    .object({
      currentEmail: z.string().email(ValidationMessages.ENTER_VALID_EMAIL),

      newEmail: z.string().email(ValidationMessages.ENTER_VALID_EMAIL),

      currentPassword: z.string().min(1, ValidationMessages.PASSWORD_REQUIRED),
    })
    .refine((data) => data.currentEmail !== data.newEmail, {
      path: ["newEmail"],
      message: ValidationMessages.EMAILS_SHOULD_BE_DIFFERENT,
    }),
});
