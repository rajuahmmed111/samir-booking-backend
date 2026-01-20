import { z } from "zod";

// update multiple inventory items validation
const updateMultipleInventoryItemsValidation = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: z.string({
            required_error: "Item ID is required",
          }),
          name: z.string().min(1, "Name cannot be empty").optional(),
          quantity: z
            .number()
            .int("Quantity must be an integer")
            .min(0, "Quantity cannot be negative")
            .optional(),
          missingQuantity: z
            .number()
            .int("Missing quantity must be an integer")
            .min(0, "Missing quantity cannot be negative")
            .optional(),
          description: z.string().optional(),
        }),
      )
      .min(1, "At least one item is required"),
  }),
});

export const InventoryValidation = {
  updateMultipleInventoryItemsValidation,
};
