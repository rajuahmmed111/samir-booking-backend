import express from "express";
import { HotelBookingController } from "./hotelBooking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = express.Router();

// get all hotel bookings
router.get(
  "/",
  auth(UserRole.PROPERTY_OWNER),
  HotelBookingController.getAllHotelBookings
);

// get single hotel booking for owner
router.get(
  "/owner/single",
  auth(UserRole.PROPERTY_OWNER),
  HotelBookingController.getSingleHotelBookingForOwner
);

// get all my hotel bookings
router.get(
  "/my-bookings",
  auth(UserRole.USER),
  HotelBookingController.getAllMyHotelBookings
);

// get single my hotel booking
router.get(
  "/my-bookings/user/single",
  auth(UserRole.USER),
  HotelBookingController.getSingleMyHotelBookingForUser
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

// create travelers with passport images
router.post(
  "/travelers/:bookingId",
  auth(
    UserRole.USER,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN
  ),
  uploadFile.passportImages,
  parseBodyData,
  HotelBookingController.createTravelers
);

export const hotelBookingRoute = router;
