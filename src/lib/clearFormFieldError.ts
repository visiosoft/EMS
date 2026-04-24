/**
 * Immutable removal of a single key from a field-error map. Use in setState
 * updaters so validation messages clear as soon as the user edits that field.
 */
export function clearFormFieldError(
  errors: Partial<Record<string, string>> | undefined,
  key: string,
): Partial<Record<string, string>> {
  if (errors == null || errors[key] == null) {
    return errors ?? {};
  }
  const n = { ...errors };
  delete n[key];
  return n;
}

export function clearFormFieldErrors(
  errors: Partial<Record<string, string>> | undefined,
  keys: readonly string[],
): Partial<Record<string, string>> {
  if (errors == null || keys.length === 0) {
    return errors ?? {};
  }
  const n = { ...errors };
  let changed = false;
  for (const k of keys) {
    if (n[k] != null) {
      delete n[k];
      changed = true;
    }
  }
  if (!changed) {
    return errors;
  }
  return Object.keys(n).length === 0 ? {} : n;
}
