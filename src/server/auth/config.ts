import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { db } from "~/server/db";
import { env } from "~/env.js";
import { type JWT } from "next-auth/jwt";
import { type Session } from "next-auth";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      isBlocked: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: "USER" | "ADMIN";
    isBlocked: boolean;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET ? [
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
      })
    ] : []),
    ...(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET ? [
      GitHub({
        clientId: env.AUTH_GITHUB_ID,
        clientSecret: env.AUTH_GITHUB_SECRET,
      })
    ] : []),
    ...(env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET ? [
      DiscordProvider({
        clientId: env.AUTH_DISCORD_ID,
        clientSecret: env.AUTH_DISCORD_SECRET,
        allowDangerousEmailAccountLinking: true,
      })
    ] : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user?.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        if (user.isBlocked) {
          return null;
        }

        const authUser: { id: string; email?: string | null; name?: string | null; image?: string | null; role: "USER" | "ADMIN"; isBlocked: boolean } = {
          id: user.id,
          email: user.email ?? null,
          name: user.name ?? null,
          image: user.image ?? null,
          role: user.role,
          isBlocked: user.isBlocked,
        };

        return authUser;
      }
    }),
  ],
  callbacks: {
    signIn: async ({ user, account, profile: _profile }) => {
      // Only create users for OAuth providers, not credentials
      if (user.email && account?.provider && account.provider !== "credentials") {
        try {
          const existingUser = await db.user.findUnique({
            where: { email: user.email }
          });
          
          if (!existingUser) {
            // Create new user with ObjectId for OAuth providers
            await db.user.create({
              data: {
                email: user.email,
                name: user.name,
                image: user.image,
                role: "USER",
                isBlocked: false,
              }
            });
          }
        } catch (error) {
          console.error("Error creating user:", error);
          // Don't block sign-in if user creation fails
        }
      }
      return true;
    },
    session: async ({ session, token }: { session: Session; token: JWT }) => {
      // Extract custom props from JWT in a type-safe way
      const tokenExtras = token as unknown as {
        id?: string;
        role?: "USER" | "ADMIN";
        isBlocked?: boolean;
        picture?: string;
      };

      let role = tokenExtras.role;
      let isBlocked = tokenExtras.isBlocked;

      // Best-effort: refresh role/isBlocked from DB (use email to avoid id format differences)
      let dbUserId: string | undefined;
      try {
        const email = token.email ?? session.user?.email ?? undefined;
        console.log("Session callback - email:", email, "token.id:", tokenExtras.id);
        if (email) {
          const user = await db.user.findUnique({
            where: { email },
            select: { id: true, role: true, isBlocked: true },
          });
          console.log("Session callback - found user:", user);
          if (user) {
            dbUserId = user.id;
            role = user.role;
            isBlocked = user.isBlocked;
          }
        }
      } catch (error) {
        console.error("Error fetching user in session callback:", error);
      }

      const nextSession: Session = {
        ...session,
        user: {
          ...session.user,
          id: dbUserId ?? tokenExtras.id ?? session.user.id,
          name: token.name ?? session.user.name,
          email: token.email ?? session.user.email,
          image: tokenExtras.picture ?? session.user.image,
          role: (role ?? "USER"),
          isBlocked: Boolean(isBlocked),
        },
      };

      return nextSession;
    },
    // Extend jwt callback to update token when session is updated client-side
    jwt: (params) => {
      const { token, user, trigger, session } = params as { token: JWT; user?: { id?: string; name?: string | null; email?: string | null; image?: string | null; role?: "USER" | "ADMIN"; isBlocked?: boolean }; trigger?: "update"; session?: Session };
      // On sign-in, persist core fields on the token
      if (user) {
        if (user.id) (token as unknown as Record<string, unknown>).id = user.id;
        if (typeof user.name !== "undefined") token.name = user.name ?? undefined;
        if (typeof user.email !== "undefined") token.email = user.email ?? undefined;
        if (typeof user.image !== "undefined") (token as unknown as Record<string, unknown>).picture = user.image ?? undefined;
        if (typeof user.role !== "undefined") (token as unknown as Record<string, unknown>).role = user.role;
        if (typeof user.isBlocked !== "undefined") (token as unknown as Record<string, unknown>).isBlocked = user.isBlocked;
      }

      // When client calls `update({ ... })`, sync changed fields into the token
      if (trigger === "update" && session?.user) {
        if (typeof session.user.name !== "undefined") token.name = session.user.name ?? undefined;
        if (typeof session.user.email !== "undefined") token.email = session.user.email ?? undefined;
        if (typeof session.user.image !== "undefined") (token as unknown as Record<string, unknown>).picture = session.user.image ?? undefined;
      }

      return token;
    },
  },
} satisfies NextAuthConfig;
