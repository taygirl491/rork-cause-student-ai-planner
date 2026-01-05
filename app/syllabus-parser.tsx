
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, FileText, CheckCircle, Circle, Save, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import apiService from '@/utils/apiService';
import colors from '@/constants/colors';

// Types for parsed data
interface ParsedAssignment {
    title: string;
    dueDate: string | null;
    description: string;
}

interface ParsedExam {
    title: string;
    date: string | null;
    description: string;
}

interface ParsedData {
    courseInfo?: {
        code: string;
        name: string;
        professor: string;
    };
    assignments?: ParsedAssignment[];
    exams?: ParsedExam[];
}

export default function SyllabusParserScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const { addTask } = useApp();

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [selectedExams, setSelectedExams] = useState<Set<number>>(new Set());

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Allow cropping to focus on table
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setSelectedImage(result.assets[0].uri);
                setParsedData(null); // Reset previous results
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleAnalyze = async () => {
        if (!selectedImage || !user?.uid) return;

        setIsAnalyzing(true);
        try {
            const result = await apiService.parseSyllabus(selectedImage, user.uid);

            if (result.success && result.data) {
                console.log("Parsed Data:", result.data);
                setParsedData(result.data);
                // Auto-select all items by default
                const assignIndices = new Set<number>(result.data.assignments?.map((_: any, i: number) => i) || []);
                const examIndices = new Set<number>(result.data.exams?.map((_: any, i: number) => i) || []);
                setSelectedItems(assignIndices);
                setSelectedExams(examIndices);
            } else {
                Alert.alert('Extraction Failed', result.error || 'Could not extract data from the image.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to analyze syllabus');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const toggleAssignment = (index: number) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedItems(newSelected);
    };

    const toggleExam = (index: number) => {
        const newSelected = new Set(selectedExams);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedExams(newSelected);
    };

    const handleSave = async () => {
        if (!parsedData || !user?.uid) return;

        let successCount = 0;

        // Save Assignments as Tasks
        if (parsedData.assignments) {
            for (const index of selectedItems) {
                const assignment = parsedData.assignments[index];
                try {
                    await addTask({
                        title: assignment.title,
                        description: `${parsedData.courseInfo?.code ? `[${parsedData.courseInfo.code}] ` : ''}${assignment.description || 'Syllabus Assignment'}`,
                        dueDate: assignment.dueDate ? new Date(assignment.dueDate) : new Date(), // Default to today if null? Or maybe null
                        priority: 'Medium',
                        completed: false,
                        userId: user.uid,
                    });
                    successCount++;
                } catch (e) {
                    console.error("Failed to save task", e);
                }
            }
        }

        // Save Exams as Tasks (High Priority)
        if (parsedData.exams) {
            for (const index of selectedExams) {
                const exam = parsedData.exams[index];
                try {
                    await addTask({
                        title: `EXAM: ${exam.title}`,
                        description: `${parsedData.courseInfo?.code ? `[${parsedData.courseInfo.code}] ` : ''}${exam.description || 'Syllabus Exam'}`,
                        dueDate: exam.date ? new Date(exam.date) : new Date(),
                        priority: 'High',
                        completed: false,
                        userId: user.uid,
                    });
                    successCount++;
                } catch (e) {
                    console.error("Failed to save exam", e);
                }
            }
        }

        Alert.alert('Success', `Imported ${successCount} items to your planner!`, [
            { text: 'OK', onPress: () => router.back() }
        ]);
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Import Syllabus</Text>
                <TouchableOpacity onPress={handleSave} disabled={!parsedData} style={{ opacity: parsedData ? 1 : 0 }}>
                    <Save size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
                {!selectedImage ? (
                    <TouchableOpacity style={styles.uploadCard} onPress={pickImage}>
                        <View style={styles.uploadIconContainer}>
                            <Upload size={40} color={colors.primary} />
                        </View>
                        <Text style={styles.uploadTitle}>Upload Syllabus Image</Text>
                        <Text style={styles.uploadSubtitle}>Take a screenshot or photo of your course schedule</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => { setSelectedImage(null); setParsedData(null); }}>
                            <Trash2 size={20} color="white" />
                        </TouchableOpacity>

                        {!parsedData && (
                            <TouchableOpacity
                                style={styles.analyzeButton}
                                onPress={handleAnalyze}
                                disabled={isAnalyzing}
                            >
                                {isAnalyzing ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <>
                                        <FileText size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.analyzeButtonText}>Extract Tasks</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {parsedData && (
                    <View style={styles.resultsContainer}>
                        {parsedData.courseInfo && (
                            <View style={styles.courseHeader}>
                                <Text style={styles.courseCode}>{parsedData.courseInfo.code}</Text>
                                <Text style={styles.courseName}>{parsedData.courseInfo.name}</Text>
                                <Text style={styles.professor}>{parsedData.courseInfo.professor}</Text>
                            </View>
                        )}

                        {parsedData.exams && parsedData.exams.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Exams found ({selectedExams.size})</Text>
                                {parsedData.exams.map((exam, index) => (
                                    <TouchableOpacity
                                        key={`exam-${index}`}
                                        style={[styles.itemCard, selectedExams.has(index) && styles.itemCardSelected]}
                                        onPress={() => toggleExam(index)}
                                    >
                                        <View style={styles.checkbox}>
                                            {selectedExams.has(index) ?
                                                <CheckCircle size={24} color={colors.primary} /> :
                                                <Circle size={24} color={colors.textLight} />
                                            }
                                        </View>
                                        <View style={styles.itemContent}>
                                            <Text style={styles.itemTitle}>{exam.title}</Text>
                                            <Text style={styles.itemDate}>{exam.date || 'No Date'}</Text>
                                            {exam.description && <Text style={styles.itemDesc} numberOfLines={1}>{exam.description}</Text>}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}

                        {parsedData.assignments && parsedData.assignments.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Assignments found ({selectedItems.size})</Text>
                                {parsedData.assignments.map((assignment, index) => (
                                    <TouchableOpacity
                                        key={`assign-${index}`}
                                        style={[styles.itemCard, selectedItems.has(index) && styles.itemCardSelected]}
                                        onPress={() => toggleAssignment(index)}
                                    >
                                        <View style={styles.checkbox}>
                                            {selectedItems.has(index) ?
                                                <CheckCircle size={24} color={colors.primary} /> :
                                                <Circle size={24} color={colors.textLight} />
                                            }
                                        </View>
                                        <View style={styles.itemContent}>
                                            <Text style={styles.itemTitle}>{assignment.title}</Text>
                                            <Text style={styles.itemDate}>{assignment.dueDate || 'No Date'}</Text>
                                            {assignment.description && <Text style={styles.itemDesc} numberOfLines={1}>{assignment.description}</Text>}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
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
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    uploadCard: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: colors.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginTop: 20,
    },
    uploadIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primaryLight + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    uploadTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 8,
    },
    uploadSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    previewContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
    },
    removeImageButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 20,
    },
    analyzeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 16,
        width: '100%',
    },
    analyzeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    resultsContainer: {
        marginTop: 8,
    },
    courseHeader: {
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    courseCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 4,
    },
    courseName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    professor: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 12,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    itemCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primaryLight + '10',
    },
    checkbox: {
        marginRight: 16,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    itemDate: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
        marginBottom: 2,
    },
    itemDesc: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
