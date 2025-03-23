import { useMemo } from 'react';

/**
 * Custom hook that provides consistent session configuration values
 * throughout the application.
 */
export function useSessionConfig() {
  const values = useMemo(() => {
    // Session duration of 1 day (reduced from 11 days)
    const DAYS = 1;
    const HOURS_PER_DAY = 24;
    const MINUTES_PER_HOUR = 60;
    const SECONDS_PER_MINUTE = 60;
    const MILLISECONDS_PER_SECOND = 1000;

    const DAYS_IN_SECONDS = DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;
    const DAYS_IN_MS = DAYS_IN_SECONDS * MILLISECONDS_PER_SECOND;

    // Other useful time constants
    const HOURS_6_IN_MS = 6 * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
    const HOURS_12_IN_MS = 12 * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;
    const MINUTES_30_IN_MS = 30 * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

    return {
      // Session duration in seconds (for Supabase API)
      SESSION_DURATION_SECONDS: DAYS_IN_SECONDS,
      
      // Session duration in milliseconds (for JS timers)
      SESSION_DURATION_MS: DAYS_IN_MS,
      
      // Human-readable representation
      SESSION_DURATION_HUMAN: `${DAYS} day`,
      
      // Refresh intervals (more frequent now with shorter session)
      SESSION_REFRESH_INTERVAL: HOURS_6_IN_MS, // Refresh every 6 hours
      ROUTE_REFRESH_INTERVAL: HOURS_6_IN_MS,   // Refresh routes every 6 hours
      MIN_REFRESH_INTERVAL: MINUTES_30_IN_MS,  // Minimum time between refreshes
    };
  }, []);

  return values;
}

export default useSessionConfig; 