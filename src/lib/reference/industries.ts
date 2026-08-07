/**
 * Industries a user can say they work in or care about.
 *
 * The flat LinkedIn-style list rather than the full nested taxonomy: this is a
 * single question during signup, and a two-level picker would cost more
 * attention than the answer is worth to us. Alphabetical, so someone scanning
 * for their own field finds it without reading the whole list.
 */
export const INDUSTRIES = [
  "Technology & Software",
  "Financial Services",
  "Healthcare",
  "Education",
  "Retail & E-Commerce",
  "Marketing & Advertising",
  "Manufacturing",
  "Real Estate & Construction",
  "Media & Entertainment",
  "Professional Services",
] as const;
