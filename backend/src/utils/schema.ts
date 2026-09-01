export function emptyToUndefined(value: unknown) {
  return value === '' ? undefined : value;
}
