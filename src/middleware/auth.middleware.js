import { auth } from '../lib/auth.js';

// -----------------------------------------------
// requireAuth
// Checks there is a valid session
// Used on routes any logged-in user can access
// cart, own orders, reviews
// -----------------------------------------------
export const requireAuth = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized — please sign in',
      });
    }

    // Attach user and session to request
    // so any controller can access req.user
    req.user    = session.user;
    req.session = session;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized — invalid session',
    });
  }
};

// -----------------------------------------------
// requireAdmin
// Checks session exists AND role is admin
// Used on routes only admin can access
// product create/edit/delete, all orders,
// customer list, analytics
// -----------------------------------------------
export const requireAdmin = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized — please sign in',
      });
    }

    if (session.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — admin access required',
      });
    }

    req.user    = session.user;
    req.session = session;

    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden — could not verify admin access',
    });
  }
};