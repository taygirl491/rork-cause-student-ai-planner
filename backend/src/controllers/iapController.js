const User = require('../models/User');
const { safeError } = require('../utils/errorResponse');

const PRODUCT_TIER_MAP = {
  Standardmonth1: 'standard',
  Standardyearly: 'standard',
  Premiummonthly: 'premium',
  Premiumyearly: 'premium',
  Unlimitedmonthly: 'unlimited',
  Unlimitedyearly: 'unlimited',
};

const VALID_TIERS = ['standard', 'premium', 'unlimited'];

const activateSubscription = async (req, res) => {
  try {
    const { userId, productId, tier: directTier } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    // Caller may pass tier directly (restore flow) or derive it from productId
    const tier = VALID_TIERS.includes(directTier) ? directTier : PRODUCT_TIER_MAP[productId];

    if (!tier) {
      return res.status(400).json({ success: false, error: 'Invalid product ID or tier' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { tier, subscriptionStatus: 'active' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`[IAP] ${tier} tier activated for user ${userId} via ${productId || 'restore'}`);
    return res.json({ success: true, tier });
  } catch (error) {
    return safeError(res, 500, 'Failed to activate IAP subscription', error);
  }
};

module.exports = { activateSubscription };
