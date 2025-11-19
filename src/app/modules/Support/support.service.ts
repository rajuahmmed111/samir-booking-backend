import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { Prisma, SupportStatus, UserStatus } from "@prisma/client";
import { IFilterRequest } from "./support.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./support.constant";

// create support
const createSupport = async (userId: string, data: any) => {
  const { subject, description, supportType } = data;
  if (!subject || !description || !supportType) {
    throw new ApiError(httpStatus.BAD_REQUEST, "fields are required");
  }

  // find user
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  const support = await prisma.support.create({
    data: {
      userId,
      ...data,
    },
  });

  // create notification
  await prisma.notifications.create({
    data: {
      title: "New Support Ticket Created",
      body: `A new support ticket has been created by ${findUser.fullName}`,
      message: `Support Subject: ${subject}`,
      serviceTypes: "SUPPORT",
      partnerId: userId,
      supportId: support.id,
    },
  });

  return support;
};

// get all support
const getAllSupport = async (
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.SupportWhereInput[] = [];

  // text search
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

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // always get only Pending status
  filters.push({
    status: SupportStatus.Pending,
  });

  const where: Prisma.SupportWhereInput = {
    AND: filters,
  };

  const result = await prisma.support.findMany({
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
  });

  const total = await prisma.support.count({
    where,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get my support
const getMySupport = async (userId: string) => {
  // find user
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.support.findMany({ where: { userId } });
  return result;
};

// get support by id
const getSupportById = async (id: string) => {
  const result = await prisma.support.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  return result;
};

// update my support
const updateMySupport = async (
  userId: string,
  supportId: string,
  data: any
) => {
  // find user
  const findUser = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find support
  const findSupport = await prisma.support.findUnique({
    where: { id: supportId, userId },
  });
  if (!findSupport) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  const result = await prisma.support.update({
    where: { id: supportId },
    data,
  });
  return result;
};

// delete my support
const deleteMySupport = async (userId: string, supportId: string) => {
  // find user
  const findUser = await prisma.user.findUnique({
    where: { id: userId, status: UserStatus.ACTIVE },
  });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // find support
  const findSupport = await prisma.support.findUnique({
    where: { id: supportId, userId },
  });
  if (!findSupport) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  const result = await prisma.support.delete({
    where: { id: findSupport.id },
  });
  return result;
};

// update support status
const updateSupportStatus = async (supportId: string) => {
  const result = await prisma.support.update({
    where: { id: supportId },
    data: { status: SupportStatus.Closed },
  });
  return result;
};

export const SupportService = {
  createSupport,
  getAllSupport,
  getMySupport,
  getSupportById,
  updateMySupport,
  deleteMySupport,
  updateSupportStatus,
};
