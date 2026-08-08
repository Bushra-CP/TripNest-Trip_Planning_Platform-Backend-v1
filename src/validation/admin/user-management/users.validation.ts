import { z } from "zod";

export const getUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(10),

    search: z.string().trim().optional(),

    status: z.enum(["Active", "Blocked"]).optional(),
  }),
});
