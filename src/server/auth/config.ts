import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";

import { db } from "~/server/db";
import { env } from "~/env.js";

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
  ],
  adapter: PrismaAdapter(db) as unknown as Adapter,
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role,
        isBlocked: user.isBlocked,
      },
    }),
  },
} satisfies NextAuthConfig;
