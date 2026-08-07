"use client";

import { useEffect, useState } from "react";
import { InkSelect, InkTextarea } from "@/components/paper/form";
import { COUNTRIES, loadStates } from "@/lib/reference/countries";
import { INDUSTRIES } from "@/lib/reference/industries";

export type InterestsDefaults = {
  industry?: string | null;
  country?: string | null;
  state?: string | null;
  hobbies?: string | null;
};

/**
 * Industry, country, state and hobbies — the block that decides which tasks a
 * user is shown.
 *
 * Shared by signup and the profile page so the two cannot drift into asking
 * slightly different questions. Uncontrolled except for country and state,
 * which have to talk to each other.
 *
 * Country and state are native selects rather than a search-and-pick combobox.
 * 250 options is within what a native control handles well, and on a phone it
 * opens the platform's own wheel — which is faster than anything we would build
 * and already searchable by typing. It also means this renders and works before
 * any JavaScript arrives.
 */
export function InterestsFields({
  defaults,
  disabled,
}: {
  defaults?: InterestsDefaults;
  disabled?: boolean;
}) {
  const [industry, setIndustry] = useState(defaults?.industry ?? "");
  const [country, setCountry] = useState(defaults?.country ?? "");
  const [states, setStates] = useState<readonly string[]>([]);
  const [state, setState] = useState(defaults?.state ?? "");
  const [loadingStates, setLoadingStates] = useState(false);

  useEffect(() => {
    if (!country) {
      setStates([]);
      return;
    }

    /* The states module is fetched on first use, so this can resolve after the
       user has already moved on to another country. Ignoring a stale response
       stops the older list from overwriting the newer one. */
    let current = true;
    setLoadingStates(true);

    loadStates(country).then((list) => {
      if (!current) return;
      setStates(list);
      setLoadingStates(false);
    });

    return () => {
      current = false;
    };
  }, [country]);

  /* A state only means something in the country it belongs to. Clearing it on
     change is what stops "Kerala, France" from being submitted by someone who
     picked the state first and then corrected the country. */
  function onCountryChange(next: string) {
    setCountry(next);
    setState("");
  }

  const hasStates = states.length > 0;

  return (
    <>
      <InkSelect
        label="Industry / Interest"
        name="industry"
        required
        disabled={disabled}
        value={industry}
        data-empty={industry ? undefined : "true"}
        onChange={(e) => setIndustry(e.target.value)}
        caption="What you work in or care about. It shapes which tasks reach you first."
      >
        <option value="" disabled>
          Choose an industry
        </option>
        {INDUSTRIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </InkSelect>

      <InkSelect
        label="Country"
        name="country"
        required
        disabled={disabled}
        value={country}
        data-empty={country ? undefined : "true"}
        onChange={(e) => onCountryChange(e.target.value)}
      >
        <option value="" disabled>
          Choose a country
        </option>
        {COUNTRIES.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </InkSelect>

      {/* Held back until a country is chosen: an empty state list is a puzzle,
          and for the couple of dozen countries with no subdivisions the field
          never appears at all rather than sitting there unanswerable. */}
      {country && (loadingStates || hasStates) ? (
        <InkSelect
          label="State"
          name="state"
          required
          disabled={disabled || loadingStates}
          value={state}
          data-empty={state ? undefined : "true"}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="" disabled>
            {loadingStates ? "Loading…" : "Choose a state"}
          </option>
          {states.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </InkSelect>
      ) : null}

      <InkTextarea
        label="Hobbies and interests"
        name="hobbies"
        rows={3}
        maxLength={500}
        disabled={disabled}
        defaultValue={defaults?.hobbies ?? ""}
        placeholder="photography, cricket, cooking, travel"
        caption="Optional, but worth a minute — this is what decides which tasks you see and how early you hear about them. Separate them with commas."
      />
    </>
  );
}
