/**
 * `applyServerErrors` — the one bridge between the backend error contract
 * (W1-3: `ProblemDetails` + `errors: [{field, code, message}]`, normalized by
 * `lib/api-error.ts`'s `normalizeApiError` into `error.normalized`) and a
 * react-hook-form instance.
 *
 * Usage inside a `<Form>` submit handler:
 *   try {
 *     await api.create(data);
 *   } catch (err) {
 *     applyServerErrors(form.setError, err, Object.keys(schema.shape));
 *   }
 */
import toast from 'react-hot-toast';
import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form';
import { normalizeApiError, type NormalizedApiError } from '../../lib/api-error';

/** Extracts the normalized shape whether `err` already carries it (from the
 * axios interceptor) or not (e.g. a manually-thrown error in a `.catch`). */
function toNormalized(err: unknown): NormalizedApiError {
  const maybeNormalized = (err as { normalized?: NormalizedApiError } | null)?.normalized;
  return maybeNormalized ?? normalizeApiError(err);
}

/**
 * Maps `error.normalized.fieldErrors` onto the form's fields via `setError`.
 *
 * - A field name the backend sent that the form does NOT recognise (`knownFields`
 *   given and the key is not in it) is NOT set on the form — RHF would silently
 *   accept it but no input would ever display it, so it falls back to a toast
 *   instead (per the phase spec: "unknown fields fall back to a toast").
 * - When there are no field errors at all (a 4xx/5xx with only a summary
 *   message, or a network error), the whole message goes to a toast.
 * - `knownFields` is optional; omit it to always trust the server's field
 *   names (fine for small forms where every field is server-validated).
 *
 * Returns the field names that were actually set, in server order, so a
 * caller can additionally focus the first one (`form.setFocus(applied[0])`).
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  err: unknown,
  knownFields?: ReadonlyArray<FieldPath<T>>,
): FieldPath<T>[] {
  const normalized = toNormalized(err);
  const entries = Object.entries(normalized.fieldErrors);

  if (entries.length === 0) {
    toast.error(normalized.message);
    return [];
  }

  const applied: FieldPath<T>[] = [];
  const unknownMessages: string[] = [];

  for (const [field, message] of entries) {
    const path = field as FieldPath<T>;
    if (knownFields && !knownFields.includes(path)) {
      unknownMessages.push(message);
      continue;
    }
    setError(path, { type: 'server', message });
    applied.push(path);
  }

  if (unknownMessages.length > 0) {
    toast.error(unknownMessages.join('. '));
  }
  // A field-only error with everything unknown still deserves a form-level
  // toast — otherwise the user sees no feedback at all.
  if (applied.length === 0 && unknownMessages.length === 0) {
    toast.error(normalized.message);
  }

  return applied;
}
