import express from "express";
import { NewsRoomController } from "./news_room.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { uploadFile } from "../../../helpars/fileUploader";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = express.Router();

// get all news rooms
router.get("/", NewsRoomController.getAllNewsRooms);

// get single news room
router.get("/:newsroomId", NewsRoomController.getSingleNewsRoom);

// create news room
router.post(
  "/",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  uploadFile.upload.fields([{ name: "image", maxCount: 5 }]),
  parseBodyData,
  NewsRoomController.createNewsRoom
);

// update news room
router.patch(
  "/:newsroomId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  uploadFile.upload.fields([{ name: "image", maxCount: 5 }]),
  parseBodyData,
  NewsRoomController.updateNewsRoom
);

// delete news room
router.delete(
  "/:newsroomId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  NewsRoomController.deleteNewsRoom
);

export const newsRoomRoute = router;
