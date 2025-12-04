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
      // space before AM/PM formate
      const formatTime = (time: string) => {
        return time
          .replace(/\s+(AM|PM)/i, " $1") // replace multiple spaces
          .replace(/(AM|PM)/i, " $1") // add space
          .trim();
      };

      await prisma.scheduleSlot.create({
        data: {
          from: formatTime(slot.from),
          to: formatTime(slot.to),
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
const updateService = async (
  serviceId: string,
  payload: IServiceUpdate,
  coverImageFile?: Express.Multer.File
) => {
  // Check if service exists
  const existingService = await prisma.service.findUnique({
    where: { id: serviceId },
    include: {
      availability: {
        include: {
          slots: true,
        },
      },
    },
  });

  if (!existingService) {
    throw new Error("Service not found");
  }

  const { availability, ...serviceData } = payload;

  // Handle cover image upload
  let coverImagePath = serviceData.coverImage;
  if (coverImageFile) {
    const uploaded = await uploadFile.uploadToCloudinary(coverImageFile);
    if (!uploaded?.secure_url) {
      throw new Error("Cloudinary upload failed for cover image");
    }
    coverImagePath = uploaded.secure_url;
  }

  // Prepare update data
  const updateData: any = {};

  if (serviceData.serviceName) updateData.serviceName = serviceData.serviceName;
  if (serviceData.serviceType) updateData.serviceType = serviceData.serviceType;
  if (serviceData.description) updateData.description = serviceData.description;
  if (serviceData.price !== undefined) updateData.price = serviceData.price;
  if (serviceData.recordProofVideo)
    updateData.recordProofVideo = serviceData.recordProofVideo;
  if (serviceData.addRemark) updateData.addRemark = serviceData.addRemark;
  if (coverImagePath) updateData.coverImage = coverImagePath;
  if (serviceData.serviceStatus)
    updateData.serviceStatus = serviceData.serviceStatus as ServiceStatus;

  // Update service basic info
  const updatedService = await prisma.service.update({
    where: { id: serviceId },
    data: updateData,
  });

  // Update availability if provided
  if (availability && availability.length > 0) {
    // Delete existing availability and slots
    await prisma.scheduleSlot.deleteMany({
      where: { serviceId: serviceId },
    });

    await prisma.availability.deleteMany({
      where: { serviceId: serviceId },
    });

    // Create new availability with slots
    for (const avail of availability) {
      const createdAvailability = await prisma.availability.create({
        data: {
          day: avail.day,
          serviceId: serviceId,
        },
      });

      // Create slots for availability
      for (const slot of avail.slots) {
        const formatTime = (time: string) => {
          return time
            .replace(/\s+(AM|PM)/i, " $1")
            .replace(/(AM|PM)/i, " $1")
            .trim();
        };

        await prisma.scheduleSlot.create({
          data: {
            from: formatTime(slot.from),
            to: formatTime(slot.to),
            serviceId: serviceId,
            availableServiceId: createdAvailability.id,
          },
        });
      }
    }
  }

  // Fetch and return complete updated service
  const completeService = await prisma.service.findUnique({
    where: { id: serviceId },
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

// Format time (AM/PM proper spacing)
const formatTime = (time: string) => {
  return time.replace(/\s+(AM|PM)/i, " $1").trim();
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
