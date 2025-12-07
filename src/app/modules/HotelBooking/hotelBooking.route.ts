import express from "express";
import { HotelBookingController } from "./hotelBooking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get all hotel bookings
router.get(
  "/",
  auth(UserRole.PROPERTY_OWNER),
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
  auth(UserRole.PROPERTY_OWNER, UserRole.USER),
  HotelBookingController.getHotelBookingById
);

// create hotel booking
router.post(
  "/:hotelId",
  auth(UserRole.USER, UserRole.PROPERTY_OWNER, UserRole.SERVICE_PROVIDER),
  HotelBookingController.createHotelRoomBooking
);

// update hotel booking status
router.patch(
  "/status/:bookingId",
  auth(UserRole.PROPERTY_OWNER),
  HotelBookingController.updateBookingStatus
);

export const hotelBookingRoute = router;
