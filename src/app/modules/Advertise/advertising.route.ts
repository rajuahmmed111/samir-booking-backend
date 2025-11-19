import express from "express";
import { AdvertisingController } from "./advertising.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";
import validateRequest from "../../middlewares/validateRequest";
import { AdvertiseValidation } from "./advertising.validation";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = express.Router();

// get all advertising
router.get("/", AdvertisingController.getAllAdvertising);

// get advertising by id
router.get(
  "/:advertisingId",

  AdvertisingController.getSingleAdvertising
);

// create advertising
router.post(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadFile.advertiseVideo,
  parseBodyData,
  validateRequest(AdvertiseValidation.createAdvertiseZodSchema),
  AdvertisingController.createAdvertising
);

// update advertising by advertisingId
router.patch(
  "/:advertisingId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  uploadFile.advertiseVideo,
  parseBodyData,
  validateRequest(AdvertiseValidation.updateAdvertiseZodSchema),
  AdvertisingController.updateAdvertising
);

// delete advertising by advertisingId
router.delete(
  "/:advertisingId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  AdvertisingController.deleteAdvertising
);

export const advertisingRoutes = router;
