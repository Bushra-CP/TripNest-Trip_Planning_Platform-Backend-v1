import { z } from "zod";

export const createPostSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters")
      .max(150, "Title must not exceed 150 characters"),

    destination: z
      .string()
      .trim()
      .min(2, "Destination must be at least 2 characters")
      .max(100, "Destination must not exceed 100 characters"),

    content: z.string().trim().min(10, "Content must be at least 10 characters"),

    tags: z.preprocess(
      (value) => {
        if (Array.isArray(value)) {
          return value;
        }

        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value);

            if (Array.isArray(parsed)) {
              return parsed;
            }
          } catch {
            return [value];
          }

          return [value];
        }

        return [];
      },
      z
        .array(
          z
            .string()
            .trim()
            .min(1, "Tag cannot be empty")
            .max(30, "Tag must not exceed 30 characters"),
        )
        .max(10, "You can add a maximum of 10 tags"),
    ),
  }),
});
