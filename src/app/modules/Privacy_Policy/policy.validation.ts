import { z } from "zod";

export const createPrivacyPolicySchema = z.object({
  body: z.object({
    description: z.string().min(10, "Description is required"),
  }),
});

export const privacyPolicyValidation = {
  createPrivacyPolicySchema,
};
