import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { setupSocket } from "./socket/index.js";

import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import groupRoutes from "./routes/groups.js";
import messageRoutes from "./routes/messages.js";
import storyRoutes from "./routes/stories.js";
import userRoutes from "./routes/users.js";
import uploadRoutes from "./routes/uploads.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../uploads");

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: CLIENT_URL,
  credentials: true,
});

await fastify.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 },
});

await fastify.register(fastifyStatic, {
  root: uploadsDir,
  prefix: "/uploads",
});

// Register routes under /api prefix
await fastify.register(
  async function apiRoutes(app) {
    await app.register(authRoutes);
    await app.register(conversationRoutes);
    await app.register(groupRoutes);
    await app.register(messageRoutes);
    await app.register(storyRoutes);
    await app.register(userRoutes);
    await app.register(uploadRoutes);
  },
  { prefix: "/api" }
);

const httpServer = fastify.server;

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

setupSocket(io);

try {
  await fastify.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
