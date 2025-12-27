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
	KeyboardAvoidingView,
	Platform,
	TouchableWithoutFeedback,
	Keyboard,
	Share,
	Linking,
	RefreshControl,
	Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
	X,
	Users,
	Copy,
	Send,
	Paperclip,
	FileText,
	User,
	Share2,
	Plus,
	Edit2,
	Trash2,
	Lock,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { StudyGroup } from "@/types";
import { schedulePushNotification } from "@/functions/Notify";
import SearchBar from "@/components/SearchBar";

export default function StudyGroupsScreen() {
	const router = useRouter();
	const {
		studyGroups,
		createStudyGroup,
		joinStudyGroup,
		sendGroupMessage,
		deleteStudyGroup,
		refreshStudyGroups,
	} = useApp();
	const [refreshing, setRefreshing] = useState(false);
	const { user } = useAuth();
	const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
	const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
	const [showActionSheet, setShowActionSheet] = useState(false);
	const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
	const [searchQuery, setSearchQuery] = useState("");

	// Filter groups based on search query
	const filteredGroups = React.useMemo(() => {
		if (!searchQuery) return studyGroups;
		const query = searchQuery.toLowerCase();
		return studyGroups.filter(
			(group) =>
				group.name.toLowerCase().includes(query) ||
				group.className.toLowerCase().includes(query) ||
				group.code.toLowerCase().includes(query)
		);
	}, [studyGroups, searchQuery]);

	const [groupName, setGroupName] = useState("");
	const [groupClass, setGroupClass] = useState("");
	const [groupSchool, setGroupSchool] = useState("");
	const [groupDescription, setGroupDescription] = useState("");
	const [isPrivate, setIsPrivate] = useState(false);

	const [joinCode, setJoinCode] = useState("");

	const scaleAnim = React.useRef(new Animated.Value(0)).current;

	React.useEffect(() => {
		if (showCreateGroupModal || showJoinGroupModal) {
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
		} else {
			scaleAnim.setValue(0);
		}
	}, [showCreateGroupModal, showJoinGroupModal, scaleAnim]);

	const handleCreateGroup = async () => {
		if (!groupName || !groupClass || !groupSchool) return;

		const newGroup = await createStudyGroup({
			name: groupName,
			className: groupClass,
			school: groupSchool,
			description: groupDescription,
			isPrivate: isPrivate,
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

			await refreshStudyGroups();

			await refreshStudyGroups();
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
		setIsPrivate(false);
	};

	const handleJoinGroup = async () => {
		if (!joinCode || !user?.email) return;

		// Use user's name from auth context, or fallback to "Student" or email prefix
		const userName = user.name || user.email.split('@')[0] || "Student";

		const result = await joinStudyGroup(joinCode.toUpperCase(), user.email, userName);

		if (!result) {
			Alert.alert("Error", "Invalid group code. Please check and try again.");
			return;
		}

		// Check if it's a pending status
		if (result.status === 'pending') {
			Alert.alert(
				"Request Sent",
				"Your request to join has been sent to the group admins for approval."
			);
			await refreshStudyGroups();
			setJoinCode("");
			setShowJoinGroupModal(false);
			return;
		}

		// Otherwise it's a successful join (result.status === 'joined')
		if ('name' in result) {
			schedulePushNotification({
				title: "Group Joined!",
				body: `You have joined the group: ${result.name}`,
				data: { group: result },
			});

			Alert.alert("Success", `You have joined the group: ${result.name}`);
			await refreshStudyGroups();
			setJoinCode("");
			setShowJoinGroupModal(false);
		}
	};

	const handleLongPress = (group: StudyGroup) => {
		setSelectedGroup(group);
		setShowActionSheet(true);
	};

	const handleDelete = () => {
		if (!selectedGroup) return;

		Alert.alert(
			"Delete Study Group",
			"Are you sure you want to delete this study group?",
			[
				{ text: "Cancel", style: "cancel" },
				{
					text: "Delete",
					style: "destructive",
					onPress: async () => {
						await deleteStudyGroup(selectedGroup.id);
						await refreshStudyGroups();
						setShowActionSheet(false);
						setSelectedGroup(null);
					},
				},
			]
		);
	};

	const onRefresh = async () => {
		setRefreshing(true);
		await refreshStudyGroups();
		setRefreshing(false);
	};

	const openGroupDetail = (group: StudyGroup) => {
		router.push({
			pathname: '/group-detail' as any,
			params: { groupId: group.id }
		});
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

			<View style={styles.searchContainer}>
				<SearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search groups, classes, or codes..."
				/>
			</View>

			<ScrollView
				style={styles.scrollView}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={[colors.primary]}
						tintColor={colors.primary}
					/>
				}
			>
				{filteredGroups.length === 0 ? (
					<View style={styles.emptyState}>
						<Users size={64} color={colors.textLight} />
						<Text style={styles.emptyText}>
							{searchQuery ? "No groups match your search" : "No study groups yet"}
						</Text>
						<Text style={styles.emptySubtext}>
							{searchQuery
								? "Try a different search term"
								: "Create or join a study group"}
						</Text>
					</View>
				) : (
					<View style={styles.classList}>
						{filteredGroups.map((group) => (
							<TouchableOpacity
								key={group.id}
								style={styles.groupCard}
								onPress={() => openGroupDetail(group)}
								onLongPress={() => handleLongPress(group)}
							>
								<View style={styles.groupIconContainer}>
									<Users size={28} color={colors.primary} />
								</View>
								<View style={styles.groupContent}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
										<Text style={styles.groupName}>{group.name}</Text>
										{/* Show admin badge if user is an admin */}
										{group.admins?.includes(user?.uid || '') && (
											<View style={styles.adminBadge}>
												<Text style={styles.adminBadgeText}>ADMIN</Text>
											</View>
										)}
									</View>
									<Text style={styles.groupClass}>{group.className}</Text>
									<Text style={styles.groupSchool}>{group.school}</Text>
									<View style={styles.groupMetaRow}>
										<Users size={14} color={colors.textSecondary} />
										<Text style={styles.groupMetaText}>
											{group.members.length} members
										</Text>
										{/* Show pending member count for admins */}
										{group.admins?.includes(user?.uid || '') && group.pendingMembers && group.pendingMembers.length > 0 && (
											<>
												<Text style={styles.groupMetaText}> • </Text>
												<View style={styles.pendingBadge}>
													<Text style={styles.pendingBadgeText}>
														{group.pendingMembers.length} pending
													</Text>
												</View>
											</>
										)}
									</View>
									{/* Only show code if it exists (public group or user is creator) */}
									{group.code ? (
										<View style={styles.codeContainer}>
											<Text style={styles.codeLabel}>Code: </Text>
											<Text style={styles.codeText}>{group.code}</Text>
											<TouchableOpacity onPress={() => copyGroupCode(group.code!)}>
												<Copy size={16} color={colors.primary} />
											</TouchableOpacity>
										</View>
									) : group.isPrivate ? (
										<View style={styles.privateIndicator}>
											<Lock size={14} color={colors.textSecondary} />
											<Text style={styles.privateText}>Private Group</Text>
										</View>
									) : null}
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
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowCreateGroupModal(false)}
					>
						<TouchableOpacity
							activeOpacity={1}
							onPress={(e) => e.stopPropagation()}
							style={{ width: '100%', alignItems: 'center' }}
						>
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
									<View style={styles.switchRow}>
										<View style={{ flex: 1 }}>
											<Text style={styles.switchLabel}>🔒 Private Group</Text>
											<Text style={styles.switchSubtext}>
												Only you can see the invite code
											</Text>
										</View>
										<Switch
											value={isPrivate}
											onValueChange={setIsPrivate}
											trackColor={{ false: colors.border, true: colors.primary }}
											thumbColor={isPrivate ? colors.surface : colors.textLight}
										/>
									</View>
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
						</TouchableOpacity>
					</TouchableOpacity>
				</KeyboardAvoidingView>
			</Modal>

			<Modal
				visible={showJoinGroupModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowJoinGroupModal(false)}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowJoinGroupModal(false)}
					>
						<TouchableOpacity
							activeOpacity={1}
							onPress={(e) => e.stopPropagation()}
							style={{ width: '100%', alignItems: 'center' }}
						>
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

									<TouchableOpacity
										style={[
											styles.createButton,
											!joinCode && styles.createButtonDisabled,
										]}
										onPress={handleJoinGroup}
										disabled={!joinCode}
									>
										<Text style={styles.createButtonText}>Join Group</Text>
									</TouchableOpacity>
								</ScrollView>
							</Animated.View>
						</TouchableOpacity>
					</TouchableOpacity>
				</KeyboardAvoidingView>
			</Modal>

			{/* Action Sheet Modal */}
			<Modal
				visible={showActionSheet}
				transparent
				animationType="fade"
				onRequestClose={() => setShowActionSheet(false)}
			>
				<TouchableOpacity
					style={styles.actionSheetOverlay}
					activeOpacity={1}
					onPress={() => setShowActionSheet(false)}
				>
					<View style={styles.actionSheetContent}>
						<TouchableOpacity
							style={styles.actionButton}
							onPress={handleDelete}
						>
							<Trash2 size={20} color="#FF3B30" />
							<Text style={[styles.actionButtonText, { color: "#FF3B30" }]}>
								Delete Study Group
							</Text>
						</TouchableOpacity>
					</View>
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

	searchContainer: {
		paddingHorizontal: 20,
		marginBottom: 16,
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
	actionSheetOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	actionSheetContent: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 20,
		paddingBottom: 40,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 20,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: "600" as const,
		color: colors.text,
		marginLeft: 16,
	},
	switchRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 16,
		padding: 16,
		backgroundColor: colors.background,
		borderRadius: 12,
	},
	switchLabel: {
		fontSize: 16,
		fontWeight: '600' as const,
		color: colors.text,
	},
	switchSubtext: {
		fontSize: 13,
		color: colors.textSecondary,
		marginTop: 4,
	},
	privateIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.background,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		alignSelf: 'flex-start',
		gap: 6,
	},
	privateText: {
		fontSize: 12,
		color: colors.textSecondary,
		fontWeight: '600' as const,
	},
	adminBadge: {
		backgroundColor: colors.primary,
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	adminBadgeText: {
		fontSize: 10,
		color: colors.surface,
		fontWeight: '700' as const,
		letterSpacing: 0.5,
	},
	pendingBadge: {
		backgroundColor: colors.warning || '#FF9500',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
	},
	pendingBadgeText: {
		fontSize: 11,
		color: colors.surface,
		fontWeight: '600' as const,
	},
});
