import { Request } from "express";
import prisma from "../../../shared/prisma";
import { IUploadedFile } from "../../../interfaces/file";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  Hotel,
  EveryServiceStatus,
  Prisma,
  BookingStatus,
  Room,
} from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IHotelFilterRequest } from "./hotel.interface";
import {
  numericFields,
  searchableFields,
  searchableFieldsHotel,
} from "./hotel.constant";
import { uploadFile } from "../../../helpars/fileUploader";
import { CurrencyHelpers } from "../../../helpars/currency";

// create hotel
const createHotel = async (req: Request) => {
  const partnerId = req.user?.id;

  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // service check
  if (
    partnerExists.isSecurity ||
    partnerExists.isCar ||
    partnerExists.isAttraction
  ) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only provide one type of service. You already provide another service."
    );
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const hotelLogoFile = files?.businessLogo?.[0];
  const docsFiles = files?.hotelDocs || [];

  // Upload logo
  let businessLogo = "https://i.ibb.co/zWxSgQL8/download.png";
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload multiple docs
  let hotelDocUrls: string[] = [];
  if (docsFiles.length > 0) {
    const docUploads = await Promise.all(
      docsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelBusinessName,
    hotelName,
    hotelBusinessType,
    hotelRegNum,
    hotelRegDate,
    hotelPhone,
    hotelEmail,
    businessTagline,
    businessDescription,
    hotelBookingCondition,
    hotelCancelationPolicy,
    hotelLate,
    hotelLong,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,

    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelAccommodationType,
    hotelKitchen,
    hotelRestaurant,
    hotelGym,
    hotelSpa,
    hotel24HourFrontDesk,
    hotelAirportShuttle,
    hotelNoSmokingPreference,
    hotelNoNSmoking,
    hotelPetsAllowed,
    hotelNoPetsPreferences,
    hotelPetsNotAllowed,
    hotelLocationFeatureWaterView,
    hotelLocationFeatureIsland,
    hotelCoffeeBar,
  } = req.body;

  const result = await prisma.hotel.create({
    data: {
      hotelBusinessName,
      hotelName,
      hotelBusinessType,
      hotelRegNum,
      hotelRegDate,
      hotelPhone,
      hotelEmail,
      businessTagline,
      businessDescription,
      businessLogo,
      hotelBookingCondition,
      hotelCancelationPolicy,
      hotelDocs: hotelDocUrls,
      hotelLate: hotelLate ? parseFloat(hotelLate) : undefined,
      hotelLong: hotelLong ? parseFloat(hotelLong) : undefined,
      hotelAddress,
      hotelCity,
      hotelPostalCode,
      hotelDistrict,
      hotelCountry,

      hotelAC: Boolean(hotelAC),
      hotelParking: Boolean(hotelParking),
      hoitelWifi: Boolean(hoitelWifi),
      hotelBreakfast: Boolean(hotelBreakfast),
      hotelPool: Boolean(hotelPool),
      hotelSmoking: Boolean(hotelSmoking),
      hotelTv: Boolean(hotelTv),
      hotelWashing: Boolean(hotelWashing),
      hotelAccommodationType,
      hotelKitchen: Boolean(hotelKitchen),
      hotelRestaurant: Boolean(hotelRestaurant),
      hotelGym: Boolean(hotelGym),
      hotelSpa: Boolean(hotelSpa),
      hotel24HourFrontDesk: Boolean(hotel24HourFrontDesk),
      hotelAirportShuttle: Boolean(hotelAirportShuttle),
      hotelNoSmokingPreference: Boolean(hotelNoSmokingPreference),
      hotelNoNSmoking: Boolean(hotelNoNSmoking),
      hotelPetsAllowed: Boolean(hotelPetsAllowed),
      hotelNoPetsPreferences: Boolean(hotelNoPetsPreferences),
      hotelPetsNotAllowed: Boolean(hotelPetsNotAllowed),
      hotelLocationFeatureWaterView: Boolean(hotelLocationFeatureWaterView),
      hotelLocationFeatureIsland: Boolean(hotelLocationFeatureIsland),
      hotelCoffeeBar: Boolean(hotelCoffeeBar),
      partnerId: partnerId,
    },
  });

  // update partner hotel count
  await prisma.user.update({
    where: { id: partnerExists.id },
    data: { isHotel: true },
  });

  return result;
};

// create hotel room
const createHotelRoom = async (req: Request) => {
  const partnerId = req.user?.id;
  const hotelId = req.params.hotelId;

  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  const hotelExists = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });
  if (!hotelExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const roomImageFiles = files?.hotelRoomImages || [];
  const hotelImagesFile = files?.hotelImages || [];

  // Upload multiple room images
  let roomImageUrls: string[] = [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload multiple hotel images
  let hotelRoomUrls: string[] = [];
  if (hotelImagesFile.length > 0) {
    const docUploads = await Promise.all(
      hotelImagesFile.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelRoomUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelRoomType,
    hotelRoomDescription,
    // hotelAddress,
    // hotelCity,
    // hotelPostalCode,
    // hotelDistrict,
    // hotelCountry,
    hotelRoomCapacity,
    hotelNumberOfRooms,
    hotelNumAdults,
    hotelNumChildren,
    hotelRoomPriceNight,
    hotelRating,
    category,
    discount,
    hotelReviewCount,
    currency,
  } = req.body;

  const result = await prisma.room.create({
    data: {
      hotelRoomType,
      hotelRoomDescription,
      // hotelAddress,
      // hotelCity,
      // hotelPostalCode,
      // hotelDistrict,
      // hotelCountry,
      hotelRoomCapacity,
      hotelNumberOfRooms: parseInt(hotelNumberOfRooms),
      hotelNumAdults: parseInt(hotelNumAdults),
      hotelNumChildren: parseInt(hotelNumChildren),
      hotelRating: hotelRating ? hotelRating : "0",
      hotelRoomPriceNight: hotelRoomPriceNight
        ? parseFloat(hotelRoomPriceNight)
        : 0,
      category,
      discount: discount ? parseInt(discount) : undefined,
      hotelReviewCount: hotelReviewCount ? parseInt(hotelReviewCount) : 0,
      isBooked: EveryServiceStatus.AVAILABLE,
      hotelRoomImages: roomImageUrls,
      hotelImages: hotelRoomUrls,
      hotelId: hotelId,
      partnerId: partnerExists.id,
      currency: currency.toUpperCase(),
    },
  });

  return result;
};

// get room active listing by partnerId
const getRoomActiveListing = async (
  partnerId: string,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const result = await prisma.room.findMany({
    where: {
      partnerId,
    },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
    include: {
      hotel: {
        select: {
          hotelCity: true,
          hotelCountry: true,
        },
      },
    },
  });

  const total = await prisma.room.count({
    where: {
      partnerId,
    },
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

// get available rooms by partnerId
const getAvailableRooms = async (
  partnerId: string,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const result = await prisma.room.findMany({
    where: {
      partnerId,
      isBooked: EveryServiceStatus.AVAILABLE,
    },
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
    include: {
      hotel: {
        select: {
          hotelCity: true,
          hotelCountry: true,
        },
      },
    },
  });

  const total = await prisma.room.count({
    where: {
      partnerId,
    },
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

// get all hotels with search filtering and pagination
const getAllHotels = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions,
  userCurrency: string = "USD"
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const {
    searchTerm,
    minPrice,
    maxPrice,
    fromDate,
    toDate,
    hotelRating,
    hotelNumberOfRooms,
    hotelNumAdults,
    hotelNumChildren,
    ...filterData
  } = params;

  const filters: Prisma.HotelWhereInput[] = [];

  // text search
  if (searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // convert string booleans to actual boolean
  const normalizedFilterData: any = {};
  Object.keys(filterData).forEach((key) => {
    const value = (filterData as any)[key];
    if (value === "true") normalizedFilterData[key] = true;
    else if (value === "false") normalizedFilterData[key] = false;
    else normalizedFilterData[key] = value;
  });

  // Exact search filter
  if (Object.keys(normalizedFilterData).length > 0) {
    filters.push({
      AND: Object.keys(normalizedFilterData).map((key) => ({
        [key]: { equals: normalizedFilterData[key] },
      })),
    });
  }

  const where: Prisma.HotelWhereInput = {
    AND: filters,
  };

  // room-level filters
  const roomWhere: Prisma.RoomWhereInput = {
    // room booking date block
    NOT: {
      hotel_bookings:
        fromDate && toDate
          ? {
              some: {
                OR: [
                  {
                    bookedFromDate: { lte: toDate },
                    bookedToDate: { gte: fromDate },
                  },
                ],
              },
            }
          : undefined,
    },

    // adults
    ...(hotelNumAdults
      ? { hotelNumAdults: { gte: Number(hotelNumAdults) } }
      : {}),

    // children
    ...(hotelNumChildren
      ? { hotelNumChildren: { gte: Number(hotelNumChildren) } }
      : {}),

    // min price
    ...(minPrice ? { hotelRoomPriceNight: { gte: Number(minPrice) } } : {}),

    // max price
    ...(maxPrice
      ? {
          hotelRoomPriceNight: {
            ...(minPrice ? { gte: Number(minPrice) } : {}),
            lte: Number(maxPrice),
          },
        }
      : {}),

    // rating
    ...(hotelRating ? { hotelRating: { gte: hotelRating } } : {}),
  };

  // fetch hotels
  const hotels = await prisma.hotel.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder && options.sortBy !== "price"
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },

    include: {
      room: {
        where: roomWhere,
        // include: {
        //   review: true,
        // }
      },
    },
  });

  // total room count for each hotel
  const hotelRoomCounts = await prisma.room.groupBy({
    by: ["hotelId"],
    _count: { hotelId: true },
  });

  const hotelRoomCountMap = new Map(
    hotelRoomCounts.map((h) => [String(h.hotelId), h._count.hotelId])
  );

  // filter hotel based on roomCount + matching rooms
  let filteredHotels = hotels.filter((hotel) => {
    const totalRoomCount = hotelRoomCountMap.get(String(hotel.id)) || 0;

    // hotelNumberOfRooms diye filter
    if (hotelNumberOfRooms && totalRoomCount < Number(hotelNumberOfRooms)) {
      return false;
    }

    // jodi room array empty hoy → hotel skip
    if (hotel.room.length === 0) return false;

    return true;
  });

  // currency exchange
  const exchangeRates = await CurrencyHelpers.getExchangeRates();

  // Convert prices এবং filter
  let resultWithAverages = filteredHotels
    .map((hotel) => {
      if (hotel.room.length === 0) return null;

      // room price convert
      const roomsWithConvertedPrices = hotel.room.map((room) => {
        const roomCurrency = room.currency || "USD";

        const convertedPrice = CurrencyHelpers.convertPrice(
          room.hotelRoomPriceNight,
          roomCurrency,
          userCurrency,
          exchangeRates
        );

        const discountedPrice = CurrencyHelpers.convertPrice(
          room.discount,
          roomCurrency,
          userCurrency,
          exchangeRates
        );

        return {
          ...room,
          originalPrice: room.hotelRoomPriceNight,
          originalCurrency: roomCurrency,
          convertedPrice,
          discountedPrice,
          displayCurrency: userCurrency,
          exchangeRate:
            exchangeRates[userCurrency] / exchangeRates[roomCurrency],
        };
      });

      // if no room found
      if (roomsWithConvertedPrices.length === 0) return null;

      // averages calculate
      const totalPrice = roomsWithConvertedPrices.reduce(
        (sum, room) => sum + room.discountedPrice,
        0
      );

      const totalRating = roomsWithConvertedPrices.reduce(
        (sum, room) => sum + (parseFloat(room.hotelRating) || 0),
        0
      );

      const totalReviews = roomsWithConvertedPrices.reduce(
        (sum, room) => sum + (room.hotelReviewCount || 0),
        0
      );

      return {
        ...hotel,
        room: roomsWithConvertedPrices,
        averagePrice: Number(
          (totalPrice / roomsWithConvertedPrices.length).toFixed(2)
        ),
        averageRating: Number(
          (totalRating / roomsWithConvertedPrices.length).toFixed(1)
        ),
        averageReviewCount: Math.round(
          totalReviews / roomsWithConvertedPrices.length
        ),
        displayCurrency: userCurrency,
        currencySymbol: CurrencyHelpers.getCurrencySymbol(userCurrency),
      };
    })
    .filter((hotel) => hotel !== null);

  // sort by averagePrice (low → high / high → low)
  if (options.sortBy === "price") {
    resultWithAverages = resultWithAverages.sort((a, b) =>
      options.sortOrder === "asc"
        ? a.averagePrice - b.averagePrice
        : b.averagePrice - a.averagePrice
    );
  }

  const total = resultWithAverages.length;

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: resultWithAverages,
  };
};

// get all hotel rooms with search filtering and pagination
const getAllHotelRooms = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, minPrice, maxPrice, fromDate, toDate, ...filterData } =
    params;

  const filters: Prisma.RoomWhereInput[] = [];

  // text search
  // filters.push({
  //   OR: searchableFields.map((field) => {
  //     if (field === "hotelName") {
  //       // search inside related Hotel
  //       return {
  //         hotel: {
  //           hotelName: {
  //             contains: params.searchTerm,
  //             mode: "insensitive",
  //           },
  //         },
  //       };
  //     }
  //     return {
  //       [field]: {
  //         contains: params.searchTerm,
  //         mode: "insensitive",
  //       },
  //     };
  //   }),
  // });

  // numeric match
  const exactNumericFields = numericFields.filter(
    (f) => f !== "hotelRoomPriceNight"
  );

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData)
        .filter(
          (key) =>
            exactNumericFields.includes(key) || !numericFields.includes(key)
        )
        .map((key) => {
          let value: any = (filterData as any)[key];

          if (exactNumericFields.includes(key)) value = Number(value);
          if (["true", "false"].includes(value)) value = value === "true";

          return {
            [key]: { equals: value },
          };
        }),
    });
  }

  // price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: any = {};
    if (minPrice !== undefined) priceFilter.gte = parseFloat(minPrice as any);
    if (maxPrice !== undefined) priceFilter.lte = parseFloat(maxPrice as any);

    filters.push({
      hotelRoomPriceNight: priceFilter,
    });
  }

  // Availability filter
  if (fromDate && toDate) {
    filters.push({
      hotel_bookings: {
        none: {
          bookingStatus: BookingStatus.CONFIRMED,
          OR: [
            {
              bookedFromDate: { lte: toDate },
              bookedToDate: { gte: fromDate },
            },
          ],
        },
      },
    });
  }

  // get only isBooked  AVAILABLE hotels
  // filters.push({
  //   isBooked: EveryServiceStatus.AVAILABLE,
  // });

  const where: Prisma.RoomWhereInput = { AND: filters };

  const result = await prisma.room.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      hotel_bookings: {
        select: {
          bookedFromDate: true,
          bookedToDate: true,
          bookingStatus: true,
        },
      },
      hotel: true,
    },
  });

  const total = await prisma.room.count({ where });

  const sortedResult = result.sort(
    (a, b) => parseFloat(b.hotelRating) - parseFloat(a.hotelRating)
  );

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: sortedResult,
  };
};

// get all hotel rooms by hotel id with search filtering and pagination
const getAllHotelRoomsByHotelId = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions,
  hotelId: string
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, minPrice, maxPrice, fromDate, toDate, ...filterData } =
    params;

  const filters: Prisma.RoomWhereInput[] = [];

  // hotelId filter
  filters.push({ hotelId });

  // text search
  // filters.push({
  //   OR: searchableFields.map((field) => {
  //     if (field === "hotelName") {
  //       // search inside related Hotel
  //       return {
  //         hotel: {
  //           hotelName: {
  //             contains: params.searchTerm,
  //             mode: "insensitive",
  //           },
  //         },
  //       };
  //     }
  //     return {
  //       [field]: {
  //         contains: params.searchTerm,
  //         mode: "insensitive",
  //       },
  //     };
  //   }),
  // });

  // numeric match
  const exactNumericFields = numericFields.filter(
    (f) => f !== "hotelRoomPriceNight"
  );

  // Exact search filter
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData)
        .filter(
          (key) =>
            exactNumericFields.includes(key) || !numericFields.includes(key)
        )
        .map((key) => {
          let value: any = (filterData as any)[key];

          if (exactNumericFields.includes(key)) value = Number(value);
          if (["true", "false"].includes(value)) value = value === "true";

          return {
            [key]: { equals: value },
          };
        }),
    });
  }

  // price range filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    const priceFilter: any = {};
    if (minPrice !== undefined) priceFilter.gte = parseFloat(minPrice as any);
    if (maxPrice !== undefined) priceFilter.lte = parseFloat(maxPrice as any);

    filters.push({
      hotelRoomPriceNight: priceFilter,
    });
  }

  // Availability filter
  if (fromDate && toDate) {
    filters.push({
      hotel_bookings: {
        none: {
          bookingStatus: BookingStatus.CONFIRMED,
          OR: [
            {
              bookedFromDate: { lte: toDate },
              bookedToDate: { gte: fromDate },
            },
          ],
        },
      },
    });
  }

  // get only isBooked  AVAILABLE hotels
  // filters.push({
  //   isBooked: EveryServiceStatus.AVAILABLE,
  // });

  const where: Prisma.RoomWhereInput = { AND: filters };

  const result = await prisma.room.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "asc",
          },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
      hotel_bookings: {
        select: {
          bookedFromDate: true,
          bookedToDate: true,
          bookingStatus: true,
        },
      },
      hotel: true,
    },
  });

  const total = await prisma.room.count({ where });

  const sortedResult = result.sort(
    (a, b) => parseFloat(b.hotelRating) - parseFloat(a.hotelRating)
  );

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: sortedResult,
  };
};

// get all my hotels for partner
const getAllHotelsForPartner = async (
  partnerId: string,
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);
  const { searchTerm, ...filterData } = params;

  const filters: Prisma.HotelWhereInput[] = [];

  // Partner filter
  filters.push({ partnerId });

  // Text search
  if (searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // Exact match filters
  if (Object.keys(filterData).length > 0) {
    filters.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const where: Prisma.HotelWhereInput = { AND: filters };

  const hotels = await prisma.hotel.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const total = await prisma.hotel.count({ where });

  // total rooms in each hotel
  const roomCounts = await prisma.room.groupBy({
    by: ["hotelId"],
    _count: { hotelId: true },
    where: {
      hotelId: { in: hotels.map((h) => h.id) },
    },
  });

  // merge room count into hotel result
  const hotelsWithRoomCount = hotels.map((hotel) => {
    const countObj = roomCounts.find((r) => r.hotelId === hotel.id);
    return {
      ...hotel,
      totalRooms: countObj?._count.hotelId || 0,
    };
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: hotelsWithRoomCount,
  };
};

// get all my hotel rooms for partner
const getAllHotelRoomsForPartner = async (
  hotelId: string,
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

  const filters: Prisma.RoomWhereInput[] = [];

  filters.push({
    hotelId,
  });

  // text search
  // filters.push({
  //   OR: searchableFields.map((field) => {
  //     if (field === "hotelName") {
  //       // search inside related Hotel
  //       return {
  //         hotel: {
  //           hotelName: {
  //             contains: params.searchTerm,
  //             mode: "insensitive",
  //           },
  //         },
  //       };
  //     }
  //     return {
  //       [field]: {
  //         contains: params.searchTerm,
  //         mode: "insensitive",
  //       },
  //     };
  //   }),
  // });

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

  const where: Prisma.RoomWhereInput = { AND: filters };

  const result = await prisma.room.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: "desc",
          },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const total = await prisma.room.count({ where });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

// get single hotel
const getSingleHotel = async (hotelId: string) => {
  const result = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  return result;
};

// get single hotel room
const getSingleHotelRoom = async (roomId: string) => {
  const result = await prisma.room.findUnique({
    where: { id: roomId },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  return result;
};

// get popular hotels
const getPopularHotels = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions,
  userCurrency: string = "USD"
): Promise<Hotel[]> => {
  const { searchTerm, ...filterData } = params;
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  // all hotels
  const hotels = await prisma.hotel.findMany({
    where: {
      ...(searchTerm && {
        OR: [
          { hotelName: { contains: searchTerm, mode: "insensitive" } },
          { hotelCity: { contains: searchTerm, mode: "insensitive" } },
          { hotelCountry: { contains: searchTerm, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      room: true,
    },
  });

  // ✅ Get exchange rates
  const exchangeRates = await CurrencyHelpers.getExchangeRates();

  // Calculate averages and add to each hotel
  const hotelsWithAverages = hotels
    .filter((hotel) => hotel.room.length > 0)
    .map((hotel) => {
      // ✅ Convert room prices by country/currency
      const convertedRooms = hotel.room.map((room) => {
        const roomCurrency = room.currency || "USD";

        const convertedPrice = CurrencyHelpers.convertPrice(
          room.hotelRoomPriceNight,
          roomCurrency,
          userCurrency,
          exchangeRates
        );

        const discountedPrice = CurrencyHelpers.convertPrice(
          room.discount || 0,
          roomCurrency,
          userCurrency,
          exchangeRates
        );

        return {
          ...room,
          originalPrice: room.hotelRoomPriceNight,
          originalCurrency: roomCurrency,
          convertedPrice,
          discountedPrice,
          displayCurrency: userCurrency,
          exchangeRate:
            exchangeRates[userCurrency] / exchangeRates[roomCurrency],
        };
      });

      // average calculations
      const totalPrice = convertedRooms.reduce(
        (sum, room) => sum + room.convertedPrice,
        0
      );
      const totalRating = convertedRooms.reduce(
        (sum, room) => sum + (parseFloat(room.hotelRating) || 0),
        0
      );
      const totalReviews = convertedRooms.reduce(
        (sum, room) => sum + (room.hotelReviewCount || 0),
        0
      );

      return {
        ...hotel,
        room: convertedRooms,
        averagePrice: Number((totalPrice / convertedRooms.length).toFixed(2)),
        averageRating: Number((totalRating / convertedRooms.length).toFixed(1)),
        averageReviewCount: Math.round(totalReviews / convertedRooms.length),
        displayCurrency: userCurrency,
        currencySymbol: CurrencyHelpers.getCurrencySymbol(userCurrency),
      };
    });

  // Sort by average rating and take top 4
  const sortedHotels = hotelsWithAverages
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 4);

  return sortedHotels;
};

// add favorite hotel
const toggleFavorite = async (userId: string, hotelId: string) => {
  // check if user exists
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if hotel exists
  const hotel = await prisma.hotel.findUnique({
    where: {
      id: hotelId,
    },
  });
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_hotelId: {
        userId: user.id,
        hotelId: hotel.id,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_hotelId: {
          userId,
          hotelId,
        },
      },
    });

    // update unfavorite
    await prisma.hotel.update({
      where: {
        id: hotel.id,
      },
      data: {
        isFavorite: false,
      },
    });

    return { isFavorite: false };
  } else {
    await prisma.favorite.create({
      data: {
        userId,
        hotelId,
      },
    });

    // update isFavorite
    await prisma.hotel.update({
      where: {
        id: hotel.id,
      },
      data: {
        isFavorite: true,
      },
    });
    return { isFavorite: true };
  }
};

// gets all favorite hotels
const getAllFavoriteHotels = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
    },
    include: {
      hotel: true,
    },
  });

  return favorites;
};

// update hotel
const updateHotel = async (req: Request) => {
  const hotelId = req.params.hotelId;
  const partnerId = req.user?.id;

  // check if partner exists
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check if hotel exists and belongs to this partner
  const hotelExists = await prisma.hotel.findFirst({
    where: { id: hotelId, partnerId },
  });
  if (!hotelExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found or unauthorized");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const hotelLogoFile = files?.businessLogo?.[0];
  const docsFiles = files?.hotelDocs || [];

  // Upload new logo if exists
  let businessLogo = hotelExists.businessLogo;
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    businessLogo = logoResult?.secure_url || businessLogo;
  }

  // Upload multiple docs if exists
  let hotelDocUrls = hotelExists.hotelDocs || [];
  if (docsFiles.length > 0) {
    const docUploads = await Promise.all(
      docsFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelDocUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelBusinessName,
    hotelName,
    hotelBusinessType,
    hotelRegNum,
    hotelRegDate,
    hotelPhone,
    hotelEmail,
    businessTagline,
    businessDescription,
    hotelBookingCondition,
    hotelCancelationPolicy,
    hotelLate,
    hotelLong,
    hotelAddress,
    hotelCity,
    hotelPostalCode,
    hotelDistrict,
    hotelCountry,

    hotelAC,
    hotelParking,
    hoitelWifi,
    hotelBreakfast,
    hotelPool,
    hotelSmoking,
    hotelTv,
    hotelWashing,
    hotelAccommodationType,
    hotelKitchen,
    hotelRestaurant,
    hotelGym,
    hotelSpa,
    hotel24HourFrontDesk,
    hotelAirportShuttle,
    hotelNoSmokingPreference,
    hotelNoNSmoking,
    hotelPetsAllowed,
    hotelNoPetsPreferences,
    hotelPetsNotAllowed,
    hotelLocationFeatureWaterView,
    hotelLocationFeatureIsland,
    hotelCoffeeBar,
  } = req.body;

  // Update hotel
  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      hotelBusinessName,
      hotelName,
      hotelBusinessType,
      hotelRegNum,
      hotelRegDate,
      hotelPhone,
      hotelEmail,
      businessTagline,
      businessDescription,
      businessLogo,
      hotelBookingCondition,
      hotelCancelationPolicy,
      hotelDocs: hotelDocUrls,
      hotelLate: hotelLate ? parseFloat(hotelLate) : undefined,
      hotelLong: hotelLong ? parseFloat(hotelLong) : undefined,
      hotelAddress,
      hotelCity,
      hotelPostalCode,
      hotelDistrict,
      hotelCountry,
      hotelAC: Boolean(hotelAC),
      hotelParking: Boolean(hotelParking),
      hoitelWifi: Boolean(hoitelWifi),
      hotelBreakfast: Boolean(hotelBreakfast),
      hotelPool: Boolean(hotelPool),
      hotelSmoking: Boolean(hotelSmoking),
      hotelTv: Boolean(hotelTv),
      hotelWashing: Boolean(hotelWashing),
      hotelAccommodationType,
      hotelKitchen: Boolean(hotelKitchen),
      hotelRestaurant: Boolean(hotelRestaurant),
      hotelGym: Boolean(hotelGym),
      hotelSpa: Boolean(hotelSpa),
      hotel24HourFrontDesk: Boolean(hotel24HourFrontDesk),
      hotelAirportShuttle: Boolean(hotelAirportShuttle),
      hotelNoSmokingPreference: Boolean(hotelNoSmokingPreference),
      hotelNoNSmoking: Boolean(hotelNoNSmoking),
      hotelPetsAllowed: Boolean(hotelPetsAllowed),
      hotelNoPetsPreferences: Boolean(hotelNoPetsPreferences),
      hotelPetsNotAllowed: Boolean(hotelPetsNotAllowed),
      hotelLocationFeatureWaterView: Boolean(hotelLocationFeatureWaterView),
      hotelLocationFeatureIsland: Boolean(hotelLocationFeatureIsland),
      hotelCoffeeBar: Boolean(hotelCoffeeBar),
    },
  });

  return updatedHotel;
};

// update hotel room
const updateHotelRoom = async (req: Request) => {
  const roomId = req.params.roomId;
  const partnerId = req.user?.id;

  // check partner exists
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // check room exists and belongs to this partner
  const roomExists = await prisma.room.findFirst({
    where: { id: roomId, partnerId },
  });
  if (!roomExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found or unauthorized");
  }

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const roomImageFiles = files?.hotelRoomImages || [];
  const hotelImagesFile = files?.hotelImages || [];

  // Upload new room images if exists
  let roomImageUrls = roomExists.hotelRoomImages || [];
  if (roomImageFiles.length > 0) {
    const uploads = await Promise.all(
      roomImageFiles.map((file) => uploadFile.uploadToCloudinary(file))
    );
    roomImageUrls = uploads.map((img) => img?.secure_url || "");
  }

  // Upload new hotel images if exists
  let hotelRoomUrls = roomExists.hotelImages || [];
  if (hotelImagesFile.length > 0) {
    const docUploads = await Promise.all(
      hotelImagesFile.map((file) => uploadFile.uploadToCloudinary(file))
    );
    hotelRoomUrls = docUploads.map((img) => img?.secure_url || "");
  }

  const {
    hotelRoomType,
    hotelRoomDescription,
    // hotelAddress,
    // hotelCity,
    // hotelPostalCode,
    // hotelDistrict,
    // hotelCountry,
    hotelRoomCapacity,
    hotelNumberOfRooms,
    hotelNumAdults,
    hotelNumChildren,
    hotelRoomPriceNight,
    hotelRating,
    category,
    discount,
    hotelReviewCount,
    currency,
  } = req.body;

  // Update room
  const updatedRoom = await prisma.room.update({
    where: { id: roomId },
    data: {
      hotelRoomType,
      hotelRoomDescription,
      // hotelAddress,
      // hotelCity,
      // hotelPostalCode,
      // hotelDistrict,
      // hotelCountry,
      hotelRoomCapacity,
      hotelNumberOfRooms: parseInt(hotelNumberOfRooms),
      hotelNumAdults: parseInt(hotelNumAdults),
      hotelNumChildren: parseInt(hotelNumChildren),
      hotelRoomPriceNight: hotelRoomPriceNight
        ? parseFloat(hotelRoomPriceNight)
        : 0,
      hotelRating,
      category,
      discount: discount ? parseInt(discount) : 0,
      hotelReviewCount: hotelReviewCount
        ? parseInt(hotelReviewCount)
        : undefined,
      hotelRoomImages: roomImageUrls,
      hotelImages: hotelRoomUrls,
      currency: currency.toUpperCase(),
    },
  });

  return updatedRoom;
};

// delete hotel
const deleteHotel = async (hotelId: string, partnerId: string) => {
  // find hotel
  const hotelExists = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });
  if (!hotelExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // find partner
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  return await prisma.hotel.delete({
    where: { id: hotelId, partnerId },
  });
};

// delete hotel room
const deleteHotelRoom = async (roomId: string, partnerId: string) => {
  // find room
  const roomExists = await prisma.room.findUnique({
    where: { id: roomId },
  });
  if (!roomExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  // find partner
  const partnerExists = await prisma.user.findUnique({
    where: { id: partnerId },
  });
  if (!partnerExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  return await prisma.room.delete({
    where: { id: roomId, partnerId },
  });
};

export const HotelService = {
  createHotel,
  createHotelRoom,
  getRoomActiveListing,
  getAvailableRooms,
  getAllHotels,
  getAllHotelRooms,
  getAllHotelRoomsByHotelId,
  getAllHotelsForPartner,
  getAllHotelRoomsForPartner,
  getSingleHotel,
  getSingleHotelRoom,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  updateHotelRoom,
  deleteHotel,
  deleteHotelRoom,
};
