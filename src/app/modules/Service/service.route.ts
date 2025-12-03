import express from "express";
import { ServiceController } from "./service.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

// create service
router.post(
  "/",
  auth(UserRole.SERVICE_PROVIDER),
  parseBodyData,
  // validateRequest(hotelValidation.createHotelSchema),
  ServiceController.createService
);

export const serviceRoutes = router;
