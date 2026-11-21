/**
 * tests/availability.test.js
 * Verifies weekly availability date calculations, deadlines, and state determination.
 */
const {
  todayIST,
  weekStartOf,
  weekDays,
  deadlineFor,
  addDays,
} = require('../src/utils/dates');

describe('Availability Date & Deadline Utilities', () => {
  it('should calculate Monday as the week start for any given date', () => {
    // 2026-11-04 is Wednesday -> week start should be Monday 2026-11-02
    expect(weekStartOf('2026-11-04')).toBe('2026-11-02');
    // 2026-11-08 is Sunday -> week start should be Monday 2026-11-02
    expect(weekStartOf('2026-11-08')).toBe('2026-11-02');
    // 2026-11-02 is Monday -> week start should be Monday 2026-11-02
    expect(weekStartOf('2026-11-02')).toBe('2026-11-02');
  });

  it('should return exactly 7 days from Monday to Sunday', () => {
    const days = weekDays('2026-11-02');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2026-11-02'); // Mon
    expect(days[4]).toBe('2026-11-06'); // Fri
    expect(days[6]).toBe('2026-11-08'); // Sun
  });

  it('should compute Friday 18:00 IST as deadline by default', () => {
    const deadline = deadlineFor('2026-11-02');
    // 18:00 IST is 12:30 UTC
    expect(deadline.toISOString()).toBe('2026-11-06T12:30:00.000Z');
  });
});

