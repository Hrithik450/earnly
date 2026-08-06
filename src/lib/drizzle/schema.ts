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
       payout destination, not an identity, and nothing authenticates against it. */
    phone: varchar("phone", { length: 20 }),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),

    /* Denormalized cache of points_ledger. Written in the same transaction as the
       ledger row it summarises; points_ledger stays the source of truth. */
    pointsBalance: integer("points_balance").notNull().default(0),

    upiId: text("upi_id"),
    paytmNumber: varchar("paytm_number", { length: 20 }),

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
    /* Two accounts sharing a payout number is how one person collects the same
       reward twice. The signup action checks this first to return a friendly
       message, but that check is a SELECT before an INSERT — two concurrent
       signups pass it and only this constraint stops the second. NULL is not
       unique in Postgres, so profiles without a number are unaffected. */
    unique("uniq_profile_phone").on(table.phone),

    /* A balance below zero would mean we paid out points that were never
       earned. Every debit re-checks the balance in application code; this is the
       backstop for a bug that gets past it, and it fails the transaction rather
       than quietly recording a negative. */
    check("balance_non_negative", sql`${table.pointsBalance} >= 0`),
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
    points: integer("points").notNull().default(0),
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
    /* Snapshot of tasks.points at claim time — see the note on tasks.points. */
    pointsAwarded: integer("points_awarded").notNull(),
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
 * Append-only audit trail of every point movement, and the authoritative
 * balance: profiles.points_balance is a cache that must always equal
 * SUM(delta) for the user. Nothing in the app updates a row here.
 */
export const pointsLedger = pgTable(
  "points_ledger",
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
      "submission" | "withdrawal" | "adjustment"
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

export const withdrawals = pgTable(
  "withdrawals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /* 1 point = ₹1, so this doubles as the rupee amount. */
    amountPoints: integer("amount_points").notNull(),
    method: varchar("method", { length: 10 })
      .notNull()
      .$type<"upi" | "paytm">(),
    /* Copied from the profile at request time. The user may edit their UPI ID
       afterwards, and the admin must pay the destination that was actually
       requested rather than whatever is current when they open the queue. */
    destination: text("destination").notNull(),
    status: varchar("status", { length: 20 })
      .notNull()
      .$type<"pending" | "paid" | "rejected">()
      .default("pending"),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_withdrawals_user").on(table.userId),
    index("idx_withdrawals_status").on(table.status),
    index("idx_withdrawals_created").on(table.createdAt),
  ],
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  submissions: many(submissions),
  ledger: many(pointsLedger),
  withdrawals: many(withdrawals),
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

export const pointsLedgerRelations = relations(pointsLedger, ({ one }) => ({
  user: one(profiles, {
    fields: [pointsLedger.userId],
    references: [profiles.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(profiles, {
    fields: [withdrawals.userId],
    references: [profiles.id],
  }),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type LedgerEntry = typeof pointsLedger.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;
