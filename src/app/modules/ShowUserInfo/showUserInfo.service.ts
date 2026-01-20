import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Prisma, UserRole } from "@prisma/client";
import { IShowUserInfoFilterRequest } from "./showUserInfo.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";

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

// get all show user info
const getAllShowUserInfo = async (
  params: IShowUserInfoFilterRequest,
  options: IPaginationOptions,
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.ShowUserInfoWhereInput[] = [];

  // exact match filters with type conversion
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => {
        const value = (filterData as any)[key];

        // Convert string boolean to actual boolean
        if (key === "isShow" && typeof value === "string") {
          return {
            [key]: {
              equals: value === "true",
            },
          };
        }

        return {
          [key]: {
            equals: value,
          },
        };
      }),
    });
  }

  const where: Prisma.ShowUserInfoWhereInput = { AND: filters };

  const result = await prisma.showUserInfo.findMany({
    where,
    skip,
    take: limit,
    select: {
      id: true,
      isShow: true,
      providerId: true,
      propertyOwnerId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          profileImage: true,
          passportOrNID: true,
          contactNumber: true,
          address: true,
          country: true,
        },
      },
    },
    orderBy: [
      { isShow: "asc" }, // false comes first, then true
      { id: "desc" }, // then by id (newest first)
    ],
  });

  // find provider info by providerId
  const providerInfo = await prisma.user.findMany({
    where: { id: { in: result.map((item) => item.providerId) } },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      profileImage: true,
      passportOrNID: true,
      contactNumber: true,
      address: true,
      country: true,
    },
  });

  // map provider info to result
  const resultWithProviderInfo = result.map((item) => {
    const provider = providerInfo.find((info) => info.id === item.providerId);
    return { ...item, provider };
  });

  // total count
  const total = await prisma.showUserInfo.count({
    where,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: resultWithProviderInfo,
  };
};

export const ShowUserInfoService = {
  createShowUserInfo,
  updateShowUserInfo,
  getAllShowUserInfo,
};
