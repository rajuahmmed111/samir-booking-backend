import { z } from "zod";

// Custom price schema
const customPriceSchema = z.object({
  startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date format",
  }),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date format",
  }),
  price: z.number().positive("Price must be positive"),
});

// Inventory item schema
const inventoryItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
});

const createHotelSchema = z.object({
  body: z.object({
    // Basic property information
    propertyTitle: z.string().min(1, "Property title is required"),
    propertyAddress: z.string().min(1, "Property address is required"),
    propertyDescription: z.string().min(1, "Property description is required"),

    // Location
    latitude: z.string().optional(),
    longitude: z.string().optional(),

    // Capacity
    maxGuests: z.string().min(1, "Max guests is required"),
    bedrooms: z.string().min(1, "Bedrooms is required"),
    bathrooms: z.string().min(1, "Bathrooms is required"),

    // Security Access
    smartLockCode: z.string().optional(),
    keyBoxPin: z.string().optional(),

    // Amenities (JSON string)
    amenities: z.string().optional(),

    // Additional info
    addSecurityKeys: z.string().optional(),
    addLocalTips: z.string().optional(),

    // Pricing
    basePrice: z.string().min(1, "Base price is required"),
    weeklyOffers: z.string().optional(),
    monthlyOffers: z.string().optional(),

    // Custom prices (JSON string)
    customPrices: z.string().optional(),

    // Inventory items (JSON string)
    inventoryItems: z.string().optional(),
  }),
});

// Update hotel schema
const updateHotelSchema = z.object({
  body: z.object({
    propertyTitle: z.string().min(1, "Property title is required").optional(),
    propertyAddress: z.string().min(1, "Property address is required").optional(),
    propertyDescription: z.string().min(1, "Property description is required").optional(),

    latitude: z.string().optional(),
    longitude: z.string().optional(),

    maxGuests: z.string().optional(),
    bedrooms: z.string().optional(),
    bathrooms: z.string().optional(),

    smartLockCode: z.string().optional(),
    keyBoxPin: z.string().optional(),

    amenities: z.string().optional(),

    addSecurityKeys: z.string().optional(),
    addLocalTips: z.string().optional(),

    basePrice: z.string().optional(),
    weeklyOffers: z.string().optional(),
    monthlyOffers: z.string().optional(),

    customPrices: z.string().optional(),
    inventoryItems: z.string().optional(),
  }),
});

// Custom price validation schema for direct API usage
const createCustomPriceSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1, "Hotel ID is required"),
    startDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid start date format",
    }),
    endDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
      message: "Invalid end date format",
    }),
    price: z.number().positive("Price must be positive"),
  }),
});

// Inventory item validation schema for direct API usage
const createInventoryItemSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1, "Hotel ID is required"),
    name: z.string().min(1, "Item name is required"),
    quantity: z.number().int().positive("Quantity must be positive"),
  }),
});

// Guard validation schema
const createGuardSchema = z.object({
  body: z.object({
    hotelId: z.string().min(1, "Hotel ID is required"),
    name: z.string().min(1, "Guard name is required"),
    phone: z.string().min(1, "Guard phone is required"),
    whatsapp: z.string().optional(),
    photo: z.string().url().optional(),
    status: z.enum(["AVAILABLE", "ON_DUTY", "OFF_DUTY"]).optional(),
  }),
});

export const hotelValidation = {
  createHotelSchema,
  updateHotelSchema,
  createCustomPriceSchema,
  createInventoryItemSchema,
  createGuardSchema,
  customPriceSchema,
  inventoryItemSchema,
};
