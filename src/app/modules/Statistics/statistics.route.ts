import express from "express";
import { StatisticsController } from "./statistics.controller";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";

const router = express.Router();

// get overview total user, total partner,total contracts , admin earnings
router.get(
  "/overview",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getOverview
);

// get payment with user analysis
router.get(
  "/payment-user-analysis",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.paymentWithUserAnalysis
);

//  user demographics
router.get(
  "/user-demographics",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.userDemographics
);

// financial metrics
router.get(
  "/financial-metrics",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.financialMetrics
);

// cancel refund and contracts
router.get(
  "/cancel-refund-contracts",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.cancelRefundAndContracts
);

// get all service provider for send report
router.get(
  "/service-providers",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getAllServiceProviders
);

// get single service provider
router.get(
  "/service-provider/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getSingleServiceProvider
);

// send report to service provider through email
router.post(
  "/send-report-service-provider/:id",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.sendReportToServiceProviderThroughEmail
);

// partner total earings hotel
router.get(
  "/partner-total-earnings-hotel",
  auth(UserRole.PROPERTY_OWNER),
  StatisticsController.getPartnerTotalEarningsHotel
);

// user support tickets
router.get(
  "/user-support-tickets",
  auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  StatisticsController.getUserSupportTickets
);

export const statisticsRoutes = router;
