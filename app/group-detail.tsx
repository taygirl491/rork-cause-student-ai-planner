import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    Alert,
    Linking,
    Share,
    Modal,
    ScrollView,
    Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from 'react-native-webview';
import {
    ArrowLeft,
    Copy,
    Share2,
    User,
    Users,
    FileText,
    Paperclip,
    Send,
    X,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from 'expo-file-system';
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function GroupDetailScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const { studyGroups, sendGroupMessage } = useApp();
    const { user } = useAuth();

    const [messageText, setMessageText] = useState("");
    const [attachments, setAttachments] = useState<
        { name: string; uri: string; type: string }[]
    >([]);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSending, setIsSending] = useState(false);
    const scrollViewRef = useRef<ScrollView>(null);

    // Find the group from the real-time studyGroups data
    const group = useMemo(
        () => studyGroups.find((g) => g.id === groupId),
        [studyGroups, groupId]
    );

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        if (group?.messages && group.messages.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [group?.messages]);

    const handleSendMessage = async () => {
        if (!group || !messageText.trim() || !user?.email || isSending) return;

        try {
            setIsSending(true);
            await sendGroupMessage(
                group.id,
                user.email,
                messageText.trim(),
                attachments.length > 0 ? attachments : undefined
            );
            setMessageText("");
            setAttachments([]);
            Keyboard.dismiss();
        } catch (error) {
            console.error("Error sending message:", error);
            Alert.alert("Error", "Failed to send message. Please try again.");
        } finally {
            setIsSending(false);
        }
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

    const isImageFile = (uri: string, type?: string) => {
        // Check by MIME type first
        if (type && type.startsWith('image/')) {
            return true;
        }
        // Check by file extension as fallback
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        return imageExtensions.some(ext => uri.toLowerCase().endsWith(ext));
    };

    const openAttachment = async (uri: string, type?: string, name?: string) => {
        try {
            // If it's an image, show in-app image viewer
            if (isImageFile(uri, type)) {
                setSelectedImage(uri);
                setShowImageViewer(true);
                return;
            }

            // For all other files (PDFs, documents, etc.), open with device's default app
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
                    style={styles.memberCount}
                    onPress={() => setShowMembersModal(true)}
                >
                    <Users size={18} color={colors.textSecondary} />
                    <Text style={styles.memberCountText}>{group.members.length}</Text>
                </TouchableOpacity>
                {/* Only show share button if group is public OR user is an admin */}
                {(!group.isPrivate || group.admins?.includes(user?.uid || '')) && group.code && (
                    <TouchableOpacity
                        onPress={() => shareGroupCode(group.code!)}
                        style={styles.shareButton}
                    >
                        <Share2 size={20} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoid}
                keyboardVerticalOffset={0}
            >
                <View style={styles.content}>
                    {/* Messages Area */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardDismissMode="on-drag"
                        keyboardShouldPersistTaps="handled"
                        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                    >
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Messages</Text>
                            <View style={styles.messagesContainer}>
                                {(!group.messages || group.messages.length === 0) ? (
                                    <Text style={styles.emptyText}>No messages yet</Text>
                                ) : (
                                    group.messages.map((msg) => (
                                        <View key={msg.id} style={styles.messageItem}>
                                            <Text style={styles.messageSender}>{msg.senderEmail}</Text>
                                            <Text style={styles.messageText}>{msg.message}</Text>
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <View style={styles.attachmentsList}>
                                                    {msg.attachments.map((attachment: any, idx: number) => (
                                                        <TouchableOpacity
                                                            key={`${msg.id}-${attachment.name}-${idx}`}
                                                            style={styles.attachmentChip}
                                                            onPress={() => openAttachment(attachment.uri, attachment.type, attachment.name)}
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
                                    (!messageText.trim() || isSending) && styles.sendButtonDisabled,
                                ]}
                                onPress={handleSendMessage}
                                disabled={!messageText.trim() || isSending}
                            >
                                <Send size={20} color={colors.surface} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Image Viewer Modal */}
            <Modal
                visible={showImageViewer}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageViewer(false)}
            >
                <View style={styles.imageViewerOverlay}>
                    <TouchableOpacity
                        style={styles.imageViewerClose}
                        onPress={() => setShowImageViewer(false)}
                    >
                        <X size={30} color={colors.surface} />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: selectedImage }}
                            style={styles.imageViewerImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* Members Modal */}
            <Modal
                visible={showMembersModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowMembersModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMembersModal(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        onPress={(e) => e.stopPropagation()}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Group Members ({group.members.length})</Text>
                                <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                                    <X size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.membersList} contentContainerStyle={styles.membersListContent}>
                                {group.members.map((member, index) => (
                                    <View key={member.email + index} style={styles.memberItem}>
                                        <View style={styles.memberAvatar}>
                                            <User size={20} color={colors.surface} />
                                        </View>
                                        <View style={styles.memberInfo}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                <Text style={styles.memberName}>{member.name || member.email.split('@')[0]}</Text>
                                                {/* Show admin badge if member is an admin */}
                                                {group.admins?.includes(member.userId) && (
                                                    <View style={styles.adminBadgeSmall}>
                                                        <Text style={styles.adminBadgeSmallText}>ADMIN</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <Text style={styles.memberEmail}>{member.email}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
    memberCount: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        gap: 6,
    },
    memberCountText: {
        fontSize: 14,
        fontWeight: "600" as const,
        color: colors.textSecondary,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        maxWidth: 400,
        maxHeight: '70%',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: colors.text,
    },
    membersList: {
        maxHeight: 400,
    },
    membersListContent: {
        padding: 16,
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
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: colors.text,
        marginBottom: 2,
    },
    memberEmail: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    adminBadgeSmall: {
        backgroundColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    adminBadgeSmallText: {
        fontSize: 10,
        fontWeight: '700' as const,
        color: colors.surface,
        letterSpacing: 0.5,
    },
    imageViewerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageViewerClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 20,
    },
    imageViewerImage: {
        width: '100%',
        height: '100%',
    },
});
