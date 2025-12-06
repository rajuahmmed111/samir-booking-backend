import express from "express";
import { ServiceBookingController } from "./serviceBooking.controller";

const router = express.Router();

// create service booking
router.post("/:serviceId", ServiceBookingController.createServiceBooking);

export const serviceBookingRoute = router;
