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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { Lock, LogOut, Save, Video, ShieldCheck } from 'lucide-react-native';
import colors from '@/constants/colors';

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
    const [causesVideo1Url, setCausesVideo1Url] = useState('');
    const [causesVideo2Url, setCausesVideo2Url] = useState('');
    const [causesVideo3Url, setCausesVideo3Url] = useState('');
    const [causesVideo4Url, setCausesVideo4Url] = useState('');
    const [saving, setSaving] = useState(false);

    // Check valid admin session
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user && user.email === ADMIN_EMAIL) {
                setIsAdmin(true);
                loadVideoConfig();
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
                setCausesVideo1Url(data.causesVideo1Id ? `https://youtu.be/${data.causesVideo1Id}` : '');
                setCausesVideo2Url(data.causesVideo2Id ? `https://youtu.be/${data.causesVideo2Id}` : '');
                setCausesVideo3Url(data.causesVideo3Id ? `https://youtu.be/${data.causesVideo3Id}` : '');
                setCausesVideo4Url(data.causesVideo4Id ? `https://youtu.be/${data.causesVideo4Id}` : '');
            }
        } catch (error) {
            console.error('Error loading video config:', error);
            Alert.alert('Error', 'Failed to load current video settings.');
        }
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

    const handleSave = async () => {
        const homeId = extractVideoId(homeVideoUrl);
        const causes1Id = extractVideoId(causesVideo1Url);
        const causes2Id = extractVideoId(causesVideo2Url);
        const causes3Id = extractVideoId(causesVideo3Url);
        const causes4Id = extractVideoId(causesVideo4Url);

        if (!homeId && homeVideoUrl) {
            Alert.alert('Invalid URL', 'Please enter a valid YouTube URL for the Home video.');
            return;
        }
        if (!causes1Id && causesVideo1Url) {
            Alert.alert('Invalid URL', 'Please enter a valid YouTube URL for Causes Video 1.');
            return;
        }
        if (!causes2Id && causesVideo2Url) {
            Alert.alert('Invalid URL', 'Please enter a valid YouTube URL for Causes Video 2.');
            return;
        }
        if (!causes3Id && causesVideo3Url) {
            Alert.alert('Invalid URL', 'Please enter a valid YouTube URL for Causes Video 3.');
            return;
        }
        if (!causes4Id && causesVideo4Url) {
            Alert.alert('Invalid URL', 'Please enter a valid YouTube URL for Causes Video 4.');
            return;
        }

        setSaving(true);
        try {
            const docRef = doc(db, 'content', 'videos');

            // Use setDoc with merge: true to create if not exists or update
            await setDoc(docRef, {
                homeVideoId: homeId,
                causesVideo1Id: causes1Id,
                causesVideo2Id: causes2Id,
                causesVideo3Id: causes3Id,
                causesVideo4Id: causes4Id,
                updatedAt: new Date().toISOString(),
                updatedBy: auth.currentUser?.email
            }, { merge: true });

            Alert.alert('Success', 'Video configuration updated successfully!');
        } catch (error: any) {
            console.error('Error saving videos:', error);
            Alert.alert('Save Failed', 'Could not save changes. Ensure you have admin permissions.');
        } finally {
            setSaving(false);
        }
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

                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Video size={24} color={colors.primary} />
                            <Text style={styles.cardTitle}>Video Configuration</Text>
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

                        <Text style={styles.sectionHeader}>Causes Screen Videos</Text>
                        <Text style={styles.sectionDescription}>Configure the 4 inspirational student talk videos</Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Video 1: "How I Changed the World as a Student"</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://youtu.be/..."
                                value={causesVideo1Url}
                                onChangeText={setCausesVideo1Url}
                                placeholderTextColor={colors.textLight}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Video 2: "From Underperforming to High Achieving"</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://youtu.be/..."
                                value={causesVideo2Url}
                                onChangeText={setCausesVideo2Url}
                                placeholderTextColor={colors.textLight}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Video 3: "What School Means to Me"</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://youtu.be/..."
                                value={causesVideo3Url}
                                onChangeText={setCausesVideo3Url}
                                placeholderTextColor={colors.textLight}
                                autoCapitalize="none"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Video 4: "Overcoming Challenges in My Academic Journey"</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="https://youtu.be/..."
                                value={causesVideo4Url}
                                onChangeText={setCausesVideo4Url}
                                placeholderTextColor={colors.textLight}
                                autoCapitalize="none"
                            />
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
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginTop: 24,
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 16,
    },
});
