import { z } from "zod";

/** Single source of truth for email validation. */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .regex(EMAIL_REGEX, { message: "Please enter a valid email." });

const strongPassword = z
  .string()
  .trim()
  .min(8, { message: "Be at least 8 characters long" })
  .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
  .regex(/[0-9]/, { message: "Contain at least one number." })
  .regex(/[^a-zA-Z0-9]/, {
    message: "Contain at least one special character.",
  });

export const SignupFormSchema = z.object({
  /* ── Step 1 — Account ───────────────────────────────── */
  email: emailField,
  password: strongPassword,

  /* ── Step 2 — Profile ───────────────────────────────── */
  fullName: z
    .string()
    .trim()
    .min(3, { message: "Name is too short." })
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Please enter both your first and last name.",
    }),
  phoneCountryCode: z.string().trim().optional().nullable(),
  phoneNumber: z.string().trim().optional().nullable(),

  /* ── Step 3 — Service notification channels ─────────── */
  notifyEmail: z.boolean().default(true),
  notifyPush: z.boolean().default(true),
  notifySms: z.boolean().default(false),
  notifyWhatsapp: z.boolean().default(false),

  /* ── Step 3 — Marketing (single, explicit opt-in) ───── */
  marketingEmail: z.boolean().default(false),
});

export type SignupInput = z.infer<typeof SignupFormSchema>;

/**
 * Sign-in only checks presence — password *strength* is a signup concern.
 * Re-validating strength here would reject legacy users and leak policy hints.
 */
export const SigninFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "Password is required." }),
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
      errors?: {
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
