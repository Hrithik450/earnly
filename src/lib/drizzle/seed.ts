import { pool } from "../db";
import { db } from "../db";
import { tasks } from "./schema";
import type { TaskFormField } from "./schema";

/**
 * Seeds a handful of representative tasks so the app has something to show
 * before an admin has created anything. Idempotent by slug.
 */
const SEED: Array<{
  title: string;
  slug: string;
  description: string;
  instructions: string;
  coins: number;
  category: string;
  formSchema: TaskFormField[];
}> = [
  {
    title: "Follow us on Instagram",
    slug: "follow-instagram",
    description: "Follow our official page and send us your username.",
    instructions:
      "Open our Instagram profile, tap Follow, then enter the username you followed from. Keep the follow for at least 7 days.",
    coins: 10,
    category: "Social",
    formSchema: [
      {
        id: "username",
        label: "Your Instagram username",
        type: "text",
        required: true,
        placeholder: "@yourhandle",
      },
      {
        id: "screenshot",
        label: "Screenshot URL (proof of follow)",
        type: "url",
        required: false,
        placeholder: "https://...",
      },
    ],
  },
  {
    title: "Write a Play Store review",
    slug: "play-store-review",
    description: "Leave an honest review of our app and share the link.",
    instructions:
      "Install the app, use it for a few minutes, then leave a review of at least 20 words. Paste the review link below.",
    coins: 50,
    category: "Reviews",
    formSchema: [
      {
        id: "review_link",
        label: "Link to your review",
        type: "url",
        required: true,
        placeholder: "https://play.google.com/...",
      },
      {
        id: "rating",
        label: "Rating you gave",
        type: "select",
        required: true,
        options: ["5 stars", "4 stars", "3 stars", "2 stars", "1 star"],
      },
      {
        id: "notes",
        label: "Anything you'd like us to improve?",
        type: "textarea",
        required: false,
        placeholder: "Optional feedback",
      },
    ],
  },
  {
    title: "Refer a friend",
    slug: "refer-a-friend",
    description: "Invite a friend who signs up and completes one task.",
    instructions:
      "Share your referral with a friend. Once they've signed up and finished any task, enter their registered email here.",
    coins: 100,
    category: "Referral",
    formSchema: [
      {
        id: "friend_email",
        label: "Your friend's registered email",
        type: "text",
        required: true,
        placeholder: "friend@example.com",
      },
    ],
  },
  {
    title: "Complete a 2-minute survey",
    slug: "product-survey",
    description: "Tell us how you use the app. Takes about two minutes.",
    instructions:
      "Answer all the questions honestly. Low-effort or duplicate answers will be rejected.",
    coins: 25,
    category: "Surveys",
    formSchema: [
      {
        id: "age_group",
        label: "Your age group",
        type: "select",
        required: true,
        options: ["Under 18", "18-24", "25-34", "35-44", "45+"],
      },
      {
        id: "found_us",
        label: "How did you hear about us?",
        type: "text",
        required: true,
      },
      {
        id: "improve",
        label: "What one thing would make you use this more?",
        type: "textarea",
        required: true,
      },
    ],
  },
];

async function main() {
  for (const task of SEED) {
    await db.insert(tasks).values(task).onConflictDoNothing({
      target: tasks.slug,
    });
  }
  console.log(`✓ Seeded ${SEED.length} tasks.`);
}

main()
  .catch((error) => {
    console.error("✗ Seed failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => pool.end());
