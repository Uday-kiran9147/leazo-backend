import { UserActivity } from "../models/admin/userActivity";

class AnalyticsService {
  // Get Daily Active Users (DAU) for a specific date
  async getDAU(date: Date): Promise<{ count: number, users: any[] }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Option 1: Count from raw activity data (more accurate)
    const uniqueUsers = await UserActivity.distinct('userId', {
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    // Option 2: Count from pre-aggregated collection (faster)
    // const uniqueUsers = await DailyActiveUser.distinct('userId', { date: startOfDay });

    return {
      count: uniqueUsers.length,
      users: uniqueUsers
    };
  }

  // Get Monthly Active Users (MAU) for a specific month
  async getMAU(year: number, month: number): Promise<{ count: number, users: any[] }> {
    // Option 1: Count from raw activity data (more accurate)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const uniqueUsers = await UserActivity.distinct('userId', {
      date: { $gte: startDate, $lte: endDate }
    });

    // Option 2: Count from pre-aggregated collection (faster)
    // const uniqueUsers = await MonthlyActiveUser.distinct('userId', { year, month });

    return {
      count: uniqueUsers.length,
      users: uniqueUsers
    };
  }

  // Get Yearly Active Users (YAU) for a specific year
  async getYAU(year: number): Promise<{ count: number, users: any[] }> {
    // Option 1: Count from raw activity data (more accurate)
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);

    const uniqueUsers = await UserActivity.distinct('userId', {
      date: { $gte: startDate, $lte: endDate }
    });

    // Option 2: Count from pre-aggregated collection (faster)
    // const uniqueUsers = await YearlyActiveUser.distinct('userId', { year });

    return {
      count: uniqueUsers.length,
      users: uniqueUsers
    };
  }

  // Get retention rate between two periods
  async getRetentionRate(period: 'day' | 'month' | 'year'): Promise<number> {
    // Implementation depends on your specific retention calculation needs
    // Example for monthly retention:
    if (period === 'month') {
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMonthUsers = await UserActivity.distinct('userId', {
        date: { $gte: currentMonthStart }
      });

      const prevMonthUsers = await UserActivity.distinct('userId', {
        date: { $gte: prevMonthStart, $lte: prevMonthEnd }
      });

      const retainedUsers = currentMonthUsers.filter(userId => 
        prevMonthUsers.includes(userId)
      );

      return prevMonthUsers.length > 0 
        ? (retainedUsers.length / prevMonthUsers.length) * 100 
        : 0;
    }

    // Similar implementations for day and year
    return 0;
  }
}

export const analyticsService = new AnalyticsService();