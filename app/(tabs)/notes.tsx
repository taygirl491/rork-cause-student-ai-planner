import React, { useState, useCallback } from "react";
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	TextInput,
	Modal,
	Animated,
	Alert,
	KeyboardAvoidingView,
	Platform,
	TouchableWithoutFeedback,
	Keyboard,
	Share,
	RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, X, FileText, Edit2, Trash2, Download } from "lucide-react-native";
import colors from "@/constants/colors";
import { useApp } from "@/contexts/AppContext";
import SearchBar from "@/components/SearchBar";
import { Note } from "@/types";
export default function NotesScreen() {
	const { notes, addNote, updateNote, deleteNote, classes, refreshNotes } = useApp();
	const [showModal, setShowModal] = useState(false);
	const [showDetailModal, setShowDetailModal] = useState(false);
	const [showActionSheet, setShowActionSheet] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [filterClass, setFilterClass] = useState("All");
	const [title, setTitle] = useState("");
	const [selectedClass, setSelectedClass] = useState("");
	const [isEditing, setIsEditing] = useState(false);
	const [selectedNote, setSelectedNote] = useState<Note | null>(null);
	const [editContent, setEditContent] = useState("");

	const scaleAnim = React.useRef(new Animated.Value(0)).current;
	const detailScaleAnim = React.useRef(new Animated.Value(0)).current;

	useFocusEffect(
		useCallback(() => {
			refreshNotes();
		}, [])
	);

	React.useEffect(() => {
		if (showModal) {
			Animated.spring(scaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
		} else {
			scaleAnim.setValue(0);
		}
	}, [showModal, scaleAnim]);

	React.useEffect(() => {
		if (showDetailModal) {
			Animated.spring(detailScaleAnim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 7,
			}).start();
		} else {
			detailScaleAnim.setValue(0);
		}
	}, [showDetailModal, detailScaleAnim]);

	const handleLongPress = (note: Note) => {
		setSelectedNote(note);
		setShowActionSheet(true);
	};

	const handleEdit = () => {
		if (!selectedNote) return;

		setTitle(selectedNote.title);
		setSelectedClass(selectedNote.className || "");
		setIsEditing(true);
		setShowActionSheet(false);
		setShowModal(true);
	};

	const handleDelete = () => {
		if (!selectedNote) return;

		Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => {
					deleteNote(selectedNote.id);
					refreshNotes();
					setShowActionSheet(false);
					setSelectedNote(null);
				},
			},
		]);
	};

	const handleCreateNote = () => {
		if (!title) return;

		if (isEditing && selectedNote) {
			updateNote(selectedNote.id, {
				title,
				className: selectedClass,
			});
			setIsEditing(false);
			setSelectedNote(null);
		} else {
			addNote({
				title,
				className: selectedClass,
				content: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			});
		}

		refreshNotes();
		setShowModal(false);
		setTitle("");
		setSelectedClass("");
	};

	const handleOpenNote = (note: Note) => {
		setSelectedNote(note);
		setEditContent(note.content);
		setShowDetailModal(true);
	};

	const handleUpdateNote = () => {
		if (selectedNote) {
			updateNote(selectedNote.id, {
				content: editContent,
			});
		}
	};

	const handleDeleteNote = () => {
		if (selectedNote) {
			deleteNote(selectedNote.id);
			setShowDetailModal(false);
			setSelectedNote(null);
		}
	};

	const handleDownloadNote = async () => {
		if (!selectedNote) return;

		try {
			await Share.share({
				message: `${selectedNote.title}\n\n${selectedNote.content}`,
				title: selectedNote.title,
			});
		} catch (error) {
			console.error("Error sharing note:", error);
			Alert.alert("Error", "Failed to download/share note");
		}
	};

	const filteredNotes = notes.filter((note) => {
		const matchesSearch =
			note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(note.className &&
				note.className.toLowerCase().includes(searchQuery.toLowerCase()));

		const matchesClass =
			filterClass === "All" || note.className === filterClass;

		return matchesSearch && matchesClass;
	});

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	// Pull-to-refresh handler
	const onRefresh = async () => {
		setRefreshing(true);
		await refreshNotes();
		setRefreshing(false);
	};

	return (
		<SafeAreaView style={styles.container} edges={["top"]}>
			<View style={styles.header}>
				<View>
					<Text style={styles.title}>Notes</Text>
					<Text style={styles.subtitle}>{notes.length} notes</Text>
				</View>
				<TouchableOpacity
					style={styles.addButton}
					onPress={() => setShowModal(true)}
				>
					<Plus size={24} color={colors.surface} />
				</TouchableOpacity>
			</View>
			<View style={styles.searchContainer}>
				<SearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search notes..."
				/>
			</View>

			{/* Class Filters */}
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.filterContainer}
				contentContainerStyle={styles.filterContent}
			>
				<TouchableOpacity
					style={[
						styles.filterChip,
						filterClass === "All" && styles.filterChipActive,
					]}
					onPress={() => setFilterClass("All")}
				>
					<Text
						style={[
							styles.filterChipText,
							filterClass === "All" && styles.filterChipTextActive,
						]}
					>
						All
					</Text>
				</TouchableOpacity>
				{classes.map((cls) => (
					<TouchableOpacity
						key={cls.id}
						style={[
							styles.filterChip,
							filterClass === cls.name && [
								styles.filterChipActive,
								{ backgroundColor: cls.color },
							],
						]}
						onPress={() => setFilterClass(cls.name)}
					>
						<Text
							style={[
								styles.filterChipText,
								filterClass === cls.name && styles.filterChipTextActive,
							]}
						>
							{cls.name}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

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
				{filteredNotes.length === 0 ? (
					<View style={styles.emptyState}>
						<FileText size={64} color={colors.textLight} />
						<Text style={styles.emptyText}>
							{searchQuery ? "No notes found" : "No notes yet"}
						</Text>
						<Text style={styles.emptySubtext}>
							{searchQuery
								? "Try a different search"
								: "Create your first note"}
						</Text>
					</View>
				) : (
					<View style={styles.notesList}>
						{filteredNotes.map((note) => (
							<TouchableOpacity
								key={note.id}
								style={styles.noteCard}
								onPress={() => handleOpenNote(note)}
								onLongPress={() => handleLongPress(note)}
							>
								<View style={styles.noteHeader}>
									<Text style={styles.noteTitle}>{note.title}</Text>
									{note.className && (
										<View style={styles.classTag}>
											<Text style={styles.classTagText}>{note.className}</Text>
										</View>
									)}
								</View>
								{note.content && (
									<Text
										style={styles.notePreview}
										numberOfLines={2}
										ellipsizeMode="tail"
									>
										{note.content}
									</Text>
								)}
								<Text style={styles.noteDate}>
									{formatDate(note.updatedAt)}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				)}
			</ScrollView>

			<Modal
				visible={showModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowModal(false)}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowModal(false)}
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
									<Text style={styles.modalTitle}>
										{isEditing ? "Edit Note" : "New Note"}
									</Text>
									<TouchableOpacity
										onPress={() => {
											setShowModal(false);
											setIsEditing(false);
											setTitle("");
											setSelectedClass("");
										}}
									>
										<X size={24} color={colors.text} />
									</TouchableOpacity>
								</View>

								<Text style={styles.label}>Title *</Text>
								<TextInput
									style={styles.input}
									placeholder="Note title"
									placeholderTextColor={colors.textLight}
									value={title}
									onChangeText={setTitle}
									autoFocus
								/>

								<Text style={styles.label}>Class (Optional)</Text>
								<View style={styles.classGrid}>
									<TouchableOpacity
										style={[
											styles.classChip,
											!selectedClass && { backgroundColor: colors.primary },
										]}
										onPress={() => setSelectedClass("")}
									>
										<Text
											style={[
												styles.classChipText,
												!selectedClass && { color: colors.surface },
											]}
										>
											None
										</Text>
									</TouchableOpacity>
									{classes.map((cls) => (
										<TouchableOpacity
											key={cls.id}
											style={[
												styles.classChip,
												selectedClass === cls.name && {
													backgroundColor: cls.color,
												},
											]}
											onPress={() => setSelectedClass(cls.name)}
										>
											<Text
												style={[
													styles.classChipText,
													selectedClass === cls.name && { color: colors.surface },
												]}
											>
												{cls.name}
											</Text>
										</TouchableOpacity>
									))}
								</View>

								<TouchableOpacity
									style={[
										styles.createButton,
										!title && styles.createButtonDisabled,
									]}
									onPress={handleCreateNote}
									disabled={!title}
								>
									<Text style={styles.createButtonText}>Create Note</Text>
								</TouchableOpacity>
							</Animated.View>
						</TouchableOpacity>
					</TouchableOpacity>
				</KeyboardAvoidingView>
			</Modal>

			{/* Detail/Edit Modal */}
			<Modal
				visible={showDetailModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowDetailModal(false)}
			>
				<KeyboardAvoidingView
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={{ flex: 1 }}
				>
					<TouchableOpacity
						style={styles.modalOverlay}
						activeOpacity={1}
						onPress={() => setShowDetailModal(false)}
					>
						<TouchableOpacity
							activeOpacity={1}
							onPress={(e) => e.stopPropagation()}
							style={{ width: '100%', alignItems: 'center' }}
						>
							<Animated.View
								style={[
									styles.modalContent,
									{ transform: [{ scale: detailScaleAnim }] },
								]}
							>
								<View style={styles.modalHeader}>
									<Text style={styles.modalTitle}>{selectedNote?.title}</Text>
									<TouchableOpacity onPress={() => setShowDetailModal(false)}>
										<X size={24} color={colors.text} />
									</TouchableOpacity>
								</View>

								{selectedNote?.className && (
									<View
										style={[
											styles.classTag,
											{ marginBottom: 16, alignSelf: "flex-start" },
										]}
									>
										<Text style={styles.classTagText}>
											{selectedNote.className}
										</Text>
									</View>
								)}

								<Text style={styles.label}>Content</Text>
								<TextInput
									style={[styles.input, styles.contentInput]}
									placeholder="Write your notes here..."
									placeholderTextColor={colors.textLight}
									value={editContent}
									onChangeText={setEditContent}
									onBlur={handleUpdateNote}
									multiline
									numberOfLines={10}
									textAlignVertical="top"
									autoFocus
								/>

								<View style={styles.detailModalActions}>
									<TouchableOpacity
										style={styles.deleteButton}
										onPress={handleDeleteNote}
									>
										<Text style={styles.deleteButtonText}>Delete Note</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={styles.saveButton}
										onPress={() => {
											handleUpdateNote();
											setShowDetailModal(false);
										}}
									>
										<Text style={styles.saveButtonText}>Done</Text>
									</TouchableOpacity>
								</View>

								<TouchableOpacity
									style={styles.downloadButton}
									onPress={handleDownloadNote}
								>
									<Download size={20} color={colors.primary} />
									<Text style={styles.downloadButtonText}>Download Note</Text>
								</TouchableOpacity>

								<Text style={styles.dateInfo}>
									Created: {selectedNote && formatDate(selectedNote.createdAt)}
								</Text>
								<Text style={styles.dateInfo}>
									Updated: {selectedNote && formatDate(selectedNote.updatedAt)}
								</Text>
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
						<TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
							<Edit2 size={20} color={colors.primary} />
							<Text style={styles.actionButtonText}>Edit Note</Text>
						</TouchableOpacity>
						<View style={styles.actionDivider} />
						<TouchableOpacity
							style={styles.actionButton}
							onPress={handleDelete}
						>
							<Trash2 size={20} color="#FF3B30" />
							<Text style={[styles.actionButtonText, { color: "#FF3B30" }]}>
								Delete Note
							</Text>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</Modal>
		</SafeAreaView >
	);
}
// styles
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
		// paddingTop: 20,
		paddingBottom: 16,
	},
	title: {
		fontSize: 32,
		fontWeight: "800" as const,
		color: colors.text,
	},
	subtitle: {
		fontSize: 14,
		color: colors.textSecondary,
		marginTop: 4,
	},
	searchContainer: { paddingHorizontal: 20, marginBottom: 12 },
	filterContainer: {
		paddingHorizontal: 20,
		marginBottom: 16,
		maxHeight: 45,
	},
	filterContent: {
		gap: 8,
		paddingRight: 20,
	},
	filterChip: {
		paddingHorizontal: 18,
		paddingVertical: 10,
		borderRadius: 24,
		backgroundColor: colors.surface,
		borderWidth: 1.5,
		borderColor: colors.border,
		shadowColor: colors.cardShadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2,
	},
	filterChipActive: {
		backgroundColor: colors.primary,
		borderColor: colors.primary,
		shadowColor: colors.primary,
		shadowOpacity: 0.2,
		shadowRadius: 6,
		elevation: 4,
	},
	filterChipText: {
		fontSize: 14,
		fontWeight: "600" as const,
		color: colors.text,
	},
	filterChipTextActive: {
		color: colors.surface,
		fontWeight: "700" as const,
	},

	addButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: colors.primary,
		alignItems: "center",
		justifyContent: "center",
		shadowColor: colors.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8,
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
	notesList: {
		paddingHorizontal: 20,
		paddingBottom: 20,
	},
	noteCard: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: 16,
		marginBottom: 12,
		shadowColor: colors.cardShadow,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3,
	},
	noteHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 8,
	},
	noteTitle: {
		fontSize: 18,
		fontWeight: "700" as const,
		color: colors.text,
		flex: 1,
		marginRight: 8,
	},
	classTag: {
		backgroundColor: colors.primaryLight + "30",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
	},
	classTagText: {
		fontSize: 11,
		fontWeight: "600" as const,
		color: colors.primary,
	},
	notePreview: {
		fontSize: 14,
		color: colors.textSecondary,
		lineHeight: 20,
		marginBottom: 8,
	},
	noteDate: {
		fontSize: 12,
		color: colors.textLight,
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
	classGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	classChip: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: colors.border,
	},
	classChipText: {
		fontSize: 14,
		fontWeight: "600" as const,
		color: colors.text,
	},
	createButton: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		padding: 18,
		alignItems: "center",
		marginTop: 24,
	},
	createButtonDisabled: {
		opacity: 0.5,
	},
	createButtonText: {
		fontSize: 16,
		fontWeight: "700" as const,
		color: colors.surface,
	},
	contentInput: {
		minHeight: 200,
		maxHeight: 400,
	},
	detailModalActions: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginTop: 24,
		gap: 12,
	},
	deleteButton: {
		flex: 1,
		backgroundColor: colors.error || "#ef4444",
		borderRadius: 12,
		padding: 18,
		alignItems: "center",
	},
	deleteButtonText: {
		fontSize: 16,
		fontWeight: "700" as const,
		color: colors.surface,
	},
	saveButton: {
		flex: 1,
		backgroundColor: colors.primary,
		borderRadius: 12,
		padding: 18,
		alignItems: "center",
	},
	saveButtonText: {
		fontSize: 16,
		fontWeight: "700" as const,
		color: colors.surface,
	},
	downloadButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		padding: 16,
		borderRadius: 12,
		backgroundColor: colors.primaryLight + "20",
		marginTop: 12,
		gap: 8,
	},
	downloadButtonText: {
		fontSize: 16,
		fontWeight: "600" as const,
		color: colors.primary,
	},
	dateInfo: {
		fontSize: 12,
		color: colors.textLight,
		marginTop: 8,
		textAlign: "center",
	},
	actionSheetOverlay: {
		flex: 1,
		backgroundColor: "rgba(0, 0, 0, 0.5)",
		justifyContent: "flex-end",
	},
	actionSheetContent: {
		backgroundColor: colors.surface,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		paddingBottom: 40,
	},
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		padding: 20,
		gap: 12,
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: "600" as const,
		color: colors.text,
	},
	actionDivider: {
		height: 1,
		backgroundColor: colors.border,
		marginHorizontal: 20,
	},
});
