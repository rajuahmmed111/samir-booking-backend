import admin from "../helpars/firebaseAdmin";
import prisma from "./prisma";

export enum ServiceTypes {
  HOTEL = "HOTEL",
  SECURITY = "SECURITY",
  CAR = "CAR",
  ATTRACTION = "ATTRACTION",
}

export interface IBookingNotificationData {
  bookingId?: string;
  userId?: string;
  partnerId?: string;
  serviceTypes: ServiceTypes;
  serviceName?: string;
  totalPrice: number;
  bookedFromDate?: string;
  bookedToDate?: string;
  quantity?: number;
  additionalInfo?: any;
}

interface INotificationResult {
  success: boolean;
  notifications: Array<{
    type: "user" | "partner";
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
  data: IBookingNotificationData
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "Hotel Booking Confirmed! 🏨",
      body: `Hotel booking has been confirmed.`,
    },
    [ServiceTypes.SECURITY]: {
      title: "Security Service Booked! 🛡️",
      body: "Security service has been confirmed.",
    },
    [ServiceTypes.CAR]: {
      title: "Car Rental Confirmed! 🚗",
      body: `Car Rental has been confirmed.`,
    },
    [ServiceTypes.ATTRACTION]: {
      title: "Attraction Booking Confirmed! 🎢",
      body: `Attraction booking has been confirmed.`,
    },
  };

  return templates[serviceType];
};

// user cancel template
const getUserCancelMessage = (
  serviceType: ServiceTypes,
  data: IBookingNotificationData
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "Hotel Booking Cancelled ❌",
      body: `Hotel booking has been cancelled.`,
    },
    [ServiceTypes.SECURITY]: {
      title: "Security Service Cancelled ❌",
      body: `Security service has been cancelled.`,
    },
    [ServiceTypes.CAR]: {
      title: "Car Rental Cancelled ❌",
      body: `Car Rental has been cancelled.`,
    },
    [ServiceTypes.ATTRACTION]: {
      title: "Attraction Booking Cancelled ❌",
      body: `Attraction booking has been cancelled.`,
    },
  };

  return templates[serviceType];
};

// partner booking template
const getPartnerNotificationMessage = (
  serviceType: ServiceTypes,
  data: IBookingNotificationData,
  userName: string
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "New Hotel Booking! 🏨",
      body: `Your Hotel booking has been confirmed.`,
    },
    [ServiceTypes.SECURITY]: {
      title: "New Security Booking! 🛡️",
      body: "Your Security service has been confirmed.",
    },
    [ServiceTypes.CAR]: {
      title: "New Car Rental! 🚗",
      body: `Your Car Rental has been confirmed`,
    },
    [ServiceTypes.ATTRACTION]: {
      title: "New Attraction Booking! 🎢",
      body: `Your Attraction booking has been confirmed.`,
    },
  };

  return templates[serviceType];
};

// partner cancel template
const getPartnerCancelMessage = (
  serviceType: ServiceTypes,
  data: IBookingNotificationData,
  userName: string
) => {
  const templates = {
    [ServiceTypes.HOTEL]: {
      title: "Hotel Booking Cancelled ❌",
      body: `Your Hotel booking has been cancelled.`,
    },
    [ServiceTypes.SECURITY]: {
      title: "Security Service Cancelled ❌",
      body: `Your Security service has been cancelled.`,
    },
    [ServiceTypes.CAR]: {
      title: "Car Rental Cancelled ❌",
      body: `Car Rental has been cancelled.`,
    },
    [ServiceTypes.ATTRACTION]: {
      title: "Attraction Booking Cancelled ❌",
      body: `Attraction booking has been cancelled.`,
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
  type: "user" | "partner"
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

// main function for booking
const sendBookingNotifications = async (
  data: IBookingNotificationData
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
    const userMessage = getUserConfirmationMessage(data.serviceTypes, data);
    if (userInfo.fcmToken) {
      const userResult = await sendNotification(
        data.userId!,
        userInfo.fcmToken,
        userMessage,
        data,
        "user"
      );
      notifications.push(userResult);
    }

    // Partner notification
    if (partnerInfo?.fcmToken) {
      const partnerMessage = getPartnerNotificationMessage(
        data.serviceTypes,
        data,
        userInfo.fullName || "Unknown User"
      );
      const partnerResult = await sendNotification(
        data.partnerId!,
        partnerInfo.fcmToken,
        partnerMessage,
        data,
        "partner"
      );
      notifications.push(partnerResult);
    }

    const successCount = notifications.filter((n) => n.success).length;

    return {
      success: successCount > 0,
      notifications,
      message: `${successCount} notifications sent successfully`,
    };
  } catch (error: any) {
    console.error("Booking notification service failed:", error);
    return {
      success: false,
      notifications,
      message: "Notification service failed",
      error: error.message,
    };
  }
};

// main function for cancel
const sendCancelNotifications = async (
  data: IBookingNotificationData
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
        "user"
      );
      notifications.push(userResult);
    }

    // Partner notification
    if (partnerInfo?.fcmToken) {
      const partnerMessage = getPartnerCancelMessage(
        data.serviceTypes,
        data,
        userInfo.fullName || "Unknown User"
      );
      const partnerResult = await sendNotification(
        data.partnerId!,
        partnerInfo.fcmToken,
        partnerMessage,
        data,
        "partner"
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
};
