const LOCALE = "es";

const integerFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

function decimalFormat(digits: number): Intl.NumberFormat {
  return new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function integer(value: number): string {
  return integerFormat.format(value);
}

export function decimal(value: number, digits = 2): string {
  return decimalFormat(digits).format(value);
}

/**
 * A probability from 0 to 1 as a percentage. A chance that is not zero never shows as 0 %, and one that is
 * not certain never shows as 100 %, because those two readings change what a player decides.
 */
export function percent(value: number, digits = 1): string {
  const scaled = value * 100;
  const step = 10 ** -digits;
  if (scaled > 0 && scaled < step / 2) return `<${decimalFormat(digits).format(step)} %`;
  if (scaled < 100 && scaled > 100 - step / 2) return `>${decimalFormat(digits).format(100 - step)} %`;
  return `${decimalFormat(digits).format(scaled)} %`;
}

export function signed(value: number): string {
  if (value > 0) return `+${integer(value)}`;
  return integer(value);
}

/** Seconds as `2 min 5 s`, or `45 s` under a minute. */
export function duration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes === 0) return `${integer(rest)} s`;
  if (rest === 0) return `${integer(minutes)} min`;
  return `${integer(minutes)} min ${integer(rest)} s`;
}

/** A range of seconds, collapsed when both ends are equal. */
export function durationRange(low: number, high: number): string {
  return low === high ? duration(low) : `${duration(low)} a ${duration(high)}`;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
