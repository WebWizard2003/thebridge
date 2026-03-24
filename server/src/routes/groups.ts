import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  memberIds: z.array(z.string()).min(1),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string(),
});

const updateRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER"]),
});

const lockSchema = z.object({
  isLocked: z.boolean(),
});

async function isAdmin(conversationId: string, userId: string) {
  const member = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: { conversationId, userId },
    },
  });
  return member?.role === "ADMIN";
}

export default async function groupRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/conversations/group", async (request, reply) => {
    try {
      const body = createGroupSchema.parse(request.body);
      const userId = request.userId;

      const allMemberIds = [...new Set([...body.memberIds, userId])];

      const conversation = await prisma.conversation.create({
        data: {
          type: "GROUP",
          name: body.name,
          createdById: userId,
          members: {
            create: allMemberIds.map((id) => ({
              userId: id,
              role: id === userId ? "ADMIN" : "MEMBER",
            })),
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      return reply.status(201).send(conversation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });

  fastify.put("/conversations/:id/group", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = updateGroupSchema.parse(request.body);

      if (!(await isAdmin(id, request.userId))) {
        return reply.status(403).send({ error: "Admin only" });
      }

      const conversation = await prisma.conversation.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.avatar !== undefined && { avatar: body.avatar }),
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      return conversation;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });

  fastify.post("/conversations/:id/members", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = addMemberSchema.parse(request.body);

      if (!(await isAdmin(id, request.userId))) {
        return reply.status(403).send({ error: "Admin only" });
      }

      const existing = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId: body.userId } },
      });
      if (existing) {
        return reply.status(409).send({ error: "User already a member" });
      }

      await prisma.conversationMember.create({
        data: { conversationId: id, userId: body.userId, role: "MEMBER" },
      });

      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      return conversation;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });

  fastify.delete("/conversations/:id/members/:userId", async (request, reply) => {
    const { id, userId: targetUserId } = request.params as {
      id: string;
      userId: string;
    };

    const isSelf = targetUserId === request.userId;

    // Allow self-removal (leaving), otherwise require admin
    if (!isSelf && !(await isAdmin(id, request.userId))) {
      return reply.status(403).send({ error: "Admin only" });
    }

    if (targetUserId === request.userId) {
      const memberCount = await prisma.conversationMember.count({
        where: { conversationId: id },
      });
      // If not the last member, check admin constraint
      if (memberCount > 1) {
        const adminCount = await prisma.conversationMember.count({
          where: { conversationId: id, role: "ADMIN" },
        });
        if (adminCount <= 1 && (await isAdmin(id, request.userId))) {
          return reply
            .status(400)
            .send({ error: "Promote another member to admin before leaving" });
        }
      }
    }

    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: { conversationId: id, userId: targetUserId },
      },
    });

    return { success: true };
  });

  fastify.put("/conversations/:id/members/:userId/role", async (request, reply) => {
    try {
      const { id, userId: targetUserId } = request.params as {
        id: string;
        userId: string;
      };
      const body = updateRoleSchema.parse(request.body);

      if (!(await isAdmin(id, request.userId))) {
        return reply.status(403).send({ error: "Admin only" });
      }

      await prisma.conversationMember.update({
        where: {
          conversationId_userId: { conversationId: id, userId: targetUserId },
        },
        data: { role: body.role },
      });

      return { success: true };
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });

  fastify.put("/conversations/:id/lock", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = lockSchema.parse(request.body);

      if (!(await isAdmin(id, request.userId))) {
        return reply.status(403).send({ error: "Admin only" });
      }

      const conversation = await prisma.conversation.update({
        where: { id },
        data: { isLocked: body.isLocked },
      });

      return conversation;
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });
}
