import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatisticsService } from "./statistics.service";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./statistics.constant";
import { paginationFields } from "../../../constants/pagination";

// get overview total clients, total providers,total revenue
const getOverview = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const result = await StatisticsService.getOverview(filter);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Statistics fetched successfully",
    data: result,
  });
});

// property owner total earings hotel
const getPartnerTotalEarningsHotel = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const { timeRange } = req.query;

    const result = await StatisticsService.getPartnerTotalEarningsHotel(
      partnerId,
      timeRange as string,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Property owner earnings fetched successfully",
      data: result,
    });
  },
);

// service provider total earnings service
const getServiceProviderTotalEarningsService = catchAsync(
  async (req: Request, res: Response) => {
    const providerId = req.user?.id;
    const { timeRange } = req.query;

    const result =
      await StatisticsService.getServiceProviderTotalEarningsService(
        providerId,
        timeRange as string,
      );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Property owner earnings fetched successfully",
      data: result,
    });
  },
);

// admin total earnings
const getAdminTotalEarnings = catchAsync(
  async (req: Request, res: Response) => {
    const { timeRange } = req.query;
    const result = await StatisticsService.getAdminTotalEarnings(
      timeRange as string,
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin earnings fetched successfully",
      data: result,
    });
  },
);

// get my properties, services bookings, guest bookings, earnings
const getMyDashboardForPropertyOwner = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result =
      await StatisticsService.getMyDashboardForPropertyOwner(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My dashboard fetched successfully",
      data: result,
    });
  },
);

// get my services, services bookings,  earnings
const getMyDashboardForServiceProvider = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const result =
      await StatisticsService.getMyDashboardForServiceProvider(userId);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My dashboard fetched successfully",
      data: result,
    });
  },
);

export const StatisticsController = {
  getOverview,
  // sales
  getPartnerTotalEarningsHotel,
  getServiceProviderTotalEarningsService,
  getMyDashboardForPropertyOwner,
  getMyDashboardForServiceProvider,

  // admin earns
  getAdminTotalEarnings,
};
