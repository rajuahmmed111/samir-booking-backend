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

  // admin earnings (only PAID payments)
  const adminEarnings = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.PAID,
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

// user support tickets
const getUserSupportTickets = async (params: IFilterRequest) => {
  const { timeRange } = params;

  const currentDateRange = getDateRange(timeRange);
  const previousDateRange = getPreviousDateRange(timeRange);

  const currentWhere: any = {};
  const previousWhere: any = {};

  if (currentDateRange) {
    currentWhere.createdAt = currentDateRange;
  }

  if (previousDateRange) {
    previousWhere.createdAt = previousDateRange;
  }

  // current period data
  const [totalSupport, pendingSupport] = await Promise.all([
    prisma.support.count({ where: currentWhere }),
    prisma.support.count({
      where: {
        ...currentWhere,
        status: SupportStatus.Pending,
      },
    }),
  ]);

  // previous period data
  const [previousTotalSupport, previousPendingSupport] = await Promise.all([
    prisma.support.count({ where: previousWhere }),
    prisma.support.count({
      where: {
        ...previousWhere,
        status: SupportStatus.Pending,
      },
    }),
  ]);

  // calculate percentage changes
  const totalSupportChange = calculatePercentageChange(
    previousTotalSupport,
    totalSupport
  );
  const pendingSupportChange = calculatePercentageChange(
    previousPendingSupport,
    pendingSupport
  );

  return {
    totalSupport,
    totalSupportChange,
    pendingSupport,
    pendingSupportChange,
  };
};

export const StatisticsService = {
  getOverview,

  // sales
  getPartnerTotalEarningsHotel,
  getServiceProviderTotalEarningsService,

  getUserSupportTickets,
};
