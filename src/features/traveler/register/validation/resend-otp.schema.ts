import { z } from "zod";

export const resendOtpSchema = z.object({
  body: z.object({
    userId: z.string().trim().min(1, "User ID is required"),
  }),

  params: z.object({}),

  query: z.object({}),
});