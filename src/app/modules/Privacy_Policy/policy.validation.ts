import { z } from "zod";

export const createPrivacyPolicySchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title is required"),
    introduction: z.string().min(10, "Introduction is required"),
    information_collect: z
      .array(z.string().min(1, "Each info must be a non-empty string"))
      .nonempty("Information collection is required"),
    how_useYour_data: z
      .array(z.string().min(1, "Each usage must be a non-empty string"))
      .nonempty("Usage details are required"),
    data_security: z.string().min(10, "Data security details are required"),
    third_party_services: z
      .string()
      .min(10, "Third-party services info is required"),
    user_control: z
      .array(z.string().min(1, "Each control must be a non-empty string"))
      .nonempty("User control details are required"),
    children_privacy: z.string().min(10, "Children privacy info is required"),
    changes_to_policy: z.string().min(10, "Change policy info is required"),
    contact_info: z.string().email("Valid contact email is required"),
  }),
});

export const updatePrivacyPolicySchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    introduction: z.string().min(10).optional(),
    information_collect: z.array(z.string().min(1)).optional(),
    how_useYour_data: z.array(z.string().min(1)).optional(),
    data_security: z.string().min(10).optional(),
    third_party_services: z.string().min(10).optional(),
    user_control: z.array(z.string().min(1)).optional(),
    children_privacy: z.string().min(10).optional(),
    changes_to_policy: z.string().min(10).optional(),
    contact_info: z.string().email().optional(),
  }),
});

export const privacyPolicyValidation = {
  createPrivacyPolicySchema,
  updatePrivacyPolicySchema,
};
