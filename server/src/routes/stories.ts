import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const createStorySchema = z.object({
  type: z.enum(["TEXT", "IMAGE"]),
  content: z.string().optional(),
  mediaUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export default async function storyRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/stories", async (request, reply) => {
    try {
      const body = createStorySchema.parse(request.body);

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const story = await prisma.story.create({
        data: {
          userId: request.userId,
          type: body.type,
          content: body.content,
          mediaUrl: body.mediaUrl,
          backgroundColor: body.backgroundColor,
          expiresAt,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return reply.status(201).send(story);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });

  fastify.get("/stories", async (request) => {
    const userId = request.userId;

    const stories = await prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        user: {
          select: { id: true, name: true, avatar: true },
        },
        views: {
          where: { viewerId: userId },
          select: { viewerId: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by user
    const grouped = new Map<
      string,
      { user: (typeof stories)[0]["user"]; stories: typeof stories }
    >();

    for (const story of stories) {
      const key = story.userId;
      if (!grouped.has(key)) {
        grouped.set(key, { user: story.user, stories: [] });
      }
      grouped.get(key)!.stories.push(story);
    }

    return Array.from(grouped.values()).map((group) => ({
      user: group.user,
      stories: group.stories.map((s) => ({
        id: s.id,
        userId: s.userId,
        type: s.type,
        content: s.content,
        mediaUrl: s.mediaUrl,
        backgroundColor: s.backgroundColor,
        expiresAt: s.expiresAt,
        createdAt: s.createdAt,
        viewed: s.views.length > 0,
      })),
    }));
  });

  fastify.get("/stories/mine", async (request) => {
    const stories = await prisma.story.findMany({
      where: { userId: request.userId },
      include: {
        views: {
          include: {
            viewer: {
              select: { id: true, name: true, avatar: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return stories;
  });

  fastify.post("/stories/:id/view", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const story = await prisma.story.findUnique({ where: { id } });
    if (!story) {
      return reply.status(404).send({ error: "Story not found" });
    }

    await prisma.storyView.upsert({
      where: { storyId_viewerId: { storyId: id, viewerId: userId } },
      create: { storyId: id, viewerId: userId },
      update: { viewedAt: new Date() },
    });

    return { success: true };
  });

  fastify.get("/stories/:id/views", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const story = await prisma.story.findUnique({ where: { id } });
    if (!story) {
      return reply.status(404).send({ error: "Story not found" });
    }
    if (story.userId !== userId) {
      return reply.status(403).send({ error: "Only story owner can view this" });
    }

    const views = await prisma.storyView.findMany({
      where: { storyId: id },
      include: {
        viewer: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { viewedAt: "desc" },
    });

    return views;
  });
}
