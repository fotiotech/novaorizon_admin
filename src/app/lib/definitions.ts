import { z } from "zod";

export const SignupFormSchema = z.object({
  /* Step 1 — Account */
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Be at least 8 characters long" })
    .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
    .regex(/[0-9]/, { message: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Contain at least one special character.",
    })
    .trim(),

  /* Step 2 — Profile */
  fullName: z
    .string()
    .trim()
    .min(3, { message: "Name is too short." })
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Please enter both your first and last name.",
    }),
  phoneCountryCode: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),

  /* Step 3 — Notification toggles (language/currency/theme moved to profile) */
  notifyEmail: z.boolean().default(true),
  notifySms: z.boolean().default(false),
  notifyPush: z.boolean().default(true),
  notifyWhatsapp: z.boolean().default(false),
  marketingEmail: z.boolean().default(false),
  orderUpdates: z.boolean().default(true),
  newsletter: z.boolean().default(false),
});

export const SigninFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Be at least 8 characters long" })
    .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
    .regex(/[0-9]/, { message: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Contain at least one special character.",
    })
    .trim(),
});

export type FormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        fullName?: string[];
        phoneNumber?: string[];
        phoneCountryCode?: string[];
      };
      message?: string;
      error?: string;
    }
  | undefined;

export type LoginFormState =
  | {
      errors: {
        email?: string[];
        password?: string[];
        role?: string[];
      };
      message?: string;
    }
  | undefined;

export type SessionPayload = {
  sessionId: string;
  expiresAt: Date;
};
