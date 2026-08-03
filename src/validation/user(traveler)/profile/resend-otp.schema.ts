import { z } from "zod";
import { ValidationMessages } from "../../../enums/messages.enum";

export const resendOtpSchema = z.object({
  body: z.object({
    userId: z.string().trim().min(1, ValidationMessages.USERID_REQUIRED),
  }),

  params: z.object({}),

  query: z.object({}),
});
