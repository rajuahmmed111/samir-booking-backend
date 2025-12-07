import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { startOfDay, endOfDay } from "date-fns";

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

export const ReviewService = {
  createHotelReview,
};
