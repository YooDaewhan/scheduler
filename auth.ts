import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcryptjs from "bcryptjs";
import getDb from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const db = getDb();
        const user = db
          .prepare("SELECT * FROM users WHERE username = ?")
          .get(credentials.username as string) as any;

        if (!user) return null;

        const valid = bcryptjs.compareSync(
          credentials.password as string,
          user.password
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          name: user.display_name || user.username,
          email: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = user.email;
        token.displayName = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = Number(token.id);
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        (session.user as any).displayName = token.displayName;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
