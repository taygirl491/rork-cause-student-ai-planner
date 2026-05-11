import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Button from '@/components/Button';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  CreditCard,
  Shield,
  FileText,
  Trash2,
  LogOut,
  ChevronRight,
  Crown,
  Heart,
  CheckCircle2,
  Lock,
  HelpCircle,
  Mail,
  AlertTriangle,
  ArrowLeft,
  Check,
  Sparkles,
  Zap,
  ExternalLink,
} from 'lucide-react-native';
import colors from '@/constants/colors';
import LogoButton from '@/components/LogoButton';
import { useAuth } from '@/contexts/AuthContext';
import { SubscriptionTier } from '@/constants/permissions';
import { useRouter, useFocusEffect } from 'expo-router';
import apiService from '@/utils/apiService';
// TextInput is imported from react-native above
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '@/constants/LegalText';
import { useStripe } from '@stripe/stripe-react-native';
import * as Analytics from '@/utils/analytics';
import { useResponsive } from '@/utils/responsive';
import ResponsiveContainer from '@/components/ResponsiveContainer';

const SUBSCRIPTION_PLANS = {
  standardMonthly: 'price_1ShIc8P0t2AuYFqK2waTumLy',
  standardYearly: 'price_1Sl6k0P0t2AuYFqKrlQXkYUq',
  premiumMonthly: 'price_1Sl6opP0t2AuYFqKRMdGp5kO',
  premiumYearly: 'price_1Sl6piP0t2AuYFqKnKhrNQRg',
  unlimitedMonthly: 'price_1Sl6rWP0t2AuYFqKshMpasoI',
  unlimitedYearly: 'price_1Sl6sFP0t2AuYFqK2JYnhp6N',
};

// type SubscriptionTier = 'free' | 'standard' | 'premium' | 'unlimited';

export default function AccountScreen() {
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionTier>('free');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { user, logout, changePassword, currentTier } = useAuth();
  const router = useRouter();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const insets = useSafeAreaInsets();

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Specific field errors
  const [currPassError, setCurrPassError] = useState('');
  const [newPassError, setNewPassError] = useState('');
  const [confirmPassError, setConfirmPassError] = useState('');

  // Legal Modals State
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Delete Account State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleteReason, setDeleteReason] = useState('');

  const clearErrors = () => {
    setCurrPassError('');
    setNewPassError('');
    setConfirmPassError('');
  };

  const handleChangePassword = async () => {
    clearErrors();
    let hasError = false;

    if (!currentPassword) {
      setCurrPassError('Current password is required');
      hasError = true;
    }

    if (!newPassword) {
      setNewPassError('New password is required');
      hasError = true;
    } else if (newPassword.length < 6) {
      setNewPassError('Password must be at least 6 characters');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPassError('Please confirm your new password');
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPassError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return;

    setIsChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearErrors();
      Alert.alert('Success', 'Password changed successfully');
    } catch (error: any) {
      console.log('Password change error:', error.code, error.message);
      if (error.code === 'auth/wrong-password' || error.message.includes('invalid-credential')) {
        setCurrPassError('Incorrect current password');
      } else if (error.code === 'auth/weak-password') {
        setNewPassError('Password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        Alert.alert('Security Update', 'Please log out and log back in to change your password.');
      } else {
        Alert.alert('Error', error.message || 'Failed to change password. Please try again.');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Fetch user's subscription on focus
  useFocusEffect(
    useCallback(() => {
      if (user?.uid) {
        fetchSubscription();
      }
    }, [user?.uid])
  );

  const { isTablet, normalize } = useResponsive();

  const fetchSubscription = async () => {
    if (!user?.uid) return;

    try {
      setLoadingSubscription(true);
      const response = await apiService.getUserSubscriptions(user.uid);

      if (response.success && response.subscriptions && response.subscriptions.length > 0) {
        // Get the most recent active subscription
        const activeSub = response.subscriptions.find(
          (sub: any) => sub.status === 'active' || sub.status === 'trialing'
        );

        if (activeSub) {
          setActiveSubscription(activeSub);
          // Determine tier based on price ID
          const priceId = activeSub.priceId;
          if (priceId === SUBSCRIPTION_PLANS.standardMonthly || priceId === SUBSCRIPTION_PLANS.standardYearly) {
            setCurrentSubscription('standard');
          } else if (priceId === SUBSCRIPTION_PLANS.premiumMonthly || priceId === SUBSCRIPTION_PLANS.premiumYearly) {
            setCurrentSubscription('premium');
          } else if (priceId === SUBSCRIPTION_PLANS.unlimitedMonthly || priceId === SUBSCRIPTION_PLANS.unlimitedYearly) {
            setCurrentSubscription('unlimited');
          }
        } else {
          // No active Stripe subscription — use the tier from AuthContext
          // (covers test accounts and any tier granted outside of Stripe)
          setCurrentSubscription(currentTier as SubscriptionTier);
        }
      } else {
        // No subscriptions at all — fall back to AuthContext tier
        setCurrentSubscription(currentTier as SubscriptionTier);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // On error, still reflect the AuthContext tier so test accounts show correctly
      setCurrentSubscription(currentTier as SubscriptionTier);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleManagePayment = () => {
    // Navigate to payment screen instead of showing modal
    router.push('/payment');
  };

  const handleCancelSubscription = async () => {
    if (!activeSubscription || !user?.uid) return;

    Alert.alert(
      'Cancel Subscription',
      'Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.cancelSubscription(
                activeSubscription._id,
                user.uid
              );

              if (response.success) {
                Alert.alert('Success', 'Your subscription has been cancelled.');
                fetchSubscription(); // Refresh subscription status
              } else {
                Alert.alert('Error', response.error || 'Failed to cancel subscription');
              }
            } catch (error) {
              console.error('Error cancelling subscription:', error);
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = async (tier: 'standard' | 'premium' | 'unlimited', interval: 'monthly' | 'yearly') => {
    if (!user?.uid) return;

    // Check if Stripe is initialized (not available in Expo Go)
    if (!initPaymentSheet || !presentPaymentSheet) {
      Alert.alert(
        'Development Build Required',
        'Stripe payments are not available in Expo Go preview mode.\n\nTo test payments, you need to build a development version:\n\n1. Run: npx eas build --profile development --platform android\n2. Install the .apk on your device\n3. Try the payment again',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      setLoadingPlan(`${tier}-${interval}`);
      setLoadingSubscription(true);

      Analytics.logCustomEvent('payment_flow_started', {
        tier,
        interval,
        plan_id: `${tier}-${interval}`
      });

      let clientSecret, customerId, response;

      // Build the plan key from tier and interval
      const planKey = `${tier}${interval.charAt(0).toUpperCase() + interval.slice(1)}` as keyof typeof SUBSCRIPTION_PLANS;
      const priceId = SUBSCRIPTION_PLANS[planKey];

      if (!priceId) {
        throw new Error('Invalid subscription plan selected');
      }

      response = await apiService.createSubscription(user.uid, priceId);
      console.log('[Stripe] Subscription response:', response);

      if (!response.success) {
        throw new Error(response.details || response.error || 'Failed to initialize subscription');
      }

      clientSecret = response.clientSecret;
      customerId = response.customerId;

      setLoadingSubscription(false);

      if (!clientSecret || typeof clientSecret !== 'string') {
        console.error('[Stripe] Invalid clientSecret:', clientSecret);
        throw new Error('Invalid payment details received from server');
      }

      const initParams = {
        merchantDisplayName: 'Cause Planner',
        customerId: customerId,
        customerEphemeralKeySecret: response.ephemeralKey,
        allowsDelayedPaymentMethods: true,
        returnURL: 'causeai://stripe-redirect',
      };

      console.log('[Stripe] Initializing Payment Sheet with params:', JSON.stringify({
        ...initParams,
        customerEphemeralKeySecret: '***',
      }, null, 2));

      let initOptions;
      if (clientSecret.startsWith('pi_')) {
        initOptions = {
          ...initParams,
          paymentIntentClientSecret: clientSecret,
        };
      } else {
        initOptions = {
          ...initParams,
          setupIntentClientSecret: clientSecret,
        };
      }

      const { error } = await initPaymentSheet(initOptions);

      if (error) {
        console.error('[Stripe] initPaymentSheet error:', error);
        Alert.alert('Error', error.message);
        return;
      }
      console.log('[Stripe] initPaymentSheet success');

      if (Platform.OS === 'android') {
        // Close modal before presenting - essential for Android reliability
        setShowPaymentModal(false);
        // Small delay to allow modal to clear before presenting native sheet
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const { error: paymentError } = await presentPaymentSheet();
      
      if (Platform.OS === 'ios') {
        // On iOS, close the modal after the Payment Sheet
        setShowPaymentModal(false);
      }

      if (paymentError) {
        if (paymentError.code !== 'Canceled') {
          console.error('[Stripe] presentPaymentSheet error:', paymentError);
          Alert.alert('Error', paymentError.message);
        } else {
          console.log('[Stripe] Payment canceled by user');
        }
      } else {
        console.log('[Stripe] Payment success');

        // Log revenue based on plan
        const prices = {
          'standard-monthly': 5,
          'standard-yearly': 35,
          'premium-monthly': 10,
          'premium-yearly': 70,
          'unlimited-monthly': 20,
          'unlimited-yearly': 140
        };
        const price = prices[`${tier}-${interval}` as keyof typeof prices] || 0;
        Analytics.logRevenue(price, 'USD');

        Alert.alert('Success', 'Thank you for subscribing!');
        setCurrentSubscription(tier);
        fetchSubscription();
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoadingSubscription(false);
      setLoadingPlan(null);
    }
  };



  const handleViewPrivacyPolicy = () => {
    console.log('Opening Privacy Modal');
    setShowPrivacyModal(true);
  };

  const handleViewTerms = () => {
    console.log('Opening Terms Modal');
    setShowTermsModal(true);
  };

  const handleDeleteAccount = () => {
    setDeleteStep(1);
    setDeleteReason('');
    setDeletePassword('');
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert('Error', 'Password is required');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'No user found');
      return;
    }

    setIsDeletingAccount(true);
    try {
      // Import Firebase functions
      const { deleteUser, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('@/firebaseConfig');

      const currentUser = auth.currentUser;
      if (!currentUser) {
        Alert.alert('Error', 'No authenticated user found');
        setIsDeletingAccount(false);
        return;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(
        currentUser.email!,
        deletePassword
      );
      await reauthenticateWithCredential(currentUser, credential);

      // Delete user data from backend (MongoDB)
      try {
        await apiService.delete(`/api/users/${user.uid}`);
      } catch (backendError) {
        console.error('Error deleting backend data:', backendError);
        // Continue with account deletion even if backend cleanup fails
      }

      // Delete Firebase Authentication account
      await deleteUser(currentUser);

      // Close modal and reset state
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeleteReason('');
      setDeleteStep(1);
      setIsDeletingAccount(false);

      // Navigate to login immediately to prevent auth state change from restarting app
      router.replace('/login');

      // Show success message after navigation
      setTimeout(() => {
        Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
      }, 500);
    } catch (error: any) {
      console.error('Delete account error:', error);
      setIsDeletingAccount(false);

      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        Alert.alert('Error', 'Incorrect password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        Alert.alert('Error', 'Too many failed attempts. Please try again later.');
      } else {
        Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            // Explicitly navigate to login screen to prevent crash in production builds
            router.replace('/login');
          } catch (error) {
            console.error('Sign out error:', error);
            // Even if logout fails, try to navigate to login
            router.replace('/login');
          }
        },
      },
    ]);
  };

  const handleContactSupport = () => {
    const email = 'support@causestudentplanner.com';
    const subject = 'Support Request - Cause Planner';
    const body = 'Hi Support Team,\n\nI need help with:\n\n';

    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(
        'Email Not Available',
        `Please email us at: ${email}`,
        [
          { text: 'OK' },
          {
            text: 'Copy Email',
            onPress: () => {
              // In a real app, you'd use Clipboard API here
              Alert.alert('Email', email);
            }
          }
        ]
      );
    });
  };

  const handleHelpCenter = () => {
    router.push('/faq');
  };

  const getSubscriptionLabel = () => {
    switch (currentSubscription) {
      case 'standard':
        return 'Standard Plan';
      case 'premium':
        return 'Premium Plan';
      case 'unlimited':
        return 'Unlimited Plan';
      default:
        return 'Free Plan';
    }
  };

  const getSubscriptionColor = () => {
    return currentSubscription !== 'free' ? colors.secondary : colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ResponsiveContainer>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={isTablet && { paddingHorizontal: 40 }}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <User size={40} color={colors.primary} />
          </View>
          <Text style={[styles.title, { fontSize: normalize(32) }]}>{user?.name || 'My Account'}</Text>
          <Text style={[styles.subtitle, { fontSize: normalize(14) }]}>{user?.email || 'Manage your subscription and settings'}</Text>
        </View>

        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.subscriptionIconContainer}>
              {currentSubscription !== 'free' ? (
                <Crown size={24} color={colors.secondary} fill={colors.secondary} />
              ) : (
                <User size={24} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionTitle}>Current Plan</Text>
              <Text style={[styles.subscriptionTier, { color: getSubscriptionColor() }]}>
                {getSubscriptionLabel()}
              </Text>
            </View>
          </View>

          {currentSubscription !== 'free' && (
            <View style={styles.impactCard}>
              <Heart size={16} color={colors.secondary} fill={colors.secondary} />
              <Text style={styles.impactText}>
                You're making the world better while acing your classes. That's a win-win! 🏆
              </Text>
            </View>
          )}

          {currentSubscription === 'free' && (
            <Text style={styles.upgradePrompt}>
              Upgrade to Premium to unlock all features and support education causes
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription & Billing</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => setShowPaymentModal(true)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
                <CreditCard size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>
                {currentSubscription !== 'free' ? 'Upgrade Plan' : 'Subscribe to Premium'}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>

          {activeSubscription && (
            <TouchableOpacity style={styles.menuItem} onPress={handleCancelSubscription}>
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: '#FF3B3020' }]}>
                  <CreditCard size={20} color="#FF3B30" />
                </View>
                <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Cancel Subscription</Text>
              </View>
              <ChevronRight size={20} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Privacy</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleViewPrivacyPolicy}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.accent + '15' }]}>
                <Shield size={20} color={colors.accent} />
              </View>
              <Text style={styles.menuItemText}>Privacy Policy</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleViewTerms}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.accent + '15' }]}>
                <FileText size={20} color={colors.accent} />
              </View>
              <Text style={styles.menuItemText}>Terms & Conditions</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>iOS Alarm Tip 🔔</Text>
            <View style={styles.iosTipCard}>
              <Text style={styles.iosTipText}>
                For alarms to ring for their full duration, set your notification banner style to{' '}
                <Text style={styles.iosTipBold}>Persistent</Text> in your iPhone settings.
              </Text>
              <Text style={styles.iosTipSteps}>
                Settings → Notifications → Cause Planner → Banner Style → <Text style={styles.iosTipBold}>Persistent</Text>
              </Text>
              <TouchableOpacity
                style={styles.iosTipBtn}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.iosTipBtnText}>Open Notification Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>

          <TouchableOpacity style={styles.menuItem} onPress={handleContactSupport}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.success + '15' }]}>
                <Mail size={20} color={colors.success} />
              </View>
              <Text style={styles.menuItemText}>Contact Us</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleHelpCenter}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.success + '15' }]}>
                <HelpCircle size={20} color={colors.success} />
              </View>
              <Text style={styles.menuItemText}>Help Center</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>


          <TouchableOpacity style={styles.menuItem} onPress={() => setShowPasswordModal(true)}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.accent + '15' }]}>
                <Lock size={20} color={colors.accent} />
              </View>
              <Text style={styles.menuItemText}>Change Password</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.textSecondary + '15' }]}>
                <LogOut size={20} color={colors.textSecondary} />
              </View>
              <Text style={styles.menuItemText}>Sign Out</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: '#FF3B3020' }]}>
                <Trash2 size={20} color="#FF3B30" />
              </View>
              <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Delete Account</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Cause Planner v1.0.0</Text>
          <Text style={styles.footerSubtext}>Making the world better while acing your classes 🌍</Text>
        </View>
      </ScrollView>
      </ResponsiveContainer>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.safeAreaModal}>
          <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
            <View style={[styles.modalContent, isTablet && styles.modalContentTablet, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Choose Your Plan</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.pricingCardsScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.pricingCards}>
                  {/* Standard Monthly */}
                  <TouchableOpacity
                    style={[styles.pricingCard, loadingPlan === 'standard-monthly' && styles.pricingCardLoading]}
                    onPress={() => handleUpgrade('standard', 'monthly')}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === 'standard-monthly' && (
                      <View style={styles.planLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>Standard</Text>
                      <Text style={styles.pricingBadge}>MONTHLY</Text>
                    </View>
                    <Text style={styles.pricingPrice}>$5</Text>
                    <Text style={styles.pricingPeriod}>per month</Text>
                    <View style={styles.pricingDivider} />
                    <Text style={styles.pricingFeatureText}>• Tasks, Calendar, Classes</Text>
                    <Text style={styles.pricingFeatureText}>• Causes & Community</Text>
                    <Text style={styles.pricingFeatureText}>• 50 AI inquiries/day</Text>
                  </TouchableOpacity>

                  {/* Standard Yearly */}
                  <TouchableOpacity
                    style={[styles.pricingCard, styles.pricingCardRecommended, loadingPlan === 'standard-yearly' && styles.pricingCardLoading]}
                    onPress={() => handleUpgrade('standard', 'yearly')}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === 'standard-yearly' && (
                      <View style={styles.planLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>SAVE $25/YEAR</Text>
                    </View>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>Standard</Text>
                      <Text style={styles.pricingBadge}>YEARLY</Text>
                    </View>
                    <Text style={styles.pricingPrice}>$35</Text>
                    <Text style={styles.pricingPeriod}>per year</Text>
                    <View style={styles.pricingDivider} />
                    <Text style={styles.pricingFeatureText}>• Tasks, Calendar, Classes</Text>
                    <Text style={styles.pricingFeatureText}>• Causes & Community</Text>
                    <Text style={styles.pricingFeatureText}>• 50 AI inquiries/day</Text>
                  </TouchableOpacity>

                  {/* Premium Monthly */}
                  <TouchableOpacity
                    style={[styles.pricingCard, loadingPlan === 'premium-monthly' && styles.pricingCardLoading]}
                    onPress={() => handleUpgrade('premium', 'monthly')}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === 'premium-monthly' && (
                      <View style={styles.planLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>Premium</Text>
                      <Text style={styles.pricingBadge}>MONTHLY</Text>
                    </View>
                    <Text style={styles.pricingPrice}>$10</Text>
                    <Text style={styles.pricingPeriod}>per month</Text>
                    <View style={styles.pricingDivider} />
                    <Text style={styles.pricingFeatureText}>• Everything in Standard</Text>
                    <Text style={styles.pricingFeatureText}>• Sync Syllabus with Calendar</Text>
                    <Text style={styles.pricingFeatureText}>• 100 AI inquiries/day</Text>
                  </TouchableOpacity>

                  {/* Premium Yearly */}
                  <TouchableOpacity
                    style={[styles.pricingCard, styles.pricingCardRecommended, loadingPlan === 'premium-yearly' && styles.pricingCardLoading]}
                    onPress={() => handleUpgrade('premium', 'yearly')}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === 'premium-yearly' && (
                      <View style={styles.planLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>SAVE $50/YEAR</Text>
                    </View>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>Premium</Text>
                      <Text style={styles.pricingBadge}>YEARLY</Text>
                    </View>
                    <Text style={styles.pricingPrice}>$70</Text>
                    <Text style={styles.pricingPeriod}>per year</Text>
                    <View style={styles.pricingDivider} />
                    <Text style={styles.pricingFeatureText}>• Everything in Standard</Text>
                    <Text style={styles.pricingFeatureText}>• Sync Syllabus with Calendar</Text>
                    <Text style={styles.pricingFeatureText}>• 100 AI inquiries/day</Text>
                  </TouchableOpacity>

                  {/* Unlimited Monthly */}
                  <TouchableOpacity
                    style={[styles.pricingCard, loadingPlan === 'unlimited-monthly' && styles.pricingCardLoading]}
                    onPress={() => handleUpgrade('unlimited', 'monthly')}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === 'unlimited-monthly' && (
                      <View style={styles.planLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>Unlimited</Text>
                      <Text style={styles.pricingBadge}>MONTHLY</Text>
                    </View>
                    <Text style={styles.pricingPrice}>$20</Text>
                    <Text style={styles.pricingPeriod}>per month</Text>
                    <View style={styles.pricingDivider} />
                    <Text style={styles.pricingFeatureText}>• Everything in Premium</Text>
                    <Text style={styles.pricingFeatureText}>• 200 AI inquiries/day</Text>
                    <Text style={styles.pricingFeatureText}>• Priority support</Text>
                  </TouchableOpacity>

                  {/* Unlimited Yearly */}
                  <TouchableOpacity
                    style={[styles.pricingCard, styles.pricingCardRecommended, loadingPlan === 'unlimited-yearly' && styles.pricingCardLoading]}
                    onPress={() => handleUpgrade('unlimited', 'yearly')}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === 'unlimited-yearly' && (
                      <View style={styles.planLoadingOverlay}>
                        <ActivityIndicator size="small" color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedBadgeText}>BEST VALUE - SAVE $100/YEAR</Text>
                    </View>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>Unlimited</Text>
                      <Text style={styles.pricingBadge}>YEARLY</Text>
                    </View>
                    <Text style={styles.pricingPrice}>$140</Text>
                    <Text style={styles.pricingPeriod}>per year</Text>
                    <View style={styles.pricingDivider} />
                    <Text style={styles.pricingFeatureText}>• Everything in Premium</Text>
                    <Text style={styles.pricingFeatureText}>• 200 AI inquiries/day</Text>
                    <Text style={styles.pricingFeatureText}>• Priority support</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.causeInfo}>
                  <Heart size={20} color={colors.secondary} fill={colors.secondary} />
                  <Text style={styles.causeInfoText}>
                    Your subscription helps students crush it, protects the planet, and
                    supports mental health for everyone!
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.safeAreaModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => setShowPasswordModal(false)}
              style={[
                styles.modalOverlay,
                isTablet && styles.modalOverlayTablet
              ]}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={!isTablet ? { width: '100%' } : null}
                onPress={(e) => {
                  e.stopPropagation();
                  Keyboard.dismiss();
                }}
              >
                <View style={[styles.modalContent, isTablet && styles.modalContentTablet, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Change Password</Text>
                    <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={[styles.modalInput, currPassError ? styles.inputError : null]}
                      placeholder="Current Password"
                      placeholderTextColor={colors.textSecondary}
                      value={currentPassword}
                      onChangeText={(text) => {
                        setCurrentPassword(text);
                        if (currPassError) setCurrPassError('');
                      }}
                      secureTextEntry
                    />
                    {currPassError ? <Text style={styles.errorText}>{currPassError}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={[styles.modalInput, newPassError ? styles.inputError : null]}
                      placeholder="New Password"
                      placeholderTextColor={colors.textSecondary}
                      value={newPassword}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        if (newPassError) setNewPassError('');
                      }}
                      secureTextEntry
                    />
                    {newPassError ? <Text style={styles.errorText}>{newPassError}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      style={[styles.modalInput, confirmPassError ? styles.inputError : null]}
                      placeholder="Confirm New Password"
                      placeholderTextColor={colors.textSecondary}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (confirmPassError) setConfirmPassError('');
                      }}
                      secureTextEntry
                    />
                    {confirmPassError ? <Text style={styles.errorText}>{confirmPassError}</Text> : null}
                  </View>

                  <Button
                    title="Update Password"
                    onPress={handleChangePassword}
                    isLoading={isChangingPassword}
                    loadingText="Updating..."
                    style={styles.saveButton}
                  />
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.safeAreaModal}>
          <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
            <View style={[styles.modalContent, isTablet && styles.modalContentTablet, styles.legalModalContent, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Terms & Conditions</Text>
                <TouchableOpacity onPress={() => setShowTermsModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.legalScrollView} showsVerticalScrollIndicator={true}>
                <Text style={styles.legalText}>{TERMS_AND_CONDITIONS}</Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.safeAreaModal}>
          <View style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}>
            <View style={[styles.modalContent, isTablet && styles.modalContentTablet, styles.legalModalContent, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Privacy Policy</Text>
                <TouchableOpacity onPress={() => setShowPrivacyModal(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.legalScrollView} showsVerticalScrollIndicator={true}>
                <Text style={styles.legalText}>{PRIVACY_POLICY}</Text>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDeleteModal(false);
          setDeletePassword('');
        }}
      >
        <View style={styles.safeAreaModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {
                setShowDeleteModal(false);
                setDeletePassword('');
              }}
              style={[styles.modalOverlay, isTablet && styles.modalOverlayTablet]}
            >
              <TouchableOpacity
                activeOpacity={1}
                style={!isTablet ? { width: '100%' } : null}
                onPress={(e) => {
                  e.stopPropagation();
                  Keyboard.dismiss();
                }}
              >
                <View style={[styles.modalContent, isTablet && styles.modalContentTablet, { paddingBottom: Math.max(insets.bottom + 24, 24) }]}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {deleteStep === 1 ? 'Why are you leaving?' :
                        deleteStep === 2 ? 'Think twice' :
                          'Confirm Deletion'}
                    </Text>
                    <TouchableOpacity onPress={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                      setDeleteStep(1);
                    }}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {deleteStep === 1 && (
                    <View>
                      <Text style={styles.deleteWarning}>
                        We're sorry to see you go! Please let us know why you're deleting your account so we can improve.
                      </Text>
                      {[
                        'Found a better app',
                        'Too expensive',
                        'Missing features',
                        'Privacy concerns',
                        'Technical issues',
                        'Other'
                      ].map((reason) => (
                        <TouchableOpacity
                          key={reason}
                          style={[
                            styles.reasonItem,
                            deleteReason === reason && styles.reasonItemActive
                          ]}
                          onPress={() => setDeleteReason(reason)}
                        >
                          <Text style={[
                            styles.reasonItemText,
                            deleteReason === reason && styles.reasonItemTextActive
                          ]}>
                            {reason}
                          </Text>
                          {deleteReason === reason && (
                            <CheckCircle2 size={20} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {deleteStep === 2 && (
                    <View>
                      <View style={styles.warningBox}>
                        <AlertTriangle size={32} color="#FF9500" />
                        <Text style={styles.warningBoxTitle}>Warning: Permanent Action</Text>
                      </View>
                      <Text style={styles.deleteWarning}>
                        Deleting your account is permanent and cannot be undone. You will lose access to:
                      </Text>
                      <View style={styles.lossList}>
                        <Text style={styles.lossItem}>• All your saved tasks and classes</Text>
                        <Text style={styles.lossItem}>• Your AI Buddy chat history</Text>
                        <Text style={styles.lossItem}>• Your points, levels and streak history</Text>
                        <Text style={styles.lossItem}>• Active subscription benefits</Text>
                      </View>
                    </View>
                  )}

                  {deleteStep === 3 && (
                    <View>
                      <Text style={styles.deleteWarning}>
                        To finalize this action, please enter your password for verification.
                      </Text>

                      <View style={styles.inputGroup}>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="Enter your password"
                          placeholderTextColor={colors.textSecondary}
                          value={deletePassword}
                          onChangeText={setDeletePassword}
                          secureTextEntry
                          autoFocus
                        />
                      </View>
                    </View>
                  )}

                  <View style={styles.modalButtons}>
                    {deleteStep > 1 && (
                      <Button
                        title="Back"
                        onPress={() => setDeleteStep(prev => prev - 1)}
                        variant="outline"
                        style={styles.modalButton}
                      />
                    )}

                    {deleteStep < 3 ? (
                      <Button
                        title="Continue"
                        onPress={() => setDeleteStep(prev => prev + 1)}
                        disabled={!deleteReason && deleteStep === 1}
                        style={styles.modalButton}
                      />
                    ) : (
                      <Button
                        title="Delete Permanently"
                        onPress={confirmDeleteAccount}
                        isLoading={isDeletingAccount}
                        disabled={!deletePassword}
                        loadingText="Deleting..."
                        variant="danger"
                        style={styles.modalButton}
                      />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaModal: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  subscriptionCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.border,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscriptionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subscriptionTier: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary + '15',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  impactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.secondary,
    lineHeight: 18,
  },
  upgradePrompt: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textLight,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'stretch', // Fill width on mobile
  },
  modalOverlayTablet: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
  },
  modalContentTablet: {
    width: 600,
    maxWidth: '90%',
    alignSelf: 'center',
    borderRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.text,
  },
  modalClose: {
    fontSize: 28,
    color: colors.textSecondary,
  },
  pricingCardsScroll: {
    flexShrink: 1,
  },
  pricingCards: {
    gap: 16,
    marginBottom: 24,
    paddingTop: 16, // Space for the first card's floating badge
  },
  pricingCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.border,
    position: 'relative',
    // Removed overflow: 'hidden' to prevent badge clipping
  },
  pricingCardLoading: {
    opacity: 0.6,
  },
  planLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: 18, // Match the card's borderRadius (20 - border)
  },
  pricingCardRecommended: {
    borderColor: colors.secondary,
    borderWidth: 3,
  },
  pricingCardActive: {
    backgroundColor: colors.secondary + '08',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  recommendedBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: colors.surface,
    letterSpacing: 0.5,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 12, // Added margin to clear the badge
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
  },
  pricingBadge: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.textSecondary,
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pricingPrice: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: colors.primary,
    marginBottom: 4,
  },
  pricingPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  pricingDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  pricingFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  pricingFeatureText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.secondary,
  },
  pricingDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  causeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary + '10',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  causeInfoText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.secondary,
    lineHeight: 18,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
    borderWidth: 1,
    marginBottom: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginLeft: 4,
  },
  legalModalContent: {
    height: '80%',
    paddingBottom: 40,
  },
  legalScrollView: {
    flex: 1,
  },
  legalText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
    paddingBottom: 24,
  },
  deleteWarning: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonDelete: {
    backgroundColor: '#FF3B30',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  modalButtonTextDelete: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalButtonNext: {
    backgroundColor: colors.primary,
  },
  modalButtonTextNext: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonItemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  reasonItemText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  reasonItemTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FF950010',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF950020',
  },
  warningBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9500',
  },
  lossList: {
    backgroundColor: colors.background,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  lossItem: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
  mockButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mockButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mockButtonText: {
    fontSize: 12,
    color: colors.text,
    textTransform: 'capitalize',
  },
  mockButtonTextActive: {
    color: colors.surface,
    fontWeight: 'bold',
  },
  // ── iOS alarm tip card ─────────────────────────────────────────────────────
  iosTipCard: {
    backgroundColor: colors.primary + '12',
    borderRadius: 16,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  iosTipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 8,
  },
  iosTipBold: {
    fontWeight: '700' as const,
    color: colors.primary,
  },
  iosTipSteps: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
    fontStyle: 'italic',
  },
  iosTipBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  iosTipBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
