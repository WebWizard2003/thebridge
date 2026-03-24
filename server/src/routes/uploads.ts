import { FastifyInstance } from "fastify";
import { authMiddleware } from "../middleware/auth.js";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");

const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);

export default async function uploadRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/uploads", async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: "No file uploaded" });
    }

    const ext = path.extname(data.filename).toLowerCase();
    const filename = `${randomUUID()}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    await pipeline(data.file, createWriteStream(filepath));

    if (data.file.truncated) {
      return reply.status(413).send({ error: "File too large" });
    }

    const type = imageExtensions.has(ext) ? "image" : "document";

    return { url: `/uploads/${filename}`, type, fileName: data.filename };
  });
}
