import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { IShowUserInfoFilterRequest, SafeUserWithShowUserInfo } from "./showUserInfo.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IGenericResponse } from "../../../interfaces/common";

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

  // ---------send notification to admin----------
  // create notification for admin
  await prisma.notifications.create({
    data: {
      title: "New Show User Info Request",
      body: "A new request to show user info has been made by a property owner. Please review the request and take appropriate action.",
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

// get all service provider for property owner
const getAllServiceProvidersForPropertyOwner = async (
  propertyOwnerId: string,
  options: IPaginationOptions,
): Promise<IGenericResponse<SafeUserWithShowUserInfo[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const where: Prisma.UserWhereInput = {
    role: UserRole.SERVICE_PROVIDER,
    status: UserStatus.ACTIVE,
  };

  const result = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      contactNumber: true,
      address: true,
      country: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      providerShowUserInfos: {
        where: {
          propertyOwnerId: propertyOwnerId,
        },
        select: {
          id: true,
          isShow: true,
          propertyOwnerId: true,
          providerId: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const usersWithShowUserInfo = result.map((user) => ({
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage,
    contactNumber: user.contactNumber,
    address: user.address,
    country: user.country,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    showUserInfo:
      user.providerShowUserInfos.length > 0
        ? user.providerShowUserInfos[0]
        : null,
  }));

  const total = await prisma.user.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: usersWithShowUserInfo,
  };
};


export const ShowUserInfoService = {
  createShowUserInfo,
  updateShowUserInfo,
  getAllServiceProvidersForPropertyOwner,
};
