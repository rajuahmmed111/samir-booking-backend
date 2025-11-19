import express from "express";
import { CancelReservationController } from "./cancel_reservation.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

// create or update cancel reservation
router.patch(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  CancelReservationController.createOrUpdateCancelReservation
);

// get all cancel reservation
router.get(
  "/",
//   auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  CancelReservationController.getAllCancelReservation
);

export const cancelReservationRoute = router;
