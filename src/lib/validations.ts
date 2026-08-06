import { z } from "zod";

/**
 * Indian mobile number: 10 digits starting 6-9, optionally +91 prefixed.
 * Normalised to bare 10 digits by `normalisePhone` before storage so that a
 * number entered two different ways is still recognisably the same number.
 */
const PHONE_RE = /^(?:\+?91[\s-]?)?[6-9]\d{9}$/;

export function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => PHONE_RE.test(v), "Enter a valid 10-digit Indian mobile number")
  .transform(normalisePhone);

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your name").max(80),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: phoneSchema,
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72, "Too long")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/\d/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpInput = z.infer<typeof signUpSchema>;

/**
 * Login accepts either an email or a phone number in one field. Phone is not an
 * auth identity — there is no SMS provider — so a phone entry is resolved to the
 * account's email server-side before being handed to Supabase.
 */
export const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your email or phone number"),
  password: z.string().min(1, "Enter your password"),
});

export type SignInInput = z.infer<typeof signInSchema>;

/**
 * Digits in the emailed signup code.
 *
 * Must match Supabase's Authentication → Emails → OTP length setting. The UI and
 * this schema both read it so a change there cannot leave the input accepting a
 * different length than the validator — that mismatch silently breaks signup,
 * because the code arrives intact and is rejected before Supabase ever sees it.
 */
export const OTP_LENGTH = 8;

export const otpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  /* Trimmed because copying the code out of an email client tends to bring
     whitespace with it. The digits themselves are passed through untouched. */
  token: z
    .string()
    .trim()
    .regex(
      new RegExp(`^\\d{${OTP_LENGTH}}$`),
      `Enter the ${OTP_LENGTH}-digit code from your email`,
    ),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(72)
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/\d/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/** UPI IDs look like handle@psp. */
export const upiSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[\w.\-]{2,64}@[a-z]{2,32}$/, "Enter a valid UPI ID, e.g. name@okhdfcbank");

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema,
  upiId: z.union([upiSchema, z.literal("")]).optional(),
  paytmNumber: z.union([phoneSchema, z.literal("")]).optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Withdrawals are whole rupees, and 1 point = ₹1. */
export const MIN_WITHDRAWAL_POINTS = 100;

export const withdrawalSchema = z.object({
  amountPoints: z.coerce
    .number()
    .int("Enter a whole number of points")
    .min(
      MIN_WITHDRAWAL_POINTS,
      `Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS} points`,
    ),
  method: z.enum(["upi", "paytm"]),
});

export const taskFormFieldSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{1,40}$/, "Field keys may use lowercase letters, numbers and underscores"),
  label: z.string().trim().min(1, "Every field needs a label").max(120),
  type: z.enum(["text", "textarea", "number", "url", "select", "image"]),
  required: z.boolean(),
  placeholder: z.string().trim().max(120).optional(),
  options: z.array(z.string().trim().min(1)).optional(),
});

export const taskSchema = z
  .object({
    title: z.string().trim().min(3, "Give the task a title").max(140),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9-]{3,80}$/, "Use lowercase letters, numbers and hyphens"),
    description: z.string().trim().max(400).optional(),
    instructions: z.string().trim().max(4000).optional(),
    points: z.coerce
      .number()
      .int()
      .min(1, "A task must be worth at least 1 point")
      .max(100000),
    category: z.string().trim().max(60).optional(),
    coverImageUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
    isActive: z.boolean(),
    formSchema: z.array(taskFormFieldSchema),
  })
  .refine(
    (t) =>
      t.formSchema
        .filter((f) => f.type === "select")
        .every((f) => (f.options?.length ?? 0) >= 2),
    { message: "Dropdown fields need at least two options", path: ["formSchema"] },
  )
  .refine(
    (t) => new Set(t.formSchema.map((f) => f.id)).size === t.formSchema.length,
    { message: "Field keys must be unique", path: ["formSchema"] },
  );

export type TaskInput = z.infer<typeof taskSchema>;
