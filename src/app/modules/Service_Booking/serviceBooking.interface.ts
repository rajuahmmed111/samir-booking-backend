import { BookingStatus } from "@prisma/client";

export interface OfferedService {
  price: number;
  serviceTypeName: string;
}

export interface ITimeSlot {
  from: string;
  to: string;
  [key: string]: any; // add index signature for Prisma Json compatibility
}

export interface ICreateServiceBooking {
  property: string;
  serviceName: string;
  offeredService: OfferedService[];
  newOfferedService?: OfferedService[];
  date: string;
  day: string;
  timeSlot: ITimeSlot;
  totalPrice: number;
  specialInstructions?: string;
  hotelId: string;
}

export interface IUpdateServiceBooking {
  bookingStatus?: BookingStatus;
  specialInstructions?: string;
}

export interface IServiceBookingResponse {
  id: string;
  checkoutSessionId?: string;
  property: string;
  serviceName: string;
  offeredService: OfferedService[];
  newOfferedService?: OfferedService[];
  date: string;
  day: string;
  timeSlot: ITimeSlot;
  totalPrice: number;
  specialInstructions?: string;
  bookingStatus: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  hotelId?: string;
  providerId?: string;
  userId?: string;
  serviceId?: string;
}

export type IServiceFilterRequest = {
  searchTerm?: string;
  bookingStatus?: BookingStatus;
  bookingType?: "active" | "past";
  userId?: string;
  providerId?: string;
  date?: string;
};
