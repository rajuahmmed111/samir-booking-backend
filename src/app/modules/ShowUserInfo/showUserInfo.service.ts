import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import {
  IShowUserInfoFilterRequest,
  IUserFilterRequest,
  SafeUserWithShowUserInfo,
} from "./showUserInfo.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IGenericResponse } from "../../../interfaces/common";
import { searchableFields } from "./showUserInfo.constant";



// get all service provider for property owner
const getAllServiceProvidersForPropertyOwner = async (
  params: IUserFilterRequest,
  options: IPaginationOptions,
): Promise<IGenericResponse<SafeUserWithShowUserInfo[]>> => {
  const { searchTerm, serviceType, ...filterData } = params;
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const filters: Prisma.UserWhereInput[] = [];

  filters.push({
    role: UserRole.SERVICE_PROVIDER,
    status: UserStatus.ACTIVE,
  });

  // service type filter if provided
  if (serviceType) {
    filters.push({
      services: {
        some: {
          serviceType: {
            contains: serviceType,
            mode: "insensitive",
          },
        },
      },
    });
  }

  // search filter if provided
  if (params?.searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  const where: Prisma.UserWhereInput = {
    AND: filters,
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
      profileImage: true,
      passportOrNID: true,
      contactNumber: true,
      address: true,
      country: true,
      createdAt: true,
      updatedAt: true,
      services: {
        select: {
          id: true,
          serviceType: true,
          serviceRating: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  // calculate average service rating for each provider
  const resultWithAverageRating = result.map((user) => {
    const ratings = user.services
      .map((service) => service.serviceRating)
      .filter((rating) => rating !== null)
      .map((rating) => parseFloat(rating as string))
      .filter((rating) => !isNaN(rating));

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null;

    return {
      ...user,
      averageServiceRating: averageRating,
    };
  });

  const total = await prisma.user.count({ where });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: resultWithAverageRating,
  };
};


export const ShowUserInfoService = {
  getAllServiceProvidersForPropertyOwner,
};
