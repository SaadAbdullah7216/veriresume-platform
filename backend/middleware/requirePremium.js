/**
 * Middleware to check if the authenticated user has a premium subscription.
 * Must be used AFTER authMiddleware (requires req.user to be set).
 */
const requirePremium = (req, res, next) => {
  if (!req.user || !req.user.isPremium) {
    return res.status(403).json({
      success: false,
      error: "Premium subscription required to access this feature.",
      requiresPremium: true,
    });
  }
  next();
};

export default requirePremium;
