import prisma from './prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

// Parallel fetch for dashboard data - eliminates waterfall
export async function getDashboardData() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;

  // Run all queries in parallel for optimal performance
  const [user, thisMonthAudits, lastMonthAudits, totalAudits, recentAudits, creditsUsed] = 
    await Promise.all([
      // User data
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          credits: true,
          creditsResetsAt: true,
          createdAt: true,
        },
      }),
      
      // This month's audits count
      prisma.audit.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      
      // Last month's audits count
      prisma.audit.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
            lte: new Date(new Date().getFullYear(), new Date().getMonth(), 0),
          },
        },
      }),
      
      // Total audits
      prisma.audit.count({
        where: { userId },
      }),
      
      // Recent audits
      prisma.audit.findMany({
        where: { userId },
        include: {
          prospect: {
            select: {
              id: true,
              url: true,
              companyName: true,
              contactName: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      
      // Credits used this month
      prisma.creditTransaction.aggregate({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
          type: 'audit',
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

  if (!user) {
    return null;
  }

  const auditsChange = lastMonthAudits > 0 
    ? Math.round(((thisMonthAudits - lastMonthAudits) / lastMonthAudits) * 100) 
    : 0;

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      credits: user.credits,
      creditsResetsAt: user.creditsResetsAt,
      memberSince: user.createdAt.toISOString(),
    },
    stats: {
      thisMonthAudits,
      lastMonthAudits,
      totalAudits,
      auditsChange,
      creditsUsed: creditsUsed._sum.amount || 0,
    },
    recentAudits: recentAudits.map((audit) => ({
      id: audit.id,
      status: audit.status,
      overallScore: audit.overallScore,
      screenshotUrl: audit.screenshotUrl,
      createdAt: audit.createdAt.toISOString(),
      prospect: audit.prospect,
    })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;