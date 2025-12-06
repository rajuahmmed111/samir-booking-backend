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

// get all service bookings for a user
router.get(
  "/",
  auth(UserRole.PROPERTY_OWNER),
  ServiceBookingController.getAllServiceBookings
);

// get single service booking
router.get(
  "/:bookingId",
  auth(UserRole.PROPERTY_OWNER),
  ServiceBookingController.getSingleServiceBooking
);

// update service booking
router.patch(
  "/:bookingId",
  auth(UserRole.PROPERTY_OWNER),
  validateRequest(ServiceBookingValidation.updateServiceBookingSchema),
  ServiceBookingController.updateServiceBooking
);

export const serviceBookingRoute = router;
