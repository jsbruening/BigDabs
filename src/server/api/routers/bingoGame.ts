import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const bingoGameRouter = createTRPCRouter({
  // Get game by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const game = await ctx.db.bingoGame.findUnique({
          where: { id: input.id },
          include: {
            items: true,
            createdBy: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        });

        if (!game) {
          throw new Error(`Game with ID "${input.id}" not found`);
        }

        // Compute game status based on start/end times
        const now = new Date();
        const startTime = new Date(game.startAt);
        const endTime = new Date(game.endAt);
        
        let status = "upcoming";
        if (now >= startTime && now <= endTime) {
          status = "active";
        } else if (now > endTime) {
          status = "ended";
        }

        return {
          ...game,
          status,
        };
      } catch (error) {
        console.error("Error in getById:", error);
        throw new Error(`Failed to fetch game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }),

  // Get participants for a game
  getParticipants: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const participants = await ctx.db.participant.findMany({
        where: { gameId: input.gameId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              email: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      });

      return participants;
    }),

  // Join a game
  join: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const game = await ctx.db.bingoGame.findUnique({
        where: { id: input.gameId },
        include: { items: true },
      });

      if (!game) {
        throw new Error("Game not found");
      }

      // Check if user is already a participant
      const existingParticipant = await ctx.db.participant.findFirst({
        where: {
          gameId: input.gameId,
          userId: ctx.session.user.id,
        },
      });

      if (existingParticipant) {
        throw new Error("You are already a participant in this game");
      }

      // Generate random card layout
      const items = game.items.map(item => item.label);
      
      // Ensure we have enough items for a 5x5 grid (24 squares + center)
      // If we don't have enough items, repeat them
      const neededItems = 24; // 5x5 minus center square
      let shuffledItems: string[] = [];
      
      if (items.length === 0) {
        // No items available, fill with placeholder
        shuffledItems = Array(neededItems).fill("No items available") as string[];
      } else if (items.length < neededItems) {
        // Not enough items, repeat them
        const repetitions = Math.ceil(neededItems / items.length);
        shuffledItems = Array(repetitions).fill(items).flat().sort(() => Math.random() - 0.5) as string[];
      } else {
        // Enough items, just shuffle
        shuffledItems = [...items].sort(() => Math.random() - 0.5);
      }
      
      // Create 5x5 grid with center square
      const cardLayout: string[][] = [];
      let itemIndex = 0;
      
      for (let row = 0; row < 5; row++) {
        const cardRow: string[] = [];
        for (let col = 0; col < 5; col++) {
          if (row === 2 && col === 2) {
            // Center square - will be handled by centerSquareItem
            cardRow.push("");
          } else {
            cardRow.push(shuffledItems[itemIndex] ?? "Empty");
            itemIndex++;
          }
        }
        cardLayout.push(cardRow);
      }

      // Create participant record
      const participant = await ctx.db.participant.create({
        data: {
          gameId: input.gameId,
          userId: ctx.session.user.id,
          cardLayout: cardLayout,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      return {
        ...participant,
        cardLayout,
      };
    }),

  // Leave a game
  leave: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const participant = await ctx.db.participant.findFirst({
        where: {
          gameId: input.gameId,
          userId: ctx.session.user.id,
        },
      });

      if (!participant) {
        throw new Error("You are not a participant in this game");
      }

      await ctx.db.participant.delete({
        where: { id: participant.id },
      });

      return { success: true };
    }),

  // Get all bingo games (public for viewing, but with different data based on auth)
  getAll: publicProcedure.query(async ({ ctx }) => {
    const games = await ctx.db.bingoGame.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        participants: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
            items: true,
          },
        },
      },
      orderBy: {
        startAt: "desc",
      },
    });

    return games.map((game) => ({
      ...game,
      playerCount: game._count.participants,
      itemCount: game._count.items,
    }));
  }),

  // Get games for admin management (includes all data)
  getForAdmin: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user is admin or the game creator
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
        select: { role: true },
      });

      if (!user || (user.role !== "ADMIN" && input.userId !== ctx.session.user.id)) {
        throw new Error("Unauthorized");
      }

      const games = await ctx.db.bingoGame.findMany({
        where: user.role === "ADMIN" ? {} : { createdById: input.userId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                },
              },
            },
          },
          items: true,
          _count: {
            select: {
              participants: true,
              items: true,
              cards: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return games.map((game) => ({
        ...game,
        playerCount: game._count.participants,
        itemCount: game._count.items,
        cardCount: game._count.cards,
      }));
    }),



  // Create new bingo game
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Game name is required"),
        description: z.string().optional(),
        isPublic: z.boolean().default(true),
        startAt: z.date(),
        endAt: z.date(),
        items: z.array(
          z.object({
            label: z.string().min(1, "Item label is required"),
            imageUrl: z.string().optional(),
          })
        ).max(24, "Maximum 24 items allowed per game").optional(),
        centerSquare: z.object({
          label: z.string().min(1),
          imageUrl: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log('Creating game with input:', input);
      console.log('Items received:', input.items);
      
      // Validate dates
      if (input.startAt >= input.endAt) {
        throw new Error("End time must be after start time");
      }

      if (input.startAt < new Date()) {
        throw new Error("Start time cannot be in the past");
      }

      const game = await ctx.db.bingoGame.create({
        data: {
          name: input.name,
          description: input.description,
          isPublic: input.isPublic,
          startAt: input.startAt,
          endAt: input.endAt,
          createdById: ctx.session.user.id,
          items: input.items
            ? {
                create: input.items.map((item) => ({
                  label: item.label,
                  imageUrl: item.imageUrl,
                })),
              }
            : undefined,
          centerSquare: input.centerSquare
            ? {
                create: {
                  label: input.centerSquare.label,
                  imageUrl: input.centerSquare.imageUrl,
                },
              }
            : undefined,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              participants: true,
              items: true,
            },
          },
        },
      });

      return {
        ...game,
        playerCount: game._count.participants,
        itemCount: game._count.items,
      };
    }),

  // Update bingo game
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        startAt: z.date().optional(),
        endAt: z.date().optional(),
        centerSquare: z.object({
          label: z.string().min(1),
          imageUrl: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, centerSquare, ...updateData } = input;

      // Check if user can update this game
      const game = await ctx.db.bingoGame.findUnique({
        where: { id },
        select: { createdById: true },
      });

      if (!game) {
        throw new Error("Game not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN" && game.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized to update this game");
      }

      // Validate dates if provided
      if (updateData.startAt && updateData.endAt && updateData.startAt >= updateData.endAt) {
        throw new Error("End time must be after start time");
      }

      // Handle center square update - it's a JSON field, not a relation
      const centerSquareJson = centerSquare
        ? {
            label: centerSquare.label,
            imageUrl: centerSquare.imageUrl,
          }
        : null;

      const updatedGame = await ctx.db.bingoGame.update({
        where: { id },
        data: {
          ...updateData,
          centerSquare: centerSquareJson,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          _count: {
            select: {
              participants: true,
              items: true,
            },
          },
        },
      });

      return {
        ...updatedGame,
        playerCount: updatedGame._count.participants,
        itemCount: updatedGame._count.items,
      };
    }),

  // Delete bingo game
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user can delete this game
      const game = await ctx.db.bingoGame.findUnique({
        where: { id: input.id },
        select: { createdById: true },
      });

      if (!game) {
        throw new Error("Game not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN" && game.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized to delete this game");
      }

      await ctx.db.bingoGame.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Add items to game
  addItems: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        items: z.array(
          z.object({
            label: z.string().min(1),
            imageUrl: z.string().optional(),
          })
        ).max(24, "Maximum 24 items allowed per game"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user can modify this game
      const game = await ctx.db.bingoGame.findUnique({
        where: { id: input.gameId },
        select: { createdById: true },
      });

      if (!game) {
        throw new Error("Game not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN" && game.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized to modify this game");
      }

      const createdItems = await ctx.db.gameItem.createMany({
        data: input.items.map((item) => ({
          gameId: input.gameId,
          label: item.label,
          imageUrl: item.imageUrl,
        })),
      });

      return createdItems;
    }),

  // Remove item from game
  removeItem: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if user can modify this game
      const item = await ctx.db.gameItem.findUnique({
        where: { id: input.itemId },
        include: {
          game: {
            select: { createdById: true },
          },
        },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN" && item.game.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized to modify this game");
      }

      await ctx.db.gameItem.delete({
        where: { id: input.itemId },
      });

      return { success: true };
    }),

  // Update a single game item
  updateItem: protectedProcedure
    .input(
      z.object({
        itemId: z.string(),
        label: z.string().min(1),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.gameItem.findUnique({
        where: { id: input.itemId },
        include: { game: { select: { createdById: true } } },
      });

      if (!item) {
        throw new Error("Item not found");
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN" && item.game.createdById !== ctx.session.user.id) {
        throw new Error("Unauthorized to modify this game");
      }

      const updated = await ctx.db.gameItem.update({
        where: { id: input.itemId },
        data: { label: input.label, imageUrl: input.imageUrl },
      });

      return updated;
    }),

  // Bulk delete items by IDs
  deleteItemsBulk: protectedProcedure
    .input(z.object({ itemIds: z.array(z.string()).min(1) }))
    .mutation(async ({ ctx, input }) => {
      // Fetch items to verify authorization
      const items = await ctx.db.gameItem.findMany({
        where: { id: { in: input.itemIds } },
        include: { game: { select: { createdById: true } } },
      });

      if (items.length === 0) {
        return { deletedCount: 0 };
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      const unauthorized = items.some(
        (it) => user?.role !== "ADMIN" && it.game.createdById !== ctx.session.user.id
      );
      if (unauthorized) {
        throw new Error("Unauthorized to delete one or more items");
      }

      const result = await ctx.db.gameItem.deleteMany({
        where: { id: { in: input.itemIds } },
      });

      return { deletedCount: result.count };
    }),

  // Mark a square as dabbed
  markSquare: protectedProcedure
    .input(
      z.object({
        gameId: z.string(),
        row: z.number().min(0).max(4),
        col: z.number().min(0).max(4),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the participant
      const participant = await ctx.db.participant.findFirst({
        where: {
          gameId: input.gameId,
          userId: ctx.session.user.id,
        },
      });

      if (!participant) {
        throw new Error("You are not a participant in this game");
      }

      // Get the current card layout
      const cardLayout = participant.cardLayout as string[][];
      
      // Create a new card layout with the toggled square
      const newCardLayout = cardLayout.map((row, rowIndex) => 
        row.map((cell, colIndex) => {
          if (rowIndex === input.row && colIndex === input.col) {
            // Toggle: if marked, unmark; if unmarked, mark
            return cell.startsWith('✓') ? cell.substring(1) : `✓${cell}`;
          }
          return cell;
        })
      );

      // Update the participant's card layout
      await ctx.db.participant.update({
        where: { id: participant.id },
        data: { cardLayout: newCardLayout },
      });

      return { success: true };
    }),

  // Get winners for a game
  getWinners: publicProcedure
    .input(z.object({ gameId: z.string() }))
    .query(async ({ ctx, input }) => {
      const winners = await ctx.db.winner.findMany({
        where: { gameId: input.gameId },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
        orderBy: { place: "asc" },
      });
      return winners;
    }),

  // Claim bingo (verifies and records placing)
  claimBingo: protectedProcedure
    .input(z.object({ gameId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Find participant
      const participant = await ctx.db.participant.findFirst({
        where: { gameId: input.gameId, userId: ctx.session.user.id },
      });
      if (!participant) {
        throw new Error("You are not a participant in this game");
      }

      const layout = participant.cardLayout as string[][];
      if (!Array.isArray(layout) || layout.length !== 5 || layout[0]?.length !== 5) {
        throw new Error("Invalid card layout");
      }

      // Helper: a cell is marked if it starts with ✓ or is the center
      const isCellMarked = (r: number, c: number) => {
        if (r === 2 && c === 2) return true;
        const value = layout[r]?.[c] ?? "";
        return typeof value === "string" && value.startsWith("✓");
      };

      // Check rows
      const rowBingo = () => {
        for (let r = 0; r < 5; r++) {
          let all = true;
          for (let c = 0; c < 5; c++) { if (!isCellMarked(r, c)) { all = false; break; } }
          if (all) return true;
        }
        return false;
      };
      // Check cols
      const colBingo = () => {
        for (let c = 0; c < 5; c++) {
          let all = true;
          for (let r = 0; r < 5; r++) { if (!isCellMarked(r, c)) { all = false; break; } }
          if (all) return true;
        }
        return false;
      };
      // Check diagonals
      const diagBingo = () => {
        const d1 = [0,1,2,3,4].every(i => isCellMarked(i, i));
        const d2 = [0,1,2,3,4].every(i => isCellMarked(i, 4 - i));
        return d1 || d2;
      };

      const isBingo = rowBingo() || colBingo() || diagBingo();
      if (!isBingo) {
        throw new Error("Bingo not detected on your card");
      }

      // Prevent duplicate claims by same user
      const existing = await ctx.db.winner.findFirst({
        where: { gameId: input.gameId, userId: ctx.session.user.id },
      });
      if (existing) {
        return existing;
      }

      // Determine next place
      const count = await ctx.db.winner.count({ where: { gameId: input.gameId } });
      const place = count + 1;

      const winner = await ctx.db.winner.create({
        data: {
          gameId: input.gameId,
          userId: ctx.session.user.id,
          place,
        },
        include: { user: { select: { id: true, name: true, image: true } } },
      });

      return winner;
    }),

  // Regenerate a participant's card (admin only)
  regenerateCard: protectedProcedure
    .input(z.object({ 
      gameId: z.string(),
      participantId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { role: true },
      });

      if (user?.role !== "ADMIN") {
        throw new Error("Admin access required");
      }

      // Get the game and participant
      const game = await ctx.db.bingoGame.findUnique({
        where: { id: input.gameId },
        include: { items: true },
      });

      if (!game) {
        throw new Error("Game not found");
      }

      const participant = await ctx.db.participant.findUnique({
        where: { id: input.participantId },
      });

      if (!participant || participant.gameId !== input.gameId) {
        throw new Error("Participant not found in this game");
      }

      // Generate new random card layout (same logic as join game)
      const items = game.items.map(item => item.label);
      
      const neededItems = 24; // 5x5 minus center square
      let shuffledItems: string[] = [];
      
      if (items.length === 0) {
        shuffledItems = Array(neededItems).fill("No items available") as string[];
      } else if (items.length < neededItems) {
        const repetitions = Math.ceil(neededItems / items.length);
        shuffledItems = Array(repetitions).fill(items).flat().sort(() => Math.random() - 0.5) as string[];
      } else {
        shuffledItems = [...items].sort(() => Math.random() - 0.5);
      }
      
      // Create new 5x5 grid with center square
      const newCardLayout: string[][] = [];
      let itemIndex = 0;
      
      for (let row = 0; row < 5; row++) {
        const cardRow: string[] = [];
        for (let col = 0; col < 5; col++) {
          if (row === 2 && col === 2) {
            // Center square - will be handled by centerSquareItem
            cardRow.push("");
          } else {
            cardRow.push(shuffledItems[itemIndex] ?? "Empty");
            itemIndex++;
          }
        }
        newCardLayout.push(cardRow);
      }

      // Check if participant has already claimed bingo (winner status)
      const existingWinner = await ctx.db.winner.findFirst({
        where: {
          gameId: input.gameId,
          userId: participant.userId,
        },
      });

      // Update the participant's card layout
      await ctx.db.participant.update({
        where: { id: input.participantId },
        data: { cardLayout: newCardLayout },
      });

      // Remove winner status if they had one (new card = no bingo = no place)
      if (existingWinner) {
        await ctx.db.winner.delete({
          where: { id: existingWinner.id },
        });
      }

      return { 
        success: true, 
        newCardLayout,
        hadWinnerStatus: !!existingWinner,
        removedWinnerPlace: existingWinner?.place ?? null
      };
    }),
});
