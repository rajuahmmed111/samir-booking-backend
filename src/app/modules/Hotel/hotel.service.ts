import { Request } from "express";
import prisma from "../../../shared/prisma";
import { IUploadedFile } from "../../../interfaces/file";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import {
  Hotel,
  Prisma,
} from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IHotelFilterRequest } from "./hotel.interface";
import {
  searchableFields,
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

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const hotelRule = files?.houseRules?.[0];
  const hotelImagesOrV = files?.uploadPhotosOrVideos || [];

  // upload house rules
  let uploadedHouseRules: string | undefined;
  if (hotelRule) {
    const uploaded = await uploadFile.uploadToCloudinary(hotelRule);
    if (!uploaded?.secure_url) {
      throw new Error("Cloudinary upload failed");
    }
    uploadedHouseRules = uploaded.secure_url;
  }

  // upload photos & videos
  let uploadedMedia: string[] = [];
  if (hotelImagesOrV?.length > 0) {
    const uploads = await Promise.all(
      hotelImagesOrV.map((file) => uploadFile.uploadToCloudinary(file))
    );
    uploadedMedia = uploads.map((f) => {
      if (!f?.secure_url) {
        throw new Error("Cloudinary upload failed");
      }
      return f.secure_url;
    });
  }

  const {
    propertyTitle,
    propertyAddress,
    propertyDescription,

    latitude,
    longitude,

    maxGuests,
    bedrooms,
    bathrooms,

    smartLockCode,
    keyBoxPin,

    amenities,

    addSecurityKeys,
    addLocalTips,

    basePrice,
    weeklyOffers,
    monthlyOffers,

    customPrices, // [{startDate, endDate, price}]
    inventoryItems, // [{name, quantity}]
  } = req.body;

  const result = await prisma.hotel.create({
    data: {
      uploadPhotosOrVideos: uploadedMedia,
      propertyTitle,
      propertyAddress,
      propertyDescription,

      latitude: latitude ? parseFloat(latitude) : null as any,
      longitude: longitude ? parseFloat(longitude) : null as any,

      maxGuests: parseInt(maxGuests),
      bedrooms: parseInt(bedrooms),
      bathrooms: parseInt(bathrooms),

      smartLockCode,
      keyBoxPin,

      amenities: amenities ? JSON.parse(amenities) : [],

      houseRules: uploadedHouseRules as string,
      addSecurityKeys,
      addLocalTips,

      basePrice: parseFloat(basePrice),
      weeklyOffers: weeklyOffers ? parseFloat(weeklyOffers) : undefined,
      monthlyOffers: monthlyOffers ? parseFloat(monthlyOffers) : undefined,

      partnerId,

      // custom Price Range
      customPrices: customPrices
        ? {
            create: JSON.parse(customPrices).map((p: any) => ({
              startDate: new Date(p.startDate),
              endDate: new Date(p.endDate),
              price: p.price,
            })),
          }
        : undefined,

      // inventory
      inventoryItems: inventoryItems
        ? {
            create: JSON.parse(inventoryItems).map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
            })),
          }
        : undefined,
    },
  });

  return result;
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

  const hotelLogoFile = files?.uploadPhotosOrVideos?.[0];

  // Upload new photos if exists
  let uploadedMedia = hotelExists.uploadPhotosOrVideos || [];
  if (hotelLogoFile) {
    const logoResult = await uploadFile.uploadToCloudinary(hotelLogoFile);
    if (logoResult?.secure_url) {
      uploadedMedia = [...uploadedMedia, logoResult.secure_url];
    }
  }

  const {
    propertyTitle,
    propertyAddress,
    propertyDescription,
    latitude,
    longitude,
    maxGuests,
    bedrooms,
    bathrooms,
    smartLockCode,
    keyBoxPin,
    amenities,
    addSecurityKeys,
    addLocalTips,
    basePrice,
    weeklyOffers,
    monthlyOffers,
  } = req.body;

  // Update hotel
  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      uploadPhotosOrVideos: uploadedMedia,
      propertyTitle,
      propertyAddress,
      propertyDescription,
      latitude: latitude ? parseFloat(latitude) : null as any,
      longitude: longitude ? parseFloat(longitude) : null as any,
      maxGuests: maxGuests ? parseInt(maxGuests) : undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      smartLockCode,
      keyBoxPin,
      amenities: amenities ? JSON.parse(amenities) : undefined,
      addSecurityKeys,
      addLocalTips,
      basePrice: basePrice ? parseFloat(basePrice) : undefined,
      weeklyOffers: weeklyOffers ? parseFloat(weeklyOffers) : undefined,
      monthlyOffers: monthlyOffers ? parseFloat(monthlyOffers) : undefined,
    },
  });

  return updatedHotel;
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

export const HotelService = {
  createHotel,
  getAllHotels,
  getAllHotelsForPartner,
  getSingleHotel,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  deleteHotel,
};
