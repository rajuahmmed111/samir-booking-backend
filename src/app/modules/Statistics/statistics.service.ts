import {
  BookingStatus,
  PaymentStatus,
  SupportStatus,
  UserRole,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import { IFilterRequest } from "./statistics.interface";
import {
  calculatePercentageChange,
  getDateRange,
  getPreviousDateRange,
} from "../../../helpars/filterByDate";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";

// get overview total clients, total providers,total revenue
const getOverview = async (params: IFilterRequest) => {
  const { timeRange, year } = params;
  const dateRange = getDateRange(timeRange);

  // total users
  const totalUsers = await prisma.user.count({
    where: {
      role: UserRole.USER,
      // ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });

  // total providers
  const totalProviders = await prisma.user.count({
    where: {
      role: UserRole.PROPERTY_OWNER,
      // ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });

  // total hotel bookings
  const totalHotelBookings = await prisma.hotel_Booking.count({
    where: {
      bookingStatus: {
        in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      },
    },
  });

  // total service booking
  const totalServiceBookings = await prisma.service_booking.count({
    where: {
      bookingStatus: {
        in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
      },
    },
  });

  // total booking
  const totalBookings = totalHotelBookings + totalServiceBookings;

  // admin earnings (only PAID payments)
  const adminEarnings = await prisma.payment.aggregate({
    where: {
      status: {
        in: [PaymentStatus.PAID, PaymentStatus.SUCCESS],
      },
    },
    _sum: {
      amount: true,
    },
  });

  // user chart data - monthly user registration with year filter
  const filterYear = year ? parseInt(year) : new Date().getFullYear();
  const startOfYear = new Date(filterYear, 0, 1); // january 1st of selected year
  const endOfYear = new Date(filterYear, 11, 31, 23, 59, 59); // december 31st of selected year

  const userChartData = await prisma.user.findMany({
    where: {
      role: UserRole.USER,
      createdAt: {
        gte: startOfYear,
        lte: endOfYear,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // group users by month for chart (all 12 months)
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const userChart = monthNames.map((month, index) => {
    const monthUsers = userChartData.filter((user) => {
      const userDate = new Date(user.createdAt);
      return (
        userDate.getMonth() === index && userDate.getFullYear() === filterYear
      );
    });

    return {
      month,
      count: monthUsers.length,
    };
  });

  // recent users - last 5 users
  const recentUsers = await prisma.user.findMany({
    where: {
      role: UserRole.USER,
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
      createdAt: true,
      status: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  return {
    totalUsers,
    totalProviders,
    totalBookings,
    adminEarnings: adminEarnings._sum.amount || 0,
    userChart,
    recentUsers,
    filterYear,
  };
};

// property owner total earnings hotel
const getPartnerTotalEarningsHotel = async (
  partnerId: string,
  timeRange?: string
) => {
  // find partner
  const partner = await prisma.user.findUnique({
    where: {
      id: partnerId,
    },
  });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // date range filter
  const dateRange = getDateRange(timeRange);

  // total earnings
  const earnings = await prisma.payment.aggregate({
    where: {
      partnerId: partnerId,
      status: PaymentStatus.PAID,
      serviceType: "HOTEL",
      ...(dateRange && { createdAt: dateRange }),
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });

  // total bookings
  const totalBookings = await prisma.hotel_Booking.count({
    where: {
      partnerId: partnerId,
      bookingStatus: BookingStatus.CONFIRMED,
      ...(dateRange && { createdAt: dateRange }),
    },
  });

  // earnings trend - monthly data
  const monthlyPayments = await prisma.payment.findMany({
    where: {
      partnerId,
      status: PaymentStatus.PAID,
      serviceType: "HOTEL",
      ...(dateRange && { createdAt: dateRange }),
    },
    select: {
      amount: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // bookings trend - monthly data
  const monthlyBookings = await prisma.hotel_Booking.findMany({
    where: {
      partnerId,
      bookingStatus: BookingStatus.CONFIRMED,
      ...(dateRange && { createdAt: dateRange }),
    },
    select: {
      createdAt: true,
      totalPrice: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // group earnings by month
  const earningsByMonth = monthlyPayments.reduce((acc: any, payment) => {
    const monthKey = payment.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, earnings: 0, count: 0 };
    }
    acc[monthKey].earnings += payment.amount;
    acc[monthKey].count += 1;
    return acc;
  }, {});

  // group bookings by month
  const bookingsByMonth = monthlyBookings.reduce((acc: any, booking) => {
    const monthKey = booking.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, bookings: 0, revenue: 0 };
    }
    acc[monthKey].bookings += 1;
    acc[monthKey].revenue += booking.totalPrice;
    return acc;
  }, {});

  // get current year
  const currentYear = new Date().getFullYear();

  // create proper month mapping
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // generate all months from January to December for current year
  const allMonths = [];
  for (let i = 0; i < 12; i++) {
    const monthKey = `${currentYear}-${String(i + 1).padStart(2, "0")}`; // YYYY-MM format
    const monthName = monthNames[i];

    allMonths.push({
      month: monthKey,
      monthName: monthName,
      earnings: earningsByMonth[monthKey]?.earnings || 0,
      count: earningsByMonth[monthKey]?.count || 0,
      bookings: bookingsByMonth[monthKey]?.bookings || 0,
      revenue: bookingsByMonth[monthKey]?.revenue || 0,
    });
  }

  // check if we have data for previous December and add it if needed
  const prevDecemberKey = `${currentYear - 1}-12`;

  if (earningsByMonth[prevDecemberKey] || bookingsByMonth[prevDecemberKey]) {
    // replace December (index 11) with previous December data
    allMonths[11] = {
      month: prevDecemberKey,
      monthName: "December",
      earnings: earningsByMonth[prevDecemberKey]?.earnings || 0,
      count: earningsByMonth[prevDecemberKey]?.count || 0,
      bookings: bookingsByMonth[prevDecemberKey]?.bookings || 0,
      revenue: bookingsByMonth[prevDecemberKey]?.revenue || 0,
    };
  }

  // separate earnings and bookings trends
  const earningsTrend = allMonths.map(
    ({ month, monthName, earnings, count }) => ({
      month,
      monthName,
      earnings,
      count,
    })
  );

  const bookingsTrend = allMonths.map(
    ({ month, monthName, bookings, revenue }) => ({
      month,
      monthName,
      bookings,
      revenue,
    })
  );

  return {
    totalEarnings: earnings._sum.amount || 0,
    // totalPayments: earnings._count.id || 0,
    totalBookings,
    earningsTrend,
    bookingsTrend,
    timeRange: timeRange || "ALL_TIME",
  };
};

// service provider total earnings service
const getServiceProviderTotalEarningsService = async (
  providerId: string,
  timeRange?: string
) => {
  // find partner
  const partner = await prisma.user.findUnique({
    where: {
      id: providerId,
    },
  });
  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // date range filter
  const dateRange = getDateRange(timeRange);

  // total earnings
  const earnings = await prisma.payment.aggregate({
    where: {
      providerId,
      status: PaymentStatus.PAID,
      serviceType: "SERVICE",
      ...(dateRange && { createdAt: dateRange }),
    },
    _sum: {
      amount: true,
    },
    _count: {
      id: true,
    },
  });
  console.log(earnings, "earnings");

  // total bookings
  const totalBookings = await prisma.service_booking.count({
    where: {
      providerId: providerId,
      bookingStatus: BookingStatus.CONFIRMED,
      ...(dateRange && { createdAt: dateRange }),
    },
  });

  // earnings trend - monthly data
  const monthlyPayments = await prisma.payment.findMany({
    where: {
      providerId,
      status: PaymentStatus.PAID,
      serviceType: "SERVICE",
      ...(dateRange && { createdAt: dateRange }),
    },
    select: {
      amount: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // bookings trend - monthly data
  const monthlyBookings = await prisma.service_booking.findMany({
    where: {
      providerId,
      bookingStatus: BookingStatus.CONFIRMED,
      ...(dateRange && { createdAt: dateRange }),
    },
    select: {
      createdAt: true,
      totalPrice: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // group earnings by month
  const earningsByMonth = monthlyPayments.reduce((acc: any, payment) => {
    const monthKey = payment.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, earnings: 0, count: 0 };
    }
    acc[monthKey].earnings += payment.amount;
    acc[monthKey].count += 1;
    return acc;
  }, {});

  // group bookings by month
  const bookingsByMonth = monthlyBookings.reduce((acc: any, booking) => {
    const monthKey = booking.createdAt.toISOString().slice(0, 7); // YYYY-MM
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, bookings: 0, revenue: 0 };
    }
    acc[monthKey].bookings += 1;
    acc[monthKey].revenue += booking.totalPrice;
    return acc;
  }, {});

  // get current year
  const currentYear = new Date().getFullYear();

  // create proper month mapping
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // generate all months from January to December for current year
  const allMonths = [];
  for (let i = 0; i < 12; i++) {
    const monthKey = `${currentYear}-${String(i + 1).padStart(2, "0")}`; // YYYY-MM format
    const monthName = monthNames[i];

    allMonths.push({
      month: monthKey,
      monthName: monthName,
      earnings: earningsByMonth[monthKey]?.earnings || 0,
      count: earningsByMonth[monthKey]?.count || 0,
      bookings: bookingsByMonth[monthKey]?.bookings || 0,
      revenue: bookingsByMonth[monthKey]?.revenue || 0,
    });
  }

  // check if we have data for previous December and add it if needed
  const prevDecemberKey = `${currentYear - 1}-12`;

  if (earningsByMonth[prevDecemberKey] || bookingsByMonth[prevDecemberKey]) {
    // replace December (index 11) with previous December data
    allMonths[11] = {
      month: prevDecemberKey,
      monthName: "December",
      earnings: earningsByMonth[prevDecemberKey]?.earnings || 0,
      count: earningsByMonth[prevDecemberKey]?.count || 0,
      bookings: bookingsByMonth[prevDecemberKey]?.bookings || 0,
      revenue: bookingsByMonth[prevDecemberKey]?.revenue || 0,
    };
  }

  // separate earnings and bookings trends
  const earningsTrend = allMonths.map(
    ({ month, monthName, earnings, count }) => ({
      month,
      monthName,
      earnings,
      count,
    })
  );

  const bookingsTrend = allMonths.map(
    ({ month, monthName, bookings, revenue }) => ({
      month,
      monthName,
      bookings,
      revenue,
    })
  );

  return {
    totalEarnings: earnings._sum.amount || 0,
    // totalPayments: earnings._count.id || 0,
    totalBookings,
    earningsTrend,
    bookingsTrend,
    timeRange: timeRange || "ALL_TIME",
  };
};

// admin earns
const getAdminTotalEarnings = async (timeRange?: string) => {
  const dateRange = getDateRange(timeRange);

  // all payments with date filtering
  const payments = await prisma.payment.findMany({
    where: {
      status: {
        in: [PaymentStatus.PAID, PaymentStatus.SUCCESS],
      },
      ...(dateRange && { createdAt: dateRange }),
    },
    select: {
      amount: true,
      createdAt: true,
      status: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // all hotel bookings bookingStatus COMPLETED with date filtering
  const hotelBookings = await prisma.hotel_Booking.count({
    where: {
      bookingStatus: "COMPLETED",
      ...(dateRange && { createdAt: dateRange }),
    },
  });

  // all service bookings bookingStatus COMPLETED with date filtering
  const serviceBookings = await prisma.service_booking.count({
    where: {
      bookingStatus: "COMPLETED",
      ...(dateRange && { createdAt: dateRange }),
    },
  });

  // total COMPLETED bookings
  const totalBookings = hotelBookings + serviceBookings;

  // average per booking amount from PAID payments only
  const paidPayments = payments.filter(
    (payment) => payment.status === PaymentStatus.PAID
  );
  const averageEarnings =
    totalBookings > 0 && paidPayments.length > 0
      ? paidPayments.reduce((sum, payment) => sum + payment.amount, 0) /
        paidPayments.length
      : 0;

  // get all hotel bookings
  const allHotelBookings = await prisma.hotel_Booking.findMany({
    where: {
      bookingStatus: {
        in: [
          BookingStatus.CONFIRMED,
          BookingStatus.CANCELLED,
          BookingStatus.COMPLETED,
        ],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });
  // get all service bookings
  const allServiceBookings = await prisma.service_booking.findMany({
    where: {
      bookingStatus: {
        in: [
          BookingStatus.CONFIRMED,
          BookingStatus.CANCELLED,
          BookingStatus.COMPLETED,
        ],
      },
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  // combine all bookings
  const recentBookings = [
    ...allHotelBookings.map((booking) => ({
      ...booking,
      type: "HOTEL",
    })),
    ...allServiceBookings.map((booking) => ({
      ...booking,
      type: "SERVICE",
    })),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // group by month
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentYear = new Date().getFullYear();

  // all months with zero
  const monthlyEarnings = monthNames.map((month, index) => {
    const monthKey = `${currentYear}-${String(index + 1).padStart(2, "0")}`;

    const monthPayments = payments.filter((payment) => {
      const paymentDate = new Date(payment.createdAt);
      return (
        paymentDate.getMonth() === index &&
        paymentDate.getFullYear() === currentYear
      );
    });

    const totalEarnings = monthPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );

    return {
      month,
      monthKey,
      earnings: totalEarnings,
      count: monthPayments.length,
    };
  });

  // calculate total earnings
  const totalEarnings = payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );

  return {
    totalEarnings,
    totalBookings,
    averageEarnings,
    monthlyEarnings,
    recentBookings,
    timeRange: timeRange || "ALL_TIME",
  };
};

export const StatisticsService = {
  getOverview,

  // sales
  getPartnerTotalEarningsHotel,
  getServiceProviderTotalEarningsService,

  // admin earns
  getAdminTotalEarnings,
};
