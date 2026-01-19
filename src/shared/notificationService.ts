import { UserRole } from "@prisma/client";
import admin from "../helpars/firebaseAdmin";
import prisma from "./prisma";

export enum ServiceTypes {
  HOTEL = "HOTEL",
  SERVICE = "SERVICE",
}

export interface IBookingNotificationData {
  bookingId?: string;
  userId?: string;
  partnerId?: string; // property owner
  providerId?: string; // service provider
  serviceTypes: ServiceTypes;
  serviceName?: string;
  totalPrice: number;
  hotelId?: string;
  serviceId?: string;
}

interface INotificationResult {
  success: boolean;
  notifications: Array<{
    type: "user" | "admin" | "property_owner" | "service_provider";
    success: boolean;
    response?: any;
    error?: string;
  }>;
  message: string;
  error?: string;
}

// user booking template
const getUserConfirmationMessage = (
  serviceType: ServiceTypes,
  data: IBookingNotificationData,
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "Hotel Booking Confirmed! 🏨",
      body: `Hotel booking has been confirmed.`,
    },
    [ServiceTypes.SERVICE]: {
      title: "Service Booked! 🛡️",
      body: "Service has been confirmed.",
    },
  };

  return templates[serviceType];
};

// user cancel template
const getUserCancelMessage = (
  serviceType: ServiceTypes,
  data: IBookingNotificationData,
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "Hotel Booking Cancelled ❌",
      body: `Hotel booking has been cancelled.`,
    },
    [ServiceTypes.SERVICE]: {
      title: "Service Cancelled ❌",
      body: `Service has been cancelled.`,
    },
  };

  return templates[serviceType];
};

// partner cancel template
const getPartnerCancelMessage = (
  serviceType: ServiceTypes,
  data: IBookingNotificationData,
  userName: string,
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "Hotel Booking Cancelled ❌",
      body: `Your Hotel booking has been cancelled.`,
    },
    [ServiceTypes.SERVICE]: {
      title: "Service Cancelled ❌",
      body: `Your Service has been cancelled.`,
    },
  };

  return templates[serviceType];
};

// save to DB
const sendNotification = async (
  receiverId: string,
  fcmToken: string | null,
  message: { title: string; body: string },
  data: IBookingNotificationData,
  type: "user" | "admin" | "property_owner" | "service_provider",
) => {
  if (!fcmToken) return { type, success: false, error: "No FCM token" };

  try {
    const response = await admin.messaging().send({
      notification: message,
      token: fcmToken,
    });

    // Save to DB
    await prisma.notifications.create({
      data: {
        receiverId,
        title: message.title,
        body: message.body,
        serviceTypes: data.serviceTypes,
        bookingId: data.bookingId,
      } as any,
    });

    return { type, success: true, response };
  } catch (error: any) {
    console.error(`${type} notification failed:`, error);
    return { type, success: false, error: error.message };
  }
};

// send booking notifications to service provider
const sendBookingNotifications = async (
  data: IBookingNotificationData,
): Promise<INotificationResult> => {
  const notifications: Array<any> = [];

  // get user who made the booking
  const userInfo = await prisma.user.findUnique({
    where: { id: data.userId },
  });

  // get all admins
  const adminUsers = await prisma.user.findMany({
    where: { role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] } },
  });

  if (data.serviceTypes === ServiceTypes.HOTEL) {
    // for HOTEL: only notify property owner (hotel owner) and admins (not the user who booked)
    const hotel = await prisma.hotel.findUnique({
      where: { id: data.hotelId },
      include: { user: true },
    });

    // notify property owner (hotel owner)
    if (hotel?.user) {
      const ownerMessage = getUserConfirmationMessage(data.serviceTypes, data);
      const ownerResult = await sendNotification(
        hotel.user.id,
        hotel.user.fcmToken,
        ownerMessage,
        data,
        "property_owner",
      );
      notifications.push(ownerResult);
    }

    // notify all admins
    for (const admin of adminUsers) {
      const adminMessage = {
        title: "New Hotel Booking! 🏨",
        body: `New booking received for ${hotel?.propertyTitle || "Hotel"}`,
      };
      const adminResult = await sendNotification(
        admin.id,
        admin.fcmToken,
        adminMessage,
        data,
        "admin",
      );
      notifications.push(adminResult);
    }
  } else if (data.serviceTypes === ServiceTypes.SERVICE) {
    // for SERVICE: only notify service provider (not property owner or admins)
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { user: true },
    });

    // notify service provider
    if (service?.user) {
      const providerMessage = {
        title: "New service request is coming to you.",
        body: `${userInfo?.fullName || "Unknown User"} has booked your service. Please review the request and accept or decline.`,
      };
      const providerResult = await sendNotification(
        service.user.id,
        service.user.fcmToken,
        providerMessage,
        data,
        "service_provider",
      );
      notifications.push(providerResult);
    }
  }

  return {
    success: notifications.every((n) => n.success),
    notifications,
    message: "Booking notifications sent successfully",
  };
};

// send booking accept notification to property owner
const sendBookingAcceptNotification = async (
  data: IBookingNotificationData,
): Promise<INotificationResult> => {
  const notifications: Array<any> = [];

  try {
    // get property owner who booked the service
    const userInfo = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    // get service provider who accepted
    const providerInfo = await prisma.user.findUnique({
      where: { id: data.providerId },
    });

    if (!userInfo || !providerInfo) throw new Error("User not found");

    // notify property owner
    if (userInfo.fcmToken) {
      const ownerMessage = {
        title: "Service provider has accepted your booking. Now you can pay.",
        body: `${providerInfo.fullName} has accepted your service booking for ${data.serviceName}. Please proceed with payment.`,
      };
      const ownerResult = await sendNotification(
        data.userId!,
        userInfo.fcmToken,
        ownerMessage,
        data,
        "user",
      );
      notifications.push(ownerResult);
    }

    const successCount = notifications.filter((n) => n.success).length;

    return {
      success: successCount > 0,
      notifications,
      message: `${successCount} accept notifications sent successfully`,
    };
  } catch (error: any) {
    console.error("Accept notification service failed:", error);
    return {
      success: false,
      notifications,
      message: "Accept notification service failed",
      error: error.message,
    };
  }
};

// send payment request notification to service provider
const sendPaymentRequestNotification = async (
  data: IBookingNotificationData,
): Promise<INotificationResult> => {
  const notifications: Array<any> = [];

  try {
    // get property owner who made payment
    const userInfo = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    // get service provider who will receive work notification
    const providerInfo = await prisma.user.findUnique({
      where: { id: data.providerId },
    });

    if (!userInfo || !providerInfo) throw new Error("User not found");

    // notify service provider that payment is made and they can start work
    if (providerInfo.fcmToken) {
      const providerMessage = {
        title: "Property owner has made payment, now you can start work.",
        body: `${userInfo.fullName} has completed payment for ${data.serviceName}. Payment is held by platform, you will receive payment after work is complete.`,
      };
      const providerResult = await sendNotification(
        data.providerId!,
        providerInfo.fcmToken,
        providerMessage,
        data,
        "service_provider",
      );
      notifications.push(providerResult);
    }

    const successCount = notifications.filter((n) => n.success).length;

    return {
      success: successCount > 0,
      notifications,
      message: `${successCount} payment completion notifications sent successfully`,
    };
  } catch (error: any) {
    console.error("Payment completion notification service failed:", error);
    return {
      success: false,
      notifications,
      message: "Payment completion notification service failed",
      error: error.message,
    };
  }
};

// main function for cancel notification
const sendCancelNotifications = async (
  data: IBookingNotificationData,
): Promise<INotificationResult> => {
  const notifications: Array<any> = [];

  try {
    const [userInfo, partnerInfo] = await Promise.all([
      prisma.user.findUnique({
        where: { id: data.userId },
        select: { fullName: true, fcmToken: true },
      }),
      prisma.user.findUnique({
        where: { id: data.partnerId },
        select: { fullName: true, fcmToken: true },
      }),
    ]);

    if (!userInfo) throw new Error("User not found");

    // User notification
    const userMessage = getUserCancelMessage(data.serviceTypes, data);
    if (userInfo.fcmToken) {
      const userResult = await sendNotification(
        data.userId!,
        userInfo.fcmToken,
        userMessage,
        data,
        "user",
      );
      notifications.push(userResult);
    }

    // Partner notification
    if (partnerInfo?.fcmToken) {
      const partnerMessage = getPartnerCancelMessage(
        data.serviceTypes,
        data,
        userInfo.fullName || "Unknown User",
      );
      const partnerResult = await sendNotification(
        data.partnerId!,
        partnerInfo.fcmToken,
        partnerMessage,
        data,
        "property_owner",
      );
      notifications.push(partnerResult);
    }

    const successCount = notifications.filter((n) => n.success).length;

    return {
      success: successCount > 0,
      notifications,
      message: `${successCount} cancel notifications sent successfully`,
    };
  } catch (error: any) {
    console.error("Cancel notification service failed:", error);
    return {
      success: false,
      notifications,
      message: "Cancel notification service failed",
      error: error.message,
    };
  }
};

export const BookingNotificationService = {
  sendBookingNotifications,
  sendCancelNotifications,
  sendBookingAcceptNotification,
  sendPaymentRequestNotification,
};
