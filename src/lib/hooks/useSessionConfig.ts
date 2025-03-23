import { useMemo } from 'react';

export function useSessionConfig() {
  const values = useMemo(() => {
    const HOURS = 4; // Reduced from 1 day to 4 hours
    const MINUTES_PER_HOUR = 60;
    const SECONDS_PER_MINUTE = 60;
    const MILLISECONDS_PER_SECOND = 1000;

    const HOURS_IN_SECONDS = HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
    const HOURS_IN_MS = HOURS_IN_SECONDS * MILLISECONDS_PER_SECOND;

    const MINUTES_15_IN_MS = 15 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

    return {
      SESSION_DURATION_SECONDS: HOURS_IN_SECONDS,
      SESSION_DURATION_MS: HOURS_IN_MS,
      SESSION_DURATION_HUMAN: `${HOURS} hours`,
      SESSION_REFRESH_INTERVAL: MINUTES_15_IN_MS, // Refresh every 15 minutes
      ROUTE_REFRESH_INTERVAL: MINUTES_15_IN_MS,
      MIN_REFRESH_INTERVAL: MINUTES_15_IN_MS,
    };
  }, []);

  return values;
}

export default useSessionConfig;