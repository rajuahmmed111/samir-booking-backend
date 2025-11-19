import { Currency, ValidityType } from "@prisma/client";
import { z } from "zod";

const createSubscriptionZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    price: z.object({
      currency: z.nativeEnum(Currency, {
        required_error: "Currency is required",
      }),
      amount: z.number().positive("Amount must be positive"),
    }),
    validity: z.object({
      type: z.nativeEnum(ValidityType, {
        required_error: "Validity type is required",
      }),
      value: z.number().positive("Value must be positive"),
    }),
    features: z.array(z.string()).nonempty("At least one feature is required"),
  }),
});

const SubscriptionValidationZodSchema = {
  createSubscriptionZodSchema,
};

export default SubscriptionValidationZodSchema;
