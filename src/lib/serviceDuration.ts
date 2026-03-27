export const DEFAULT_SERVICE_DURATION_MINUTES = 30;
export const MIN_SERVICE_DURATION_MINUTES = 1;
export const MAX_SERVICE_DURATION_MINUTES = 240;

export function isValidServiceDuration(duration: number | null | undefined): duration is number {
  if (!Number.isInteger(duration)) {
    return false;
  }

  const normalizedDuration = Number(duration);

  return (
    normalizedDuration >= MIN_SERVICE_DURATION_MINUTES &&
    normalizedDuration <= MAX_SERVICE_DURATION_MINUTES
  );
}

export function getSafeServiceDuration(duration: number | null | undefined): number {
  return isValidServiceDuration(duration) ? duration : DEFAULT_SERVICE_DURATION_MINUTES;
}

export function getServiceDurationValidationMessage(duration: number | null | undefined): string | null {
  if (!Number.isInteger(duration)) {
    return "La durée doit être un nombre entier de minutes.";
  }

  const normalizedDuration = Number(duration);

  if (
    normalizedDuration < MIN_SERVICE_DURATION_MINUTES ||
    normalizedDuration > MAX_SERVICE_DURATION_MINUTES
  ) {
    return `La durée doit être comprise entre ${MIN_SERVICE_DURATION_MINUTES} et ${MAX_SERVICE_DURATION_MINUTES} minutes.`;
  }

  return null;
}
