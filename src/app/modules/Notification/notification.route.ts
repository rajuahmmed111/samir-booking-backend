import express from "express";
import auth from "../../middlewares/auth";
import { NotificationController } from "./notification.controller";
import { UserRole } from "@prisma/client";

const router = express.Router();

// get my all notifications
router.get(
  "/my-notifications",
  auth(),
  NotificationController.getMyNotifications
);

// send single notification
router.post(
  "/send-notification/:userId",
  auth(),
  NotificationController.sendSingleNotification
);

// send notifications
router.post(
  "/send-notification",
  auth(),
  NotificationController.sendNotifications
);

// get all notifications
router.get(
  "/all-notifications",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  NotificationController.getAllNotifications
);

// get single notification
router.get(
  "/:notificationId",
  auth(),
  NotificationController.getSingleNotificationById
);

// delete notification
router.delete(
  "/:notificationId",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  NotificationController.deleteNotification
);

// mark as read notification
router.patch(
  "/mark-as-read/:notificationId",
  auth(),
  NotificationController.markAsReadNotification
);

export const notificationsRoute = router;
