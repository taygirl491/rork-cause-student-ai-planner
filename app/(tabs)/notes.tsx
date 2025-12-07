import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, FileText, Search } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Note } from '@/types';
export default function NotesScreen() {
  const { notes, addNote, deleteNote, classes } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [title, setTitle] = useState('');
  const [selectedClass, setSelectedClass] = useState('');

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

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

  const handleCreateNote = () => {
    if (!title) return;

    const newNote: Note = {
      id: Date.now().toString(),
      title,
      className: selectedClass,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addNote(newNote);
    setShowModal(false);
    setTitle('');
    setSelectedClass('');
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (note.className && note.className.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notes</Text>
          <Text style={styles.subtitle}>{notes.length} notes</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)}>
          <Plus size={24} color={colors.surface} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textLight} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color={colors.textLight} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try a different search' : 'Create your first note'}
            </Text>
          </View>
        ) : (
          <View style={styles.notesList}>
            {filteredNotes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.noteCard}
                onLongPress={() => deleteNote(note.id)}
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
                  <Text style={styles.notePreview} numberOfLines={3}>
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

      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Note</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
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
                onPress={() => setSelectedClass('')}
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
                    selectedClass === cls.name && { backgroundColor: cls.color },
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
              style={[styles.createButton, !title && styles.createButtonDisabled]}
              onPress={handleCreateNote}
              disabled={!title}
            >
              <Text style={styles.createButtonText}>Create Note</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    // paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600' as const,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  classTag: {
    backgroundColor: colors.primaryLight + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    fontWeight: '600' as const,
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.surface,
  },
});
