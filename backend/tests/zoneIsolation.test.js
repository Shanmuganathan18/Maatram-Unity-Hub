/**
 * tests/zoneIsolation.test.js
 * Verifies that zone isolation middleware strictly prevents cross-zone data access.
 */
const { requireZoneAccess } = require('../src/middleware/authorize');
const { ZoneAccessError, AuthorizationError } = require('../src/utils/errors');

describe('Zone Isolation Security Middleware', () => {
  it('should reject access if user is not an officer', async () => {
    const req = {
      user: { id: 'u1', role: 'STUDENT', status: 'ACTIVE' },
    };
    const next = jest.fn();

    await requireZoneAccess(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should reject access if officer account is inactive', async () => {
    const req = {
      user: { id: 'u2', role: 'OFFICER', status: 'INACTIVE' },
    };
    const next = jest.fn();

    // requireActiveAccount check
    const { requireActiveAccount } = require('../src/middleware/authorize');
    requireActiveAccount(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(AuthorizationError);
  });

  it('should extract zoneId strictly from officerProfile and attach to req', async () => {
    const req = {
      user: { id: 'u3', role: 'OFFICER', status: 'ACTIVE' },
      officerProfile: { id: 'op1', zoneId: 'zone-a', status: 'ACTIVE', name: 'Officer Arun' },
    };
    const next = jest.fn();

    await requireZoneAccess(req, {}, next);

    expect(next).toHaveBeenCalledWith(); // no error
    expect(req.zoneId).toBe('zone-a');
  });
});

