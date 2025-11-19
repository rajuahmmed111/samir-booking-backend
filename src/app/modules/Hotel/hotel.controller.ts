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

// create hotel room
const createHotelRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await HotelService.createHotelRoom(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Hotel room created successfully",
    data: result,
  });
});

// get room active listing by partnerId
const getRoomActiveListing = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const options = pick(req.query, paginationFields);
  const result = await HotelService.getRoomActiveListing(partnerId, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Room active listing fetched successfully",
    data: result,
  });
});

// get available rooms by partnerId
const getAvailableRooms = catchAsync(async (req: Request, res: Response) => {
  const partnerId = req.user?.id;
  const options = pick(req.query, paginationFields);
  const result = await HotelService.getAvailableRooms(partnerId, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Available rooms fetched successfully",
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

// get all hotel rooms
const getAllHotelRooms = catchAsync(async (req: Request, res: Response) => {
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);
  const result = await HotelService.getAllHotelRooms(filter, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel rooms fetched successfully",
    data: result,
  });
});

// get all hotel rooms by hotel id
const getAllHotelRoomsByHotelId = catchAsync(
  async (req: Request, res: Response) => {
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const hotelId = req.params.hotelId;
    const result = await HotelService.getAllHotelRoomsByHotelId(
      filter,
      options,
      hotelId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hotel rooms fetched successfully",
      data: result,
    });
  }
);

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

// get all my hotel rooms for partner
const getAllHotelRoomsForPartner = catchAsync(
  async (req: Request, res: Response) => {
    const hotelId = req.params.hotelId;
    const filter = pick(req.query, filterField);
    const options = pick(req.query, paginationFields);
    const result = await HotelService.getAllHotelRoomsForPartner(
      hotelId,
      filter,
      options
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hotel rooms fetched successfully",
      data: result,
    });
  }
);

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

// get single hotel room
const getSingleHotelRoom = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params.roomId;
  const result = await HotelService.getSingleHotelRoom(roomId);
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

// update hotel room
const updateHotelRoom = catchAsync(async (req: Request, res: Response) => {
  // const roomId = req.params.roomId;
  // const partnerId = req.user?.id;

  const result = await HotelService.updateHotelRoom(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel room updated successfully",
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

// delete hotel room
const deleteHotelRoom = catchAsync(async (req: Request, res: Response) => {
  const roomId = req.params.roomId;
  const partnerId = req.user?.id;
  const result = await HotelService.deleteHotelRoom(roomId, partnerId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Hotel room deleted successfully",
    data: result,
  });
});

export const HotelController = {
  createHotel,
  createHotelRoom,
  getRoomActiveListing,
  getAvailableRooms,
  getAllHotels,
  getAllHotelRooms,
  getAllHotelRoomsByHotelId,
  getAllHotelsForPartner,
  getAllHotelRoomsForPartner,
  getSingleHotel,
  getSingleHotelRoom,
  getPopularHotels,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  updateHotelRoom,
  deleteHotel,
  deleteHotelRoom,
};
