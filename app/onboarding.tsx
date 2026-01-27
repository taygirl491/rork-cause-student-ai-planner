import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    ScrollView,
    TouchableOpacity,
    Image,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_COMPLETE_KEY = '@onboarding_complete';

interface OnboardingPage {
    id: number;
    title: string;
    description: string;
    image: any;
}

const pages: OnboardingPage[] = [
    {
        id: 1,
        title: 'Your AI Study Companion',
        description: 'Get help with homework, generate practice quizzes, and summarize study materials with AI',
        image: require('../assets/onboarding/screen-1.webp'),
    },
    {
        id: 2,
        title: 'Everything in One Place',
        description: 'Manage classes, tasks, goals, and study groups all in one beautiful app',
        image: require('../assets/onboarding/screen-2.webp'),
    },
    {
        id: 3,
        title: 'Excel in Your Studies',
        description: 'Track your progress, collaborate with peers, and reach your academic goals',
        image: require('../assets/onboarding/screen-3.webp'),
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [currentPage, setCurrentPage] = useState(0);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / SCREEN_WIDTH);
        setCurrentPage(page);
    };

    const scrollToPage = (page: number) => {
        scrollViewRef.current?.scrollTo({
            x: page * SCREEN_WIDTH,
            animated: true,
        });
    };

    const handleSkip = async () => {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        router.replace('/intro-survey');
    };

    const handleNext = () => {
        if (currentPage < pages.length - 1) {
            scrollToPage(currentPage + 1);
        }
    };

    const handleGetStarted = async () => {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        router.replace('/intro-survey');
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Skip Button */}
                {currentPage < pages.length - 1 && (
                    <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                    </TouchableOpacity>
                )}

                {/* Scrollable Pages */}
                <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    style={styles.scrollView}
                >
                    {pages.map((page) => (
                        <View key={page.id} style={styles.page}>
                            <View style={styles.content}>
                                {/* Image */}
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={page.image}
                                        style={styles.image}
                                        resizeMode="contain"
                                    />
                                </View>

                                {/* Text Content */}
                                <View style={styles.textContainer}>
                                    <Text style={styles.title}>{page.title}</Text>
                                    <Text style={styles.description}>{page.description}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Bottom Section */}
                <View style={styles.bottomSection}>
                    {/* Page Indicators */}
                    <View style={styles.pagination}>
                        {pages.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    currentPage === index && styles.dotActive,
                                ]}
                            />
                        ))}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        {currentPage < pages.length - 1 ? (
                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={handleNext}
                            >
                                <Text style={styles.nextButtonText}>Next</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.getStartedButton}
                                onPress={handleGetStarted}
                            >
                                <Text style={styles.getStartedButtonText}>Get Started</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    safeArea: {
        flex: 1,
    },
    skipButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    skipText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    page: {
        width: SCREEN_WIDTH,
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxHeight: '50%',
    },
    image: {
        width: '100%',
        height: '100%',
        maxWidth: 350,
    },
    textContainer: {
        alignItems: 'center',
        paddingBottom: 40,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    bottomSection: {
        paddingBottom: 40,
        paddingHorizontal: 32,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.border,
        marginHorizontal: 4,
    },
    dotActive: {
        width: 24,
        backgroundColor: colors.primary,
    },
    buttonContainer: {
        width: '100%',
    },
    nextButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    getStartedButton: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    getStartedButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});
