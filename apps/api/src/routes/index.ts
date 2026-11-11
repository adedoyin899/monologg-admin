import type { FastifyInstance } from "fastify";
import { healthRoutes } from "./health.js";
import { metricsRoutes } from "./metrics.js";
import { authRoutes } from "./auth.js";
import { creatorRoutes } from "./creators.js";
import { clientRoutes } from "./clients.js";
import { rateCardRoutes } from "./rateCards.js";
import { availabilityRoutes } from "./availability.js";
import { calendarEventRoutes } from "./calendarEvents.js";
import { briefRoutes } from "./briefs.js";
import { projectRoutes } from "./projects.js";
import { talentRoutes } from "./talent.js";
import { bookingRoutes } from "./bookings.js";
import { publicBookingRoutes } from "./publicBookings.js";
import { orderRoomRoutes } from "./orderRooms.js";
import { uploadRoutes } from "./uploads.js";
import { webhookRoutes } from "./webhooks.js";
import { calendarRoutes } from "./calendar.js";
import { notificationRoutes } from "./notifications.js";
import { transactionRoutes } from "./transactions.js";
import { supportRoutes } from "./support.js";
import { mediaKitRoutes } from "./mediaKit.js";
import { verificationRoutes } from "./verification.js";
import { attributesRoutes } from "./attributes.js";
import { adminRoutes } from "./admin/index.js";
import { supabaseAuthRoutes } from "./authSupabase.js";
import { withdrawalRoutes } from "./withdrawals.js";
import { analyticsRoutes } from "./analytics.js";
import { eventsRoutes } from "./events.js";
import { newsletterRoutes } from "./newsletter.js";
import { cronRoutes } from "./cron.js";

/**
 * Route aggregator — registers all route plugins onto the Fastify instance.
 * Add new route modules here as phases land.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
  await app.register(metricsRoutes);
  await app.register(analyticsRoutes);
  await app.register(eventsRoutes);
  await app.register(newsletterRoutes);
  await app.register(authRoutes);
  await app.register(supabaseAuthRoutes);
  await app.register(adminRoutes);
  await app.register(creatorRoutes);
  await app.register(clientRoutes);
  await app.register(rateCardRoutes);
  await app.register(availabilityRoutes);
  await app.register(calendarEventRoutes);
  await app.register(briefRoutes);
  await app.register(projectRoutes);
  await app.register(talentRoutes);
  await app.register(bookingRoutes);
  await app.register(publicBookingRoutes);
  await app.register(orderRoomRoutes);
  await app.register(uploadRoutes);
  await app.register(webhookRoutes);
  await app.register(calendarRoutes);
  await app.register(notificationRoutes);
  await app.register(transactionRoutes);
  await app.register(supportRoutes);
  await app.register(mediaKitRoutes);
  await app.register(verificationRoutes);
  await app.register(attributesRoutes);
  await app.register(withdrawalRoutes);
  await app.register(cronRoutes);
}
