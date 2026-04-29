// ─────────────────────────────────────────────────────────────────────────────
//  Validation helpers (Zod)
// ─────────────────────────────────────────────────────────────────────────────
//  Server actions on the existing portal coerce FormData with `String(get(…))`
//  and trust the result. When the `zod_validation` feature flag is ON, we run
//  the input through a Zod schema first and surface a structured error.
//
//  Pattern:
//      const data = await parseForm(formData, NewTaskSchema);
//      // data is fully typed and validated
//
//  When the flag is OFF, parseForm falls back to the legacy lenient parse so
//  existing forms keep working unchanged.
// ─────────────────────────────────────────────────────────────────────────────

import { z, ZodSchema, ZodError } from "zod";
import { isEnabled } from "@/lib/features";

export class ValidationError extends Error {
  readonly issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super("Validation failed: " + issues.map((i) => `${i.path} ${i.message}`).join("; "));
    this.name = "ValidationError";
    this.issues = issues;
  }
}

function formDataToObject(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) {
    // Re-collect repeated keys into arrays (used for bulk multi-select).
    if (k in out) {
      const existing = out[k];
      if (Array.isArray(existing)) existing.push(v);
      else out[k] = [existing, v];
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function parseForm<T>(form: FormData, schema: ZodSchema<T>): Promise<T> {
  if (!(await isEnabled("zod_validation"))) {
    // Legacy mode — just coerce, no validation. Schemas still type the result.
    return schema.parse(formDataToObject(form));
  }
  try {
    return schema.parse(formDataToObject(form));
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ValidationError(
        err.errors.map((e) => ({ path: e.path.join(".") || "(root)", message: e.message })),
      );
    }
    throw err;
  }
}

// ────────── Common atoms ──────────
export const NonEmptyString = z.string().trim().min(1, "is required");
export const OptionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined));
export const OptionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? new Date(v) : undefined));
export const Email = z.string().trim().toLowerCase().email("must be a valid email");

// ────────── Domain schemas ──────────
//
// These mirror the shape of the existing FormData payloads so they can be
// dropped into the corresponding actions.ts without churning the forms.

export const NewTaskSchema = z.object({
  title: NonEmptyString,
  verticalId: NonEmptyString,
  priorityId: NonEmptyString,
  subVerticalId: OptionalString,
  ownerRoleId: OptionalString,
  source: OptionalString,
  description: OptionalString,
  expectedOutput: OptionalString,
  supportNeeded: OptionalString,
  nextAction: OptionalString,
  frequency: OptionalString,
  intervention: OptionalString,
  ownerEmail: OptionalString,
  subOwnerEmail: OptionalString,
  deadline: OptionalDate,
});

export const TaskUpdateSchema = z.object({
  note: NonEmptyString,
  newStatus: OptionalString,
  delayReason: OptionalString,
});

export const EscalateSchema = z.object({
  issue: NonEmptyString,
  whyNeeded: NonEmptyString,
  decisionRequired: NonEmptyString,
  deadline: OptionalDate,
  noteAttached: OptionalString,
});

export const DropTaskSchema = z.object({
  reason: NonEmptyString,
});

export const BulkDropSchema = z.object({
  taskIds: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .pipe(z.array(z.string().min(1)).min(1, "select at least one task")),
  reason: NonEmptyString,
});
