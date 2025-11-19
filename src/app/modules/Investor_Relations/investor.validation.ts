import { z } from "zod";

const createInvestorRelationsSchema = z.object({
  body: z.object({
    title: z.string({ required_error: "Title is required" }),
    description: z.string({ required_error: "Description is required" }),
    imageUrl: z
      .string()
      .url({ message: "Image URL must be a valid URL" })
      .optional(),
    revenue: z.number().optional(),
    profit: z.number().optional(),
    growth: z.number().optional(),
  }),
});

const updateInvestorRelationsSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z
      .string()
      .url({ message: "Image URL must be a valid URL" })
      .optional(),
    revenue: z.number().optional(),
    profit: z.number().optional(),
    growth: z.number().optional(),
  }),
});

export const InvestorRelationsValidation = {
  createInvestorRelationsSchema,
  updateInvestorRelationsSchema,
};
