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
 * A request to convert coins into a gift card.
 *
 * Earnly never sends money. An admin buys the voucher from the brand and pastes
 * the code into `cardCode`, which is the entire fulfilment step — there is no
 * payment integration and no float to reconcile.
 */
export const redemptions = pgTable(
  "redemptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /* GiftCardBrand.id from src/lib/gift-cards.ts. Not a foreign key: the
       catalogue is code, and a retired brand must not erase the history of cards
       already issued under it. */
    brandId: varchar("brand_id", { length: 40 }).notNull(),
    /* Denormalised so a row still reads correctly after the brand is renamed or
       dropped from the catalogue. */
    brandName: text("brand_name").notNull(),
    /* 1 coin = ₹1 of face value, so this is both the cost and the card's worth. */
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
