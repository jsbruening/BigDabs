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
