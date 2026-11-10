import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../db/client.js";

interface SubscribeBody {
  email: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export async function newsletterRoutes(app: FastifyInstance): Promise<void> {
  // Public endpoint for subscribing to the newsletter / email list
  app.post(
    "/api/v1/newsletter/subscribe",
    async (req: FastifyRequest<{ Body: SubscribeBody }>, reply: FastifyReply) => {
      const { email, source, metadata } = req.body ?? {};
      const cleanEmail = (email || "").trim().toLowerCase();

      if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
        return reply.status(400).send({ error: "Invalid email address" });
      }

      try {
        const subscriber = await prisma.newsletterSubscriber.upsert({
          where: { email: cleanEmail },
          create: {
            email: cleanEmail,
            source: source || "website_footer",
            status: "ACTIVE",
            metadata: (metadata as object) || {},
          },
          update: {
            status: "ACTIVE",
            updatedAt: new Date(),
          },
        });

        return reply.status(200).send({
          success: true,
          message: "Subscribed successfully",
          subscriber: {
            id: subscriber.id,
            email: subscriber.email,
            status: subscriber.status,
            createdAt: subscriber.createdAt,
          },
        });
      } catch (err) {
        app.log.error({ err }, "Failed to subscribe newsletter email");
        return reply.status(500).send({ error: "Failed to process newsletter subscription" });
      }
    },
  );

  // Endpoint to retrieve all accumulated subscribers (for future marketing exports)
  app.get(
    "/api/v1/newsletter/subscribers",
    async (req: FastifyRequest<{ Querystring: { format?: string } }>, reply: FastifyReply) => {
      try {
        const subscribers = await prisma.newsletterSubscriber.findMany({
          orderBy: { createdAt: "desc" },
        });

        if (req.query.format === "csv") {
          const header = "id,email,source,status,createdAt\n";
          const rows = subscribers
            .map((s) => `"${s.id}","${s.email}","${s.source}","${s.status}","${s.createdAt.toISOString()}"`)
            .join("\n");
          return reply
            .header("Content-Type", "text/csv")
            .header("Content-Disposition", 'attachment; filename="newsletter_subscribers.csv"')
            .send(header + rows);
        }

        return reply.status(200).send({
          count: subscribers.length,
          subscribers,
        });
      } catch (err) {
        app.log.error({ err }, "Failed to list newsletter subscribers");
        return reply.status(500).send({ error: "Failed to list subscribers" });
      }
    },
  );
}

