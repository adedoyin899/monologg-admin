import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.js";

export async function adminUsersRoutes(app: FastifyInstance): Promise<void> {
  // List all registered users
  app.get("/api/v1/admin/users", async (_request: FastifyRequest, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: { id: true, name: true, niche: true } },
        client: { select: { id: true, name: true, orgName: true } },
        activities: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return reply.send({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        userType: u.userType,
        authProvider: u.authProvider,
        emailVerified: u.emailVerified,
        isNewUser: u.isNewUser,
        name: u.creator?.name || u.client?.name || u.client?.orgName || "User",
        createdAt: u.createdAt,
        activitiesCount: u.activities.length,
        recentActivities: u.activities,
      })),
      totalCount: users.length,
    });
  });

  // List all user activity logs chronologically
  app.get("/api/v1/admin/user-activities", async (_request: FastifyRequest, reply: FastifyReply) => {
    const activities = await prisma.userActivity.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userType: true,
            creator: { select: { name: true } },
            client: { select: { name: true } },
          },
        },
      },
    });

    return reply.send({
      activities: activities.map((a) => ({
        id: a.id,
        userId: a.userId,
        userName: a.user?.creator?.name || a.user?.client?.name || a.user?.email || "Unknown",
        userEmail: a.user?.email,
        action: a.action,
        details: a.details,
        createdAt: a.createdAt,
      })),
    });
  });
}
