import { z } from "zod";
import { ValidationMessages } from "../../enums/messages.enum";

export const googleAuthSchema = z.object({
  body: z.object({
    googleAcessToken: z.string().trim().min(1, ValidationMessages.GOOGLE_CREDENTIAL_REQUIRED),
  }),
});
