import { STATES } from "./states";

/**
 * Checks a state against the country it was submitted with.
 *
 * Split out of the zod schema in @/lib/validations because it needs the 74KB
 * states map, and that module is imported by client components — a static
 * import there would put every subdivision on Earth into the signup bundle.
 * Only import this from a "use server" file; the client gets its copy of the
 * list through `loadStates`, which is dynamic.
 *
 * Both directions matter. A country with subdivisions must get one, or
 * "Karnataka or Kerala" is a question we can no longer answer about that user.
 * A country without any must not: a state posted for Gibraltar only ever got
 * there by editing the request.
 *
 * Returns an error message, or null when the pair is fine.
 */
export function checkState(country: string, state: string): string | null {
  const available = STATES[country] ?? [];

  if (available.length === 0) {
    return state ? `${country} has no states to choose from` : null;
  }

  if (!state) return "Pick a state";

  return available.includes(state)
    ? null
    : `Pick a state from the list for ${country}`;
}
