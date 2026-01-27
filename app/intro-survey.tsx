import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import colors from '@/constants/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SurveyQuestion {
    id: number;
    question: string;
    subText?: string;
    type: 'multiple' | 'single' | 'category';
    options: string[] | { category: string, items: string[] }[];
}

const QUESTIONS: SurveyQuestion[] = [
    {
        id: 1,
        question: "What gets you out of bed for school? 🎒",
        subText: "Pick all that vibe with you!",
        type: 'multiple',
        options: [
            "School = friend time! That's where my people are",
            "My teachers are actually pretty cool",
            "My guidance counselor gets me",
            "Honestly? School is just where I belong",
            "Learning how to adult and be a good human",
            "Becoming an expert at something I actually care about",
            "Getting my life together, one day at a time",
            "Keeps me busy and away from drama",
            "Not gonna lie, I actually like learning things",
            "I love a good challenge or debate",
            "Writing, creating, expressing myself—that's my thing",
            "Solving problems makes my brain happy",
            "Sports and gym class? Yes please!",
            "Band/orchestra/chorus is my jam",
            "Clubs and activities are where it's at",
            "Lunchtime hits different 😋",
            "I've got goals, and school is how I reach them",
            "Trying to secure the bag (make that money!) one day",
            "College prep mode activated",
            "I want options when I'm older—real freedom",
            "Building the life I want to live",
            "My family would literally lose it if I didn't go",
            "It's kinda mandatory, so... here I am",
            "Better than sitting at home doing nothing",
        ]
    },
    {
        id: 2,
        question: "So what does school actually mean to YOU? 🤔",
        subText: "Which one hits different?",
        type: 'single',
        options: [
            "School = my social HQ where the squad hangs",
            "School keeps things from getting boring AF",
            "School is lowkey interesting (I said what I said!)",
            "School is my thing—I'm here for ALL the knowledge",
            "School = cool adults who actually care about me",
            "School is where I figure out who I am and what I'm about",
            "School is teaching me how to be a real citizen and use my voice",
            "School gives me structure when life feels chaotic",
            "School lets me explore what I'm good at and what I love",
        ]
    },
    {
        id: 3,
        question: "Why does education even matter? (Real talk) 💬",
        subText: "What's the point? Check all that feel true:",
        type: 'multiple',
        options: [
            "So I actually understand how the world works",
            "Learning how to think, not just what to think",
            "Getting ready for my dream job/career",
            "Becoming someone who can make smart decisions",
            "Figuring out what I'm passionate about",
            "Making friends and learning how to deal with people",
            "Opening doors my family never had",
            "Changing the world (or at least my corner of it)",
            "Getting that diploma/degree that unlocks opportunities",
            "Learning how to learn anything—superpower unlocked!",
        ]
    },
    {
        id: 4,
        question: "What do you wanna be when you grow up? ✨",
        subText: "Dream big! Pick anything that sounds cool (you can totally change your mind later):",
        type: 'category',
        options: [
            {
                category: "Tech & Science Stuff 💻🔬",
                items: [
                    "App Developer/Coder (making the next viral app?)",
                    "Engineer (building cool stuff that works)",
                    "Data Wizard/Analyst",
                    "Architect (designing buildings people actually use!)",
                    "Astronaut (because space is dope)",
                    "Doctor/Nurse/Healthcare Hero",
                ]
            },
            {
                category: "Money Moves 💰",
                items: [
                    "Start my own business/be my own boss",
                    "Work in finance (investment banking, etc.)",
                    "Project Manager (the person who makes things happen)",
                    "HR Professional (helping people find their place)",
                    "Marketing Guru (making brands go viral)",
                ]
            },
            {
                category: "Creative Stuff 🎨🎬",
                items: [
                    "Writer/Author (the next bestseller?)",
                    "Graphic/UX Designer (making things look fire)",
                    "Fashion Designer (drip creator)",
                    "Filmmaker/Director (lights, camera, action!)",
                    "Influencer/Content Creator (building my brand)",
                    "Musician/Producer (making those hits)",
                    "Actor/Performer (main character energy)",
                ]
            },
            {
                category: "Teaching & Helping People 📚❤️",
                items: [
                    "Teacher/Professor (shaping the next generation)",
                    "Therapist/Counselor (helping people heal)",
                    "Social Worker (making real change)",
                    "Nonprofit Leader (doing good in the world)",
                ]
            },
            {
                category: "Hands-On Work 🛠️✂️",
                items: [
                    "Barber/Hair Stylist (making people look fresh)",
                    "Nail Tech (that nail art tho!)",
                    "Massage Therapist (helping people relax)",
                    "Chef (cooking up something special)",
                    "Electrician/Plumber/HVAC Tech (stuff always breaks—job security!)",
                ]
            },
            {
                category: "Protecting & Serving 🚨⚖️",
                items: [
                    "Lawyer (fighting for what's right)",
                    "Police Officer/Detective",
                    "Firefighter (literal hero status)",
                    "Military (serving my country)",
                    "Politician/Public Official (making the rules)",
                    "Urban Planner (designing better cities)",
                ]
            },
            {
                category: "Sports & Arts 🏀🎭",
                items: [
                    "Professional Athlete/Coach (living the dream)",
                    "Artist (painting, sculpting, creating)",
                    "Photographer/Videographer (capturing moments)",
                    "Interior Designer (making spaces beautiful)",
                ]
            },
            {
                category: "Honestly? Still figuring it out! (And that's totally fine!) 🤷",
                items: ["Honestly? Still figuring it out! 🤷"]
            }
        ]
    },
    {
        id: 5,
        question: "What do you stand for? Your core values 💪",
        subText: "What really matters to you? What fires you up?",
        type: 'category',
        options: [
            {
                category: "Making Things Fair ⚖️",
                items: [
                    "Everyone deserves equal chances (DEI for real)",
                    "Human rights aren't negotiable",
                    "Civil rights and justice for all",
                    "Fighting for what's fair",
                ]
            },
            {
                category: "How We Treat People 🤝",
                items: [
                    "Being kind isn't weakness—it's everything",
                    "Respecting everyone, no exceptions",
                    "Treat people how you want to be treated (golden rule!)",
                    "We're better together than apart",
                ]
            },
            {
                category: "Personal Code 🎯",
                items: [
                    "Keeping it 100—honesty and integrity",
                    "Being open-minded and accepting differences",
                    "Bouncing back when life gets hard (resilience!)",
                    "Always growing, always learning",
                    "Thinking outside the box (creativity!)",
                    "Grinding and working hard for what I want",
                ]
            },
            {
                category: "Protecting our planet 🌍",
                items: ["Protecting our planet 🌍"]
            },
            {
                category: "Helping others and giving back",
                items: ["Helping others and giving back"]
            }
        ]
    }
];

export default function IntroSurveyScreen() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string[]>>({});
    const horizontalScrollRef = useRef<ScrollView>(null);

    const toggleOption = (id: number, type: string, option: string) => {
        setAnswers(prev => {
            const currentAnswers = prev[id] || [];
            if (type === 'single') {
                return { ...prev, [id]: [option] };
            }

            if (currentAnswers.includes(option)) {
                return { ...prev, [id]: currentAnswers.filter(a => a !== option) };
            } else {
                return { ...prev, [id]: [...currentAnswers, option] };
            }
        });
    };

    const handleNext = () => {
        if (currentStep < QUESTIONS.length - 1) {
            const nextStep = currentStep + 1;
            setCurrentStep(nextStep);
            horizontalScrollRef.current?.scrollTo({
                x: nextStep * SCREEN_WIDTH,
                animated: true,
            });
        } else {
            // Finish survey
            router.replace('/login');
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            const prevStep = currentStep - 1;
            setCurrentStep(prevStep);
            horizontalScrollRef.current?.scrollTo({
                x: prevStep * SCREEN_WIDTH,
                animated: true,
            });
        }
    };

    const progress = (currentStep + 1) / QUESTIONS.length;

    const renderQuestionOptions = (question: SurveyQuestion) => {
        if (question.type === 'category') {
            const categories = question.options as { category: string, items: string[] }[];
            return categories.map((cat, idx) => (
                <View key={idx} style={styles.categoryContainer}>
                    <Text style={styles.categoryTitle}>{cat.category}</Text>
                    <View style={styles.optionsGrid}>
                        {cat.items.map((item, itemIdx) => {
                            const isSelected = (answers[question.id] || []).includes(item);
                            return (
                                <TouchableOpacity
                                    key={itemIdx}
                                    style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                                    onPress={() => toggleOption(question.id, question.type, item)}
                                >
                                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                                        {isSelected && <Check size={14} color="#cce0a0aff" strokeWidth={3} />}
                                    </View>
                                    <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{item}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            ));
        }

        const options = question.options as string[];
        return (
            <View style={styles.optionsList}>
                {options.map((option, idx) => {
                    const isSelected = (answers[question.id] || []).includes(option);
                    return (
                        <TouchableOpacity
                            key={idx}
                            style={[
                                styles.optionItem,
                                isSelected && styles.optionItemSelected
                            ]}
                            onPress={() => toggleOption(question.id, question.type, option)}
                        >
                            <View style={[
                                styles.radio,
                                question.type === 'multiple' && styles.checkbox,
                                isSelected && styles.radioSelected,
                                isSelected && question.type === 'multiple' && styles.checkboxSelected
                            ]}>
                                {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                            </View>
                            <Text style={[styles.optionItemText, isSelected && styles.optionItemTextSelected]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={StyleSheet.absoluteFill}
            />
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.stepText}>Step {currentStep + 1} of {QUESTIONS.length}</Text>
                </View>

                <View style={styles.content}>
                    <ScrollView
                        ref={horizontalScrollRef}
                        horizontal
                        pagingEnabled
                        scrollEnabled={false}
                        showsHorizontalScrollIndicator={false}
                        style={styles.horizontalScrollView}
                        contentContainerStyle={styles.horizontalScrollContent}
                    >
                        {QUESTIONS.map((question) => (
                            <View key={question.id} style={styles.questionPage}>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.scrollContent}
                                >
                                    <Text style={styles.question}>{question.question}</Text>
                                    {question.subText && <Text style={styles.subText}>{question.subText}</Text>}

                                    <View style={styles.optionsContainer}>
                                        {renderQuestionOptions(question)}
                                    </View>
                                </ScrollView>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.footer}>
                    {currentStep > 0 ? (
                        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={{ flex: 1 }} />
                    )}
                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            !(answers[QUESTIONS[currentStep].id]?.length > 0) && styles.nextButtonDisabled
                        ]}
                        onPress={handleNext}
                        disabled={!(answers[QUESTIONS[currentStep].id]?.length > 0)}
                    >
                        <Text style={styles.nextButtonText}>
                            {currentStep === QUESTIONS.length - 1 ? "Finish" : "Next"}
                        </Text>
                        <ChevronRight size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },
    progressContainer: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 3,
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#fff',
        borderRadius: 3,
    },
    stepText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        opacity: 0.8,
    },
    content: {
        flex: 1,
    },
    horizontalScrollView: {
        flex: 1,
    },
    horizontalScrollContent: {
        // Automatically handled by horizontal scrollview but good to specify
    },
    questionPage: {
        width: SCREEN_WIDTH,
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 40,
    },
    question: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 12,
    },
    subText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 32,
        lineHeight: 22,
    },
    optionsContainer: {
        flex: 1,
    },
    optionsList: {
        gap: 12,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    optionItemSelected: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    optionItemText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
        flex: 1,
    },
    optionItemTextSelected: {
        color: colors.primary,
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#fff',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    checkbox: {
        borderRadius: 6,
    },
    checkboxSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryContainer: {
        marginBottom: 24,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
        opacity: 0.9,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    optionCardSelected: {
        backgroundColor: '#fff',
        borderColor: '#fff',
    },
    optionText: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
    },
    optionTextSelected: {
        color: colors.primary,
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 12 : 24,
        gap: 12,
    },
    backButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    nextButton: {
        flex: 2,
        flexDirection: 'row',
        paddingVertical: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    nextButtonDisabled: {
        opacity: 0.5,
    },
    nextButtonText: {
        color: colors.primary,
        fontSize: 18,
        fontWeight: '700',
    },
});
