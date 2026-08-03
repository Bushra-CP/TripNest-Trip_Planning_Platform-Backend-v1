import { z } from "zod";

export const updateTravelerProfileSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(3).max(50),

    phone: z
      .string()
      .trim()
      .regex(/^[6-9]\d{9}$/),

    country: z.string().trim().optional(),

    state: z.string().trim().optional(),

    city: z.string().trim().optional(),

    bio: z.string().trim().max(300).optional().or(z.literal("")),

    socialPresence: z
      .array(
        z.object({
          url: z.string().trim().url(),
        }),
      )
      .max(10)
      .optional(),
  }),
});
