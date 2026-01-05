import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, CreditCard, Sparkles, Zap, ExternalLink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

import { useStripe } from '@stripe/stripe-react-native';
import apiService from '@/utils/apiService';

// This ID should match the Premium Monthly price ID from AccountScreen
const PREMIUM_MONTHLY_PRICE_ID = 'price_1Sl6opP0t2AuYFqKRMdGp5kO';

const PRICING = {
    name: 'Premium Monthly',
    price: 4.99,
    features: [
        'Unlimited AI conversations',
        'Advanced quiz generation',
        'Document & image uploads',
        'Cross-mode memory',
        'Priority support',
        'Ad-free experience',
    ],
};

export default function PaymentScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const { initPaymentSheet, presentPaymentSheet } = useStripe();

    const handlePayment = async () => {
        if (!user?.uid) {
            Alert.alert('Error', 'Please log in to continue');
            return;
        }

        try {
            setLoading(true);

            // Check if Stripe is initialized
            if (!initPaymentSheet || !presentPaymentSheet) {
                Alert.alert('Configuration Error', 'Stripe SDK is not initialized. Please check your internet connection or restart the app.');
                setLoading(false);
                return;
            }

            // 1. Create subscription via backend
            const response = await apiService.createSubscription(user.uid, PREMIUM_MONTHLY_PRICE_ID);

            if (!response.success) {
                throw new Error(response.error || 'Failed to initialize subscription');
            }

            const { clientSecret, customerId } = response;

            if (!clientSecret) {
                throw new Error('Failed to get payment details');
            }

            // 2. Initialize Payment Sheet
            const { error: initError } = await initPaymentSheet({
                paymentIntentClientSecret: clientSecret.startsWith('pi_') ? clientSecret : undefined,
                setupIntentClientSecret: clientSecret.startsWith('seti_') ? clientSecret : undefined,
                merchantDisplayName: 'Cause Student AI Planner',
                customerId: customerId,
                returnURL: 'cause-student-ai-planner://stripe-redirect',
            });

            if (initError) {
                Alert.alert('Error', initError.message);
                return;
            }

            // 3. Present Payment Sheet
            const { error: paymentError } = await presentPaymentSheet();

            if (paymentError) {
                if (paymentError.code !== 'Canceled') {
                    Alert.alert('Error', paymentError.message);
                }
            } else {
                Alert.alert('Success', 'Thank you for subscribing!', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
        } catch (error: any) {
            console.error('Payment error:', error);
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upgrade to Premium</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.heroSection}>
                    <View style={styles.iconContainer}>
                        <Sparkles size={64} color={colors.primary} />
                    </View>
                    <Text style={styles.heroTitle}>Unlock Your Full Potential</Text>
                    <Text style={styles.heroSubtitle}>
                        Get unlimited access to AI-powered study tools and premium features
                    </Text>
                </View>

                <View style={styles.pricingContainer}>
                    <View style={styles.pricingCard}>
                        <View style={styles.popularBadge}>
                            <Zap size={14} color={colors.surface} />
                            <Text style={styles.popularText}>BEST VALUE</Text>
                        </View>

                        <Text style={styles.planTitle}>{PRICING.name}</Text>

                        <View style={styles.priceContainer}>
                            <Text style={styles.currency}>$</Text>
                            <Text style={styles.price}>{PRICING.price.toFixed(2).split('.')[0]}</Text>
                            <Text style={styles.cents}>.{PRICING.price.toFixed(2).split('.')[1]}</Text>
                            <Text style={styles.interval}>/month</Text>
                        </View>

                        <Text style={styles.billingInfo}>Billed monthly • Cancel anytime</Text>

                        <View style={styles.divider} />

                        <View style={styles.featuresContainer}>
                            <Text style={styles.featuresTitle}>What's included:</Text>
                            {PRICING.features.map((feature, index) => (
                                <View key={index} style={styles.featureRow}>
                                    <Check size={20} color={colors.primary} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={styles.subscribeButton}
                            onPress={handlePayment}
                            disabled={loading}
                        >
                            <CreditCard size={20} color={colors.surface} />
                            <Text style={styles.subscribeButtonText}>
                                Subscribe Now
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.setupNotice}>
                    <View style={styles.noticeCard}>
                        <ExternalLink size={20} color={colors.primary} />
                        <View style={styles.noticeContent}>
                            <Text style={styles.noticeTitle}>Payment Setup Required</Text>
                            <Text style={styles.noticeText}>
                                Stripe payments require a development build. Run: npx eas build --profile development --platform android
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.guaranteeSection}>
                    <View style={styles.guaranteeCard}>
                        <Text style={styles.guaranteeTitle}>💯 30-Day Money-Back Guarantee</Text>
                        <Text style={styles.guaranteeText}>
                            Not satisfied? Get a full refund within 30 days, no questions asked.
                        </Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        🔒 Secure payment powered by Stripe
                    </Text>
                    <Text style={styles.footerSubtext}>
                        Cancel anytime. No hidden fees.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    content: {
        flex: 1,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        marginTop: 8,
        textAlign: 'center',
    },
    heroSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 320,
    },
    pricingContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    pricingCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 28,
        borderWidth: 2,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 12,
        position: 'relative',
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    popularText: {
        color: colors.surface,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    planTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 16,
        textAlign: 'center',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'center',
        marginBottom: 8,
    },
    currency: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary,
        marginRight: 4,
    },
    price: {
        fontSize: 56,
        fontWeight: 'bold',
        color: colors.primary,
        lineHeight: 56,
    },
    cents: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary,
    },
    interval: {
        fontSize: 18,
        color: colors.textSecondary,
        marginLeft: 4,
    },
    billingInfo: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 24,
    },
    featuresContainer: {
        gap: 14,
        marginBottom: 28,
    },
    featuresTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    featureText: {
        fontSize: 15,
        color: colors.text,
        flex: 1,
        lineHeight: 22,
    },
    subscribeButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    subscribeButtonText: {
        color: colors.surface,
        fontSize: 17,
        fontWeight: '700',
    },
    setupNotice: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    noticeCard: {
        backgroundColor: colors.primary + '10',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        gap: 12,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    noticeContent: {
        flex: 1,
    },
    noticeTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    noticeText: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    guaranteeSection: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    guaranteeCard: {
        backgroundColor: colors.primary + '10',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    guaranteeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    guaranteeText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    footerText: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    footerSubtext: {
        fontSize: 12,
        color: colors.textLight,
        marginTop: 4,
        textAlign: 'center',
    },
});
