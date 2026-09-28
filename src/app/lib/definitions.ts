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
  name: z
    .string()
    .trim()
    .min(3, { message: "Name is too short." })
    .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, {
      message: "Please enter both your first and last name.",
    }),
  email: emailField,
  password: strongPassword,
});

export type SignupInput = z.infer<typeof SignupFormSchema>;

/**
 * Sign-in only checks presence — password *strength* is a signup concern.
 */
export const SigninFormSchema = z.object({
  email: emailField,
  password: z.string().min(1, { message: "Password is required." }),
});

export type FormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        password?: string[];
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
