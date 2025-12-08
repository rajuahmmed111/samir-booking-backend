import prisma from "../../../shared/prisma";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IContractFilterRequest } from "./contract.interface";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { searchableFields } from "./contract.constant";
import ApiError from "../../../errors/ApiErrors";
import { getDateRange } from "../../../helpars/filterByDate";

// get all contracts (bookings)
const getAllContracts = async (
  params: IContractFilterRequest,
  options: IPaginationOptions
) => {
  // pagination
  const limit = options.limit || Number.MAX_SAFE_INTEGER;
  const page = options.page || 1;
  const skip = (page - 1) * limit || 0;

  const { searchTerm, bookingStatus, timeRange } = params;

  // fetch all bookings
  const hotel = await prisma.hotel_Booking.findMany();

  let allContracts = [...hotel.map((item) => ({ type: "hotel", ...item }))];

  // timeRange filter
  let dateRange;
  if (timeRange) {
    dateRange = getDateRange(timeRange);
  }
  if (dateRange) {
    allContracts = allContracts.filter((contract) => {
      const createdAt = new Date((contract as any).createdAt);
      return createdAt >= dateRange.gte && createdAt <= dateRange.lte;
    });
  }

  // search filter
  if (searchTerm) {
    allContracts = allContracts.filter((contract) =>
      searchableFields.some((field) => {
        const value = (contract as any)[field];
        return (
          value &&
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    );
  }

  // bookingStatus filter
  if (bookingStatus) {
    allContracts = allContracts.filter(
      (contract) => contract.bookingStatus === bookingStatus
    );
  }

  // total count (before pagination)
  const total = allContracts.length;

  // sorting (latest first)
  allContracts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // pagination slice
  const paginatedContracts = allContracts.slice(skip, skip + limit);

  return {
    meta: {
      total,
      page,
      limit: limit === Number.MAX_SAFE_INTEGER ? total : limit,
    },
    data: paginatedContracts,
  };
};

// get single contract by id
const getSingleContract = async (id: string, type: string) => {
  let contract: any;

  switch (type) {
    case "hotel":
      contract = await prisma.hotel_Booking.findUnique({
        where: { id },
        include: {
          hotel: {
            select: {
              id: true,
            },
          },
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              profileImage: true,
              contactNumber: true,
            },
          },
        },
      });
      break;

    default:
      throw new Error("Invalid contract type");
  }

  if (!contract) {
    throw new Error("Contract not found");
  }

  // partner fetch
  if (contract?.partnerId) {
    const partner = await prisma.user.findUnique({
      where: { id: contract.partnerId },
      select: {
        id: true,
        fullName: true,
        email: true,
        profileImage: true,
        contactNumber: true,
      },
    });

    contract = {
      ...contract,
      partner,
    };
  }

  return { type, ...contract };
};

export const ContractService = {
  getAllContracts,
  getSingleContract,
};
