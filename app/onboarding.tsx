import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    NativeSyntheticEvent,
    NativeScrollEvent,
    useWindowDimensions,
} from 'react-native';
import Button from '@/components/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';

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
        description: 'Manage classes, tasks, goals, and notes all in one beautiful app',
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
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;

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
        router.replace('/login');
    };

    const handleNext = () => {
        if (currentPage < pages.length - 1) {
            scrollToPage(currentPage + 1);
        }
    };

    const handleGetStarted = async () => {
        await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        router.replace('/login');
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
                        <View key={page.id} style={[styles.page, { width: SCREEN_WIDTH }]}>
                            <View style={[styles.content, isTablet && styles.contentTablet]}>
                                {/* Image */}
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={page.image}
                                        style={[styles.image, isTablet && styles.imageTablet]}
                                        resizeMode="contain"
                                    />
                                </View>

                                {/* Text Content */}
                                <View style={styles.textContainer}>
                                    <Text style={[styles.title, isTablet && styles.titleTablet]}>{page.title}</Text>
                                    <Text style={[styles.description, isTablet && styles.descriptionTablet]}>{page.description}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Bottom Section */}
                <View style={[styles.bottomSection, isTablet && styles.bottomSectionTablet]}>
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
                            <Button
                                title="Next"
                                onPress={handleNext}
                                style={styles.nextButton}
                                textStyle={styles.nextButtonText}
                            />
                        ) : (
                            <Button
                                title="Get Started"
                                onPress={handleGetStarted}
                                style={styles.getStartedButton}
                                textStyle={styles.getStartedButtonText}
                            />
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
        backgroundColor: colors.background,
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
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    contentTablet: {
        maxWidth: 700,
        alignSelf: 'center',
        width: '100%',
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
    imageTablet: {
        maxWidth: 520,
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
    titleTablet: {
        fontSize: 36,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    descriptionTablet: {
        fontSize: 20,
        lineHeight: 30,
    },
    bottomSection: {
        paddingBottom: 40,
        paddingHorizontal: 32,
    },
    bottomSectionTablet: {
        maxWidth: 560,
        alignSelf: 'center',
        width: '100%',
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
