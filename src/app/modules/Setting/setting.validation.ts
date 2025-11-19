import { z } from "zod";

const customerContactInfo = z.object({
  body: z.object({
    email: z.string().email("Invalid email address").optional(),
    phone: z.string().min(1, "Contact number is required").optional(),
  }),
});

export const settingValidation = {
  customerContactInfo,
};
