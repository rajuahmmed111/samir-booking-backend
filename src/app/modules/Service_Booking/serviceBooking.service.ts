import { UserStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// create service booking
const createServiceBooking = async (
  userId: string,
  serviceId: string,
  data: any
) => {
  // find user
  const findUser = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find service
  const findService = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!findService) {
    throw new ApiError(httpStatus.NOT_FOUND, "Service not found");
  }

  const result = await prisma.service_booking.create({
    data: { userId, serviceId },
  });
  return result;
};

export const ServiceBookingService = { createServiceBooking };
