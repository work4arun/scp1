import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { SystemRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      systemRole: SystemRole;
    } & DefaultSession["user"];
  }
}

// Removed next-auth/jwt module augmentation as it causes build errors in v5.

// Fail loudly at startup if AUTH_SECRET is missing — much friendlier than the
// generic "Server configuration" message at login time.
if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  console.error(
    "\n[auth] AUTH_SECRET is not set. Add it to .env (generate with: openssl rand -base64 32)\n"
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const email = (credentials?.email as string)?.toLowerCase().trim();
          const password = credentials?.password as string;
          if (!email || !password) return null;

          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (!user || !user.active) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            systemRole: user.systemRole,
          };
        } catch (err) {
          // Surface DB / Prisma errors clearly in the server logs so we don't
          // get a silent "Server configuration" message in the browser.
          console.error("[auth] authorize() failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const t = token as any;
      if (user) {
        t.id = (user as { id: string }).id;
        t.systemRole = (user as { systemRole: SystemRole }).systemRole;
      }
      return t;
    },
    async session({ session, token }) {
      const t = token as any;
      if (session.user) {
        session.user.id = t.id;
        session.user.systemRole = t.systemRole;
      }
      return session;
    },
  },
});
