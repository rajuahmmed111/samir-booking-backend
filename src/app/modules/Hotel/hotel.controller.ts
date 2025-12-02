import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { HotelService } from "./hotel.service";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { filterField } from "./hotel.constant";
import { getUserCurrency } from "../../../helpars/detectionLocality";

// create hotel
const createHotel = catchAsync(async (req: Request, res: Response) => {
  const result = await HotelService.createHotel(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hotel created successfully",
    data: result,
  });
});

// create guard
const createGuard = catchAsync(async (req: Request, res: Response) => {
  const result = await HotelService.createGuard(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Guard created successfully",
    data: result,
  });
});

// get all hotels
const getAllHotels = catchAsync(async (req: Request, res: Response) => {
  const userCurrency = await getUserCurrency(req);
  // console.log(`User currency detected: ${userCurrency}`);

  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await HotelService.getAllHotels(filter, options, userCurrency);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotels fetched successfully",
    data: result,
  });
});

// get all my hotels for partner
const getAllHotelsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await HotelService.getAllHotelsForPartner(
      partnerId,
      filter,
      options
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hotels fetched successfully",
      data: result,
    });
  }
);

// generate property share link
// const generatePropertyShareLink = catchAsync(
//   async (req: Request, res: Response) => {
//     const hotelId = req.params.hotelId;
//     const partnerId = req.user?.id;
//     const result = await HotelService.generatePropertyShareLink(hotelId, partnerId);
//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: "Property share link generated successfully",
//       data: result,
//     });
//   }
// );

// get single hotel
const getSingleHotel = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await HotelService.getSingleHotel(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel fetched successfully",
    data: result,
  });
});

// get popular hotels
const getPopularHotels = catchAsync(async (req: Request, res: Response) => {
  const userCurrency = await getUserCurrency(req);
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await HotelService.getPopularHotels(
    filter,
    options,
    userCurrency
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Popular hotels fetched successfully",
    data: result,
  });
});

// add favorite hotel
const toggleFavorite = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const hotelId = req.params.hotelId;

  const result = await HotelService.toggleFavorite(userId, hotelId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.isFavorite ? "Hotel favorited" : "Hotel unfavorited",
    data: result,
  });
});

// gets all favorite hotels
const getAllFavoriteHotels = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await HotelService.getAllFavoriteHotels(userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Favorite hotels fetched successfully",
    data: result,
  });
});

// update hotel
const updateHotel = catchAsync(async (req: Request, res: Response) => {
  // const hotelId = req.params.id;
  // const partnerId = req.user?.id;

  const result = await HotelService.updateHotel(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel updated successfully",
    data: result,
  });
});

// delete hotel
const deleteHotel = catchAsync(async (req: Request, res: Response) => {
  const hotelId = req.params.hotelId;
  const partnerId = req.user?.id;
  const result = await HotelService.deleteHotel(hotelId, partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel deleted successfully",
    data: result,
  });
});

export const HotelController = {
  createHotel,
  getAllHotels,
  getAllHotelsForPartner,
  // generatePropertyShareLink,
  getSingleHotel,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  deleteHotel,
  createGuard,
};
