/** Display helper for backend estimatedWaitTime (minutes). -1 = counters closed. */
export function formatEstimatedWaitMinutes(minutes) {
  if (minutes === null || minutes === undefined) return 'Calculating…';
  if (minutes < 0) return 'Paused — no counters open (estimate unavailable)';
  if (minutes === 0) return 'Your turn is now or very soon';
  return `Approximately ${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function formatEstimatedWaitFromToken(token) {
  if (!token) return '—';
  return formatEstimatedWaitMinutes(token.estimatedWaitTime);
}
