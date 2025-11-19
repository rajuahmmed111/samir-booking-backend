import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { startOfDay, endOfDay } from "date-fns";

// create hotel review
const createHotelReview = async (
  userId: string,
  roomId: string,
  rating: number,
  comment?: string
)=> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      hotelRating: true,
      hotelReviewCount: true,
      hotelId: true,
    },
  });
  if (!room) {
    throw new ApiError(httpStatus.NOT_FOUND, "Room not found");
  }

  const review = await prisma.review.create({
    data: {
      userId: user.id,
      roomId,
      hotelId: room.hotelId,
      rating,
      comment,
    },
    select: {
      id: true,
      userId: true,
      roomId: true,
      hotelId: true,
      rating: true,
      comment: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  const ratings = await prisma.review.findMany({
    where: {
      roomId,
    },
    select: {
      rating: true,
    },
  });

  // average rating calculation
  const averageRating =
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  await prisma.room.update({
    where: { id: roomId },
    data: {
      hotelRating: averageRating.toFixed(1),
      hotelReviewCount: ratings.length,
    },
  });

  return review;
};

// get all reviews
const getAllReviews = async () => {
  const result = await prisma.review.findMany();
  return result;
};

// get all hotel reviews by hotel id
const getAllHotelReviewsByHotelId = async (hotelId: string) => {
  const result = await prisma.review.findMany({
    where: {
      hotelId,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      userId: true,
      hotelId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return result;
};

export const ReviewService = {
  createHotelReview,
  getAllReviews,
  getAllHotelReviewsByHotelId,
};
