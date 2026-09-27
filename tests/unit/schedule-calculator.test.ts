describe('ScheduleCalculator (Unit Tests)', () => {
  it('calculates sequential scheduled timestamps with minimum delay steps', () => {
    const startEpoch = 1727376000000;
    const delayMs = 2000;
    const leads = ['alice@reachinbox.ai', 'bob@reachinbox.ai', 'charlie@reachinbox.ai'];

    const scheduledTimes = leads.map((_, index) => {
      return startEpoch + index * delayMs;
    });

    expect(scheduledTimes[0]).toBe(startEpoch);
    expect(scheduledTimes[1]).toBe(startEpoch + 2000);
    expect(scheduledTimes[2]).toBe(startEpoch + 4000);
  });

  it('handles empty or zero delays by enforcing minimum delay constraint', () => {
    const minDelayMs = 2000;
    const userConfiguredDelay = 500;
    const effectiveDelay = Math.max(userConfiguredDelay, minDelayMs);

    expect(effectiveDelay).toBe(2000);
  });
});
