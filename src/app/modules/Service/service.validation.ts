import { z } from "zod";
import { ServiceStatus } from "@prisma/client";

const ServiceSlotSchema = z.object({
  from: z.string().min(1, "Start time is required"),
  to: z.string().min(1, "End time is required"),
});

const ServiceAvailabilitySchema = z.object({
  day: z.string().min(1, "Day is required"),
  slots: z.array(ServiceSlotSchema).min(1, "At least one slot is required"),
});

export const createServiceSchema = z.object({
  body: z.object({
    serviceName: z.string().min(1, "Service name is required"),
    serviceType: z.string().min(1, "Service type is required"),
    description: z.string().min(1, "Description is required"),
    experience: z.number().min(0, "Experience must be a positive number"),
    price: z.number().min(0, "Price must be a positive number"),
    // coverImage: z.string().min(1, "Cover image is required"),
    serviceStatus: z.enum([
      ServiceStatus.ACTIVE,
      ServiceStatus.INACTIVE,
      ServiceStatus.PENDING,
    ]),
    recordProofVideo: z.string().optional(),
    addRemark: z.string().optional(),
    availability: z
      .array(ServiceAvailabilitySchema)
      .min(1, "At least one availability is required"),
  }),
});

export const updateServiceSchema = z.object({
  body: z.object({
    serviceName: z.string().min(1, "Service name is required").optional(),
    serviceType: z.string().min(1, "Service type is required").optional(),
    description: z.string().min(1, "Description is required").optional(),
    experience: z
      .number()
      .min(0, "Experience must be a positive number")
      .optional(),
    price: z.number().min(0, "Price must be a positive number").optional(),
    serviceStatus: z
      .enum([
        ServiceStatus.ACTIVE,
        ServiceStatus.INACTIVE,
        ServiceStatus.PENDING,
      ])
      .optional(),
    recordProofVideo: z.string().optional(),
    addRemark: z.string().optional(),
    availability: z
      .array(ServiceAvailabilitySchema)
      .min(1, "At least one availability is required")
      .optional(),
  }),
});

export const ServiceValidation = {
  createServiceSchema,
  updateServiceSchema,
};
