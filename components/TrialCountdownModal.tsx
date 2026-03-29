import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react-native';
import colors from '@/constants/colors';

interface TrialCountdownModalProps {
    visible: boolean;
    onClose: () => void;
    daysRemaining: number;
    onUpgrade: () => void;
}

const { width } = Dimensions.get('window');

export default function TrialCountdownModal({
    visible,
    onClose,
    daysRemaining,
    onUpgrade,
}: TrialCountdownModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.iconContainer}>
                        <View style={styles.sparkleContainer}>
                            <Sparkles size={32} color={colors.premium} />
                        </View>
                    </View>

                    <Text style={styles.title}>Trial Active!</Text>

                    <View style={styles.countdownContainer}>
                        <Calendar size={20} color={colors.textSecondary} />
                        <Text style={styles.countdownText}>
                            <Text style={styles.daysBold}>{daysRemaining}</Text> {daysRemaining === 1 ? 'day' : 'days'} remaining
                        </Text>
                    </View>

                    <Text style={styles.description}>
                        You're currently enjoying <Text style={styles.unlimitedText}>Unlimited</Text> features! Don't forget to subscribe to keep these superpowers after your trial ends.
                    </Text>

                    <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
                        <Text style={styles.upgradeButtonText}>View Subscription Plans</Text>
                        <ArrowRight size={18} color="#FFFFFF" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Maybe Later</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: 20,
    },
    sparkleContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.premium + '15',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    countdownContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
        gap: 8,
    },
    countdownText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    daysBold: {
        color: colors.premium,
        fontWeight: '800',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    unlimitedText: {
        color: colors.premium,
        fontWeight: '700',
    },
    upgradeButton: {
        backgroundColor: colors.premium,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        gap: 8,
        marginBottom: 16,
    },
    upgradeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    closeButton: {
        paddingVertical: 8,
    },
    closeButtonText: {
        color: colors.textLight,
        fontSize: 14,
        fontWeight: '600',
    },
});
