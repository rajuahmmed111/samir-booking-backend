import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { Prisma, SupportStatus, UserStatus, SupportType } from "@prisma/client";
import { IFilterRequest } from "./support.interface";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./support.constant";
// import { getDateRange } from "../../../helpars/filterByDate";

// create user-to-user report
const createUserReport = async (
  reporterId: string,
  reportedUserId: string,
  data: any
) => {
  const { subject, description, supportType } = data;
  if (!subject || !description || !supportType) {
    throw new ApiError(httpStatus.BAD_REQUEST, "fields are required");
  }

  // find reporter user
  const reporter = await prisma.user.findUnique({ where: { id: reporterId } });
  if (!reporter) {
    throw new ApiError(httpStatus.NOT_FOUND, "Reporter not found");
  }

  // find reported user
  const reportedUser = await prisma.user.findUnique({
    where: { id: reportedUserId },
  });
  if (!reportedUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "Reported user not found");
  }

  // create support with special data
  const support = await prisma.support.create({
    data: {
      userId: reporterId, // reporter creates the support
      subject: `Report against ${reportedUser.fullName}`,
      description,
      supportType,
      fullName: reporter?.fullName,
      email: reporter?.email,
      contactNumber: reporter?.contactNumber,
      reportedUserId: reportedUser?.id,
    },
  });

  // create notification for admins
  await prisma.notifications.create({
    data: {
      title: "User Report Created",
      body: `${reporter.fullName} has reported ${reportedUser.fullName}`,
      message: `Report Subject: ${subject}`,
      serviceTypes: "SUPPORT",
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
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
  });

  const finalData = await Promise.all(
    result.map(async (item) => {
      let reportedUser = null;

      if (item.reportedUserId) {
        reportedUser = await prisma.user.findUnique({
          where: { id: item.reportedUserId },
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        });
      }

      return {
        ...item,
        reportedUser,
      };
    })
  );

  const total = await prisma.support.count({
    where,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: finalData,
  };
};

// get my support
const getMySupport = async (userId: string) => {
  // find user
  const findUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!findUser) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const result = await prisma.support.findMany({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  const finalData = await Promise.all(
    result.map(async (item) => {
      let reportedUser = null;

      if (item.reportedUserId) {
        reportedUser = await prisma.user.findUnique({
          where: { id: item.reportedUserId },
          select: {
            id: true,
            fullName: true,
            email: true,
            profileImage: true,
          },
        });
      }

      return {
        ...item,
        reportedUser,
      };
    })
  );

  return finalData;
};

// get support by id
const getSupportById = async (id: string) => {
  const result = await prisma.support.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Support not found");
  }

  // find reported user
  let reportedUser = null;

  if (result.reportedUserId) {
    reportedUser = await prisma.user.findUnique({
      where: { id: result.reportedUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
      },
    });
  }

  return {
    ...result,
    reportedUser,
  };
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

// delete support
const deleteSupport = async (supportId: string) => {
  const result = await prisma.support.delete({
    where: { id: supportId },
  });
  return result;
};

export const SupportService = {
  createUserReport,
  getAllSupport,
  getMySupport,
  getSupportById,
  updateMySupport,
  deleteMySupport,
  deleteSupport,
};
