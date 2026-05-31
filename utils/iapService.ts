import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getAvailablePurchases,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
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

export const ANDROID_PRODUCT_IDS: Record<string, string> = {
  'standard-monthly': 'com.causeplanner.standard_monthly',
  'standard-yearly': 'com.causeplanner.standard_yearly',
  'premium-monthly': 'com.causeplanner.premium_monthly',
  'premium-yearly': 'com.causeplanner.premium_yearly',
  'unlimited-monthly': 'com.causeplanner.unlimited_monthly',
  'unlimited-yearly': 'com.causeplanner.unlimited_yearly',
};

const TIER_MAP: Record<string, IAPTier> = {
  // iOS product IDs
  Standardmonth1: 'standard',
  Standardyearly: 'standard',
  Premiummonthly: 'premium',
  Premiumyearly: 'premium',
  Unlimitedmonthly: 'unlimited',
  Unlimitedyearly: 'unlimited',
  // Android product IDs
  'com.causeplanner.standard_monthly': 'standard',
  'com.causeplanner.standard_yearly': 'standard',
  'com.causeplanner.premium_monthly': 'premium',
  'com.causeplanner.premium_yearly': 'premium',
  'com.causeplanner.unlimited_monthly': 'unlimited',
  'com.causeplanner.unlimited_yearly': 'unlimited',
};

const TIER_PRIORITY: Record<IAPTier, number> = { unlimited: 3, premium: 2, standard: 1 };

export function tierForProductId(productId: string): IAPTier | undefined {
  return TIER_MAP[productId];
}

export async function initIAP(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  try {
    await initConnection();
    return true;
  } catch {
    return false;
  }
}

export async function endIAP(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
  try {
    await endConnection();
  } catch {
    // ignore — connection may already be closed
  }
}

type PurchaseResult = {
  success: boolean;
  purchase?: Purchase;
  tier?: IAPTier;
  error?: string;
};

export async function purchaseSubscription(productId: string): Promise<PurchaseResult> {
  if (Platform.OS === 'android') {
    return purchaseSubscriptionAndroid(productId);
  }
  return purchaseSubscriptionIOS(productId);
}

function purchaseSubscriptionIOS(productId: string): Promise<PurchaseResult> {
  return new Promise((resolve) => {
    let purchaseSub: { remove: () => void } | null = null;
    let errorSub: { remove: () => void } | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      purchaseSub?.remove();
      errorSub?.remove();
      purchaseSub = null;
      errorSub = null;
    };

    const settle = (result: PurchaseResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        settle({ success: true, purchase, tier: tierForProductId(purchase.productId) });
      } catch {
        settle({ success: false, error: 'Failed to finish transaction.' });
      }
    });

    errorSub = purchaseErrorListener((error: PurchaseError) => {
      if ((error as any).code === 'E_USER_CANCELLED') {
        settle({ success: false, error: 'cancelled' });
      } else {
        settle({ success: false, error: error.message });
      }
    });

    timeoutId = setTimeout(() => {
      settle({ success: false, error: 'Purchase timed out. Please try again.' });
    }, 5 * 60 * 1000);

    requestPurchase({
      request: { apple: { sku: productId } },
      type: 'subs',
    }).catch((err: any) => {
      if (err?.code === 'E_USER_CANCELLED') {
        settle({ success: false, error: 'cancelled' });
      } else {
        settle({ success: false, error: err?.message ?? 'Purchase request failed.' });
      }
    });
  });
}

async function purchaseSubscriptionAndroid(productId: string): Promise<PurchaseResult> {
  // Fetch the subscription to get the offerToken required by Google Play Billing
  let offerToken: string | undefined;
  try {
    const products = await fetchProducts({ skus: [productId], type: 'subs' });
    const sub = products[0] as any;
    offerToken =
      sub?.subscriptionOffers?.[0]?.offerToken ??
      sub?.subscriptionOfferDetailsAndroid?.[0]?.offerToken;
  } catch (e) {
    console.warn('[IAP] Could not fetch Android subscription details:', e);
  }

  return new Promise((resolve) => {
    let purchaseSub: { remove: () => void } | null = null;
    let errorSub: { remove: () => void } | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    const cleanup = () => {
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      purchaseSub?.remove();
      errorSub?.remove();
      purchaseSub = null;
      errorSub = null;
    };

    const settle = (result: PurchaseResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      try {
        await finishTransaction({ purchase, isConsumable: false });
        settle({ success: true, purchase, tier: tierForProductId(purchase.productId) });
      } catch {
        settle({ success: false, error: 'Failed to finish transaction.' });
      }
    });

    errorSub = purchaseErrorListener((error: PurchaseError) => {
      if ((error as any).code === 'E_USER_CANCELLED') {
        settle({ success: false, error: 'cancelled' });
      } else {
        settle({ success: false, error: error.message });
      }
    });

    timeoutId = setTimeout(() => {
      settle({ success: false, error: 'Purchase timed out. Please try again.' });
    }, 5 * 60 * 1000);

    requestPurchase({
      request: {
        google: {
          skus: [productId],
          ...(offerToken ? { subscriptionOffers: [{ sku: productId, offerToken }] } : {}),
        },
      },
      type: 'subs',
    }).catch((err: any) => {
      if (err?.code === 'E_USER_CANCELLED') {
        settle({ success: false, error: 'cancelled' });
      } else {
        settle({ success: false, error: err?.message ?? 'Purchase request failed.' });
      }
    });
  });
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
