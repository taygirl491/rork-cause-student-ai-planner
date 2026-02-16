
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
    Modal,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Upload, FileText, CheckCircle, Circle, Save, Trash2, Pencil, X, File as FileIcon } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import UpgradeModal from '../components/UpgradeModal';
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

interface SelectedFile {
    uri: string;
    name: string;
    type: string;
}

export default function SyllabusParserScreen() {
    const router = useRouter();
    const { user, checkPermission } = useAuth();
    const { addTask } = useApp();

    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [selectedExams, setSelectedExams] = useState<Set<number>>(new Set());
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);



    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Allow cropping to focus on table
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const asset = result.assets[0];
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.fileName || 'syllabus.jpg',
                    type: asset.mimeType || 'image/jpeg'
                });
                setParsedData(null); // Reset previous results
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedFile({
                    uri: asset.uri,
                    name: asset.name,
                    type: asset.mimeType || 'application/pdf' // Default to PDF if unknown from doc picker
                });
                setParsedData(null);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick document');
            console.error(error);
        }
    };

    const handleAnalyze = async () => {
        if (checkPermission && !checkPermission('canSyncSyllabus')) {
            setShowUpgradeModal(true);
            return;
        }

        if (!selectedFile || !user?.uid) return;

        setIsAnalyzing(true);
        try {
            const result = await apiService.parseSyllabus(selectedFile.uri, user.uid, selectedFile.type);

            if (result.success && result.data) {
                console.log("Parsed Data:", result.data);
                setParsedData(result.data);
                // Auto-select all items by default
                const assignIndices = new Set<number>(result.data.assignments?.map((_: any, i: number) => i) || []);
                const examIndices = new Set<number>(result.data.exams?.map((_: any, i: number) => i) || []);
                setSelectedItems(assignIndices);
                setSelectedExams(examIndices);
            } else {
                Alert.alert('Extraction Failed', result.error || 'Could not extract data from the file.');
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

    // Edit Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingType, setEditingType] = useState<'assignment' | 'exam' | null>(null);
    const [editingIndex, setEditingIndex] = useState<number>(-1);
    const [editForm, setEditForm] = useState({ title: '', date: '', description: '' });
    const [isSaving, setIsSaving] = useState(false);

    const openEditModal = (type: 'assignment' | 'exam', index: number) => {
        if (!parsedData) return;
        const item = type === 'assignment'
            ? parsedData.assignments![index]
            : parsedData.exams![index];

        setEditingType(type);
        setEditingIndex(index);
        setEditForm({
            title: item.title,
            date: (type === 'assignment' ? (item as ParsedAssignment).dueDate : (item as ParsedExam).date) || '',
            description: item.description
        });
        setEditModalVisible(true);
    };

    const saveEdit = () => {
        if (!parsedData || !editingType || editingIndex === -1) return;

        const newData = { ...parsedData };
        if (editingType === 'assignment') {
            if (!newData.assignments) newData.assignments = [];
            newData.assignments[editingIndex] = {
                ...newData.assignments[editingIndex],
                title: editForm.title,
                dueDate: editForm.date,
                description: editForm.description
            };
        } else {
            if (!newData.exams) newData.exams = [];
            newData.exams[editingIndex] = {
                ...newData.exams[editingIndex],
                title: editForm.title,
                date: editForm.date,
                description: editForm.description
            };
        }
        setParsedData(newData);
        setEditModalVisible(false);
    };

    const handleSave = async () => {
        if (!parsedData || !user?.uid) return;

        setIsSaving(true);
        try {
            let successCount = 0;

            // Save Assignments as Tasks
            if (parsedData.assignments) {
                for (const index of selectedItems) {
                    const assignment = parsedData.assignments[index];
                    try {
                        await addTask({
                            description: assignment.title, // Map title to description
                            className: parsedData.courseInfo?.code || '',
                            type: 'homework',
                            dueDate: assignment.dueDate ? assignment.dueDate : new Date().toISOString(),
                            priority: 'medium',
                            completed: false,
                            id: '', // Placeholder, will be generated
                            alarmEnabled: false,
                            createdAt: new Date().toISOString()
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
                            description: `EXAM: ${exam.title}`,
                            className: parsedData.courseInfo?.code || '',
                            type: 'exam',
                            dueDate: exam.date ? exam.date : new Date().toISOString(),
                            priority: 'high',
                            completed: false,
                            id: '', // Placeholder
                            alarmEnabled: true, // Enable alarm for exams
                            createdAt: new Date().toISOString()
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
        } catch (error) {
            console.error("Save error:", error);
            Alert.alert('Error', 'Failed to save items. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'top']}>

            <ScrollView style={styles.content}>
                {!selectedFile ? (
                    <View>
                        <TouchableOpacity style={styles.uploadCard} onPress={pickImage}>
                            <View style={styles.uploadIconContainer}>
                                <Upload size={40} color={colors.primary} />
                            </View>
                            <Text style={styles.uploadTitle}>Upload Image</Text>
                            <Text style={styles.uploadSubtitle}>Take a screenshot or photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.uploadCard, { marginTop: 12 }]} onPress={pickDocument}>
                            <View style={[styles.uploadIconContainer, { backgroundColor: colors.secondary + '20' }]}>
                                <FileIcon size={40} color={colors.secondary} />
                            </View>
                            <Text style={styles.uploadTitle}>Upload File</Text>
                            <Text style={styles.uploadSubtitle}>Select a PDF or document</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.previewContainer}>
                        {selectedFile.type.includes('image') ? (
                            <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="contain" />
                        ) : (
                            <View style={[styles.previewImage, styles.previewDoc]}>
                                <FileText size={64} color={colors.textSecondary} />
                                <Text style={styles.previewFilename}>{selectedFile.name}</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.removeImageButton} onPress={() => { setSelectedFile(null); setParsedData(null); }}>
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
                                        <Text style={styles.analyzeButtonText}>
                                            {selectedFile.type.includes('pdf') ? 'Parse Document' : 'Extract Tasks'}
                                        </Text>
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
                                    <View key={`exam-${index}`} style={[styles.itemCard, selectedExams.has(index) && styles.itemCardSelected]}>
                                        <TouchableOpacity
                                            style={styles.itemSelectionArea}
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
                                        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal('exam', index)}>
                                            <Pencil size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {parsedData.assignments && parsedData.assignments.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Assignments found ({selectedItems.size})</Text>
                                {parsedData.assignments.map((assignment, index) => (
                                    <View key={`assign-${index}`} style={[styles.itemCard, selectedItems.has(index) && styles.itemCardSelected]}>
                                        <TouchableOpacity
                                            style={styles.itemSelectionArea}
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
                                        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal('assignment', index)}>
                                            <Pencil size={20} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {parsedData && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.mainSaveButton, isSaving && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Save size={24} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.mainSaveButtonText}>
                                    Confirm & Import ({selectedItems.size + selectedExams.size})
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}

            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setEditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Item</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <X size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Title</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.title}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, title: text }))}
                                placeholder="Assignment Title"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                value={editForm.date}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, date: text }))}
                                placeholder="YYYY-MM-DD"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editForm.description}
                                onChangeText={(text) => setEditForm(prev => ({ ...prev, description: text }))}
                                placeholder="Description"
                                multiline
                                numberOfLines={3}
                            />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={saveEdit}>
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>


            <UpgradeModal
                visible={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="Syllabus Parser"
                message="Automatically import your assignments and exams from your syllabus with the premium plan!"
            />
        </SafeAreaView >
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
    previewDoc: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    previewFilename: {
        marginTop: 16,
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
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
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
        paddingRight: 16, // Padding for edit button
    },
    itemSelectionArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
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
    editButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 8,
    },
    inputGroup: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: colors.text,
        backgroundColor: colors.background,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: colors.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 8,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        padding: 20,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    mainSaveButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
    },
    mainSaveButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
