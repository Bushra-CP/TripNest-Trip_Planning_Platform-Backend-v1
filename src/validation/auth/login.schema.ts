import { z } from "zod";
import { ValidationMessages } from "../../enums/messages.enum";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, ValidationMessages.EMAIL_REQUIRED)
    .email(ValidationMessages.ENTER_VALID_EMAIL),

  password: z
    .string()
    .min(1, ValidationMessages.PASSWORD_REQUIRED)
    .min(8, ValidationMessages.PASSWORD_CONSTRAINT_ERROR1),
});
