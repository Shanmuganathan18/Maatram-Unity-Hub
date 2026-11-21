/**
 * src/middleware/authenticate.js
 *
 * Verifies the Supabase JWT from the Authorization header.
 * Loads the application user record from MySQL.
 * Attaches req.user = { id, supabaseUid, email, role, status } to the request.
 *
 * NEVER trusts role or permissions from the client — always reads from the DB.
 */
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const env = require('../config/env');
const { supabase } = require('../config/supabase');
const { AuthenticationError } = require('../utils/errors');
const logger = require('../utils/logger');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No authentication token provided');
    }

    const token = authHeader.slice(7);

    // Verify the Supabase JWT using local secret or Supabase Auth API
    let decoded;
    try {
      decoded = jwt.verify(token, env.supabase.jwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      // Fallback: verify directly with Supabase Auth API
      try {
        const { data: sbData, error: sbErr } = await supabase.auth.getUser(token);
        if (sbErr || !sbData?.user) {
          if (err.name === 'TokenExpiredError') {
            throw new AuthenticationError('Your session has expired. Please sign in again.');
          }
          throw new AuthenticationError('Invalid authentication token');
        }
        decoded = { sub: sbData.user.id, email: sbData.user.email };
      } catch (authErr) {
        if (authErr instanceof AuthenticationError) throw authErr;
        throw new AuthenticationError('Invalid authentication token');
      }
    }

    const supabaseUid = decoded.sub;
    if (!supabaseUid) {
      throw new AuthenticationError('Invalid token: missing subject');
    }

    // Load application user record
    const user = await prisma.user.findUnique({
      where: { supabaseUid },
      select: {
        id: true,
        supabaseUid: true,
        email: true,
        role: true,
        status: true,
        studentProfile: {
          select: { id: true, zoneId: true, institutionId: true, name: true },
        },
        officerProfile: {
          select: { id: true, zoneId: true, name: true, designation: true },
        },
        adminProfile: {
          select: { id: true, name: true, roleId: true },
        },
      },
    });

    if (!user) {
      throw new AuthenticationError('Account not found. Please contact support.');
    }

    // Attach to request — downstream middleware and handlers read from here
    req.user = user;
    req.supabaseUid = supabaseUid;

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Optional authentication — does not throw if no token, but sets req.user if valid.
 * Used for public endpoints that have optional personalisation.
 */
const authenticateOptional = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  return authenticate(req, res, next);
};

module.exports = { authenticate, authenticateOptional };

