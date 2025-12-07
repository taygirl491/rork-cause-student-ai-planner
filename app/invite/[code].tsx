import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import colors from "@/constants/colors";
import { Users } from "lucide-react-native";

export default function InviteScreen() {
    const { code } = useLocalSearchParams<{ code: string }>();
    const router = useRouter();
    const { user } = useAuth();
    const { joinStudyGroup } = useApp();
    const [isJoining, setIsJoining] = useState(false);

    useEffect(() => {
        if (!user) {
            Alert.alert(
                "Login Required",
                "Please login to join this study group.",
                [
                    {
                        text: "Go to Login",
                        onPress: () => router.replace("/login"),
                    },
                ]
            );
        }
    }, [user]);

    const handleJoin = async () => {
        if (!user || !code) return;

        setIsJoining(true);
        try {
            const result = await joinStudyGroup(code, user.email || "");
            if (result) {
                Alert.alert("Success", "You have joined the group!", [
                    { text: "View Groups", onPress: () => router.replace("/(tabs)/study-groups") }
                ]);
            } else {
                Alert.alert("Error", "Failed to join group. The code might be invalid.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "An unexpected error occurred.");
        } finally {
            setIsJoining(false);
        }
    };

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.title}>Welcome back!</Text>
                    <Text style={styles.subtitle}>Please log in to join the group.</Text>
                    <TouchableOpacity style={styles.button} onPress={() => router.replace(`/login?returnTo=/invite/${code}`)}>
                        <Text style={styles.buttonText}>Log In</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Users size={48} color={colors.primary} />
                </View>
                <Text style={styles.title}>Join Study Group</Text>
                <Text style={styles.subtitle}>
                    You've been invited to join a group with code:
                </Text>
                <View style={styles.codeContainer}>
                    <Text style={styles.code}>{code}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.button, isJoining && styles.disabledButton]}
                    onPress={handleJoin}
                    disabled={isJoining}
                >
                    {isJoining ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Join Group</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.replace("/(tabs)/study-groups")}
                    disabled={isJoining}
                >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: 30,
        alignItems: "center",
        justifyContent: "center",
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryLight,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: colors.text,
        marginBottom: 8,
        textAlign: "center",
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: "center",
        marginBottom: 24,
    },
    codeContainer: {
        backgroundColor: colors.surface,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: colors.border,
        marginBottom: 40,
        borderStyle: 'dashed'
    },
    code: {
        fontSize: 32,
        fontWeight: "bold",
        color: colors.primary,
        letterSpacing: 2,
    },
    button: {
        backgroundColor: colors.primary,
        width: "100%",
        padding: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 16,
    },
    disabledButton: {
        opacity: 0.7,
    },
    buttonText: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 18,
    },
    secondaryButton: {
        padding: 16,
    },
    secondaryButtonText: {
        color: colors.textSecondary,
        fontSize: 16,
    },
});
