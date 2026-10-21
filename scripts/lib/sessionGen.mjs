export function makeHelpers(rand) {
  const int = (min, max) => min + Math.floor(rand() * (max - min + 1));
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const chance = (p) => rand() < p;
  return { int, pick, chance };
}

export function splitPeriods(startMs, focusSeconds, pausedSeconds, { int }) {
  const n = Math.max(1, Math.min(8, int(1, 8), Math.floor(focusSeconds / 60)));
  const periods = [];
  let cursor = startMs;
  let remainingFocus = focusSeconds;
  let remainingPause = pausedSeconds;
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const focus = last ? remainingFocus : Math.floor(remainingFocus / (n - i));
    const pause = last ? 0 : Math.floor(remainingPause / (n - 1 - i));
    periods.push({
      start: new Date(cursor).toISOString(),
      end: new Date(cursor + focus * 1000).toISOString(),
    });
    cursor += (focus + pause) * 1000;
    remainingFocus -= focus;
    remainingPause -= pause;
  }
  return { periods, endMs: cursor };
}
