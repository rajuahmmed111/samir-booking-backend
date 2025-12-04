import prisma from "../../../shared/prisma";
import { IServiceCreate, IServiceUpdate } from "./service.interface";
import { ServiceStatus } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";

// create service
const createService = async (
  payload: IServiceCreate,
  coverImageFile?: Express.Multer.File
) => {
  const { availability, ...serviceData } = payload;

  // cover image upload
  let coverImagePath = serviceData.coverImage;
  if (coverImageFile) {
    const uploaded = await uploadFile.uploadToCloudinary(coverImageFile);
    if (!uploaded?.secure_url) {
      throw new Error("Cloudinary upload failed for cover image");
    }
    coverImagePath = uploaded.secure_url;
  }

  // create service
  const service = await prisma.service.create({
    data: {
      ...serviceData,
      coverImage: coverImagePath,
      serviceStatus: serviceData.serviceStatus as ServiceStatus,
    },
  });

  // create availability with slots
  for (const avail of availability) {
    const createdAvailability = await prisma.availability.create({
      data: {
        day: avail.day,
        serviceId: service.id,
      },
    });

    // create slots for availability
    for (const slot of avail.slots) {
      await prisma.scheduleSlot.create({
        data: {
          from: slot.from,
          to: slot.to,
          serviceId: service.id,
          availableServiceId: createdAvailability.id,
        },
      });
    }
  }

  const completeService = await prisma.service.findUnique({
    where: { id: service.id },
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });

  return completeService;
};

// update service
const updateService = async (serviceId: string, payload: IServiceUpdate) => {
  const { availability, ...serviceData } = payload;

  // Convert serviceStatus to proper enum type if present
  const updateData: any = { ...serviceData };
  if (serviceData.serviceStatus) {
    updateData.serviceStatus = serviceData.serviceStatus as ServiceStatus;
  }

  // First, update the basic service information
  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: updateData,
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });

  // If availability is provided, update it
  if (availability) {
    // Delete existing availability and slots
    await prisma.scheduleSlot.deleteMany({
      where: {
        serviceId,
      },
    });

    await prisma.availability.deleteMany({
      where: {
        serviceId,
      },
    });

    // Create new availability and slots
    await prisma.service.update({
      where: { id: serviceId },
      data: {
        availability: {
          create: availability.map((avail) => ({
            day: avail.day,
            slots: {
              create: avail.slots.map((slot) => ({
                from: slot.from,
                to: slot.to,
              })),
            },
          })),
        },
      },
      include: {
        availability: {
          include: {
            slots: true,
          },
        },
      },
    });
  }

  // Return the updated service with new availability
  const finalService = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });

  return finalService;
};

// get single service
const getServiceById = async (serviceId: string) => {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });

  return service;
};

// get all services
const getAllServices = async () => {
  const services = await prisma.service.findMany({
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });

  return services;
};

export const ServiceService = {
  createService,
  updateService,
  getServiceById,
  getAllServices,
};
