import React, { useState, useMemo } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Alert,
    Linking,
    Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
    ArrowLeft,
    Copy,
    Share2,
    User,
    FileText,
    Paperclip,
    Send,
    X,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

export default function GroupDetailScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const { studyGroups, sendGroupMessage } = useApp();
    const { user } = useAuth();

    const [messageText, setMessageText] = useState("");
    const [attachments, setAttachments] = useState<
        { name: string; uri: string; type: string }[]
    >([]);

    // Find the group from the real-time studyGroups data
    const group = useMemo(
        () => studyGroups.find((g) => g.id === groupId),
        [studyGroups, groupId]
    );

    const handleSendMessage = async () => {
        if (!group || !messageText.trim() || !user?.email) return;

        await sendGroupMessage(
            group.id,
            user.email,
            messageText.trim(),
            attachments.length > 0 ? attachments : undefined
        );
        setMessageText("");
        setAttachments([]);
        Keyboard.dismiss();
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: "*/*",
                copyToCacheDirectory: true,
                multiple: true,
            });

            if (!result.canceled && result.assets) {
                const newAttachments = result.assets.map((asset) => ({
                    name: asset.name,
                    uri: asset.uri,
                    type: asset.mimeType || "application/octet-stream",
                }));
                setAttachments((prev) => [...prev, ...newAttachments]);
            }
        } catch (err) {
            console.error("Error picking document:", err);
            Alert.alert("Error", "Failed to pick document");
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const openAttachment = async (uri: string) => {
        try {
            const supported = await Linking.canOpenURL(uri);
            if (supported) {
                await Linking.openURL(uri);
            } else {
                Alert.alert("Cannot open file", "This file type is not supported");
            }
        } catch (err) {
            console.error("Error opening attachment:", err);
            Alert.alert("Error", "Failed to open attachment");
        }
    };

    const copyGroupCode = (code: string) => {
        Alert.alert("Code Copied", `Group code: ${code}`);
    };

    const shareGroupCode = async (code: string) => {
        const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";
        const url = `${baseUrl}/join/${code}`;

        try {
            await Share.share({
                message: `Join my study group on CauseAI! Click here: ${url}`,
                url: url,
                title: "Join Study Group",
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (!group) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                    >
                        <ArrowLeft size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Group Not Found</Text>
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>Group not found</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {group.name}
                </Text>
                <TouchableOpacity
                    onPress={() => shareGroupCode(group.code)}
                    style={styles.shareButton}
                >
                    <Share2 size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoid}
                keyboardVerticalOffset={0}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.content}>
                        {/* Scrollable Content */}
                        <ScrollView
                            style={styles.scrollView}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                        >
                            {/* Group Info Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Group Information</Text>
                                <View style={styles.infoCard}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Class:</Text>
                                        <Text style={styles.infoValue}>{group.className}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>School:</Text>
                                        <Text style={styles.infoValue}>{group.school}</Text>
                                    </View>
                                    {group.description && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Description:</Text>
                                            <Text style={styles.infoValue}>{group.description}</Text>
                                        </View>
                                    )}
                                    <View style={styles.codeContainer}>
                                        <View style={styles.codeRow}>
                                            <View>
                                                <Text style={styles.infoLabel}>Group Code:</Text>
                                                <Text style={styles.codeText}>{group.code}</Text>
                                            </View>
                                            <View style={styles.codeActions}>
                                                <TouchableOpacity
                                                    onPress={() => copyGroupCode(group.code)}
                                                    style={styles.iconButton}
                                                >
                                                    <Copy size={20} color={colors.primary} />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => shareGroupCode(group.code)}
                                                    style={styles.iconButton}
                                                >
                                                    <Share2 size={20} color={colors.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Members Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    Members ({group.members.length})
                                </Text>
                                <View style={styles.membersContainer}>
                                    {group.members.length === 0 ? (
                                        <Text style={styles.emptyText}>No members yet</Text>
                                    ) : (
                                        group.members.map((member, index) => (
                                            <View key={index} style={styles.memberItem}>
                                                <User size={16} color={colors.textSecondary} />
                                                <Text style={styles.memberEmail}>{member.email}</Text>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </View>

                            {/* Messages Section */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Messages</Text>
                                <View style={styles.messagesContainer}>
                                    {group.messages.length === 0 ? (
                                        <Text style={styles.emptyText}>No messages yet</Text>
                                    ) : (
                                        group.messages.map((msg) => (
                                            <View key={msg.id} style={styles.messageItem}>
                                                <Text style={styles.messageSender}>{msg.senderEmail}</Text>
                                                <Text style={styles.messageText}>{msg.message}</Text>
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <View style={styles.attachmentsList}>
                                                        {msg.attachments.map((attachment, idx) => (
                                                            <TouchableOpacity
                                                                key={idx}
                                                                style={styles.attachmentChip}
                                                                onPress={() => openAttachment(attachment.uri)}
                                                            >
                                                                <FileText size={14} color={colors.primary} />
                                                                <Text
                                                                    style={styles.attachmentName}
                                                                    numberOfLines={1}
                                                                >
                                                                    {attachment.name}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                                <Text style={styles.messageTime}>
                                                    {new Date(msg.createdAt).toLocaleString()}
                                                </Text>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Message Input Container (Fixed at Bottom) */}
                        <View style={styles.messageInputContainer}>
                            {attachments.length > 0 && (
                                <ScrollView
                                    horizontal
                                    style={styles.attachmentsPreview}
                                    showsHorizontalScrollIndicator={false}
                                >
                                    {attachments.map((attachment, idx) => (
                                        <View key={idx} style={styles.attachmentPreviewChip}>
                                            <FileText size={14} color={colors.primary} />
                                            <Text
                                                style={styles.attachmentPreviewName}
                                                numberOfLines={1}
                                            >
                                                {attachment.name}
                                            </Text>
                                            <TouchableOpacity onPress={() => removeAttachment(idx)}>
                                                <X size={16} color={colors.textSecondary} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                            <View style={styles.messageInputRow}>
                                <TouchableOpacity
                                    style={styles.attachButton}
                                    onPress={pickDocument}
                                >
                                    <Paperclip size={20} color={colors.primary} />
                                </TouchableOpacity>
                                <TextInput
                                    style={styles.messageInput}
                                    placeholder="Type a message..."
                                    placeholderTextColor={colors.textLight}
                                    value={messageText}
                                    onChangeText={setMessageText}
                                    multiline
                                    maxLength={500}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.sendButton,
                                        !messageText.trim() && styles.sendButtonDisabled,
                                    ]}
                                    onPress={handleSendMessage}
                                    disabled={!messageText.trim()}
                                >
                                    <Send size={20} color={colors.surface} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: "700" as const,
        color: colors.text,
    },
    shareButton: {
        padding: 8,
    },
    keyboardAvoid: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: colors.text,
        marginBottom: 12,
    },
    infoCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
    },
    infoRow: {
        marginBottom: 12,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 15,
        color: colors.text,
        lineHeight: 22,
    },
    codeContainer: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    codeRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    codeText: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: colors.primary,
        letterSpacing: 2,
    },
    codeActions: {
        flexDirection: "row",
        gap: 8,
    },
    iconButton: {
        padding: 8,
        backgroundColor: colors.background,
        borderRadius: 8,
    },
    membersContainer: {
        gap: 8,
    },
    memberItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.surface,
        borderRadius: 8,
        gap: 12,
    },
    memberEmail: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    messagesContainer: {
        gap: 12,
    },
    messageItem: {
        backgroundColor: colors.surface,
        padding: 12,
        borderRadius: 12,
    },
    messageSender: {
        fontSize: 12,
        fontWeight: "600" as const,
        color: colors.primary,
        marginBottom: 4,
    },
    messageText: {
        fontSize: 14,
        color: colors.text,
        marginBottom: 4,
        lineHeight: 20,
    },
    messageTime: {
        fontSize: 11,
        color: colors.textLight,
        marginTop: 4,
    },
    attachmentsList: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    attachmentChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        maxWidth: 200,
    },
    attachmentName: {
        fontSize: 12,
        color: colors.text,
        flex: 1,
    },
    messageInputContainer: {
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingBottom: Platform.OS === "ios" ? 12 : 16,
    },
    attachmentsPreview: {
        maxHeight: 60,
        marginBottom: 8,
    },
    attachmentPreviewChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 6,
        marginRight: 8,
        maxWidth: 150,
    },
    attachmentPreviewName: {
        fontSize: 12,
        color: colors.text,
        flex: 1,
    },
    messageInputRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    attachButton: {
        padding: 10,
    },
    messageInput: {
        flex: 1,
        backgroundColor: colors.background,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text,
        maxHeight: 100,
    },
    sendButton: {
        backgroundColor: colors.primary,
        padding: 10,
        borderRadius: 20,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textLight,
        textAlign: "center",
    },
});
