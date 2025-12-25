import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronUp, ArrowLeft, HelpCircle } from 'lucide-react-native';
import colors from '@/constants/colors';

// Enable LayoutAnimation for Android
if (
    Platform.OS === 'android' &&
    UIManager.setLayoutAnimationEnabledExperimental
) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQ_DATA = [
    {
        id: '1',
        question: 'How do I create a new task?',
        answer:
            "Go to the 'Tasks' tab and tap the '+' button at the bottom of the screen. Fill in the details like title, due date, and priority, then tap 'Add Task'.",
    },
    {
        id: '2',
        question: 'How does the AI Buddy work?',
        answer:
            "The AI Buddy uses advanced AI to help you answer questions, summarize notes, and organize your schedule. You can chat with it in the 'AI Buddy' tab.",
    },
    {
        id: '3',
        question: 'How do I join a study group?',
        answer:
            "Navigate to the 'Study Groups' tab and tap 'Join Group'. Enter the unique group code provided by the group creator to join.",
    },
    {
        id: '4',
        question: 'Can I sync my calendar?',
        answer:
            "Yes! Go to the 'Account' tab and toggle 'Sync with Calendar'. You'll need to grant calendar permissions for this to work.",
    },
    {
        id: '5',
        question: 'How do I track my goals?',
        answer:
            "In the 'Goals' tab, you can create long-term goals and break them down into daily habits. Check off habits daily to build your streak!",
    },
    {
        id: '6',
        question: 'Is my data secure?',
        answer:
            "Yes, we prioritize your privacy. Your data is stored securely and is only accessible by you. We do not sell your personal information.",
    },
    {
        id: '7',
        question: 'How do I delete a task or note?',
        answer:
            "Long-press on any task, note, or item to reveal options, then select 'Delete'. You can also delete items from their detail view.",
    },
    {
        id: '8',
        question: 'How do I submit a video or essay to be featured on Cause Student for a prize?',
        answer:
            "You can email minatoventuresinc@gmail.com with a link to your Youtube video, or send an essay as an attachment.",
    },
];

const FAQItem = ({ item, expanded, onPress }: { item: typeof FAQ_DATA[0], expanded: boolean, onPress: () => void }) => {
    return (
        <View style={styles.itemContainer}>
            <TouchableOpacity
                style={styles.questionContainer}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <Text style={[styles.questionText, expanded && styles.questionTextActive]}>
                    {item.question}
                </Text>
                {expanded ? (
                    <ChevronUp size={20} color={colors.primary} />
                ) : (
                    <ChevronDown size={20} color={colors.textSecondary} />
                )}
            </TouchableOpacity>
            {expanded && (
                <View style={styles.answerContainer}>
                    <Text style={styles.answerText}>{item.answer}</Text>
                </View>
            )}
        </View>
    );
};

export default function FAQScreen() {
    const router = useRouter();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>


            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={{ height: 16 }} />

                <View style={styles.listContainer}>
                    {FAQ_DATA.map((item) => (
                        <FAQItem
                            key={item.id}
                            item={item}
                            expanded={expandedId === item.id}
                            onPress={() => toggleExpand(item.id)}
                        />
                    ))}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Still need help?</Text>
                    <TouchableOpacity onPress={() => { /* TODO: Implement contact support */ }}>
                        <Text style={styles.contactSupport}>Contact Support</Text>
                    </TouchableOpacity>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    introSection: {
        alignItems: 'center',
        padding: 24,
        marginBottom: 8,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    introTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    introSubtitle: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
    listContainer: {
        paddingHorizontal: 16,
    },
    itemContainer: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    questionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    questionText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        flex: 1,
        marginRight: 16,
    },
    questionTextActive: {
        color: colors.primary,
    },
    answerContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        paddingTop: 0,
    },
    answerText: {
        fontSize: 15,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    footer: {
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
    },
    footerText: {
        fontSize: 14,
        color: colors.textLight,
        marginBottom: 8,
    },
    contactSupport: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
});
