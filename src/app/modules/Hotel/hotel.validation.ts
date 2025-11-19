import { z } from "zod";

const createHotelSchema = {
  body: {
    hotelBusinessName: z.string().min(1, "hotelBusinessName is required"),
    hotelName: z.string().min(1, "hotelName is required"),
    hotelBusinessType: z.string().min(1, "hotelBusinessType is required"),
    hotelRegNum: z.string().min(1, "hotelRegNum is required"),
    hotelRegDate: z.string().min(1, "hotelRegDate is required"), // Could be refined as date string
    hotelPhone: z.string().min(1, "hotelPhone is required"),
    hotelEmail: z.string().email("Invalid email format"),

    businessTagline: z.string().min(1, "businessTagline is required"),
    businessDescription: z.string().min(1, "businessDescription is required"),
    businessLogo: z.string().url().optional(),

    hotelRoomType: z.string().min(1, "hotelRoomType is required"),
    hotelRoomPriceNight: z
      .number()
      .int()
      .positive("Must be a positive integer"),

    hotelAC: z.boolean(),
    hotelParking: z.boolean(),
    hoitelWifi: z.boolean(),
    hotelBreakfast: z.boolean(),
    hotelPool: z.boolean(),

    hotelRating: z.string().min(1, "hotelRating is required"), // You can refine this e.g. z.enum or regex

    hotelSmoking: z.boolean(),
    hotelTv: z.boolean(),
    hotelWashing: z.boolean(),

    hotelBookingCondition: z
      .string()
      .min(1, "hotelBookingCondition is required"),
    hotelCancelationPolicy: z
      .string()
      .min(1, "hotelCancelationPolicy is required"),
    hotelDocs: z.array(z.string().url()).optional(), // array of URLs for docs (PDF, DOC, etc.)
    hotelRoomDescription: z.string().min(1, "hotelRoomDescription is required"),
    hotelAddress: z.string().min(1, "hotelAddress is required"),
    hotelCity: z.string().min(1, "hotelCity is required"),
    hotelPostalCode: z.string().min(1, "hotelPostalCode is required"),
    hotelDistrict: z.string().min(1, "hotelDistrict is required"),
    hotelCountry: z.string().min(1, "hotelCountry is required"),
    hotelRoomImages: z.array(z.string().url()),
    hotelRoomCapacity: z.number().optional(),

    category: z.string().optional(),
    discount: z.number().positive().optional(),
  },
};

export const hotelValidation = {
  createHotelSchema,
};
