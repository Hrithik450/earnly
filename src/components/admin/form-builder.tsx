"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { TaskFormField } from "@/lib/drizzle/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const TYPES: { value: TaskFormField["type"]; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "url", label: "Link" },
  { value: "image", label: "Screenshot link" },
  { value: "select", label: "Dropdown" },
];

/** Derives a stable field key from the label so admins never type one. */
function keyFor(label: string, taken: Set<string>) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "field";

  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

/**
 * Builds the list of fields a task collects.
 *
 * The result is serialised into one hidden input, because FormData is flat and
 * this shape is not. The server re-validates it with taskSchema.
 */
export function FormBuilder({
  initial,
}: {
  initial: TaskFormField[];
}) {
  const [fields, setFields] = useState<TaskFormField[]>(initial);

  function addField() {
    const taken = new Set(fields.map((f) => f.id));
    setFields([
      ...fields,
      {
        id: keyFor("", taken),
        label: "",
        type: "text",
        required: true,
        placeholder: "",
      },
    ]);
  }

  function patch(index: number, next: Partial<TaskFormField>) {
    setFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, ...next } : field)),
    );
  }

  /* The key is regenerated from the label only while it is still the derived
     default — once a task has submissions, changing a key would orphan the
     answers already stored under the old one. */
  function onLabelChange(index: number, label: string) {
    const taken = new Set(fields.filter((_, i) => i !== index).map((f) => f.id));
    patch(index, { label, id: keyFor(label, taken) });
  }

  return (
    <div className="space-y-3">
      <input
        type="hidden"
        name="formSchema"
        value={JSON.stringify(
          fields.map((f) =>
            f.type === "select"
              ? { ...f, options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) }
              : f,
          ),
        )}
      />

      {fields.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
          No fields yet. Add at least one so users have something to submit.
        </p>
      ) : null}

      {fields.map((field, i) => (
        <div key={i} className="space-y-3 rounded-md border p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`label-${i}`}>Question</Label>
              <Input
                id={`label-${i}`}
                value={field.label}
                onChange={(e) => onLabelChange(i, e.target.value)}
                placeholder="e.g. Your Instagram username"
              />
            </div>

            <div className="w-44 space-y-1.5">
              <Label>Answer type</Label>
              <Select
                value={field.type}
                onValueChange={(value) =>
                  patch(i, {
                    type: value as TaskFormField["type"],
                    options: value === "select" ? (field.options ?? ["", ""]) : undefined,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mt-6"
              aria-label="Remove field"
              onClick={() => setFields(fields.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>

          {field.type === "select" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`options-${i}`}>Options, one per line</Label>
              <textarea
                id={`options-${i}`}
                rows={3}
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  patch(i, { options: e.target.value.split("\n") })
                }
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
                placeholder={"Yes\nNo\nMaybe"}
              />
              <p className="text-muted-foreground text-xs">
                At least two are needed. Blank lines are ignored.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor={`placeholder-${i}`}>
                Hint text{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id={`placeholder-${i}`}
                value={field.placeholder ?? ""}
                onChange={(e) => patch(i, { placeholder: e.target.value })}
                placeholder="Shown greyed out inside the field"
              />
            </div>
          )}

          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`required-${i}`}
                checked={field.required}
                onCheckedChange={(checked) => patch(i, { required: checked })}
              />
              <Label htmlFor={`required-${i}`} className="font-normal">
                Required
              </Label>
            </div>
            <code className="text-muted-foreground text-xs">
              {field.id || "—"}
            </code>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addField}>
        Add field
      </Button>
    </div>
  );
}
