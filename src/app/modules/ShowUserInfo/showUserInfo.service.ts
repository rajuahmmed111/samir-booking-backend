import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { UserRole } from "@prisma/client";

// create show user info for property owner by providerId
const createShowUserInfo = async (
  providerId: string,
  propertyOwnerId: string,
) => {
  // verify provider exists
  const provider = await prisma.user.findFirst({
    where: { id: providerId, role: UserRole.SERVICE_PROVIDER },
  });

  if (!provider) {
    throw new ApiError(httpStatus.NOT_FOUND, "Provider not found");
  }

  // verify property owner exists
  const propertyOwner = await prisma.user.findFirst({
    where: { id: propertyOwnerId, role: UserRole.PROPERTY_OWNER },
  });

  if (!propertyOwner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Property owner not found");
  }

  const result = await prisma.showUserInfo.create({
    data: {
      isShow: false,
      providerId,
      propertyOwnerId,
    },
  });

  return result;
};

// update show user info
const updateShowUserInfo = async (id: string) => {
  // verify show user info exists
  const existingShowUserInfo = await prisma.showUserInfo.findUnique({
    where: { id },
  });

  if (!existingShowUserInfo) {
    throw new ApiError(httpStatus.NOT_FOUND, "Show user info not found");
  }

  const result = await prisma.showUserInfo.update({
    where: { id },
    data: {
      isShow: true,
    },
  });

  return result;
};

export const ShowUserInfoService = {
  createShowUserInfo,
  updateShowUserInfo,
};
