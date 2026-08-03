import { z } from "zod";
import { ValidationMessages } from "../../../enums/messages.enum";

export const verifyRegistrationSchema = z.object({
  body: z.object({
    userId: z.string().trim().min(1, ValidationMessages.USERID_REQUIRED),

    otp: z
      .string()
      .trim()
      .regex(/^\d{6}$/, ValidationMessages.OTP_CONSTRAINT),
  }),

  params: z.object({}),

  query: z.object({}),
});
