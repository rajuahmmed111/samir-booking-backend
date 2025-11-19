import express from "express";
import { HotelBookingController } from "./hotelBooking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all hotel bookings
router.get(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.getAllHotelBookings
);

// get all my hotel bookings
router.get(
  "/my-bookings",
  auth(UserRole.USER),
  HotelBookingController.getAllMyHotelBookings
);

// get hotel booking by id
router.get(
  "/:bookingId",
  auth(UserRole.BUSINESS_PARTNER, UserRole.USER),
  HotelBookingController.getHotelBookingById
);

// create hotel room booking
router.post(
  "/:roomId",
  auth(UserRole.USER, UserRole.BUSINESS_PARTNER),
  HotelBookingController.createHotelRoomBooking
);

// update hotel booking status
router.patch(
  "/status/:bookingId",
  auth(UserRole.BUSINESS_PARTNER),
  HotelBookingController.updateBookingStatus
);

export const hotelBookingRoute = router;
