import { BookingStatus } from "@prisma/client";

export interface ITimeSlot {
  from: string;
  to: string;
  [key: string]: any; // add index signature for Prisma Json compatibility
}

export interface ICreateServiceBooking {
  property: string;
  serviceName: string;
  date: string;
  day: string;
  timeSlot: ITimeSlot;
  totalPrice: number;
  specialInstructions?: string;
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
  date: string;
  day: string;
  timeSlot: ITimeSlot;
  totalPrice: number;
  specialInstructions?: string;
  bookingStatus: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
  providerId?: string;
  userId?: string;
  serviceId?: string;
}

export type IServiceFilterRequest = {
  searchTerm?: string;
  bookingStatus?: BookingStatus;
  userId?: string;
  providerId?: string;
  date?: string;
};
