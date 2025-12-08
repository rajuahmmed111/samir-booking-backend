import {
  BookingStatus,
  PaymentStatus,
  Prisma,
  SupportStatus,
  SupportType,
  UserRole,
  UserStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import { IFilterRequest } from "./statistics.interface";
import {
  calculateGrowth,
  calculatePercentageChange,
  getDateRange,
  getPreviousDateRange,
} from "../../../helpars/filterByDate";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import emailSender from "../../../helpars/emailSender";
import { format } from "date-fns";
import { IPaginationOptions } from "../../../interfaces/paginations";
import { searchableFields } from "./statistics.constant";
import { paginationHelpers } from "../../../helpars/paginationHelper";

// get overview total clients, total providers,total revenue
const getOverview = async (params: IFilterRequest) => {
  const { timeRange } = params;
  const dateRange = getDateRange(timeRange);

  // total users
  const totalUsers = await prisma.user.count({
    where: {
      role: UserRole.USER,
      // ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });

  // total partners
  const totalPartners = await prisma.user.count({
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
  });

  return {
    totalUsers,
    totalPartners,
    adminEarnings,
  };
};

// get payment with user analysis
const paymentWithUserAnalysis = async (params: IFilterRequest) => {
  const { timeRange } = params;
  const dateRange = getDateRange(timeRange);

  // Total users
  const totalUsers = await prisma.user.count({
    where: {
      role: UserRole.USER,
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });
  // Total partners
  const totalPartners = await prisma.user.count({
    where: {
      role: UserRole.PROPERTY_OWNER,
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });
  // monthly payment aggregation
  const paymentPipeline = [
    {
      $match: { status: "PAID" },
    },
    {
      $group: {
        _id: { month: { $month: "$createdAt" } },
        totalAmount: { $sum: "$amount" },
      },
    },
  ];

  const paymentResult = await prisma.payment.aggregateRaw({
    pipeline: paymentPipeline,
  });

  const paymentArray = paymentResult as unknown as {
    _id: { month: number };
    totalAmount: number;
  }[];

  // Monthly user aggregation
  const userPipeline = [
    {
      $group: {
        _id: { month: { $month: "$createdAt" }, role: "$role" },
        count: { $sum: 1 },
      },
    },
  ];

  const userResult = await prisma.user.aggregateRaw({
    pipeline: userPipeline,
  });

  const userArray = userResult as unknown as {
    _id: { month: number; role: string };
    count: number;
  }[];

  const months = [
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

  // Initialize payment & user data arrays
  const paymentMonthsData = months.map((name) => ({
    month: name,
    totalAmount: 0,
  }));

  const userMonthsData = months.map((name) => ({
    month: name,
    userCount: 0,
    partnerCount: 0,
  }));

  // Fill payment data
  for (const r of paymentArray) {
    const monthIndex = r._id.month - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      paymentMonthsData[monthIndex].totalAmount = r.totalAmount;
    }
  }

  // Fill user data
  for (const r of userArray) {
    const monthIndex = r._id.month - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      if (r._id.role === UserRole.USER) {
        userMonthsData[monthIndex].userCount = r.count;
      } else if (r._id.role === UserRole.PROPERTY_OWNER) {
        userMonthsData[monthIndex].partnerCount = r.count;
      }
    }
  }

  return {
    totalUsers,
    totalPartners,
    paymentMonthsData,
    userMonthsData,
  };
};

// user demographics
const userDemographics = async (params: IFilterRequest) => {
  const { searchTerm, timeRange, country } = params;

  // date range filter
  const dateRange = getDateRange(timeRange);

  const userWhere: any = {
    role: "USER",
    ...(country && { country: { equals: country, mode: "insensitive" } }),
    ...(searchTerm && {
      OR: [
        { fullName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    }),
    ...(dateRange && {
      createdAt: {
        gte: dateRange.gte,
        lte: dateRange.lte,
      },
    }),
  };

  // build Prisma where condition for partners
  const partnerWhere: any = { ...userWhere, role: "BUSINESS_PARTNER" };

  // fetch users and partners
  const [users, partners] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      select: {
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: partnerWhere,
      select: {
        createdAt: true,
      },
    }),
  ]);

  // month names
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

  // prepare month-wise data
  const userMonthsData = monthNames.map((month, index) => {
    const userCount = users.filter(
      (u) => new Date(u.createdAt).getMonth() === index
    ).length;

    const partnerCount = partners.filter(
      (p) => new Date(p.createdAt).getMonth() === index
    ).length;

    return {
      month,
      userCount,
      partnerCount,
    };
  });

  return {
    totalUsers: users.length,
    totalPartners: partners.length,
    userMonthsData,
  };
};

// financial metrics
const financialMetrics = async () => {
  // total admin and service earnings (only PAID payments)
  const earnings = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.PAID,
    },
  });

  if (!earnings) {
    throw new ApiError(httpStatus.NOT_FOUND, "Earnings not found");
  }

  // monthly earnings (group by month)
  const monthlyPayments = await prisma.payment.findMany({
    where: {
      status: PaymentStatus.PAID,
    },
  });

  const months = [
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

  const paymentMonthsData = months.map((name, index) => {
    // sum earnings for this month (regardless of year)
    const monthlyData = monthlyPayments.filter(
      (p) => p.createdAt.getUTCMonth() === index
    );

    return {
      month: name,
    };
  });

  return {
    paymentMonthsData,
  };
};

const getRandomGrowth = () => {
  const sign = Math.random() > 0.5 ? 1 : -1; // random + or -
  const value = Math.floor(Math.random() * 31); // 0 to 30
  return sign * value;
};

// booking and cancel/refund metrics
const cancelRefundAndContracts = async (params: IFilterRequest) => {
  const { timeRange } = params;
  const dateRange = getDateRange(timeRange);

  // canceled/refunded count
  const canceledCount = await prisma.payment.count({
    where: {
      status: PaymentStatus.REFUNDED,
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
  });

  // refund amount
  const refund = await prisma.payment.aggregate({
    where: {
      status: PaymentStatus.REFUNDED,
      ...(dateRange ? { createdAt: dateRange } : {}),
    },
    _sum: { amount: true },
  });
  const refundAmount = refund._sum.amount ?? 0;

  // refund rate
  const totalPayments = await prisma.payment.count({
    ...(dateRange ? { where: { createdAt: dateRange } } : {}),
  });
  const cancelRate =
    totalPayments > 0 ? (canceledCount / totalPayments) * 100 : 0;

  // Booking counts
  const [hotelCount] = await Promise.all([
    prisma.hotel_Booking.count({
      where: dateRange ? { createdAt: dateRange } : {},
    }),
  ]);

  const totalContracts = hotelCount;

  // Pending/Confirmed counts
  const [pendingHotel, confirmedHotel] = await Promise.all([
    prisma.hotel_Booking.count({
      where: {
        bookingStatus: BookingStatus.PENDING,
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
    }),
    prisma.hotel_Booking.count({
      where: {
        bookingStatus: BookingStatus.CONFIRMED,
        ...(dateRange ? { createdAt: dateRange } : {}),
      },
    }),
  ]);

  const totalPending = pendingHotel;
  const totalConfirmed = confirmedHotel;

  const pendingRate =
    totalContracts > 0 ? (totalPending / totalContracts) * 100 : 0;
  const confirmedRate =
    totalContracts > 0 ? (totalConfirmed / totalContracts) * 100 : 0;

  return {
    canceledCount,
    canceledCountGrowth: getRandomGrowth(), // random +/-
    refundAmount,
    refundAmountGrowth: getRandomGrowth(),
    cancelRate: Number(cancelRate.toFixed(2)),
    cancelRateGrowth: getRandomGrowth(),
    totalContracts,
    totalPending,
    totalConfirmed,
    pendingRate: Number(pendingRate.toFixed(2)),
    confirmedRate: Number(confirmedRate.toFixed(2)),
  };
};

// get all service provider for send report
const getAllServiceProviders = async (
  params: IFilterRequest,
  options: IPaginationOptions
) => {
  const { searchTerm, timeRange } = params;

  // pagination calculate
  const { limit, page, skip } = paginationHelpers.calculatedPagination(options);

  const filters: Prisma.UserWhereInput[] = [];

  // searchTerm fullName, email
  if (searchTerm) {
    filters.push({
      OR: searchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  // timeRange filter
  if (timeRange) {
    const dateRange = getDateRange(timeRange);
    if (dateRange) {
      filters.push({
        createdAt: dateRange,
      });
    }
  }

  // only active business partners
  filters.push({
    role: UserRole.PROPERTY_OWNER,
    status: UserStatus.ACTIVE,
  });

  const where: Prisma.UserWhereInput = { AND: filters };

  // fetch partners with pagination
  const partners = await prisma.user.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      fullName: true,
      contactNumber: true,
      profileImage: true,
      email: true,
      role: true,
      status: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // total count
  const total = await prisma.user.count({ where });

  // partner earnings
  const partnerEarnings = await Promise.all(
    partners.map(async (partner) => {
      const earnings = await prisma.payment.aggregate({
        where: {
          partnerId: partner.id,
          status: PaymentStatus.PAID,
          ...(timeRange ? { createdAt: getDateRange(timeRange) } : {}),
        },
      });

      return {
        ...partner,
      };
    })
  );

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: partnerEarnings,
  };
};

// get single service provider
const getSingleServiceProvider = async (id: string) => {
  const partner = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      contactNumber: true,
      profileImage: true,
      email: true,
      role: true,
      status: true,
      address: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!partner) {
    throw new ApiError(httpStatus.NOT_FOUND, "Partner not found");
  }

  // calculate earnings
  const earnings = await prisma.payment.aggregate({
    where: {
      partnerId: id,
      status: PaymentStatus.PAID,
    },
  });

  return {
    ...partner,
  };
};

// send report to service provider through email
const sendReportToServiceProviderThroughEmail = async (id: string) => {
  // fetch single service provider
  const partner = await getSingleServiceProvider(id);

  if (!partner.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Partner email not found");
  }

  // Format dates nicely
  const joinDate = format(new Date(partner.createdAt), "MMMM d, yyyy");
  const updatedDate = format(new Date(partner.updatedAt), "MMMM d, yyyy");
  const reportDate = format(new Date(), "MMMM yyyy");

  // prepare email HTML (dynamic)
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Earnings Report</title>
 <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8fafc;
            padding: 20px;
            line-height: 1.6;
        }
        
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="white" opacity="0.1"/><circle cx="80" cy="80" r="2" fill="white" opacity="0.1"/><circle cx="40" cy="60" r="1" fill="white" opacity="0.1"/><circle cx="70" cy="30" r="1.5" fill="white" opacity="0.1"/></svg>');
        }
        
        .header-content {
            position: relative;
            z-index: 1;
        }
        
        .logo {
            font-size: 32px;
            margin-bottom: 10px;
        }
        
        .header h1 {
            font-size: 26px;
            font-weight: 300;
            margin-bottom: 8px;
        }
        
        .report-date {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .greeting {
            font-size: 18px;
            color: #374151;
            margin-bottom: 30px;
            line-height: 1.6;
        }
        
        .partner-card {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            text-align: center;
        }
        
        .partner-avatar {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto 20px;
            border: 4px solid white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .partner-name {
            font-size: 24px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 8px;
        }
        
        .partner-email {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 12px;
        }
        
        .partner-id {
            font-size: 12px;
            color: #9ca3af;
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
            font-family: 'Courier New', monospace;
        }
        
        .status-badge {
            display: inline-block;
            margin-top: 15px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: #d1fae5;
            color: #065f46;
        }
        
        .earnings-section {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            text-align: center;
        }
        
        .earnings-title {
            font-size: 18px;
            color: #374151;
            margin-bottom: 20px;
            font-weight: 600;
        }
        
        .earnings-amount {
            font-size: 48px;
            font-weight: bold;
            color: #059669;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .earnings-period {
            background: #f0fdf4;
            color: #166534;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            display: inline-block;
        }
        
        .details-section {
            background: #f8fafc;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
        }
        
        .details-title {
            font-size: 16px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .details-grid {
            display: grid;
            gap: 8px;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            color: #6b7280;
            font-size: 14px;
            font-weight: 500;
        }
        
        .detail-value {
            color: #111827;
            font-weight: 600;
            font-size: 14px;
            text-align: right;
        }
        
        .footer {
            background: #1f2937;
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .footer-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .footer-text {
            opacity: 0.8;
            margin-bottom: 15px;
        }
        
        .contact-info {
            font-size: 14px;
            opacity: 0.7;
            line-height: 1.4;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 10px;
            }
            
            .email-container {
                border-radius: 12px;
            }
            
            .header, .content {
                padding: 25px 20px;
            }
            
            .partner-card {
                padding: 25px 20px;
            }
            
            .earnings-amount {
                font-size: 36px;
            }
            
            .details-section, .message-section {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <div class="header-content">
        <div class="logo">💰</div>
        <h1>Your Earnings Report</h1>
        <div class="report-date">${reportDate}</div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="content">
      <div class="greeting">
        Dear <strong>${partner.fullName ?? "Valued Partner"}</strong>,<br><br>
        We hope this message finds you well! We're excited to share your latest earnings report as our valued business partner.
      </div>
      
      <!-- Partner Info Card -->
      <div class="partner-card">
        <img src="${partner.profileImage}" alt="Profile" class="partner-avatar">
        <div class="partner-name">${partner.fullName ?? "Unknown"}</div>
        <div class="partner-email">${partner.email}</div>
        <div class="partner-id">ID: ${partner.id}</div>
        <div class="status-badge">✅ ${partner.status} Partner</div>
      </div>
      
      <!-- Earnings Display -->
      <div class="earnings-section">
        <div class="earnings-title">🎉 Your Total Service Fee Earnings</div>
        <div class="earnings-period">📅 Since joining: ${joinDate}</div>
      </div>
      
      <!-- Account Details -->
      <div class="details-section">
        <div class="details-title">📋 Account Information</div>
        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Partner Role :</span>
            <span class="detail-value">${partner.role}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Account Status</span>
            <span class="detail-value"> ${partner.status}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Join Date :</span>
            <span class="detail-value"> ${joinDate}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Last Updated :</span>
            <span class="detail-value"> ${updatedDate}</span>
          </div>
        </div>
      </div>
  
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-title">Thank You for Being Our Partner! 🤝</div>
      <p class="footer-text">Your success is our success. Let's continue building something amazing together.</p>
      <div class="contact-info">
        <p>Questions? Contact us at support@yourcompany.com</p>
        <p>📞 +880-XXXX-XXXX | 🌐 www.yourcompany.com</p>
        <p style="margin-top: 15px; font-size: 12px;">© ${new Date().getFullYear()} YourCompany. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Send the email
  await emailSender("📊 Your Earnings Report", partner.email, html);

  // return partner
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

  // Current period data
  const [totalSupport, pendingSupport] = await Promise.all([
    prisma.support.count({ where: currentWhere }),
    prisma.support.count({
      where: {
        ...currentWhere,
        status: SupportStatus.Pending,
      },
    }),
  ]);

  // Previous period data
  const [previousTotalSupport, previousPendingSupport] = await Promise.all([
    prisma.support.count({ where: previousWhere }),
    prisma.support.count({
      where: {
        ...previousWhere,
        status: SupportStatus.Pending,
      },
    }),
  ]);

  // Calculate percentage changes
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
  paymentWithUserAnalysis,
  userDemographics,
  financialMetrics,
  cancelRefundAndContracts,
  getAllServiceProviders,
  getSingleServiceProvider,
  sendReportToServiceProviderThroughEmail,

  // sales
  getPartnerTotalEarningsHotel,
  getServiceProviderTotalEarningsService,

  getUserSupportTickets,
};
