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

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema,
});

export type ProfileInput = z.infer<typeof profileSchema>;

/**
 * A UPI ID (VPA), as `name@handle`.
 *
 * Format only. Nothing here proves the address exists, is active or belongs to
 * the person typing it — that needs a PSP ValidateAddress call, which we have no
 * provider for. The admin sees the ID before transferring and that human check
 * is the real one; this just catches typos before they reach the panel.
 *
 * Deliberately permissive on the handle. NPCI approves new PSP handles
 * regularly, so an allow-list of known ones would reject valid new IDs as they
 * appear — a false rejection here means a user cannot get paid, which is worse
 * than letting an odd-looking handle through to the admin's eye.
 *
 * Digits are allowed in the handle (`@axl`, `@yesbank`) — the widely copied
 * regex that excludes them rejects real IDs.
 */
const UPI_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}@[a-zA-Z][a-zA-Z0-9]{1,29}$/;

/**
 * Lowercases and strips whitespace.
 *
 * Both matter: UPI handles are case-insensitive and always issued lowercase, and
 * copying an ID out of a chat app reliably brings spaces with it — including the
 * kind that sit invisibly around the `@`.
 */
export function normaliseUpiId(input: string): string {
  return input.replace(/\s+/g, "").toLowerCase();
}

export const upiIdSchema = z
  .string()
  .trim()
  .min(1, "Enter your UPI ID")
  .transform(normaliseUpiId)
  .refine(
    (v) => UPI_RE.test(v),
    "That doesn't look like a UPI ID. It should read like name@bank.",
  );

/**
 * A redemption request, in either shape.
 *
 * Discriminated on `method` so a UPI request cannot be filed without a
 * destination and a gift card request cannot smuggle one in. The amount is only
 * shape-checked here — that it names a denomination we stock, or falls inside
 * the UPI limits, is decided by the server action, because that is the number
 * which determines how many coins get debited.
 */
export const redemptionSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("gift_card"),
    brandId: z.string().trim().min(1, "Pick a gift card"),
    amountCoins: z.coerce.number().int().min(1, "Pick an amount"),
  }),
  z.object({
    method: z.literal("upi"),
    upiId: upiIdSchema,
    amountCoins: z.coerce.number().int().min(1, "Enter an amount"),
  }),
]);

/** The code an admin pastes in when issuing a card. */
export const issueCardSchema = z.object({
  cardCode: z.string().trim().min(4, "Paste the gift card code").max(120),
  cardPin: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
});

/**
 * The reference an admin pastes back after making a UPI transfer.
 *
 * The UPI counterpart of issueCardSchema — it is the user's proof the payment
 * happened, so it is required rather than optional.
 */
export const settleUpiSchema = z.object({
  payoutRef: z
    .string()
    .trim()
    .min(4, "Paste the UPI reference or transaction ID")
    .max(120),
  note: z.string().trim().max(500).optional(),
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
    coins: z.coerce
      .number()
      .int()
      .min(1, "A task must be worth at least 1 coin")
      .max(100000),
    category: z.string().trim().max(60).optional(),
    coverImageUrl: z.union([z.string().trim().url(), z.literal("")]).optional(),
    /* Rendered as a link every user is invited to click, so the protocol is
       checked rather than just the shape — z.url() alone accepts
       "javascript:alert(1)" as a valid URL. */
    externalUrl: z
      .union([
        z
          .string()
          .trim()
          .url("Enter a full link, starting with https://")
          .refine(
            (v) => /^https?:$/.test(new URL(v).protocol),
            "The link must start with http:// or https://",
          ),
        z.literal(""),
      ])
      .optional(),
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

/**
 * A one-off message from the admin panel.
 *
 * Body is plain text, not HTML. Admin-authored copy is still interpolated into
 * an email template, and a stray angle bracket that silently breaks the layout
 * — or a pasted snippet that does something worse — is not a trade worth making
 * for rich text nobody asked for. Line breaks become paragraphs on the way out.
 */
export const adminMailSchema = z.object({
  subject: z.string().trim().min(3, "Give the email a subject").max(160),
  body: z.string().trim().min(10, "Write a message").max(5000),
  recipientIds: z
    .array(z.string().uuid())
    .min(1, "Pick at least one recipient")
    /* Bounded because it arrives as a list from the client. The picker offers
       every mailable user, so this only has to stay ahead of the user table. */
    .max(10000, "Too many recipients in one send"),
});

export type AdminMailInput = z.infer<typeof adminMailSchema>;
