
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Flame } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface StreakFireAnimationProps {
    visible: boolean;
    streakNumber: number;
    onFinish: () => void;
}

export default function StreakFireAnimation({ visible, streakNumber, onFinish }: StreakFireAnimationProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const textOpacityAnim = useRef(new Animated.Value(0)).current;
    const textScaleAnim = useRef(new Animated.Value(0.5)).current;
    const flameRotateAnim = useRef(new Animated.Value(0)).current;

    // Layered flames for jitter effect
    const flameJitter1 = useRef(new Animated.Value(0)).current;
    const flameJitter2 = useRef(new Animated.Value(0)).current;

    const particles = useRef([...Array(20)].map(() => ({
        x: new Animated.Value(0),
        y: new Animated.Value(0),
        scale: new Animated.Value(0),
        opacity: new Animated.Value(0),
        color: ['#FF6B35', '#FFAB40', '#FFD54F', '#FFF176'][Math.floor(Math.random() * 4)]
    }))).current;

    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            startAnimation();
        }
    }, [visible]);

    const startAnimation = () => {
        // Reset
        scaleAnim.setValue(0);
        opacityAnim.setValue(0);
        textOpacityAnim.setValue(0);
        textScaleAnim.setValue(0.5);
        flameRotateAnim.setValue(0);
        flameJitter1.setValue(0);
        flameJitter2.setValue(0);
        particles.forEach(p => {
            p.x.setValue(0);
            p.y.setValue(0);
            p.scale.setValue(0);
            p.opacity.setValue(0);
        });

        // Trigger Haptics
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        }

        // Main Animation Sequence
        Animated.sequence([
            // 1. Initial Burst
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1.2,
                    friction: 4,
                    tension: 40,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]),
            // 2. Text Reveal + Bounce
            Animated.parallel([
                Animated.timing(textOpacityAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(textScaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 50,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // 3. Flame Jitter Loop
        const createJitter = (anim: Animated.Value) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: Math.random() * 10 - 5,
                        duration: 50 + Math.random() * 50,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: Math.random() * 10 - 5,
                        duration: 50 + Math.random() * 50,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        createJitter(flameJitter1).start();
        createJitter(flameJitter2).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(flameRotateAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(flameRotateAnim, {
                    toValue: -1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // 4. Enhanced Particles
        const particleAnimations = particles.map((p, i) => {
            const angle = (i / particles.length) * Math.PI * 2 + (Math.random() * 0.5);
            const distance = 120 + Math.random() * 80;
            const duration = 1000 + Math.random() * 500;

            return Animated.parallel([
                Animated.timing(p.x, {
                    toValue: Math.cos(angle) * distance,
                    duration: duration,
                    useNativeDriver: true,
                }),
                Animated.timing(p.y, {
                    toValue: Math.sin(angle) * distance - 50, // Drift upwards
                    duration: duration,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(p.scale, {
                        toValue: 1.5,
                        duration: duration * 0.3,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.scale, {
                        toValue: 0,
                        duration: duration * 0.7,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.sequence([
                    Animated.timing(p.opacity, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(p.opacity, {
                        toValue: 0,
                        duration: duration - 200,
                        useNativeDriver: true,
                    }),
                ]),
            ]);
        });
        Animated.stagger(30, particleAnimations).start();

        // Auto-end after 3.5 seconds
        setTimeout(() => {
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }).start(() => {
                setShouldRender(false);
                onFinish();
            });
        }, 3000);
    };

    if (!shouldRender) return null;

    const rotation = flameRotateAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-8deg', '8deg'],
    });

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                <LinearGradient
                    colors={['rgba(0,0,0,0.8)', 'rgba(255,107,53,0.15)', 'rgba(0,0,0,0.8)']}
                    style={styles.gradient}
                />

                {/* Background Glow */}
                <Animated.View style={[styles.glow, { transform: [{ scale: scaleAnim }] }]} />

                {/* Flame Container */}
                <View style={styles.centerContent}>
                    {/* Particles */}
                    {particles.map((p, i) => (
                        <Animated.View
                            key={i}
                            style={[
                                styles.particle,
                                {
                                    backgroundColor: p.color,
                                    transform: [
                                        { translateX: p.x },
                                        { translateY: p.y },
                                        { scale: p.scale }
                                    ],
                                    opacity: p.opacity
                                }
                            ]}
                        />
                    ))}

                    {/* Layered Flames for "Fire" feel */}
                    <View style={styles.flameLayerContainer}>
                        {/* Back Glow Flame */}
                        <Animated.View style={[styles.flameLayer, { transform: [{ scale: scaleAnim }, { rotate: rotation }, { translateX: flameJitter1 }, { translateY: flameJitter2 }], opacity: 0.6 }]}>
                            <Flame size={140} color="#BF360C" strokeWidth={4} />
                        </Animated.View>

                        {/* Middle Flame */}
                        <Animated.View style={[styles.flameLayer, { transform: [{ scale: scaleAnim }, { rotate: rotation }, { translateX: flameJitter2 }, { translateY: flameJitter1 }] }]}>
                            <Flame size={120} color="#FF6B35" strokeWidth={3} />
                        </Animated.View>

                        {/* Front Core Flame */}
                        <Animated.View style={[styles.flameLayer, { transform: [{ scale: Animated.multiply(scaleAnim, 0.8) }, { rotate: rotation }] }]}>
                            <Flame size={90} color="#FFD54F" strokeWidth={2} />
                        </Animated.View>
                    </View>

                    <Animated.View style={[styles.textContainer, { opacity: textOpacityAnim, transform: [{ scale: textScaleAnim }] }]}>
                        <View style={styles.streakBadge}>
                            <Text style={styles.streakCount}>{streakNumber}</Text>
                        </View>
                        <Text style={styles.streakLabel}>DAY STREAK!</Text>
                        <Text style={styles.congratsText}>You're on fire! 🔥</Text>
                    </Animated.View>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 9999,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlay: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    flameLayerContainer: {
        height: 160,
        width: 160,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flameLayer: {
        position: 'absolute',
    },
    glow: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(255, 107, 53, 0.4)',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 50,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    streakBadge: {
        backgroundColor: 'rgba(255, 107, 53, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FF6B35',
        marginBottom: 10,
    },
    streakCount: {
        fontSize: 84,
        fontWeight: '900',
        color: '#FFF',
        textShadowColor: '#FF6B35',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
    },
    streakLabel: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 4,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
    },
    congratsText: {
        fontSize: 20,
        color: '#FFCCBC',
        marginTop: 12,
        fontWeight: '600',
    },
    particle: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
