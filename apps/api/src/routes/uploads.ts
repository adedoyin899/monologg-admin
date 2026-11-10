import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { writeFile } from "node:fs/promises";
import { pendingUploads } from "../providers/storage.mock.js";

// The mock StorageProvider's "presigned URL" — a real PUT route on this same
// server that writes to local disk (see providers/storage.mock.ts). Only
// meaningful when STORAGE_PROVIDER=mock; a real S3 presigned URL bypasses this
// server entirely, so this route is simply never hit in that mode.
export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_req, body, done) => {
    done(null, body);
  });

  app.put(
    "/api/v1/uploads/local/:token",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.params as { token: string };
      const pending = pendingUploads.get(token);

      if (!pending) {
        return reply.status(404).send({
          error: "Not Found",
          message: "Unknown or already-used upload token",
          statusCode: 404,
        });
      }

      const body = request.body as Buffer;
      if (!Buffer.isBuffer(body) || body.length !== pending.sizeBytes) {
        return reply.status(400).send({
          error: "Bad Request",
          message: `Expected ${pending.sizeBytes} bytes, received ${Buffer.isBuffer(body) ? body.length : 0}`,
          statusCode: 400,
        });
      }

      await writeFile(pending.filePath, body);
      pendingUploads.delete(token);

      return reply.status(200).send({ success: true });
    },
  );
}
