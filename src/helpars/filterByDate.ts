export const getDateRange = (timeRange?: string) => {
  const now = new Date();

  switch (timeRange) {
    case "TODAY": {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      return { gte: startOfDay, lte: now };
    }
    case "THIS_WEEK": {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
      startOfWeek.setHours(0, 0, 0, 0);

      return { gte: startOfWeek, lte: now };
    }
    case "THIS_MONTH": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { gte: startOfMonth, lte: now };
    }
    case "THIS_YEAR": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { gte: startOfYear, lte: now };
    }
    default:
      return undefined; // ALL_TIME
  }
};

export const calculatePercentageChange = (previousValue: number, currentValue: number): {
  percentage: number;
  isIncrease: boolean;
} => {
  if (previousValue === 0) {
    return {
      percentage: currentValue > 0 ? 100 : 0,
      isIncrease: currentValue > 0
    };
  }
  
  const change = ((currentValue - previousValue) / previousValue) * 100;
  return {
    percentage: Math.abs(Math.round(change)),
    isIncrease: change >= 0
  };
}

export const calculateGrowth = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(2));
};

// get previous dateRange based on current timeRange
export const getPreviousDateRange = (timeRange?: string) => {
  const now = new Date();

  switch (timeRange) {
    case "TODAY": {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const start = new Date(yesterday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { gte: start, lte: end };
    }
    case "THIS_WEEK": {
      const startOfThisWeek = new Date(now);
      startOfThisWeek.setDate(now.getDate() - now.getDay());
      const startOfLastWeek = new Date(startOfThisWeek);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
      const endOfLastWeek = new Date(startOfThisWeek);
      endOfLastWeek.setMilliseconds(-1);
      return { gte: startOfLastWeek, lte: endOfLastWeek };
    }
    case "THIS_MONTH": {
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1
      );
      const endOfLastMonth = new Date(startOfThisMonth);
      endOfLastMonth.setMilliseconds(-1);
      return { gte: startOfLastMonth, lte: endOfLastMonth };
    }
    case "THIS_YEAR": {
      const startOfThisYear = new Date(now.getFullYear(), 0, 1);
      const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
      const endOfLastYear = new Date(startOfThisYear);
      endOfLastYear.setMilliseconds(-1);
      return { gte: startOfLastYear, lte: endOfLastYear };
    }
    default:
      return undefined;
  }
};
