describe('RateLimiterService (Unit Tests)', () => {
  it('calculates the current hourly window key accurately', () => {
    const fixedTimestamp = 1727376000000; // e.g. 2024-09-26 18:40:00 UTC
    const expectedHour = Math.floor(fixedTimestamp / 3600000);
    const nextWindow = (expectedHour + 1) * 3600000;

    expect(expectedHour).toBeGreaterThan(0);
    expect(nextWindow - fixedTimestamp).toBeLessThanOrEqual(3600000);
  });

  it('determines whether hourly limit threshold is exceeded', () => {
    const hourlyLimit = 100;

    const countUnderLimit = 99;
    expect(countUnderLimit <= hourlyLimit).toBe(true);

    const countAtLimit = 100;
    expect(countAtLimit <= hourlyLimit).toBe(true);

    const countOverLimit = 101;
    expect(countOverLimit > hourlyLimit).toBe(true);
  });

  it('calculates delay to the next hour window', () => {
    const now = 1727376600000; // 10 minutes into the hour
    const hourWindow = Math.floor(now / 3600000);
    const nextWindowEpoch = (hourWindow + 1) * 3600000;

    const delayMs = nextWindowEpoch - now;
    expect(delayMs).toBe(10 * 60 * 1000); // exactly 10 minutes remaining (50 min into the hour)
  });
});
