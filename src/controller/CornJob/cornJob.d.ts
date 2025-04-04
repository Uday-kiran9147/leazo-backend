// import cron from 'node-cron';
// import { DailyActiveUser, YearlyActiveUser } from '../../models/admin/activity';
// import { UserActivity } from '../../models/admin/userActivity';

// // Daily job to backfill any missing aggregates
// cron.schedule('0 0 * * *', async () => {
//   const yesterday = new Date();
//   yesterday.setDate(yesterday.getDate() - 1);
//   yesterday.setHours(0, 0, 0, 0);

//   // Get all active users from yesterday
//   const activeUsers = await UserActivity.distinct('userId', {
//     date: { 
//       $gte: yesterday, 
//       $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000) 
//     }
//   });

//   // Ensure all are in DailyActiveUser
//   await Promise.all(activeUsers.map(userId => 
//     DailyActiveUser.updateOne(
//       { userId, date: yesterday },
//       { $setOnInsert: { userId, date: yesterday } },
//       { upsert: true }
//     )
//   ));

//   // If it's the first day of the month, backfill monthly aggregates
//   if (yesterday.getDate() === 1) {
//     const month = yesterday.getMonth() + 1;
//     const year = yesterday.getFullYear();
    
//     const monthStart = new Date(year, month - 1, 1);
//     const monthEnd = new Date(year, month, 0);
    
//     const monthlyActiveUsers = await UserActivity.distinct('userId', {
//       date: { $gte: monthStart, $lte: monthEnd }
//     });

//     await Promise.all(monthlyActiveUsers.map(userId =>
//       MonthlyActiveUser.updateOne(
//         { userId, year, month },
//         { $setOnInsert: { userId, year, month } },
//         { upsert: true }
//       )
//     ));
//   }

//   // If it's the first day of the year, backfill yearly aggregates
//   if (yesterday.getMonth() === 0 && yesterday.getDate() === 1) {
//     const year = yesterday.getFullYear();
    
//     const yearStart = new Date(year, 0, 1);
//     const yearEnd = new Date(year, 11, 31);
    
//     const yearlyActiveUsers = await UserActivity.distinct('userId', {
//       date: { $gte: yearStart, $lte: yearEnd }
//     });

//     await Promise.all(yearlyActiveUsers.map(userId =>
//       YearlyActiveUser.updateOne(
//         { userId, year },
//         { $setOnInsert: { userId, year } },
//         { upsert: true }
//       )
//     ));
//   }
// });