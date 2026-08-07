import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * One field in a task's submission form, as configured by an admin in the form
 * builder. Stored as JSONB on the task rather than as rows in a field table:
 * the schema is only ever read and written as a whole, and keeping it inline
 * means a submission can be rendered against the exact shape that was live when
 * it was made, even after the task is later edited.
 */
export type TaskFormField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "url" | "select" | "image";
  required: boolean;
  placeholder?: string;
  /** Only meaningful when type is "select". */
  options?: string[];
};

/**
 * Mirrors auth.users, which lives in a schema Drizzle does not manage. Rows are
 * created by the handle_new_user trigger (see migrations/0001_auth_trigger.sql)
 * so a profile always exists by the time the user first reaches the app.
 */
export const profiles = pgTable(
  "profiles",
  {
    /* Not defaultRandom(): this must equal auth.users.id, and the trigger supplies
       it. Generating one here would silently orphan the profile. */
    id: uuid("id").primaryKey(),
    email: text("email").notNull(),
    /* Collected at signup and never verified — we run no SMS provider. It is a
       contact detail, not an identity, and nothing authenticates against it. */
    phone: varchar("phone", { length: 20 }),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),

    /* Denormalized cache of coins_ledger. Written in the same transaction as the
       ledger row it summarises; coins_ledger stays the source of truth. */
    coinsBalance: integer("coins_balance").notNull().default(0),

    isAdmin: boolean("is_admin").notNull().default(false),
    isBlocked: boolean("is_blocked").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    /* Two accounts sharing a mobile number is how one person collects the same
       reward twice. The signup action checks this first to return a friendly
       message, but that check is a SELECT before an INSERT — two concurrent
       signups pass it and only this constraint stops the second. NULL is not
       unique in Postgres, so profiles without a number are unaffected. */
    unique("uniq_profile_phone").on(table.phone),

    /* A balance below zero would mean we issued a gift card that was never
       earned. Every debit re-checks the balance in application code; this is the
       backstop for a bug that gets past it, and it fails the transaction rather
       than quietly recording a negative. */
    check("balance_non_negative", sql`${table.coinsBalance} >= 0`),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    instructions: text("instructions"),
    /* The authoritative reward. Submissions copy this value at claim time so
       that editing a task never rewrites the history of what was already paid. */
    coins: integer("coins").notNull().default(0),
    category: varchar("category", { length: 60 }),
    coverImageUrl: text("cover_image_url"),
    /* Where the task is actually done — usually someone else's site. Null for a
       task completed entirely in our own form. */
    externalUrl: text("external_url"),
    formSchema: jsonb("form_schema").$type<TaskFormField[]>().notNull().default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_tasks_active").on(table.isActive),
    index("idx_tasks_created").on(table.createdAt),
  ],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /* The user's answers, keyed by TaskFormField.id. */
    data: jsonb("data").$type<Record<string, string>>().notNull(),
    /* Snapshot of tasks.coins at claim time — see the note on tasks.coins. */
    coinsAwarded: integer("coins_awarded").notNull(),
    status: varchar("status", { length: 20 })
      .notNull()
      .$type<"approved" | "rejected">()
      .default("approved"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    /* One submission per user per task, and the real defence against
       double-claiming: two concurrent submissions race past any
       SELECT-then-INSERT check in application code, but the second one fails
       here at the database. */
    unique("uniq_submission_task_user").on(table.taskId, table.userId),
    index("idx_submissions_user").on(table.userId),
    index("idx_submissions_created").on(table.createdAt),
  ],
);

/**
 * Append-only audit trail of every coin movement, and the authoritative
 * balance: profiles.coins_balance is a cache that must always equal
 * SUM(delta) for the user. Nothing in the app updates a row here.
 */
export const coinsLedger = pgTable(
  "coins_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /* Positive credits, negative debits. */
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    /* Loose polymorphic pointer at whatever caused the movement. Deliberately
       not a foreign key: the referenced row may be deleted, and the ledger must
       outlive it. */
    refType: varchar("ref_type", { length: 20 }).$type<
      "submission" | "redemption" | "adjustment"
    >(),
    refId: uuid("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_ledger_user").on(table.userId),
    index("idx_ledger_created").on(table.createdAt),
  ],
);

/**
 * What users may currently redeem into.
 *
 * Two kinds of row share this table. A method row is a bare PayoutMethod —
 * "gift_card" or "upi". A brand row is "gift_card:<brand id>" and switches a
 * single card off without closing gift cards as a whole. Both answer the same
 * question at the same moment, so they live together rather than in two tables
 * the redeem page would have to join by hand.
 *
 * A table rather than an env var because closing a method has to take effect on
 * the next request, and a redeploy is too slow a lever for that.
 */
export const payoutMethods = pgTable("payout_methods", {
  /* "gift_card", "upi", or "gift_card:<brand id>". */
  id: varchar("id", { length: 64 }).primaryKey(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Platform-wide switches. Exactly one row, id = 1.
 *
 * A single row rather than a key/value table because every field is read
 * together on every request — the maintenance gate needs the mode, the message
 * and the auto-limit config in one query, and a key/value shape would make that
 * five round trips or a pivot.
 *
 * Not env vars: turning maintenance on has to take effect on the next request,
 * and a redeploy is far too slow a lever when something is actively going wrong.
 */
export const platformSettings = pgTable(
  "platform_settings",
  {
    id: integer("id").primaryKey(),
    /* The manual switch. Also what the auto-limit flips, so the two are never
       out of sync — there is only ever one answer to "are we in maintenance". */
    maintenanceMode: boolean("maintenance_mode").notNull().default(false),
    /* Optional admin note shown to users. Null falls back to standard copy. */
    maintenanceMessage: text("maintenance_message"),
    autoLimitEnabled: boolean("auto_limit_enabled").notNull().default(false),
    autoSubmissionLimit: integer("auto_submission_limit")
      .notNull()
      .default(1000),
    /* Submissions are counted from this moment, not from the beginning of time.
       Lifting maintenance moves it to now() — otherwise the count would still
       exceed the limit and the platform would trip straight back in. */
    countingSince: timestamp("counting_since", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [check("platform_settings_singleton", sql`${table.id} = 1`)],
);

/**
 * A request to convert coins into a reward.
 *
 * Two shapes share this table, distinguished by `method`. A gift card is
 * fulfilled by pasting in a voucher code; a UPI request is fulfilled by making
 * the transfer by hand and pasting in its reference. Both debit coins at the
 * same moment — when the admin marks it issued, not when it is requested — so a
 * rejected request never needs a reversal.
 *
 * Nothing here talks to a payment API. The UPI transfer is a human action, which
 * keeps the admin review step that is our only real fraud check.
 */
export const redemptions = pgTable(
  "redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /* Which kind of payout. Defaulted to gift_card so rows written before UPI
       existed read correctly without a backfill guess. */
    method: varchar("method", { length: 20 })
      .notNull()
      .$type<"gift_card" | "upi">()
      .default("gift_card"),
    /* GiftCardBrand.id from src/lib/gift-cards.ts, or "upi" for a transfer. Not
       a foreign key: the catalogue is code, and a retired brand must not erase
       the history of cards already issued under it. */
    brandId: varchar("brand_id", { length: 40 }).notNull(),
    /* Denormalised so a row still reads correctly after the brand is renamed or
       dropped from the catalogue. */
    brandName: text("brand_name").notNull(),
    /* 1 coin = ₹1 of face value, so this is both the cost and the payout's worth. */
    amountCoins: integer("amount_coins").notNull(),
    status: varchar("status", { length: 20 })
      .notNull()
      .$type<"pending" | "issued" | "rejected">()
      .default("pending"),
    /* The voucher itself, written once when an admin issues the card. Readable
       by that user and by admins, and by nothing else — the RLS policy in
       supabase-setup.sql is what enforces that over the anon key. */
    cardCode: text("card_code"),
    cardPin: text("card_pin"),
    /* The destination for a UPI request, captured at request time. Stored on the
       row rather than the profile because it is the address this one payment was
       sent to: editing a profile later must not rewrite where past money went. */
    upiId: text("upi_id"),
    /* The bank/UPI reference the admin pastes back after transferring. The UPI
       counterpart of cardCode, and the user's proof the payment happened. */
    payoutRef: text("payout_ref"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_redemptions_user").on(table.userId),
    index("idx_redemptions_status").on(table.status),
    index("idx_redemptions_created").on(table.createdAt),

    /* A UPI request with no destination cannot be paid, and a crafted form post
       is the way one gets created. The server action checks this first; this is
       the backstop that keeps an unpayable row out of the table entirely. */
    check(
      "upi_needs_destination",
      sql`${table.method} <> 'upi' OR ${table.upiId} IS NOT NULL`,
    ),
  ],
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  submissions: many(submissions),
  ledger: many(coinsLedger),
  redemptions: many(redemptions),
}));

export const tasksRelations = relations(tasks, ({ many }) => ({
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  task: one(tasks, {
    fields: [submissions.taskId],
    references: [tasks.id],
  }),
  user: one(profiles, {
    fields: [submissions.userId],
    references: [profiles.id],
  }),
}));

export const coinsLedgerRelations = relations(coinsLedger, ({ one }) => ({
  user: one(profiles, {
    fields: [coinsLedger.userId],
    references: [profiles.id],
  }),
}));

export const redemptionsRelations = relations(redemptions, ({ one }) => ({
  user: one(profiles, {
    fields: [redemptions.userId],
    references: [profiles.id],
  }),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type LedgerEntry = typeof coinsLedger.$inferSelect;
export type Redemption = typeof redemptions.$inferSelect;
export type PayoutMethodRow = typeof payoutMethods.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
