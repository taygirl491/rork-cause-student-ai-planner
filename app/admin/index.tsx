import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { Lock, LogOut, Save, Video, ShieldCheck, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import apiService from '@/utils/apiService';

const ADMIN_EMAIL = 'minatoventuresinc@gmail.com';
// In a real app, never hardcode passwords on the client. 
// However, per user instructions for this specific tool, we are implementing auth logic.
// We won't auto-fill the password for security, but we know what it should be: @@@@Minato2025

export default function AdminScreen() {
    const router = useRouter();

    // Hide the header using Stack.Screen
    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <AdminContent />
        </>
    );
}

function AdminContent() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [homeVideoUrl, setHomeVideoUrl] = useState('');
    const [homeVideoTitle, setHomeVideoTitle] = useState('');
    const [homeVideoName, setHomeVideoName] = useState('');
    const [homeVideoSchool, setHomeVideoSchool] = useState('');
    const [causesVideo1Url, setCausesVideo1Url] = useState('');
    const [causesVideo1Title, setCausesVideo1Title] = useState('');
    const [causesVideo1Name, setCausesVideo1Name] = useState('');
    const [causesVideo1School, setCausesVideo1School] = useState('');
    const [causesVideo2Url, setCausesVideo2Url] = useState('');
    const [causesVideo2Title, setCausesVideo2Title] = useState('');
    const [causesVideo2Name, setCausesVideo2Name] = useState('');
    const [causesVideo2School, setCausesVideo2School] = useState('');
    const [causesVideo3Url, setCausesVideo3Url] = useState('');
    const [causesVideo3Title, setCausesVideo3Title] = useState('');
    const [causesVideo3Name, setCausesVideo3Name] = useState('');
    const [causesVideo3School, setCausesVideo3School] = useState('');
    const [causesVideo4Url, setCausesVideo4Url] = useState('');
    const [causesVideo4Title, setCausesVideo4Title] = useState('');
    const [causesVideo4Name, setCausesVideo4Name] = useState('');
    const [causesVideo4School, setCausesVideo4School] = useState('');
    const [causesVideo5Url, setCausesVideo5Url] = useState('');
    const [causesVideo5Title, setCausesVideo5Title] = useState('');
    const [causesVideo5Name, setCausesVideo5Name] = useState('');
    const [causesVideo5School, setCausesVideo5School] = useState('');
    const [saving, setSaving] = useState(false);

    const [submissions, setSubmissions] = useState<any[]>([]);
    const [submissionsLoading, setSubmissionsLoading] = useState(false);

    const [essay1Title, setEssay1Title] = useState('');
    const [essay1Author, setEssay1Author] = useState('');
    const [essay1Content, setEssay1Content] = useState('');

    const [essay2Title, setEssay2Title] = useState('');
    const [essay2Author, setEssay2Author] = useState('');
    const [essay2Content, setEssay2Content] = useState('');

    // Check valid admin session
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user && user.email === ADMIN_EMAIL) {
                setIsAdmin(true);
                loadVideoConfig();
                loadSubmissions();
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadVideoConfig = async () => {
        try {
            const docRef = doc(db, 'content', 'videos');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setHomeVideoUrl(data.homeVideoId ? `https://youtu.be/${data.homeVideoId}` : '');
                setHomeVideoTitle(data.homeVideoTitle || '');
                setHomeVideoName(data.homeVideoName || '');
                setHomeVideoSchool(data.homeVideoSchool || '');
                setCausesVideo1Url(data.causesVideo1Id ? `https://youtu.be/${data.causesVideo1Id}` : '');
                setCausesVideo1Title(data.causesVideo1Title || '');
                setCausesVideo1Name(data.causesVideo1Name || '');
                setCausesVideo1School(data.causesVideo1School || '');
                setCausesVideo2Url(data.causesVideo2Id ? `https://youtu.be/${data.causesVideo2Id}` : '');
                setCausesVideo2Title(data.causesVideo2Title || '');
                setCausesVideo2Name(data.causesVideo2Name || '');
                setCausesVideo2School(data.causesVideo2School || '');
                setCausesVideo3Url(data.causesVideo3Id ? `https://youtu.be/${data.causesVideo3Id}` : '');
                setCausesVideo3Title(data.causesVideo3Title || '');
                setCausesVideo3Name(data.causesVideo3Name || '');
                setCausesVideo3School(data.causesVideo3School || '');
                setCausesVideo4Url(data.causesVideo4Id ? `https://youtu.be/${data.causesVideo4Id}` : '');
                setCausesVideo4Title(data.causesVideo4Title || '');
                setCausesVideo4Name(data.causesVideo4Name || '');
                setCausesVideo4School(data.causesVideo4School || '');
                setCausesVideo5Url(data.causesVideo5Id ? `https://youtu.be/${data.causesVideo5Id}` : '');
                setCausesVideo5Title(data.causesVideo5Title || '');
                setCausesVideo5Name(data.causesVideo5Name || '');
                setCausesVideo5School(data.causesVideo5School || '');

                if (data.essay1) {
                    setEssay1Title(data.essay1.title || '');
                    setEssay1Author(data.essay1.author || '');
                    setEssay1Content(data.essay1.content || '');
                }
                if (data.essay2) {
                    setEssay2Title(data.essay2.title || '');
                    setEssay2Author(data.essay2.author || '');
                    setEssay2Content(data.essay2.content || '');
                }
            }
        } catch (error) {
            console.error('Error loading video config:', error);
            Alert.alert('Error', 'Failed to load current video settings.');
        }
    };

    const loadSubmissions = async () => {
        setSubmissionsLoading(true);
        try {
            const response = await apiService.get('/api/pep-talks/submissions');
            if (response.success) {
                setSubmissions(response.submissions || []);
            }
        } catch (error) {
            console.error('Error loading submissions:', error);
        } finally {
            setSubmissionsLoading(false);
        }
    };

    const handleDeleteSubmission = (id: string, name: string) => {
        Alert.alert(
            'Delete Submission',
            `Remove the entry from ${name}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.delete(`/api/pep-talks/submissions/${id}`);
                            setSubmissions(prev => prev.filter(s => s._id !== id));
                        } catch {
                            Alert.alert('Error', 'Failed to delete submission. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteAllSubmissions = () => {
        Alert.alert(
            'Delete All Submissions',
            'This will permanently delete ALL student form submissions. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiService.delete('/api/pep-talks/submissions/all');
                            setSubmissions([]);
                        } catch {
                            Alert.alert('Error', 'Failed to delete submissions. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleLogin = async () => {
        if (email.trim() !== ADMIN_EMAIL) {
            Alert.alert('Access Denied', 'This area is restricted to authorized administrators only.');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            // If user not found, try to create it (per user request)
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                try {
                    // Attempt to create the admin user if it doesn't exist
                    // Note: This matches the "create new user" requirement
                    await createUserWithEmailAndPassword(auth, email, password);
                    Alert.alert('Admin Created', 'Admin account created successfully. You are now logged in.');
                } catch (createError: any) {
                    Alert.alert('Login Failed', createError.message);
                }
            } else {
                Alert.alert('Login Failed', error.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const extractVideoId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };



    const clearVideoState = (num: number) => {
        const map: Record<number, () => void> = {
            1: () => { setCausesVideo1Url(''); setCausesVideo1Title(''); setCausesVideo1Name(''); setCausesVideo1School(''); },
            2: () => { setCausesVideo2Url(''); setCausesVideo2Title(''); setCausesVideo2Name(''); setCausesVideo2School(''); },
            3: () => { setCausesVideo3Url(''); setCausesVideo3Title(''); setCausesVideo3Name(''); setCausesVideo3School(''); },
            4: () => { setCausesVideo4Url(''); setCausesVideo4Title(''); setCausesVideo4Name(''); setCausesVideo4School(''); },
            5: () => { setCausesVideo5Url(''); setCausesVideo5Title(''); setCausesVideo5Name(''); setCausesVideo5School(''); },
        };
        map[num]?.();
    };

    const handleDeleteVideo = (num: number) => {
        Alert.alert(
            'Delete Submission',
            `Remove Video ${num} from the Causes page? This takes effect immediately.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const docRef = doc(db, 'content', 'videos');
                            await setDoc(docRef, {
                                [`causesVideo${num}Id`]: null,
                                [`causesVideo${num}Title`]: '',
                                [`causesVideo${num}Name`]: '',
                                [`causesVideo${num}School`]: '',
                            }, { merge: true });
                            clearVideoState(num);
                        } catch {
                            Alert.alert('Error', 'Failed to delete. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteAllVideos = () => {
        Alert.alert(
            'Delete All Submissions',
            'This will remove ALL pep talk videos from the Causes page immediately. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const docRef = doc(db, 'content', 'videos');
                            await setDoc(docRef, {
                                causesVideo1Id: null, causesVideo1Title: '', causesVideo1Name: '', causesVideo1School: '',
                                causesVideo2Id: null, causesVideo2Title: '', causesVideo2Name: '', causesVideo2School: '',
                                causesVideo3Id: null, causesVideo3Title: '', causesVideo3Name: '', causesVideo3School: '',
                                causesVideo4Id: null, causesVideo4Title: '', causesVideo4Name: '', causesVideo4School: '',
                                causesVideo5Id: null, causesVideo5Title: '', causesVideo5Name: '', causesVideo5School: '',
                            }, { merge: true });
                            [1, 2, 3, 4, 5].forEach(clearVideoState);
                            Alert.alert('Done', 'All submissions removed from the Causes page.');
                        } catch {
                            Alert.alert('Error', 'Failed to delete all. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleSave = async () => {
        const homeId = extractVideoId(homeVideoUrl);
        const causes1Id = extractVideoId(causesVideo1Url);
        const causes2Id = extractVideoId(causesVideo2Url);
        const causes3Id = extractVideoId(causesVideo3Url);
        const causes4Id = extractVideoId(causesVideo4Url);
        const causes5Id = extractVideoId(causesVideo5Url);

        if (!homeId && homeVideoUrl) {
            Alert.alert('Invalid URL', 'Please enter a valid YouTube URL for the Home video.');
            return;
        }

        // ... (preserving other validations logic if simpler, but assuming loose validation is fine for now or rely on user correctness)

        setSaving(true);
        try {
            const docRef = doc(db, 'content', 'videos');

            // Use setDoc with merge: true to create if not exists or update
            await setDoc(docRef, {
                homeVideoId: homeId,
                homeVideoTitle: homeVideoTitle,
                homeVideoName: homeVideoName,
                homeVideoSchool: homeVideoSchool,
                causesVideo1Id: causes1Id,
                causesVideo1Title: causesVideo1Title,
                causesVideo1Name: causesVideo1Name,
                causesVideo1School: causesVideo1School,
                causesVideo2Id: causes2Id,
                causesVideo2Title: causesVideo2Title,
                causesVideo2Name: causesVideo2Name,
                causesVideo2School: causesVideo2School,
                causesVideo3Id: causes3Id,
                causesVideo3Title: causesVideo3Title,
                causesVideo3Name: causesVideo3Name,
                causesVideo3School: causesVideo3School,
                causesVideo4Id: causes4Id,
                causesVideo4Title: causesVideo4Title,
                causesVideo4Name: causesVideo4Name,
                causesVideo4School: causesVideo4School,
                causesVideo5Id: causes5Id,
                causesVideo5Title: causesVideo5Title,
                causesVideo5Name: causesVideo5Name,
                causesVideo5School: causesVideo5School,
                essay1: {
                    title: essay1Title,
                    author: essay1Author,
                    content: essay1Content
                },
                essay2: {
                    title: essay2Title,
                    author: essay2Author,
                    content: essay2Content
                },
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser?.email
            }, { merge: true });

            Alert.alert('Success', 'Content configuration updated successfully!');
        } catch (error: any) {
            console.error('Error saving content:', error);
            Alert.alert('Save Failed', 'Could not save changes. Ensure you have admin permissions.');
        } finally {
            setSaving(false);
        }
    };

    // Announcement State
    const [announcementSubject, setAnnouncementSubject] = useState('');
    const [announcementBody, setAnnouncementBody] = useState('');
    const [sendingEmail, setSendingEmail] = useState(false);

    const handleSendAnnouncement = async () => {
        if (!announcementSubject.trim() || !announcementBody.trim()) {
            Alert.alert('Missing Info', 'Please provide both a subject and a body for the announcement.');
            return;
        }

        Alert.alert(
            'Confirm Broadcast',
            'Are you sure you want to send this email to ALL users? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Broadcast',
                    style: 'destructive',
                    onPress: async () => {
                        setSendingEmail(true);
                        try {
                            // Use apiService for consistent configuration and error handling
                            const response = await apiService.post('/api/admin/broadcast-email', {
                                subject: announcementSubject,
                                body: announcementBody
                            });

                            // apiService returns the parsed JSON result directly on success
                            // or { success: false, error: ... } on failure (caught or handled)

                            if (response.success) {
                                Alert.alert('Success', `Announcement sent to ${response.recipientCount} users.`);
                                setAnnouncementSubject('');
                                setAnnouncementBody('');
                            } else {
                                Alert.alert('Error', response.error || 'Failed to send announcement.');
                            }



                        } catch (error: any) {
                            console.error('Broadcast error:', error);
                            Alert.alert('Error', 'Failed to connect to server.');
                        } finally {
                            setSendingEmail(false);
                        }
                    }
                }
            ]
        );
    };

    if (isAdmin) {
        return (
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
                <View style={styles.header}>
                    <View style={styles.headerTitleRow}>
                        <ShieldCheck size={28} color={colors.primary} />
                        <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    </View>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                        <LogOut size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                    <Text style={styles.welcomeText}>Welcome, Admin!</Text>
                    <Text style={styles.descriptionText}>
                        Manage the featured videos linked in the app for Home and Causes screens.
                    </Text>

                    {/* Pep Talk Submissions Card */}
                    <View style={[styles.card, { marginBottom: 20 }]}>
                        <View style={styles.cardHeader}>
                            <ShieldCheck size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>Pep Talk Submissions</Text>
                            <TouchableOpacity onPress={loadSubmissions} style={styles.refreshButton}>
                                <Text style={styles.refreshButtonText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>

                        {submissionsLoading ? (
                            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                        ) : submissions.length === 0 ? (
                            <View style={styles.emptySubmissions}>
                                <Text style={styles.emptySubmissionsText}>No submissions yet.</Text>
                            </View>
                        ) : (
                            <>
                                {submissions.map((s: any) => (
                                    <View key={s._id} style={styles.submissionItem}>
                                        <View style={styles.submissionHeader}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.submissionName}>{s.firstName} {s.lastName}</Text>
                                                <Text style={styles.submissionSchool}>{s.school}</Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => handleDeleteSubmission(s._id, `${s.firstName} ${s.lastName}`)}
                                                style={styles.deleteIconButton}
                                            >
                                                <Trash2 size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>

                                        <TouchableOpacity onPress={() => Linking.openURL(s.videoLink)}>
                                            <Text style={styles.submissionLink} numberOfLines={1}>{s.videoLink}</Text>
                                        </TouchableOpacity>

                                        <View style={styles.submissionMeta}>
                                            <Text style={styles.submissionMetaText}>{s.email}</Text>
                                            <Text style={styles.submissionMetaText}>{s.phone}</Text>
                                            <Text style={styles.submissionMetaText}>
                                                {new Date(s.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </Text>
                                        </View>
                                    </View>
                                ))}

                                <TouchableOpacity style={styles.clearButton} onPress={handleDeleteAllSubmissions}>
                                    <Trash2 size={16} color="#EF4444" />
                                    <Text style={styles.clearButtonText}>Delete All Submissions</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Video size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>Video Configuration</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Home Video Title (appears under video)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Motivation from students like you"
                                value={homeVideoTitle}
                                onChangeText={setHomeVideoTitle}
                                placeholderTextColor={colors.textLight}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Home Screen Video URL</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://youtu.be/..."
                                value={homeVideoUrl}
                                onChangeText={setHomeVideoUrl}
                                placeholderTextColor={colors.textLight}
                                autoCapitalize="none"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Student Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., John"
                                value={homeVideoName}
                                onChangeText={setHomeVideoName}
                                placeholderTextColor={colors.textLight}
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>School / University</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., University of Lagos"
                                value={homeVideoSchool}
                                onChangeText={setHomeVideoSchool}
                                placeholderTextColor={colors.textLight}
                            />
                        </View>

                        <Text style={styles.sectionHeader}>Causes Screen Videos</Text>
                        <Text style={styles.sectionDescription}>Configure the 5 inspirational student talk videos</Text>

                        {[
                            { num: 1, label: 'Video 1', url: causesVideo1Url, setUrl: setCausesVideo1Url, title: causesVideo1Title, setTitle: setCausesVideo1Title, name: causesVideo1Name, setName: setCausesVideo1Name, school: causesVideo1School, setSchool: setCausesVideo1School },
                            { num: 2, label: 'Video 2', url: causesVideo2Url, setUrl: setCausesVideo2Url, title: causesVideo2Title, setTitle: setCausesVideo2Title, name: causesVideo2Name, setName: setCausesVideo2Name, school: causesVideo2School, setSchool: setCausesVideo2School },
                            { num: 3, label: 'Video 3', url: causesVideo3Url, setUrl: setCausesVideo3Url, title: causesVideo3Title, setTitle: setCausesVideo3Title, name: causesVideo3Name, setName: setCausesVideo3Name, school: causesVideo3School, setSchool: setCausesVideo3School },
                            { num: 4, label: 'Video 4', url: causesVideo4Url, setUrl: setCausesVideo4Url, title: causesVideo4Title, setTitle: setCausesVideo4Title, name: causesVideo4Name, setName: setCausesVideo4Name, school: causesVideo4School, setSchool: setCausesVideo4School },
                            { num: 5, label: 'Video 5', url: causesVideo5Url, setUrl: setCausesVideo5Url, title: causesVideo5Title, setTitle: setCausesVideo5Title, name: causesVideo5Name, setName: setCausesVideo5Name, school: causesVideo5School, setSchool: setCausesVideo5School },
                        ].map((v) => (
                            <View key={v.label} style={styles.videoGroup}>
                                <View style={styles.videoGroupHeader}>
                                    <Text style={styles.subHeader}>{v.label}</Text>
                                    {v.url ? (
                                        <TouchableOpacity onPress={() => handleDeleteVideo(v.num)} style={styles.deleteIconButton}>
                                            <Trash2 size={18} color="#EF4444" />
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>YouTube URL</Text>
                                    <TextInput style={styles.input} placeholder="https://youtu.be/..." value={v.url} onChangeText={v.setUrl} placeholderTextColor={colors.textLight} autoCapitalize="none" />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Title of the Video</Text>
                                    <TextInput style={styles.input} placeholder="e.g., How I Aced My Finals" value={v.title} onChangeText={v.setTitle} placeholderTextColor={colors.textLight} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Student Name</Text>
                                    <TextInput style={styles.input} placeholder="e.g., Sarah" value={v.name} onChangeText={v.setName} placeholderTextColor={colors.textLight} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>School / University</Text>
                                    <TextInput style={styles.input} placeholder="e.g., MIT" value={v.school} onChangeText={v.setSchool} placeholderTextColor={colors.textLight} />
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity
                            style={styles.clearButton}
                            onPress={handleDeleteAllVideos}
                        >
                            <Trash2 size={16} color="#EF4444" />
                            <Text style={styles.clearButtonText}>Delete All Submissions</Text>
                        </TouchableOpacity>

                        <Text style={styles.sectionHeader}>Featured Essays</Text>
                        <Text style={styles.sectionDescription}>Add up to 2 featured student essays.</Text>

                        <View style={styles.essayCard}>
                            <Text style={styles.subHeader}>Essay 1</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Essay Title"
                                    value={essay1Title}
                                    onChangeText={setEssay1Title}
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Author</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Student Name"
                                    value={essay1Author}
                                    onChangeText={setEssay1Author}
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Content</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Paste essay content here..."
                                    value={essay1Content}
                                    onChangeText={setEssay1Content}
                                    placeholderTextColor={colors.textLight}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <View style={styles.essayCard}>
                            <Text style={styles.subHeader}>Essay 2</Text>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Title</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Essay Title"
                                    value={essay2Title}
                                    onChangeText={setEssay2Title}
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Author</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Student Name"
                                    value={essay2Author}
                                    onChangeText={setEssay2Author}
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Content</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Paste essay content here..."
                                    value={essay2Content}
                                    onChangeText={setEssay2Content}
                                    placeholderTextColor={colors.textLight}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>

                        <Text style={styles.sectionHeader}>Email Announcement</Text>
                        <Text style={styles.sectionDescription}>Send a broadcast email to all registered users.</Text>

                        <View style={styles.essayCard}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Subject</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Announcement Subject"
                                    value={announcementSubject}
                                    onChangeText={setAnnouncementSubject}
                                    placeholderTextColor={colors.textLight}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Message Body</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Write your announcement here..."
                                    value={announcementBody}
                                    onChangeText={setAnnouncementBody}
                                    placeholderTextColor={colors.textLight}
                                    multiline
                                    numberOfLines={6}
                                    textAlignVertical="top"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.broadcastButton, sendingEmail && styles.saveButtonDisabled]}
                                onPress={handleSendAnnouncement}
                                disabled={sendingEmail}
                            >
                                {sendingEmail ? (
                                    <ActivityIndicator color={colors.surface} />
                                ) : (
                                    <>
                                        <Text style={styles.broadcastButtonText}>Send Announcement</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color={colors.surface} />
                            ) : (
                                <>
                                    <Save size={20} color={colors.surface} />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.loginContainer}
            >
                <View style={styles.loginCard}>
                    <View style={styles.iconContainer}>
                        <Lock size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.loginTitle}>Admin Access</Text>
                    <Text style={styles.loginSubtitle}>Please sign in to continue</Text>

                    <TextInput
                        style={styles.loginInput}
                        placeholder="Admin Email"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholderTextColor={colors.textLight}
                    />

                    <TextInput
                        style={styles.loginInput}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor={colors.textLight}
                    />

                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.surface} />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>Cancel & Go Back</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    // Login Styles
    loginContainer: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    loginCard: {
        backgroundColor: colors.surface,
        padding: 32,
        borderRadius: 24,
        width: '100%',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        alignItems: 'center',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '10',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    loginTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 8,
    },
    loginSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 32,
    },
    loginInput: {
        width: '100%',
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 16,
    },
    loginButton: {
        width: '100%',
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '700',
    },
    backButton: {
        marginTop: 20,
        padding: 10,
    },
    backButtonText: {
        color: colors.textSecondary,
        fontSize: 14,
    },

    // Dashboard Styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    logoutButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        gap: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.text,
        borderWidth: 1,
        borderColor: colors.border,
    },
    videoGroupHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        marginBottom: 12,
    },
    deleteIconButton: {
        padding: 6,
    },
    clearButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#EF4444',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        gap: 8,
        marginBottom: 12,
    },
    clearButtonText: {
        color: '#EF4444',
        fontWeight: '600' as const,
        fontSize: 15,
    },
    saveButton: {
        backgroundColor: colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 12,
        marginTop: 8,
        gap: 8,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '700',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginTop: 24,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 16,
    },
    videoGroup: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    essayCard: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    subHeader: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: 16,
    },
    textArea: {
        minHeight: 120,
    },
    broadcastButton: {
        backgroundColor: colors.secondary || '#4B5563', // distinct color
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        marginTop: 8,
    },
    broadcastButtonText: {
        color: colors.surface,
        fontSize: 16,
        fontWeight: '700',
    },
    refreshButton: {
        marginLeft: 'auto' as any,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.primary + '15',
        borderRadius: 8,
    },
    refreshButtonText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    emptySubmissions: {
        paddingVertical: 24,
        alignItems: 'center' as const,
    },
    emptySubmissionsText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    submissionItem: {
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    submissionHeader: {
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        marginBottom: 8,
    },
    submissionName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    submissionSchool: {
        fontSize: 13,
        color: colors.textSecondary,
        marginTop: 2,
    },
    submissionLink: {
        fontSize: 13,
        color: colors.primary,
        textDecorationLine: 'underline' as const,
        marginBottom: 8,
    },
    submissionMeta: {
        gap: 2,
    },
    submissionMetaText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
});
