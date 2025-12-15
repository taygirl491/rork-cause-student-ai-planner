import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import colors from '@/constants/colors';
import LogoButton from '@/components/LogoButton';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
// TextInput is imported from react-native above
import { TERMS_AND_CONDITIONS, PRIVACY_POLICY } from '@/constants/LegalText';

type SubscriptionTier = 'free' | 'monthly' | 'yearly';

export default function AccountScreen() {
  const [currentSubscription, setCurrentSubscription] = useState<SubscriptionTier>('free');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const { user, logout, changePassword } = useAuth();
  const router = useRouter();

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

  const handleManagePayment = () => {
    setShowPaymentModal(true);
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    Alert.alert(
      'Upgrade Subscription',
      tier === 'monthly'
        ? 'Subscribe for $4.99/month and support education causes with $1 from every payment!'
        : 'Subscribe for $19.99/year and support education causes with $4 from every payment!',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () => {
            setCurrentSubscription(tier);
            setShowPaymentModal(false);
            Alert.alert('Success!', 'Thank you for subscribing and supporting education causes!');
          },
        },
      ]
    );
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
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deleted', 'Your account has been permanently deleted.');
          },
        },
      ]
    );
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
    const subject = 'Support Request - Cause Student AI Planner';
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
    Alert.alert(
      'Help Center',
      'Visit our help center for FAQs, tutorials, and guides.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Help Center',
          onPress: () => {
            // In a real app, this would open a help center URL
            Linking.openURL('https://causestudentplanner.com/help').catch(() => {
              Alert.alert('Coming Soon', 'Our help center is currently being built. Please contact support for assistance.');
            });
          }
        }
      ]
    );
  };

  const getSubscriptionLabel = () => {
    switch (currentSubscription) {
      case 'monthly':
        return 'Premium Monthly - $4.99/mo';
      case 'yearly':
        return 'Premium Yearly - $19.99/yr';
      default:
        return 'Free Plan';
    }
  };

  const getSubscriptionColor = () => {
    return currentSubscription !== 'free' ? colors.secondary : colors.textSecondary;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <User size={40} color={colors.primary} />
          </View>
          <Text style={styles.title}>{user?.name || 'My Account'}</Text>
          <Text style={styles.subtitle}>{user?.email || 'Manage your subscription and settings'}</Text>
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
                You&apos;re supporting education, environment, and mental health causes!
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

          <TouchableOpacity style={styles.menuItem} onPress={handleManagePayment}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
                <CreditCard size={20} color={colors.primary} />
              </View>
              <Text style={styles.menuItemText}>Manage Payment</Text>
            </View>
            <ChevronRight size={20} color={colors.textLight} />
          </TouchableOpacity>
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
          <Text style={styles.footerText}>Cause Student AI Planner v1.0.0</Text>
          <Text style={styles.footerSubtext}>Making a difference, one task at a time</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Your Plan</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pricingCards}>
              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  currentSubscription === 'monthly' && styles.pricingCardActive,
                ]}
                onPress={() => handleUpgrade('monthly')}
              >
                <View style={styles.pricingHeader}>
                  <Text style={styles.pricingTitle}>Monthly</Text>
                  {currentSubscription === 'monthly' && (
                    <CheckCircle2 size={20} color={colors.secondary} fill={colors.secondary} />
                  )}
                </View>
                <Text style={styles.pricingPrice}>$4.99</Text>
                <Text style={styles.pricingPeriod}>per month</Text>
                <View style={styles.pricingDivider} />
                <View style={styles.pricingFeature}>
                  <Heart size={16} color={colors.secondary} fill={colors.secondary} />
                  <Text style={styles.pricingFeatureText}>$1 to education causes</Text>
                </View>
                <Text style={styles.pricingDescription}>
                  All premium features with monthly flexibility
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.pricingCard,
                  styles.pricingCardRecommended,
                  currentSubscription === 'yearly' && styles.pricingCardActive,
                ]}
                onPress={() => handleUpgrade('yearly')}
              >
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>BEST VALUE</Text>
                </View>
                <View style={styles.pricingHeader}>
                  <Text style={styles.pricingTitle}>Yearly</Text>
                  {currentSubscription === 'yearly' && (
                    <CheckCircle2 size={20} color={colors.secondary} fill={colors.secondary} />
                  )}
                </View>
                <Text style={styles.pricingPrice}>$19.99</Text>
                <Text style={styles.pricingPeriod}>per year</Text>
                <View style={styles.pricingDivider} />
                <View style={styles.pricingFeature}>
                  <Heart size={16} color={colors.secondary} fill={colors.secondary} />
                  <Text style={styles.pricingFeatureText}>$4 to education causes</Text>
                </View>
                <Text style={styles.pricingDescription}>
                  Save $40 per year and maximize your impact!
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.causeInfo}>
              <Heart size={20} color={colors.secondary} fill={colors.secondary} />
              <Text style={styles.causeInfoText}>
                Your subscription supports school supplies, scholarships, Teach for America, and
                more!
              </Text>
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowPasswordModal(false)}
            style={styles.modalOverlay}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => {
                e.stopPropagation();
                Keyboard.dismiss();
              }}
            >
              <View style={styles.modalContent}>
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

                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    isChangingPassword && styles.saveButtonDisabled
                  ]}
                  onPress={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <Text style={styles.saveButtonText}>Updating...</Text>
                  ) : (
                    <Text style={styles.saveButtonText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.legalModalContent]}>
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
      </Modal>

      {/* Privacy Modal */}
      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.legalModalContent]}>
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
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '90%',
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
  pricingCards: {
    gap: 16,
    marginBottom: 24,
  },
  pricingCard: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.border,
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
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
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
});
