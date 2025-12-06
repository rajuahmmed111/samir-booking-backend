import { z } from "zod";
import { BookingStatus } from "@prisma/client";

const TimeSlotSchema = z.object({
  from: z.string().min(1, "Start time is required"),
  to: z.string().min(1, "End time is required"),
});

export const createServiceBookingSchema = z.object({
  body: z.object({
    property: z.string().min(1, "Property name is required"),
    serviceName: z.string().min(1, "Service name is required"),
    date: z.string().min(1, "Date is required"),
    day: z.string().min(1, "Day is required"),
    timeSlot: TimeSlotSchema,
    totalPrice: z.number().min(0, "Total price must be a positive number"),
    specialInstructions: z.string().optional(),
  }),
});

export const updateServiceBookingSchema = z.object({
  body: z.object({
    bookingStatus: z.enum([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED]).optional(),
    specialInstructions: z.string().optional(),
  }),
});

export const ServiceBookingValidation = {
  createServiceBookingSchema,
  updateServiceBookingSchema,
};