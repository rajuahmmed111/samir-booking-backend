import express from "express";
import { StatisticsController } from "./statistics.controller";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

// get overview total clients, total providers,total revenue
router.get(
  "/overview",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getOverview
);

// partner total earings hotel
router.get(
  "/earnings-hotel",
  auth(UserRole.PROPERTY_OWNER),
  StatisticsController.getPartnerTotalEarningsHotel
);

// service provider total earnings service
router.get(
  "/earnings-service",
  auth(UserRole.SERVICE_PROVIDER),
  StatisticsController.getServiceProviderTotalEarningsService
);

// user support tickets
router.get(
  "/user-support-tickets",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getUserSupportTickets
);

export const statisticsRoutes = router;
