import { Router } from "express";
import { messageControllers } from "./message.controller";
import auth from "../../middlewares/auth";
import { parseBodyData } from "../../middlewares/parseNestedJson";
import { uploadFile } from "../../../helpars/fileUploader";
import { UserRole } from "@prisma/client";

const router = Router();

// send message
router.post(
  "/send-message/:receiverId",
  auth(),
  uploadFile.uploadMessageImages,
  parseBodyData,
  messageControllers.sendMessage
);

router.get("/channels", auth(), messageControllers.getUserChannels);

// get my channel by my id
router.get(
  "/my-channel-by-my-id/:userId",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  messageControllers.getMyChannelByMyId
);

// get my channel through my id and receiver id
router.get("/my-channel/:receiverId", auth(), messageControllers.getMyChannel);

// get all message
router.get(
  "/get-message/:channelName",
  auth(),
  messageControllers.getMessagesFromDB
);

// get all channels only user and admin
router.get(
  "/user-admin-channels",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER),
  messageControllers.getUserAdminChannels
);

// get single channel
router.get(
  "/channel/:channelId",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.USER,
    UserRole.PROPERTY_OWNER
  ),
  messageControllers.getSingleChannel
);

export const messageRoutes = router;
