import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { HotelController } from "./hotel.controller";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";
// import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

// get room active listing by partnerId
router.get(
  "/room-active-listing",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.getRoomActiveListing
);

// get available rooms by partnerId
router.get(
  "/available-rooms",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.getAvailableRooms
);

// get all hotels
router.get(
  "/",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getAllHotels
);

// get all hotel rooms
router.get(
  "/rooms/",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getAllHotelRooms
);

// get all hotel rooms by hotel id
router.get(
  "/rooms/:hotelId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getAllHotelRoomsByHotelId
);

// get all my hotels for partner
router.get(
  "/partner-hotels",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.getAllHotelsForPartner
);

// get all my hotel rooms for partner
router.get(
  "/partner-rooms/:hotelId",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.getAllHotelRoomsForPartner
);

// get my favorites
router.get(
  "/my-favorites",
  auth(UserRole.USER),
  HotelController.getAllFavoriteHotels
);

// get popular hotels
router.get(
  "/popular",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getPopularHotels
);

// get single hotel
router.get(
  "/:id",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getSingleHotel
);

// get single hotel room
router.get(
  "/room/:roomId",
  // auth(
  //   UserRole.ADMIN,
  //   UserRole.SUPER_ADMIN,
  //   UserRole.BUSINESS_PARTNER,
  //   UserRole.USER
  // ),
  HotelController.getSingleHotelRoom
);

// add favorite hotel room
router.post(
  "/favorite/:hotelId",
  auth(UserRole.USER),
  HotelController.toggleFavorite
);

// create hotel
router.post(
  "/",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "hotelDocs", maxCount: 5 },
  ]),
  parseBodyData,
  //   validateRequest(HotelController.createHotelSchema),
  HotelController.createHotel
);

// create hotel room
router.post(
  "/room/:hotelId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "hotelImages", maxCount: 40 },
    { name: "hotelRoomImages", maxCount: 40 },
  ]),
  parseBodyData,
  //   validateRequest(HotelController.createHotelSchema),
  HotelController.createHotelRoom
);

// update hotel
router.patch(
  "/:hotelId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "businessLogo", maxCount: 1 },
    { name: "hotelDocs", maxCount: 5 },
  ]),
  parseBodyData,
  HotelController.updateHotel
);

// update hotel room
router.patch(
  "/room/:roomId",
  auth(UserRole.BUSINESS_PARTNER),
  uploadFile.upload.fields([
    { name: "hotelImages", maxCount: 40 },
    { name: "hotelRoomImages", maxCount: 40 },
  ]),
  parseBodyData,
  HotelController.updateHotelRoom
);

// delete hotel
router.delete(
  "/:hotelId",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.deleteHotel
);

// delete hotel room
router.delete(
  "/room/:roomId",
  auth(UserRole.BUSINESS_PARTNER),
  HotelController.deleteHotelRoom
);

export const hotelRoute = router;
