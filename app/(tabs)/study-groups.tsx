import React, { useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Modal,
	TextInput,
	Animated,
	Alert,
	Linking,
	Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	Plus,
	X,
	Users,
	Copy,
	Send,
	Paperclip,
	FileText,
	User,
	Share2,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { StudyGroup } from "@/types";
import { schedulePushNotification } from "@/functions/Notify";

export default function StudyGroupsScreen() {
	const {
		studyGroups,
		createStudyGroup,
		joinStudyGroup,
		sendGroupMessage,
		deleteStudyGroup,
	} = useApp();
	const { user } = useAuth();
	const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
	const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
	const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

	// Derive selectedGroup from the real-time studyGroups data
	const selectedGroup = React.useMemo(() =>
		studyGroups.find(g => g.id === selectedGroupId) || null,
		[studyGroups, selectedGroupId]
	);

	const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);

	const [groupName, setGroupName] = useState("");
	const [groupClass, setGroupClass] = useState("");
	const [groupSchool, setGroupSchool] = useState("");
	const [groupDescription, setGroupDescription] = useState("");

	const [joinCode, setJoinCode] = useState("");
	const [joinEmail, setJoinEmail] = useState("");

	const [messageText, setMessageText] = useState("");
	const [messageSenderEmail, setMessageSenderEmail] = useState("");
	const [attachments, setAttachments] = useState<
		{ name: string; uri: string; type: string }[]
	>([]);

	const scaleAnim = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		if (showCreateGroupModal || showJoinGroupModal || showGroupDetailModal) {
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
		} else {
			scaleAnim.setValue(0);
		}
	}, [
		showCreateGroupModal,
		showJoinGroupModal,
		showGroupDetailModal,
		scaleAnim,
	]);

	const handleCreateGroup = async () => {
		if (!groupName || !groupClass || !groupSchool) return;

		const newGroup = await createStudyGroup({
			name: groupName,
			className: groupClass,
			school: groupSchool,
			description: groupDescription,
		});

		if (newGroup) {
			Alert.alert(
				"Group Created!",
				`Group Code: ${newGroup.code}\n\nShare this code with others to join the group.`,
				[
					{ text: "Share Link", onPress: () => shareGroupCode(newGroup.code) },
					{ text: "OK" }
				]
			);
			schedulePushNotification({
				title: "Group Created!",
				body: `Group Code: ${newGroup.code}\n\nShare this code with others to join the group.`,
				data: { group: newGroup },
			});

			resetGroupForm();
			setShowCreateGroupModal(false);
		} else {
			Alert.alert("Error", "Failed to create group. Please try again.");
		}
	};

	const shareGroupCode = async (code: string) => {
		// TODO: Replace with your production backend URL
		const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.5:3000";
		const url = `${baseUrl}/join/${code}`;

		try {
			await Share.share({
				message: `Join my study group on CauseAI! Click here: ${url}`,
				url: url,
				title: 'Join Study Group'
			});
		} catch (error) {
			console.error(error);
		}
	};

	const resetGroupForm = () => {
		setGroupName("");
		setGroupClass("");
		setGroupSchool("");
		setGroupDescription("");
	};

	const handleJoinGroup = async () => {
		if (!joinCode || !user?.email) return;

		const group = await joinStudyGroup(joinCode.toUpperCase(), user.email);

		if (!group) {
			Alert.alert("Error", "Invalid group code. Please check and try again.");
			return;
		}
		schedulePushNotification({
			title: "Group Join Notification",
			body: `You have joined the group: ${group.name}`,
			data: { group },
		});


		Alert.alert("Success", `You have joined the group: ${group.name}`);
		setJoinCode("");
		setShowJoinGroupModal(false);
	};

	const openGroupDetail = (group: StudyGroup) => {
		setSelectedGroupId(group.id);
		setShowGroupDetailModal(true);
	};

	const handleSendMessage = async () => {
		console.log("Send button pressed!");
		console.log("Selected group:", selectedGroup?.name);
		console.log("Message text:", messageText);
		console.log("Message text length:", messageText.length);
		console.log("Message text trimmed:", messageText.trim());
		console.log("User email:", user?.email);

		if (!selectedGroup || !messageText.trim() || !user?.email) {
			console.log("Missing required data - returning");
			if (!selectedGroup) console.log("No group selected");
			if (!messageText.trim())
				console.log("No message text (or only whitespace)");
			if (!user?.email) console.log("No user email");
			return;
		}

		console.log("Sending message to group:", selectedGroup.id);
		await sendGroupMessage(
			selectedGroup.id,
			user.email,
			messageText.trim(),
			attachments.length > 0 ? attachments : undefined
		);
		console.log("Message sent successfully");
		setMessageText("");
		setAttachments([]);

		// No need to manually update selectedGroup - the Firestore listener will handle it
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

	return (
		<SafeAreaView style={styles.container} edges={["bottom"]}>
			<View style={styles.header}>
				<View>
					<Text style={styles.title}>Study Groups</Text>
					<Text style={styles.subtitle}>Collaborate with classmates</Text>
				</View>
			</View>

			<View style={styles.actionButtons}>
				<TouchableOpacity
					style={styles.primaryButton}
					onPress={() => setShowCreateGroupModal(true)}
				>
					<Plus size={20} color={colors.surface} />
					<Text style={styles.primaryButtonText}>Create Group</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.secondaryButton}
					onPress={() => setShowJoinGroupModal(true)}
				>
					<Users size={20} color={colors.primary} />
					<Text style={styles.secondaryButtonText}>Join Group</Text>
				</TouchableOpacity>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
			>
				{studyGroups.length === 0 ? (
					<View style={styles.emptyState}>
						<Users size={64} color={colors.textLight} />
						<Text style={styles.emptyText}>No study groups yet</Text>
						<Text style={styles.emptySubtext}>
							Create or join a study group
						</Text>
					</View>
				) : (
					<View style={styles.classList}>
						{studyGroups.map((group) => (
							<TouchableOpacity
								key={group.id}
								style={styles.groupCard}
								onPress={() => openGroupDetail(group)}
								onLongPress={() => deleteStudyGroup(group.id)}
							>
								<View style={styles.groupIconContainer}>
									<Users size={28} color={colors.primary} />
								</View>
								<View style={styles.groupContent}>
									<Text style={styles.groupName}>{group.name}</Text>
									<Text style={styles.groupClass}>{group.className}</Text>
									<Text style={styles.groupSchool}>{group.school}</Text>
									<View style={styles.groupMetaRow}>
										<Users size={14} color={colors.textSecondary} />
										<Text style={styles.groupMetaText}>
											{group.members.length} members
										</Text>
									</View>
									<View style={styles.codeContainer}>
										<Text style={styles.codeLabel}>Code: </Text>
										<Text style={styles.codeText}>{group.code}</Text>
										<TouchableOpacity onPress={() => copyGroupCode(group.code)}>
											<Copy size={16} color={colors.primary} />
										</TouchableOpacity>
									</View>
								</View>
							</TouchableOpacity>
						))}
					</View>
				)}
			</ScrollView>

			<Modal
				visible={showCreateGroupModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowCreateGroupModal(false)}
			>
				<View style={styles.modalOverlay}>
					<Animated.View
						style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Create Study Group</Text>
							<TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
								<X size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.label}>Group Name *</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., Calculus Study Group"
								placeholderTextColor={colors.textLight}
								value={groupName}
								onChangeText={setGroupName}
							/>

							<Text style={styles.label}>Class *</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., MATH 101"
								placeholderTextColor={colors.textLight}
								value={groupClass}
								onChangeText={setGroupClass}
							/>

							<Text style={styles.label}>School or University *</Text>
							<TextInput
								style={styles.input}
								placeholder="e.g., University of California"
								placeholderTextColor={colors.textLight}
								value={groupSchool}
								onChangeText={setGroupSchool}
							/>

							<Text style={styles.label}>Description</Text>
							<TextInput
								style={[styles.input, styles.textArea]}
								placeholder="Describe the purpose of this study group"
								placeholderTextColor={colors.textLight}
								value={groupDescription}
								onChangeText={setGroupDescription}
								multiline
								numberOfLines={4}
							/>

							<TouchableOpacity
								style={[
									styles.createButton,
									(!groupName || !groupClass || !groupSchool) &&
									styles.createButtonDisabled,
								]}
								onPress={handleCreateGroup}
								disabled={!groupName || !groupClass || !groupSchool}
							>
								<Text style={styles.createButtonText}>Create Group</Text>
							</TouchableOpacity>
						</ScrollView>
					</Animated.View>
				</View>
			</Modal>

			<Modal
				visible={showJoinGroupModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowJoinGroupModal(false)}
			>
				<View style={styles.modalOverlay}>
					<Animated.View
						style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>Join Study Group</Text>
							<TouchableOpacity onPress={() => setShowJoinGroupModal(false)}>
								<X size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						<ScrollView showsVerticalScrollIndicator={false}>
							<Text style={styles.label}>Group Code *</Text>
							<TextInput
								style={styles.input}
								placeholder="Enter group code"
								placeholderTextColor={colors.textLight}
								value={joinCode}
								onChangeText={setJoinCode}
								autoCapitalize="characters"
							/>

							<Text style={styles.label}>Your Email *</Text>
							<TextInput
								style={styles.input}
								placeholder="your.email@example.com"
								placeholderTextColor={colors.textLight}
								value={joinEmail}
								onChangeText={setJoinEmail}
								keyboardType="email-address"
								autoCapitalize="none"
							/>

							<TouchableOpacity
								style={[
									styles.createButton,
									(!joinCode || !joinEmail) && styles.createButtonDisabled,
								]}
								onPress={handleJoinGroup}
								disabled={!joinCode || !joinEmail}
							>
								<Text style={styles.createButtonText}>Join Group</Text>
							</TouchableOpacity>
						</ScrollView>
					</Animated.View>
				</View>
			</Modal>

			<Modal
				visible={showGroupDetailModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowGroupDetailModal(false)}
			>
				<View style={styles.modalOverlay}>
					<Animated.View
						style={[
							styles.modalContent,
							styles.detailModalContent,
							{ transform: [{ scale: scaleAnim }] },
						]}
					>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
							<TouchableOpacity onPress={() => setShowGroupDetailModal(false)}>
								<X size={24} color={colors.text} />
							</TouchableOpacity>
						</View>

						{selectedGroup && (
							<>
								<ScrollView
									style={styles.groupDetailInfo}
									showsVerticalScrollIndicator={false}
								>
									<Text style={styles.detailLabel}>Class:</Text>
									<Text style={styles.detailValue}>
										{selectedGroup.className}
									</Text>
									<Text style={styles.detailLabel}>School:</Text>
									<Text style={styles.detailValue}>{selectedGroup.school}</Text>
									{selectedGroup.description && (
										<>
											<Text style={styles.detailLabel}>Description:</Text>
											<Text style={styles.detailValue}>
												{selectedGroup.description}
											</Text>
										</>
									)}
									<View style={styles.codeContainerLarge}>
										<Text style={styles.detailLabel}>Group Code:</Text>
										<View style={styles.codeRow}>
											<Text style={styles.codeTextLarge}>
												{selectedGroup.code}
											</Text>
											<TouchableOpacity
												onPress={() => copyGroupCode(selectedGroup.code)}
												style={styles.copyButton}
											>
												<Copy size={20} color={colors.primary} />
											</TouchableOpacity>
											<TouchableOpacity
												onPress={() => shareGroupCode(selectedGroup.code)}
												style={styles.copyButton}
											>
												<Share2 size={20} color={colors.primary} />
											</TouchableOpacity>
										</View>
									</View>
								</ScrollView>

								<Text style={styles.sectionTitle}>
									Members ({selectedGroup.members.length})
								</Text>
								<ScrollView
									style={styles.membersList}
									showsVerticalScrollIndicator={false}
								>
									{selectedGroup.members.length === 0 ? (
										<Text style={styles.emptySubtext}>No members yet</Text>
									) : (
										selectedGroup.members.map((member, index) => (
											<View key={index} style={styles.memberItem}>
												<User size={16} color={colors.textSecondary} />
												<Text style={styles.memberEmail}>{member.email}</Text>
											</View>
										))
									)}
								</ScrollView>

								<Text style={styles.sectionTitle}>Messages</Text>
								<ScrollView
									style={styles.messagesList}
									showsVerticalScrollIndicator={false}
								>
									{selectedGroup.messages.length === 0 ? (
										<Text style={styles.emptySubtext}>No messages yet</Text>
									) : (
										selectedGroup.messages.map((msg) => (
											<View key={msg.id} style={styles.messageItem}>
												<Text style={styles.messageSender}>
													{msg.senderEmail}
												</Text>
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
								</ScrollView>

								<View style={styles.sendMessageContainer}>
									{/* <TextInput
										style={styles.emailInput}
										placeholder="Your email"
										placeholderTextColor={colors.textLight}
										value={messageSenderEmail}
										onChangeText={setMessageSenderEmail}
										keyboardType="email-address"
										autoCapitalize="none"
									/> */}
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
													<TouchableOpacity
														onPress={() => removeAttachment(idx)}
													>
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
							</>
						)}
					</Animated.View>
				</View>
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
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: 20,
		paddingTop: 20,
		paddingBottom: 12,
	},
	title: {
		fontSize: 28,
		fontWeight: "800" as const,
		color: colors.text,
	},
	subtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
	},
	actionButtons: {
		flexDirection: "row",
		paddingHorizontal: 20,
		marginBottom: 16,
		gap: 12,
	},
	primaryButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: colors.primary,
		gap: 8,
	},
	primaryButtonText: {
		fontSize: 15,
		fontWeight: "700" as const,
		color: colors.surface,
	},
	secondaryButton: {
		flex: 1,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 14,
		borderRadius: 12,
		backgroundColor: colors.surface,
		borderWidth: 2,
		borderColor: colors.primary,
		gap: 8,
	},
	secondaryButtonText: {
		fontSize: 15,
		fontWeight: "700" as const,
		color: colors.primary,
	},
	scrollView: {
		flex: 1,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 80,
	},
	emptyText: {
		fontSize: 20,
		fontWeight: "600" as const,
		color: colors.textSecondary,
		marginTop: 16,
	},
	emptySubtext: {
		fontSize: 14,
		color: colors.textLight,
		marginTop: 8,
	},
	classList: {
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	groupCard: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		flexDirection: "row",
		shadowColor: colors.cardShadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	groupIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 12,
		backgroundColor: colors.primary + "20",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	groupContent: {
		flex: 1,
	},
	groupName: {
		fontSize: 17,
		fontWeight: "700" as const,
		color: colors.text,
		marginBottom: 4,
	},
	groupClass: {
		fontSize: 14,
		color: colors.textSecondary,
		marginBottom: 2,
	},
	groupSchool: {
		fontSize: 13,
		color: colors.textLight,
		marginBottom: 8,
	},
	groupMetaRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 8,
	},
	groupMetaText: {
		fontSize: 13,
		color: colors.textSecondary,
		marginLeft: 6,
	},
	codeContainer: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.background,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		alignSelf: "flex-start",
	},
	codeLabel: {
		fontSize: 12,
		color: colors.textSecondary,
		fontWeight: "600" as const,
	},
	codeText: {
		fontSize: 14,
		color: colors.primary,
		fontWeight: "700" as const,
		marginRight: 8,
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "center",
		alignItems: "center",
		padding: 20,
	},
	modalContent: {
		backgroundColor: colors.surface,
		borderRadius: 24,
		padding: 24,
		width: "100%",
		maxWidth: 500,
		maxHeight: "90%",
	},
	detailModalContent: {
		maxHeight: "85%",
	},
	modalHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 24,
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: "700" as const,
		color: colors.text,
	},
	label: {
		fontSize: 14,
		fontWeight: "600" as const,
		color: colors.text,
		marginBottom: 8,
		marginTop: 16,
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
	textArea: {
		minHeight: 100,
		textAlignVertical: "top",
	},
	createButton: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		padding: 18,
		alignItems: "center",
		marginTop: 24,
		marginBottom: 8,
	},
	createButtonDisabled: {
		opacity: 0.5,
	},
	createButtonText: {
		fontSize: 16,
		fontWeight: "700" as const,
		color: colors.surface,
	},
	groupDetailInfo: {
		maxHeight: 140,
		marginBottom: 12,
	},
	detailLabel: {
		fontSize: 13,
		fontWeight: "600" as const,
		color: colors.textSecondary,
		marginTop: 8,
	},
	detailValue: {
		fontSize: 15,
		color: colors.text,
		marginTop: 4,
	},
	codeContainerLarge: {
		marginTop: 12,
		backgroundColor: colors.background,
		padding: 12,
		borderRadius: 12,
	},
	codeRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 8,
	},
	codeTextLarge: {
		fontSize: 20,
		color: colors.primary,
		fontWeight: "700" as const,
		letterSpacing: 2,
	},
	copyButton: {
		padding: 8,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: "700" as const,
		color: colors.text,
		marginTop: 16,
		marginBottom: 12,
	},
	membersList: {
		maxHeight: 100,
	},
	memberItem: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: colors.background,
		borderRadius: 8,
		marginBottom: 8,
		gap: 8,
	},
	memberEmail: {
		fontSize: 14,
		color: colors.text,
	},
	messagesList: {
		maxHeight: 180,
		marginBottom: 12,
	},
	messageItem: {
		backgroundColor: colors.background,
		padding: 12,
		borderRadius: 12,
		marginBottom: 8,
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
	},
	messageTime: {
		fontSize: 11,
		color: colors.textLight,
	},
	sendMessageContainer: {
		marginTop: 8,
	},
	emailInput: {
		backgroundColor: colors.background,
		borderRadius: 12,
		padding: 12,
		fontSize: 14,
		color: colors.text,
		borderWidth: 1,
		borderColor: colors.border,
		marginBottom: 8,
	},
	messageInputRow: {
		flexDirection: "row",
		alignItems: "flex-end",
		gap: 8,
	},
	messageInput: {
		flex: 1,
		backgroundColor: colors.background,
		borderRadius: 12,
		padding: 12,
		fontSize: 14,
		color: colors.text,
		borderWidth: 1,
		borderColor: colors.border,
		maxHeight: 80,
	},
	attachButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: colors.background,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: colors.border,
	},
	sendButton: {
		backgroundColor: colors.primary,
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
	sendButtonDisabled: {
		opacity: 0.5,
	},
	attachmentsPreview: {
		maxHeight: 60,
		marginBottom: 8,
	},
	attachmentPreviewChip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.background,
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		marginRight: 8,
		gap: 6,
		borderWidth: 1,
		borderColor: colors.border,
		maxWidth: 200,
	},
	attachmentPreviewName: {
		fontSize: 12,
		color: colors.text,
		flex: 1,
	},
	attachmentsList: {
		marginTop: 8,
		gap: 6,
	},
	attachmentChip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.primary + "10",
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 4,
		gap: 6,
		alignSelf: "flex-start",
	},
	attachmentName: {
		fontSize: 12,
		color: colors.primary,
		fontWeight: "600" as const,
		maxWidth: 150,
	},
});
