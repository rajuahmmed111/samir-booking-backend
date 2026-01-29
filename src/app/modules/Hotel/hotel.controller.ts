import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { HotelService } from "./hotel.service";
import { pick } from "../../../shared/pick";
import { paginationFields } from "../../../constants/pagination";
import { filterField } from "./hotel.constant";
import prisma from "../../../shared/prisma";
import { BookingStatus } from "@prisma/client";

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
  const filter = pick(req.query, filterField);
  const options = pick(req.query, paginationFields);

  const result = await HotelService.getAllHotels(filter, options);

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
      options,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Hotels fetched successfully",
      data: result,
    });
  },
);

// get select my property
const getSelectMyProperties = catchAsync(
  async (req: Request, res: Response) => {
    const partnerId = req.user?.id;
    const result = await HotelService.getSelectMyProperties(partnerId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Retrieved selected properties successfully",
      data: result,
    });
  },
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

// export hotel bookings as iCal
const exportHotelIcal = catchAsync(async (req: Request, res: Response) => {
  const { hotelId } = req.params;

  // fetch hotel with bookings, including externalBookingId
  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    include: {
      hotel_bookings: {
        where: {
          bookingStatus: BookingStatus.CONFIRMED,
        },
        select: {
          id: true,
          bookedFromDate: true,
          bookedToDate: true,
          externalBookingId: true,
        },
      },
    },
  });

  if (!hotel) {
    return res.status(404).send("Hotel not found");
  }

  // iCal content without any leading spaces
  let calendar =
    "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Samir Booking//Hotel Calendar//EN\n";

  hotel.hotel_bookings.forEach((booking) => {
    const startDate = new Date(booking.bookedFromDate);
    const endDate = new Date(booking.bookedToDate);

    calendar += "BEGIN:VEVENT\n";
    calendar += `UID:${booking.externalBookingId ?? booking.id}\n`;
    calendar += "SUMMARY:Booked\n";
    calendar += `DTSTART:${formatIcalDate(startDate)}\n`;
    calendar += `DTEND:${formatIcalDate(endDate)}\n`;
    calendar += "END:VEVENT\n";
  });

  calendar += "END:VCALENDAR";

  // set headers for iCal download
  res.setHeader("Content-Type", "text/calendar");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=hotel-${hotelId}.ics`,
  );
  res.send(calendar);
});

// helper function
function formatIcalDate(date: Date) {
  const d = new Date(date);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export const HotelController = {
  createHotel,
  getAllHotels,
  getAllHotelsForPartner,
  getSelectMyProperties,
  getSingleHotel,
  toggleFavorite,
  getAllFavoriteHotels,
  updateHotel,
  deleteHotel,
  createGuard,
  exportHotelIcal,
};
