import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';
import { Flame, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import colors from '@/constants/colors';
import StreakFireAnimation from './StreakFireAnimation';

const { width } = Dimensions.get('window');

interface DailyStreakModalProps {
    visible: boolean;
    streakCount: number;
    onClose: () => void;
}

export default function DailyStreakModal({ visible, streakCount, onClose }: DailyStreakModalProps) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            fadeAnim.setValue(0);
            slideAnim.setValue(50);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <X size={24} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.fireContainer}>
                            <StreakFireAnimation
                                visible={visible}
                                streakNumber={streakCount}
                                onFinish={() => { }}
                            />
                        </View>
                    </View>

                    <View style={styles.body}>
                        <Text style={styles.title}>Daily Streak!</Text>
                        <Text style={styles.description}>
                            You've checked in {streakCount} {streakCount === 1 ? 'day' : 'days'} in a row. Keep it up!
                        </Text>

                        <View style={styles.streakBadge}>
                            <Flame size={20} color={colors.primary} fill={colors.primary} />
                            <Text style={styles.streakCountText}>Day {streakCount}</Text>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.button} onPress={onClose}>
                        <Text style={styles.buttonText}>Awesome!</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        backgroundColor: colors.surface,
        borderRadius: 24,
        width: '100%',
        maxWidth: 400,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    header: {
        height: 120,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    fireContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        alignItems: 'center',
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '10',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.primary + '30',
    },
    streakCountText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        marginLeft: 8,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: colors.surface,
        fontSize: 18,
        fontWeight: '700',
    },
});
