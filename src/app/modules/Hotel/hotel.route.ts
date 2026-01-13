import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { HotelController } from "./hotel.controller";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import validateRequest from "../../middlewares/validateRequest";
import { hotelValidation } from "./hotel.validation";

const router = express.Router();

// get all hotels
router.get("/", HotelController.getAllHotels);

// get all my hotels for partner
router.get(
  "/partner-hotels",
  auth(UserRole.PROPERTY_OWNER),
  HotelController.getAllHotelsForPartner
);

// get select my property
router.get(
  "/",
  auth(UserRole.PROPERTY_OWNER),
  HotelController.getSelectMyProperties
);

// get my favorites
router.get(
  "/my-favorites",
  auth(UserRole.USER),
  HotelController.getAllFavoriteHotels
);

// get single hotel
router.get("/:id", HotelController.getSingleHotel);

// add favorite hotel room
router.post(
  "/favorite/:hotelId",
  auth(UserRole.USER),
  HotelController.toggleFavorite
);

// create hotel
router.post(
  "/",
  auth(UserRole.PROPERTY_OWNER),
  uploadFile.upload.fields([
    { name: "uploadPhotosOrVideos", maxCount: 5 },
    { name: "houseRules", maxCount: 5 },
  ]),
  parseBodyData,
  validateRequest(hotelValidation.createHotelSchema),
  HotelController.createHotel
);

// create guard
router.post(
  "/guard/:hotelId",
  auth(UserRole.PROPERTY_OWNER),
  uploadFile.upload.fields([{ name: "guardPhoto", maxCount: 1 }]),
  parseBodyData,
  validateRequest(hotelValidation.createGuardSchema),
  HotelController.createGuard
);

// update hotel
router.patch(
  "/:hotelId",
  auth(UserRole.PROPERTY_OWNER),
  uploadFile.upload.fields([
    { name: "uploadPhotosOrVideos", maxCount: 5 },
    { name: "houseRules", maxCount: 5 },
  ]),
  parseBodyData,
  HotelController.updateHotel
);

// delete hotel
router.delete(
  "/:hotelId",
  auth(UserRole.PROPERTY_OWNER),
  HotelController.deleteHotel
);

export const hotelRoute = router;
