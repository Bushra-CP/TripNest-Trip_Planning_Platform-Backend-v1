import { z } from "zod";
import { ValidationMessages } from "../../../enums/messages.enum";

export const registerSchema = z.object({
  body: z.object({
    fullName: z
      .string()
      .trim()
      .min(4, ValidationMessages.FULL_NAME_ERROR1)
      .max(50, ValidationMessages.FULL_NAME_ERROR2),

    email: z.string().trim().email(ValidationMessages.ENTER_VALID_EMAIL).toLowerCase(),

    password: z
      .string()
      .min(8, ValidationMessages.PASSWORD_CONSTRAINT_ERROR1)
      .max(50, ValidationMessages.PASSWORD_CONSTRAINT_ERROR2)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        ValidationMessages.PASSWORD_CONSTRAINT_ERROR3,
      ),

    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/, ValidationMessages.ENTER_VALID_PHONE),
  }),
});
