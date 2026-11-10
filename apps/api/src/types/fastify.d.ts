import type { AccessTokenPayload } from "../services/auth.js";
import type { AdminUser, AdminSession } from "@prisma/client";

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
    adminUser?: AdminUser;
    adminSession?: AdminSession;
  }
}

