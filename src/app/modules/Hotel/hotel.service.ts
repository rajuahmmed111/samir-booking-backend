import { Request } from "express";
import prisma from "../../../shared/prisma";
import { IUploadedFile } from "../../../interfaces/file";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { Hotel, Prisma } from "@prisma/client";
import { paginationHelpers } from "../../../helpars/paginationHelper";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { IHotelFilterRequest } from "./hotel.interface";
import { searchableFields } from "./hotel.constant";
import { uploadFile } from "../../../helpars/fileUploader";

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
  // const hotelImagesOrV = files?.uploadPhotosOrVideos?.[0];
  const hotelImagesOrV = files?.uploadPhotosOrVideos || [];

  if (!hotelImagesOrV) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "uploadPhotosOrVideos field is required"
    );
  }

  if (!hotelRule) {
    throw new ApiError(httpStatus.BAD_REQUEST, "houseRules field is required");
  }

  // upload house rules
  let uploadedHouseRules: string | undefined;
  if (hotelRule) {
    const uploaded = await uploadFile.uploadToCloudinary(hotelRule);
    if (!uploaded?.secure_url) {
      throw new Error("Cloudinary upload failed");
    }
    uploadedHouseRules = uploaded.secure_url;
  }

  // upload photos & videos (multiple files)
  const uploadedMedia: string[] = [];

  const uploads = await Promise.all(
    hotelImagesOrV.map((file) => uploadFile.uploadToCloudinary(file))
  );

  uploads.forEach((u) => {
    if (!u?.secure_url) {
      throw new Error("Cloudinary upload failed");
    }
    uploadedMedia.push(u.secure_url);
  });

  const {
    // propertyName,
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

    availableForBooking,
    syncWithAirbnb,
    syncWithBooking,
  } = req.body;

  const result = await prisma.hotel.create({
    data: {
      // propertyName,
      uploadPhotosOrVideos: uploadedMedia,
      propertyTitle,
      propertyAddress,
      propertyDescription,

      latitude: latitude ? parseFloat(latitude) : (null as any),
      longitude: longitude ? parseFloat(longitude) : (null as any),

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
            create: JSON.parse(customPrices).map((p: any) => {
              // Handle single date case
              if (p.date) {
                return {
                  startDate: new Date(p.date),
                  endDate: new Date(p.date), // same date for single day
                  price: p.price,
                };
              }
              // Handle date range case
              return {
                startDate: new Date(p.startDate),
                endDate: new Date(p.endDate),
                price: p.price,
              };
            }),
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

      availableForBooking,
      syncWithAirbnb,
      syncWithBooking,
    },
    include: {
      customPrices: true,
      inventoryItems: true,
    },
  });

  return result;
};

// create guard
const createGuard = async (req: Request) => {
  const { name, phone, whatsapp, status } = req.body;
  const hotelId = req.params.hotelId;

  // check if hotel exists
  const hotelExists = await prisma.hotel.findUnique({
    where: { id: hotelId },
  });
  if (!hotelExists) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  // check if guard already exists for this hotel
  const existingGuard = await prisma.guard.findUnique({
    where: { hotelId },
  });
  if (existingGuard) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Guard already exists for this hotel"
    );
  }

  // handle photo upload
  let uploadedPhoto: string | undefined;
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const guardPhotoFile = files?.guardPhoto?.[0];
  if (guardPhotoFile) {
    const uploaded = await uploadFile.uploadToCloudinary(guardPhotoFile);
    if (!uploaded?.secure_url) {
      throw new Error("Cloudinary upload failed");
    }
    uploadedPhoto = uploaded.secure_url;
  }

  const result = await prisma.guard.create({
    data: {
      hotelId,
      name,
      phone,
      whatsapp: whatsapp || null,
      photo: uploadedPhoto || null,
      status: status || "AVAILABLE",
    },
  });

  return result;
};

// get all hotels with search filtering and pagination
const getAllHotels = async (
  params: IHotelFilterRequest,
  options: IPaginationOptions
) => {
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const { searchTerm, ...filterData } = params;

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

  const where: Prisma.HotelWhereInput = {
    AND: filters,
  };

  const hotels = await prisma.hotel.findMany({
    where,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: "desc" },
    include: {
      customPrices: true,
      inventoryItems: true,
      guards: true,
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

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: hotels,
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
      customPrices: true,
      inventoryItems: true,
      guards: true,
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

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: hotels ? hotels : [],
  };
};

// generate property share link
// const generatePropertyShareLink = async (
//   hotelId: string,
//   partnerId: string
// ) => {
//   // find hotel
//   const partnerExists = await prisma.user.findUnique({
//     where: { id: partnerId },
//   });
//   if (!partnerExists) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
//   }

//   // find hotel
//   const hotel = await prisma.hotel.findUnique({
//     where: { id: hotelId },
//   });

//   if (!hotel) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
//   }
// };

// get single hotel
const getSingleHotel = async (hotelId: string) => {
  const result = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      customPrices: true,
      inventoryItems: true,
      guards: true,
      user: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Hotel not found");
  }

  return result;
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

  // upload photos & videos (multiple files)
  const uploadedMedia: string[] = [];

  const uploads = await Promise.all(
    hotelImagesOrV.map((file) => uploadFile.uploadToCloudinary(file))
  );

  uploads.forEach((u) => {
    if (!u?.secure_url) {
      throw new Error("Cloudinary upload failed");
    }
    uploadedMedia.push(u.secure_url);
  });

  const {
    // propertyName,
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

  // Update hotel
  const updatedHotel = await prisma.hotel.update({
    where: { id: hotelId },
    data: {
      // propertyName,
      uploadPhotosOrVideos: uploadedMedia || hotelExists.uploadPhotosOrVideos,
      propertyTitle,
      propertyAddress,
      propertyDescription,
      latitude: latitude ? parseFloat(latitude) : (null as any),
      longitude: longitude ? parseFloat(longitude) : (null as any),
      maxGuests: maxGuests ? parseInt(maxGuests) : undefined,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      smartLockCode,
      keyBoxPin,
      amenities: amenities ? JSON.parse(amenities) : undefined,
      houseRules: uploadedHouseRules || hotelExists.houseRules,
      addSecurityKeys,
      addLocalTips,
      basePrice: basePrice ? parseFloat(basePrice) : undefined,
      weeklyOffers: weeklyOffers ? parseFloat(weeklyOffers) : undefined,
      monthlyOffers: monthlyOffers ? parseFloat(monthlyOffers) : undefined,

      // Handle custom prices - delete existing and create new ones
      customPrices: customPrices
        ? {
            deleteMany: {},
            create: JSON.parse(customPrices).map((p: any) => ({
              startDate: new Date(p.startDate),
              endDate: new Date(p.endDate),
              price: parseFloat(p.price),
            })),
          }
        : undefined,

      // Handle inventory items - delete existing and create new ones
      inventoryItems: inventoryItems
        ? {
            deleteMany: {},
            create: JSON.parse(inventoryItems).map((item: any) => ({
              name: item.name,
              quantity: item.quantity,
            })),
          }
        : undefined,
    },
    include: {
      customPrices: true,
      inventoryItems: true,
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
  // generatePropertyShareLink,
  getSingleHotel,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  deleteHotel,
  createGuard,
};
