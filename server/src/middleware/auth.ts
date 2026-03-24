import { FastifyRequest, FastifyReply } from "fastify";
import { Socket } from "socket.io";
import { verifyToken } from "../lib/jwt.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing or invalid token" });
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }

  request.userId = payload.userId;
}

export function socketAuth(
  socket: Socket,
  next: (err?: Error) => void
) {
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  const payload = verifyToken(token);
  if (!payload) {
    return next(new Error("Invalid or expired token"));
  }

  socket.data.userId = payload.userId;
  next();
}
