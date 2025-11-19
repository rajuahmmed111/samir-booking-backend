import { Prisma } from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import prisma from "../../../shared/prisma";
import { IFilterRequest } from "./finance.interface";
import { searchableFields } from "./finance.constant";
import { getDateRange } from "../../../helpars/filterByDate";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// get all finances
const getAllFinances = async (
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.PaymentWhereInput[] = [];

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

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.PaymentWhereInput = {
    AND: filters,
  };

  const result = await prisma.payment.findMany({
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

  const total = await prisma.payment.count({
    where,
  });

  // fetch all related users in one query
  const userIds = Array.from(new Set(result.map((p) => p.userId)));
  const partnerIds = Array.from(new Set(result.map((p) => p.partnerId)));

  const users = await prisma.user.findMany({
    where: { id: { in: [...userIds, ...partnerIds] } },
    select: { id: true, fullName: true, role: true },
  });

  // users by id for easy lookup
  const userMap = new Map(users.map((u) => [u.id, u.fullName]));

  // attach userName & partnerName
  const dataWithNames = result.map((p) => ({
    ...p,
    userName: userMap.get(p.userId) || null,
    partnerName: userMap.get(p.partnerId) || null,
  }));

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: dataWithNames,
  };
};

// get all service providers finances
const getAllProvidersFinances = async (
  partnerId: string,
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.PaymentWhereInput[] = [];

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

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.PaymentWhereInput = {
    AND: filters,
    ...(partnerId && { partnerId }),
  };

  if (partnerId) {
    where.partnerId = partnerId;
  }

  const result = await prisma.payment.findMany({
    where: where,
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

  const total = await prisma.payment.count({
    where: {
      partnerId,
    },
  });

  // sum service_fee
  const totalServiceFee = await prisma.payment.aggregate({
    _sum: {
      service_fee: true,
    },
    where,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
    totalServiceFee: totalServiceFee._sum.service_fee || 0,
  };
};

// get all users finances
const getAllUsersFinances = async (
  userId: string,
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, timeRange, ...filterData } = params;

  const filters: Prisma.PaymentWhereInput[] = [];

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

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  const where: Prisma.PaymentWhereInput = {
    AND: filters,
    ...(userId && { userId }),
  };

  const result = await prisma.payment.findMany({
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

  const total = await prisma.payment.count({
    where,
  });

  // sum service_fee
  const totalUserExpense = await prisma.payment.aggregate({
    _sum: {
      amount: true,
    },
    where,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
    totalUserExpense: totalUserExpense._sum.amount || 0,
  };
};

// get single service provider finances
const getSingleProviderFinance = async (paymentId: string) => {
  // payment data
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Finance not found");
  }

  // user
  const user = await prisma.user.findUnique({
    where: { id: payment.userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      role: true,
      contactNumber: true,
      address: true,
    },
  });

  // partner
  const partner = await prisma.user.findUnique({
    where: { id: payment.partnerId },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      role: true,
      contactNumber: true,
      address: true,
    },
  });

  return {
    payment,
    user,
    partner,
  };
};

export const FinanceService = {
  getAllFinances,
  getAllProvidersFinances,
  getAllUsersFinances,
  getSingleProviderFinance,
};
