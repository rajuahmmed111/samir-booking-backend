import express from "express";
import { ServiceBookingController } from "./serviceBooking.controller";
import { ServiceBookingValidation } from "./serviceBooking.validation";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create service booking
router.post(
  "/:serviceId",
  auth(UserRole.PROPERTY_OWNER),
  validateRequest(ServiceBookingValidation.createServiceBookingSchema),
  ServiceBookingController.createServiceBooking
);

// get all service active bookings for a user
router.get(
  "/user-active-bookings",
  auth(UserRole.PROPERTY_OWNER),
  ServiceBookingController.getAllServiceActiveBookingsOfUser
);

// get all service past bookings for a user
router.get(
  "/user-past-bookings",
  auth(UserRole.PROPERTY_OWNER),
  ServiceBookingController.getAllServicePastBookingsOfUser
);

// get all my active and past bookings for a property owner
router.get(
  "/active-past-bookings",
  auth(UserRole.PROPERTY_OWNER),
  ServiceBookingController.getAllServiceActiveAndPastBookings
);

// get single service booking
router.get(
  "/:bookingId",
  auth(UserRole.PROPERTY_OWNER),
  ServiceBookingController.getSingleServiceBooking
);

// get all service bookings for provider by providerId
router.get(
  "/provider/bookings",
  auth(UserRole.SERVICE_PROVIDER),
  ServiceBookingController.getAllServiceBookingsOfProvider
);

export const serviceBookingRoute = router;
