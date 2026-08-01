export class SongPatchValidationError extends Error {}

export function validateSongPatchId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new SongPatchValidationError("Song id is required");
  }

  return value.trim();
}

export function assertSongPatchHasChanges(patch: Record<string, unknown>): void {
  if (Object.keys(patch).length === 0) {
    throw new SongPatchValidationError("At least one editable song field is required");
  }
}

export function validateOptionalBoolean(
  value: unknown,
  field: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new SongPatchValidationError(`${field} must be a boolean`);
  }
  return value;
}
