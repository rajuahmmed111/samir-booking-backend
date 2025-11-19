import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { NewsRoomService } from "./news_room.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";

// create news room
const createNewsRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsRoomService.createNewsRoom(req);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "News Room created successfully",
    data: result,
  });
});

// get all news rooms
const getAllNewsRooms = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsRoomService.getAllNewsRooms();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "News Rooms retrieved successfully",
    data: result,
  });
});

// get single news room
const getSingleNewsRoom = catchAsync(async (req: Request, res: Response) => {
  const newsroomId = req.params.newsroomId;
  const result = await NewsRoomService.getSingleNewsRoom(newsroomId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "News Room fetched successfully",
    data: result,
  });
});

// update news room
const updateNewsRoom = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsRoomService.updateNewsRoom(req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "News Room updated successfully",
    data: result,
  });
});

// delete news room
const deleteNewsRoom = catchAsync(async (req: Request, res: Response) => {
  const newsroomId = req.params.newsroomId;
  const result = await NewsRoomService.deleteNewsRoom(newsroomId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "News Room deleted successfully",
    data: result,
  });
});

export const NewsRoomController = {
  createNewsRoom,
  getAllNewsRooms,
  getSingleNewsRoom,
  updateNewsRoom,
  deleteNewsRoom,
};
