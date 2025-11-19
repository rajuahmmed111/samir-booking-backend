import { z } from "zod";

// create advertise validation
const createAdvertiseZodSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Title is required" }),
    description: z.string({ required_error: "Description is required" }),
    videoUrl: z
      .string()
      .url({ message: "Invalid video URL format" })
      .optional(),
  }),
});

// update advertise validation
const updateAdvertiseZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    videoUrl: z
      .string()
      .url({ message: "Invalid video URL format" })
      .optional(),
  }),
});

export const AdvertiseValidation = {
  createAdvertiseZodSchema,
  updateAdvertiseZodSchema,
};
