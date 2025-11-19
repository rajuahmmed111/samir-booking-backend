import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatisticsService } from "./statistics.service";
import httpStatus from "http-status";
import { pick } from "../../../shared/pick";
import { filterField } from "./statistics.constant";
import { paginationFields } from "../../../constants/pagination";

// get overview total user, total partner,total contracts , admin earnings
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

// get payment with user analysis
const paymentWithUserAnalysis = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const result = await StatisticsService.paymentWithUserAnalysis(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

//  user demographics
const userDemographics = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const result = await StatisticsService.userDemographics(filter);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Statistics fetched successfully",
    data: result,
  });
});

// financial metrics
const financialMetrics = catchAsync(async (req: Request, res: Response) => {
  const result = await StatisticsService.financialMetrics();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Statistics fetched successfully",
    data: result,
  });
});

// cancel refund and contracts
const cancelRefundAndContracts = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const result = await StatisticsService.cancelRefundAndContracts(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// get all service provider for send report
const getAllServiceProviders = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await StatisticsService.getAllServiceProviders(
      filter,
      options
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service providers fetched successfully",
      data: result,
    });
  }
);

// get single service provider
const getSingleServiceProvider = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result = await StatisticsService.getSingleServiceProvider(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Service provider fetched successfully",
      data: result,
    });
  }
);

// send report to service provider through email
const sendReportToServiceProviderThroughEmail = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.params.id;
    const result =
      await StatisticsService.sendReportToServiceProviderThroughEmail(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Report sent successfully",
      data: result,
    });
  }
);

// partner total earings hotel
const getPartnerTotalEarningsHotel = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await StatisticsService.getPartnerTotalEarningsHotel(
      partnerId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// partner total earings security
const getPartnerTotalEarningsSecurity = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await StatisticsService.getPartnerTotalEarningsSecurity(
      partnerId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// partner total earings car
const getPartnerTotalEarningsCar = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await StatisticsService.getPartnerTotalEarningsCar(
      partnerId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// partner total earings attraction
const getPartnerTotalEarningsAttraction = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await StatisticsService.getPartnerTotalEarningsAttraction(
      partnerId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

// user support tickets
const getUserSupportTickets = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const result = await StatisticsService.getUserSupportTickets(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Statistics fetched successfully",
      data: result,
    });
  }
);

export const StatisticsController = {
  getOverview,
  paymentWithUserAnalysis,
  userDemographics,
  financialMetrics,
  cancelRefundAndContracts,
  getAllServiceProviders,
  getSingleServiceProvider,
  sendReportToServiceProviderThroughEmail,
  getPartnerTotalEarningsHotel,
  getPartnerTotalEarningsSecurity,
  getPartnerTotalEarningsCar,
  getPartnerTotalEarningsAttraction,
  getUserSupportTickets,
};
