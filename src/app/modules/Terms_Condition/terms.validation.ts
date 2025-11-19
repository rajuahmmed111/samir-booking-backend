import { z } from "zod";

const termsConditionSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title is required"),
    acceptance_terms: z.string().min(10, "Acceptance terms are required"),
    app_purpose: z.string().min(10, "App purpose is required"),
    user_responsibilities: z
      .string()
      .min(10, "User responsibilities are required"),
    data_usage: z.string().min(10, "Data usage is required"),
    intellectual_property: z
      .string()
      .min(10, "Intellectual property terms are required"),
    limitation: z.string().min(10, "Limitations are required"),
    updates: z.string().min(10, "Update terms are required"),
    contactUS: z.string().email("Valid contact email required"),
  }),
});

const updateTermsConditionSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters").optional(),
    acceptance_terms: z
      .string()
      .min(10, "Acceptance terms must be at least 10 characters")
      .optional(),
    app_purpose: z
      .string()
      .min(10, "App purpose must be at least 10 characters")
      .optional(),
    user_responsibilities: z
      .string()
      .min(10, "User responsibilities must be at least 10 characters")
      .optional(),
    data_usage: z
      .string()
      .min(10, "Data usage must be at least 10 characters")
      .optional(),
    intellectual_property: z
      .string()
      .min(10, "Intellectual property must be at least 10 characters")
      .optional(),
    limitation: z
      .string()
      .min(10, "Limitations must be at least 10 characters")
      .optional(),
    updates: z
      .string()
      .min(10, "Update terms must be at least 10 characters")
      .optional(),
    contactUS: z.string().email("Valid contact email required").optional(),
  }),
});

export const termsConditionValidation = {
  termsConditionSchema,
  updateTermsConditionSchema,
};