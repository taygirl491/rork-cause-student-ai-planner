import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';

const { width } = Dimensions.get('window');

const CONFETTI_COLORS = [
    '#FF6B35', '#FFD700', '#FF4081', '#00BCD4',
    '#7C4DFF', '#69F0AE', '#FF6E40', '#F9A825',
    '#26C6DA', '#EC407A',
];

const CONFETTI_COUNT = 40;

interface Confetto {
    x: Animated.Value;
    y: Animated.Value;
    rotate: Animated.Value;
    opacity: Animated.Value;
    scale: Animated.Value;
    color: string;
    isRect: boolean;
}

interface DailyStreakModalProps {
    visible: boolean;
    streakCount: number;
    onClose: () => void;
}

export default function DailyStreakModal({ visible, streakCount, onClose }: DailyStreakModalProps) {
    const cardScale = useRef(new Animated.Value(0.4)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const flameScale = useRef(new Animated.Value(0)).current;
    const flameBounce = useRef(new Animated.Value(0)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textTranslate = useRef(new Animated.Value(20)).current;
    const flameBounceLoop = useRef<Animated.CompositeAnimation | null>(null);

    const confetti = useRef<Confetto[]>(
        [...Array(CONFETTI_COUNT)].map(() => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
            color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
            isRect: Math.random() > 0.5,
        }))
    ).current;

    useEffect(() => {
        if (visible) {
            startAnimation();
        } else {
            flameBounceLoop.current?.stop();
            flameBounceLoop.current = null;
            cardScale.setValue(0.4);
            cardOpacity.setValue(0);
            flameScale.setValue(0);
            flameBounce.setValue(0);
            textOpacity.setValue(0);
            textTranslate.setValue(20);
            confetti.forEach(c => {
                c.x.setValue(0);
                c.y.setValue(0);
                c.rotate.setValue(0);
                c.opacity.setValue(0);
                c.scale.setValue(0);
            });
        }
    }, [visible]);

    const startAnimation = () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 350);
        }

        Animated.parallel([
            Animated.spring(cardScale, {
                toValue: 1,
                friction: 7,
                tension: 60,
                useNativeDriver: true,
            }),
            Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => {
            Animated.sequence([
                Animated.spring(flameScale, {
                    toValue: 1.25,
                    friction: 4,
                    tension: 80,
                    useNativeDriver: true,
                }),
                Animated.spring(flameScale, {
                    toValue: 1,
                    friction: 6,
                    tension: 80,
                    useNativeDriver: true,
                }),
            ]).start();

            flameBounceLoop.current = Animated.loop(
                Animated.sequence([
                    Animated.timing(flameBounce, {
                        toValue: -6,
                        duration: 700,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(flameBounce, {
                        toValue: 0,
                        duration: 700,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            );
            flameBounceLoop.current.start();
        }, 150);

        setTimeout(() => {
            Animated.parallel([
                Animated.timing(textOpacity, {
                    toValue: 1,
                    duration: 350,
                    useNativeDriver: true,
                }),
                Animated.timing(textTranslate, {
                    toValue: 0,
                    duration: 350,
                    easing: Easing.out(Easing.back(1.5)),
                    useNativeDriver: true,
                }),
            ]).start();
        }, 250);

        setTimeout(() => {
            const animations = confetti.map((c, i) => {
                const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
                const spread = 160 + Math.random() * 140;
                const duration = 900 + Math.random() * 600;
                return Animated.parallel([
                    Animated.timing(c.x, {
                        toValue: Math.cos(angle) * spread,
                        duration,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(c.y, {
                        toValue: Math.sin(angle) * spread - 60,
                        duration,
                        easing: Easing.out(Easing.quad),
                        useNativeDriver: true,
                    }),
                    Animated.timing(c.rotate, {
                        toValue: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 5),
                        duration,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(c.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
                        Animated.timing(c.opacity, { toValue: 0, duration: duration - 150, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(c.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
                        Animated.timing(c.scale, { toValue: 0.5, duration: duration - 200, useNativeDriver: true }),
                    ]),
                ]);
            });
            Animated.stagger(15, animations).start();
        }, 200);
    };

    const message =
        streakCount === 1 ? "You're on your way!" :
        streakCount < 7 ? 'Keep it going! 💪' :
        streakCount < 30 ? "You're on fire! 🔥" :
        "Incredible dedication! 🏆";

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

                {/* Confetti — centered in the overlay, non-interactive */}
                <View style={styles.confettiOrigin} pointerEvents="none">
                    {confetti.map((c, i) => {
                        const rotation = c.rotate.interpolate({
                            inputRange: [-10, 10],
                            outputRange: ['-720deg', '720deg'],
                        });
                        return (
                            <Animated.View
                                key={i}
                                style={[
                                    c.isRect ? styles.confettoRect : styles.confettoCircle,
                                    {
                                        backgroundColor: c.color,
                                        transform: [
                                            { translateX: c.x },
                                            { translateY: c.y },
                                            { rotate: rotation },
                                            { scale: c.scale },
                                        ],
                                        opacity: c.opacity,
                                    },
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Card */}
                <Animated.View
                    style={[
                        styles.card,
                        { opacity: cardOpacity, transform: [{ scale: cardScale }] },
                    ]}
                >
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>

                    <Animated.Text
                        style={[
                            styles.flameEmoji,
                            { transform: [{ scale: flameScale }, { translateY: flameBounce }] },
                        ]}
                    >
                        🔥
                    </Animated.Text>

                    <Animated.View
                        style={{
                            opacity: textOpacity,
                            transform: [{ translateY: textTranslate }],
                            alignItems: 'center',
                        }}
                    >
                        <Text style={styles.streakNumber}>{streakCount}</Text>
                        <Text style={styles.streakLabel}>Day Streak</Text>
                        <View style={styles.divider} />
                        <Text style={styles.message}>{message}</Text>
                    </Animated.View>

                    <Animated.View
                        style={[styles.buttonWrapper, { opacity: textOpacity }]}
                    >
                        <TouchableOpacity style={styles.button} onPress={onClose}>
                            <Text style={styles.buttonText}>Awesome!</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    confettiOrigin: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confettoRect: {
        position: 'absolute',
        width: 8,
        height: 14,
        borderRadius: 2,
    },
    confettoCircle: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        paddingHorizontal: 48,
        paddingTop: 36,
        paddingBottom: 32,
        alignItems: 'center',
        width: width * 0.78,
        maxWidth: 420,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.2,
        shadowRadius: 24,
        elevation: 16,
    },
    closeButton: {
        position: 'absolute',
        top: 14,
        right: 16,
        padding: 6,
        zIndex: 10,
    },
    closeButtonText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '600',
    },
    flameEmoji: {
        fontSize: 88,
        marginBottom: 8,
    },
    streakNumber: {
        fontSize: 72,
        fontWeight: '900',
        color: '#FF6B35',
        textAlign: 'center',
        lineHeight: 80,
        letterSpacing: -2,
    },
    streakLabel: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'center',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 16,
        width: '100%',
    },
    message: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
        marginBottom: 4,
    },
    buttonWrapper: {
        width: '100%',
        marginTop: 24,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
        width: '100%',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});
