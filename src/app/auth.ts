// auth.ts
import { connection } from "@/utils/connection";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import client from "./lib/db";
import NextAuth, { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import User from "@/models/User";

const providers: Provider[] = [
  Credentials({
    credentials: {
      email: { label: "email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      try {
        await connection();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials");
        }

        const user = await User.findOne({ email: credentials.email });

        if (!user || !(await user.matchPassword(credentials.password))) {
          throw new Error("Invalid credentials");
        }

        // Uncomment if you enforce email verification
        // if (!user.isVerified) {
        //   throw new Error(
        //     "Your email address is unverified. Please check your inbox for the activation link.",
        //   );
        // }

        return {
          id: user._id.toString(),
          name: user.fullName || user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        };
      } catch (error) {
        console.error("Authorization error:", error);
        return null;
      }
    },
  }),
  Google({
    clientId: process.env.AUTH_GOOGLE_ID!,
    clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    async profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
        role: "user", // Default role for OAuth users
      };
    },
  }),
  GitHub({
    clientId: process.env.AUTH_GITHUB_ID!,
    clientSecret: process.env.AUTH_GITHUB_SECRET!,
    async profile(profile) {
      return {
        id: profile.id.toString(),
        name: profile.name || profile.login,
        email: profile.email,
        image: profile.avatar_url,
        role: "user", // Default role for OAuth users
      };
    },
  }),
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
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/auth/sign_up",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-admin.session-token"
          : "admin.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-admin.callback-url"
          : "admin.callback-url",
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Host-admin.csrf-token"
          : "admin.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }: any) {
      // Add user info to token on sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Safely update token with session data (whitelist fields only)
      if (trigger === "update" && session) {
        token.name = session.user?.name ?? token.name;
        token.image = session.user?.image ?? token.image;
        // Do NOT copy role or id from session
      }

      return token;
    },
    async session({ session, token }: any) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
} satisfies NextAuthConfig);
