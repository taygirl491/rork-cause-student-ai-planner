import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Flame } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useStreak } from '@/contexts/StreakContext';

interface StreakCardProps {
    onPress?: () => void;
}

export default function StreakCard({ onPress }: StreakCardProps) {
    const { streakData, isLoading } = useStreak();

    if (isLoading) {
        return (
            <View style={styles.card}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }

    const currentStreak = streakData?.current || 0;
    const hasStreak = currentStreak > 0;

    return (
        <TouchableOpacity
            style={[styles.card, hasStreak && styles.cardActive]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, hasStreak && styles.iconContainerActive]}>
                <Flame size={24} color={hasStreak ? '#FF6B35' : colors.textLight} />
            </View>
            <View style={styles.textContainer}>
                {hasStreak ? (
                    <>
                        <Text style={styles.streakNumber}>{currentStreak}</Text>
                        <Text style={styles.streakLabel}>day streak</Text>
                    </>
                ) : (
                    <>
                        <Text style={styles.noStreakText}>Start your streak!</Text>
                        <Text style={styles.noStreakSubtext}>Complete a task today</Text>
                    </>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardActive: {
        borderColor: '#FF6B35',
        backgroundColor: '#FFF5F2',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconContainerActive: {
        backgroundColor: '#FFE5DC',
    },
    textContainer: {
        flex: 1,
    },
    streakNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF6B35',
    },
    streakLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    noStreakText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    noStreakSubtext: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
});
