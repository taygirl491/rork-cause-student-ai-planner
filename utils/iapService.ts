import { Platform } from 'react-native';
import {
  initConnection,
  getAvailablePurchases,
  requestSubscription,
  finishTransaction,
  type SubscriptionPurchase,
  type ProductPurchase,
} from 'react-native-iap';

export type IAPTier = 'standard' | 'premium' | 'unlimited';

export const APPLE_PRODUCT_IDS = {
  standardMonthly: 'Standardmonth1',
  standardYearly: 'Standardyearly',
  premiumMonthly: 'Premiummonthly',
  premiumYearly: 'Premiumyearly',
  unlimitedMonthly: 'Unlimitedmonthly',
  unlimitedYearly: 'Unlimitedyearly',
} as const;

const TIER_MAP: Record<string, IAPTier> = {
  Standardmonth1: 'standard',
  Standardyearly: 'standard',
  Premiummonthly: 'premium',
  Premiumyearly: 'premium',
  Unlimitedmonthly: 'unlimited',
  Unlimitedyearly: 'unlimited',
};

const TIER_PRIORITY: Record<IAPTier, number> = { unlimited: 3, premium: 2, standard: 1 };

export function tierForProductId(productId: string): IAPTier | undefined {
  return TIER_MAP[productId];
}

export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    await initConnection();
    return true;
  } catch {
    return false;
  }
}

export async function purchaseSubscription(productId: string): Promise<{
  success: boolean;
  purchase?: SubscriptionPurchase | ProductPurchase;
  tier?: IAPTier;
  error?: string;
}> {
  try {
    const result = await requestSubscription({
      sku: productId,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    });
    const purchase = Array.isArray(result) ? result[0] : result;
    if (purchase) {
      await finishTransaction({ purchase, isConsumable: false });
      return { success: true, purchase, tier: tierForProductId(productId) };
    }
    return { success: false, error: 'Purchase not completed.' };
  } catch (error: any) {
    if (error.code === 'E_USER_CANCELLED') {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: error.message };
  }
}

export async function restorePurchases(): Promise<{
  success: boolean;
  tier?: IAPTier;
  error?: string;
}> {
  try {
    const purchases = await getAvailablePurchases();
    if (!purchases || purchases.length === 0) {
      return { success: false, error: 'No active subscriptions found.' };
    }

    let bestTier: IAPTier | undefined;
    let bestScore = 0;

    for (const p of purchases) {
      const tier = TIER_MAP[p.productId];
      if (tier && TIER_PRIORITY[tier] > bestScore) {
        bestTier = tier;
        bestScore = TIER_PRIORITY[tier];
      }
    }

    if (bestTier) return { success: true, tier: bestTier };
    return { success: false, error: 'No recognized subscriptions found.' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
