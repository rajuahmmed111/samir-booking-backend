import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { HotelController } from "./hotel.controller";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";
// import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

// get all hotels
router.get("/", HotelController.getAllHotels);

// get all my hotels for partner
router.get(
  "/partner-hotels",
  auth(UserRole.PROPERTY_OWNER),
  HotelController.getAllHotelsForPartner
);

// get my favorites
router.get(
  "/my-favorites",
  auth(UserRole.USER),
  HotelController.getAllFavoriteHotels
);

// get popular hotels
router.get("/popular", HotelController.getPopularHotels);

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
  uploadFile.upload.fields([{ name: "uploadPhotosOrVideos", maxCount: 5 }, { name: "houseRules", maxCount: 5 }]),
  parseBodyData,
  //   validateRequest(HotelController.createHotelSchema),
  HotelController.createHotel
);

// update hotel
router.patch(
  "/:hotelId",
  auth(UserRole.PROPERTY_OWNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "hotelDocs", maxCount: 5 },
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
