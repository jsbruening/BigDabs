import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  // Get all users (admin only)
  getAll: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isBlocked: true,
        blockedAt: true,
        blockReason: true,
        _count: {
          select: {
            createdGames: true,
            participants: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return users;
  }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["USER", "ADMIN"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from demoting themselves
      if (ctx.session.user.id === input.userId && input.role === "USER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot demote yourself from admin role",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: {
          id: input.userId,
        },
        data: {
          role: input.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      return updatedUser;
    }),

  // Block user (admin only)
  blockUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from blocking themselves
      if (ctx.session.user.id === input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot block yourself",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: {
          id: input.userId,
        },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy: ctx.session.user.id,
          blockReason: input.reason,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isBlocked: true,
          blockedAt: true,
          blockReason: true,
        },
      });

      return updatedUser;
    }),

  // Unblock user (admin only)
  unblockUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updatedUser = await ctx.db.user.update({
        where: {
          id: input.userId,
        },
        data: {
          isBlocked: false,
          blockedAt: null,
          blockedBy: null,
          blockReason: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          isBlocked: true,
        },
      });

      return updatedUser;
    }),

  // Force delete user and cascade related data (admin only)
  deleteUser: adminProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = input.userId;

      // 1) Delete games created by this user and all related entities
      const games = await ctx.db.bingoGame.findMany({
        where: { createdById: userId },
        select: { id: true },
      });

      for (const g of games) {
        const cards = await ctx.db.card.findMany({ where: { gameId: g.id }, select: { id: true } });
        const cardIds = cards.map(c => c.id);
        if (cardIds.length > 0) {
          await ctx.db.cardSquare.deleteMany({ where: { cardId: { in: cardIds } } });
        }
        await ctx.db.gameItem.deleteMany({ where: { gameId: g.id } });
        await ctx.db.participant.deleteMany({ where: { gameId: g.id } });
        await ctx.db.winner.deleteMany({ where: { gameId: g.id } });
        await ctx.db.card.deleteMany({ where: { gameId: g.id } });
        await ctx.db.bingoGame.deleteMany({ where: { id: g.id } });
      }

      // 2) Delete the user's participation and cards in other games
      const userCards = await ctx.db.card.findMany({ where: { userId }, select: { id: true } });
      const userCardIds = userCards.map(c => c.id);
      if (userCardIds.length > 0) {
        await ctx.db.cardSquare.deleteMany({ where: { cardId: { in: userCardIds } } });
      }
      await ctx.db.card.deleteMany({ where: { userId } });
      await ctx.db.participant.deleteMany({ where: { userId } });
      await ctx.db.winner.deleteMany({ where: { userId } });

      // 3) Delete auth/session records
      await ctx.db.account.deleteMany({ where: { userId } });
      await ctx.db.session.deleteMany({ where: { userId } });

      // 4) Finally, delete the user
      await ctx.db.user.delete({ where: { id: userId } });

      return { success: true } as const;
    }),

  // Get current user info
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: {
        id: ctx.session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isBlocked: true,
      },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    return user;
  }),
});
