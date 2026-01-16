import { z } from "zod";
import { BookingStatus } from "@prisma/client";

const OfferedServiceSchema = z.object({
  price: z.number().min(0, "Price is required"),
  serviceTypeName: z.string().min(1, "Service type name is required"),
});

const TimeSlotSchema = z.object({
  from: z.string().min(1, "Start time is required"),
  to: z.string().min(1, "End time is required"),
});

export const createServiceBookingSchema = z.object({
  body: z.object({
    property: z.string().min(1, "Property name is required"),
    serviceName: z.string().min(1, "Service name is required"),

    offeredService: z
      .array(OfferedServiceSchema)
      .min(1, "At least one offered service is required"),
    newOfferedService: OfferedServiceSchema.array().optional(),

    date: z.string().min(1, "Date is required"),
    day: z.string().min(1, "Day is required"),
    timeSlot: TimeSlotSchema,
    totalPrice: z.number().min(0, "Total price must be a positive number"),
    specialInstructions: z.string().optional(),
    // hotelId ObjectId
    hotelId: z.string().min(1, "Hotel ID is required"),
  }),
});

export const updateServiceBookingSchema = z.object({
  body: z.object({
    bookingStatus: z
      .enum([
        BookingStatus.PENDING,
        BookingStatus.CONFIRMED,
        BookingStatus.CANCELLED,
        BookingStatus.COMPLETED,
      ])
      .optional(),
    specialInstructions: z.string().optional(),
  }),
});

export const ServiceBookingValidation = {
  createServiceBookingSchema,
  updateServiceBookingSchema,
};
