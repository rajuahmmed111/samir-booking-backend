import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import auth from "../../middlewares/auth";
import { uploadFile } from "../../../helpars/fileUploader";
import { UserController } from "./user.controller";
import { UserRole } from "@prisma/client";
import { parseBodyData } from "../../middlewares/parseNestedJson";

const router = express.Router();

// get all admins
router.get("/admins", auth(UserRole.SUPER_ADMIN), UserController.getAllAdmins);

// get all users (but last i change this api . all users, property owners, service providers)
router.get(
  "/",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllUsers,
);

// get all property owners
router.get(
  "/property-owners",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllPropertyOwners,
);

// get all blocked users
router.get(
  "/blocked-users",
  auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  UserController.getAllBlockedUsers,
);

//get my profile
router.get(
  "/my-profile",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER,
  ),
  UserController.getMyProfile,
);

// get user by id
router.get(
  "/:id",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER,
  ),
  UserController.getUserById,
);

// create user
router.post(
  "/",
  uploadFile.passportOrNID,
  parseBodyData,
  validateRequest(userValidation.createUserZodSchema),
  UserController.createUser,
);

// create SERVICE_PROVIDER (it's inactive, because it's not verified)
router.post(
  "/service-provider",
  uploadFile.upload.fields([
    { name: "profileImage", maxCount: 1 },
    { name: "passportOrNID", maxCount: 10 },
  ]),
  parseBodyData,
  validateRequest(userValidation.createUserZodSchema),
  UserController.createServiceProvider,
);

// create role for supper admin
router.post(
  "/add-role",
  auth(UserRole.SUPER_ADMIN),
  validateRequest(userValidation.createUserZodSchema),
  UserController.createRoleSupperAdmin,
);

// verify user
router.post("/verify-user", UserController.verifyOtpAndCreateUser);

// update  user status access admin (active to inactive)
router.patch(
  "/update-user-status-inactive/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.updateUserStatusActiveToInActive,
);

// update  user status access admin (inactive to active)
router.patch(
  "/update-user-status-active/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  UserController.updateUserStatusInActiveToActive,
);

// single update user (info + profile image)
router.patch(
  "/update",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER,
  ),
  uploadFile.profileImage,
  parseBodyData,
  validateRequest(userValidation.updateUserZodSchema),
  UserController.updateUser,
);

// update user profile image
router.patch(
  "/profile-img-update",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER,
  ),
  uploadFile.profileImage,
  UserController.updateUserProfileImage,
);

// delete my account
router.patch(
  "/my-account",
  auth(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.PROPERTY_OWNER,
    UserRole.SERVICE_PROVIDER,
    UserRole.USER,
  ),
  UserController.deleteMyAccount,
);

// delete user access admin
router.delete(
  "/delete-user/:id",
  auth(UserRole.SUPER_ADMIN),
  UserController.deleteUserAccessAdmin,
);

export const userRoute = router;
