import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// create hotel review
const createHotelReview = async (
  userId: string,
  hotelId: string,
  rating: number,
  comment?: string
) => {
  // check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if hotel exists
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: {
      id: true,
      hotelRating: true,
      hotelReviewCount: true,
    },
  });
  if (!hotel) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      hotelId: hotel?.id,
      rating,
      comment,
    },
    select: {
      id: true,
      userId: true,
      hotelId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      hotelId: hotel?.id,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.hotel.update({
    where: { id: hotel?.id },
    data: {
      hotelRating: averageRating.toFixed(1),
      hotelReviewCount: ratings.length,
    },
  });

  return review;
};

// create service review
const createServiceReview = async (
  userId: string,
  serviceId: string,
  rating: number,
  comment?: string
) => {
  // check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // check if service exists
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: {
      id: true,
      serviceRating: true,
      serviceReviewCount: true,
    },
  });
  if (!service) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      serviceId: service?.id,
      rating,
      comment,
    },
    select: {
      id: true,
      userId: true,
      serviceId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const ratings = await prisma.review.findMany({
    where: {
      serviceId: service?.id,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.service.update({
    where: { id: service?.id },
    data: {
      serviceRating: averageRating.toFixed(1),
      serviceReviewCount: ratings.length,
    },
  });

  return review;
};

export const ReviewService = {
  createHotelReview,
  createServiceReview,
};
