import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import client from "./lib/db";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import { connection } from "@/utils/connection";
import User from "@/models/users";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(c) {
      await connection();

      const user = await User.findOne({ email: c.email });
      if (!user || !(await user.matchPassword(c.password))) {
        console.log("Wrong password");
        return null;
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      };
    },
  }),
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
    async profile(profile) {
      return { ...profile, role: profile.role ?? "user" };
    },
  }),
  GitHub,
];

export const providerMap = providers
  .map((provider) => {
    if (typeof provider === "function") {
      const providerData = provider();
      return { id: providerData.id, name: providerData.name };
    } else {
      return { id: provider.id, name: provider.name };
    }
  })
  .filter((provider) => provider.id !== "credentials");

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(client),
  providers,
  // pages: {
  //   signIn: "/auth/login",
  // },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        // User is available during sign-in
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.id = token.id as string;
      session.user.name = token.name;
      session.user.email = token.email as string;
      session.user.image = token.image as string;
      session.user.role = token?.role;
      return session;
    },
    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth
    },
  },
});
