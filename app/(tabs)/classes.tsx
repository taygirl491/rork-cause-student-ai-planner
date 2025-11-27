import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, BookOpen, Clock, User, Calendar as CalendarIcon, Users, Copy, Send, Paperclip, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Class, StudyGroup } from '@/types';

const CLASS_COLORS = [colors.primary, colors.secondary, colors.success, colors.warning, '#56CCF2', '#F2994A'];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type TabType = 'classes' | 'groups';

export default function ClassesScreen() {
  const { classes, addClass, deleteClass, studyGroups, createStudyGroup, joinStudyGroup, sendGroupMessage, deleteStudyGroup } = useApp();
  const [activeTab, setActiveTab] = useState<TabType>('classes');
  const [showClassModal, setShowClassModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);

  const [name, setName] = useState('');
  const [section, setSection] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [time, setTime] = useState('');
  const [professor, setProfessor] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedColor, setSelectedColor] = useState(CLASS_COLORS[0]);

  const [groupName, setGroupName] = useState('');
  const [groupClass, setGroupClass] = useState('');
  const [groupSchool, setGroupSchool] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joinEmail, setJoinEmail] = useState('');

  const [messageText, setMessageText] = useState('');
  const [messageSenderEmail, setMessageSenderEmail] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; uri: string; type: string }[]>([]);

  const scaleAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (showClassModal || showCreateGroupModal || showJoinGroupModal || showGroupDetailModal) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [showClassModal, showCreateGroupModal, showJoinGroupModal, showGroupDetailModal, scaleAnim]);

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAddClass = () => {
    if (!name || selectedDays.length === 0 || !time || !startDate || !endDate) return;

    const newClass: Class = {
      id: Date.now().toString(),
      name,
      section,
      daysOfWeek: selectedDays,
      time,
      professor,
      startDate,
      endDate,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    addClass(newClass);
    resetClassForm();
    setShowClassModal(false);
  };

  const resetClassForm = () => {
    setName('');
    setSection('');
    setSelectedDays([]);
    setTime('');
    setProfessor('');
    setStartDate('');
    setEndDate('');
    setSelectedColor(CLASS_COLORS[0]);
  };

  const handleCreateGroup = () => {
    if (!groupName || !groupClass || !groupSchool) return;

    const newGroup = createStudyGroup({
      name: groupName,
      className: groupClass,
      school: groupSchool,
      description: groupDescription,
    });

    Alert.alert(
      'Group Created!',
      `Group Code: ${newGroup.code}\n\nShare this code with others to join the group.`,
      [{ text: 'OK' }]
    );

    resetGroupForm();
    setShowCreateGroupModal(false);
  };

  const resetGroupForm = () => {
    setGroupName('');
    setGroupClass('');
    setGroupSchool('');
    setGroupDescription('');
  };

  const handleJoinGroup = () => {
    if (!joinCode || !joinEmail) return;

    const group = joinStudyGroup(joinCode.toUpperCase(), joinEmail);
    
    if (!group) {
      Alert.alert('Error', 'Invalid group code. Please check and try again.');
      return;
    }

    Alert.alert('Success', `You have joined the group: ${group.name}`);
    setJoinCode('');
    setJoinEmail('');
    setShowJoinGroupModal(false);
  };

  const openGroupDetail = (group: StudyGroup) => {
    setSelectedGroup(group);
    setShowGroupDetailModal(true);
  };

  const handleSendMessage = () => {
    if (!selectedGroup || !messageText || !messageSenderEmail) return;

    sendGroupMessage(selectedGroup.id, messageSenderEmail, messageText, attachments.length > 0 ? attachments : undefined);
    setMessageText('');
    setAttachments([]);
    
    const updatedGroup = studyGroups.find(g => g.id === selectedGroup.id);
    if (updatedGroup) {
      setSelectedGroup(updatedGroup);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newAttachments = result.assets.map(asset => ({
          name: asset.name,
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
        }));
        setAttachments(prev => [...prev, ...newAttachments]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const openAttachment = async (uri: string) => {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) {
        await Linking.openURL(uri);
      } else {
        Alert.alert('Cannot open file', 'This file type is not supported');
      }
    } catch (err) {
      console.error('Error opening attachment:', err);
      Alert.alert('Error', 'Failed to open attachment');
    }
  };

  const copyGroupCode = (code: string) => {
    Alert.alert('Code Copied', `Group code: ${code}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Classes & Study Groups</Text>
          <Text style={styles.subtitle}>Manage classes and collaborate</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'classes' && styles.activeTab]}
          onPress={() => setActiveTab('classes')}
        >
          <BookOpen size={20} color={activeTab === 'classes' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'classes' && styles.activeTabText]}>Classes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'groups' && styles.activeTab]}
          onPress={() => setActiveTab('groups')}
        >
          <Users size={20} color={activeTab === 'groups' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, activeTab === 'groups' && styles.activeTabText]}>Study Groups</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'classes' ? (
        <>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowClassModal(true)}>
              <Plus size={20} color={colors.surface} />
              <Text style={styles.primaryButtonText}>Add Class</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {classes.length === 0 ? (
              <View style={styles.emptyState}>
                <BookOpen size={64} color={colors.textLight} />
                <Text style={styles.emptyText}>No classes yet</Text>
                <Text style={styles.emptySubtext}>Add your classes to get started</Text>
              </View>
            ) : (
              <View style={styles.classList}>
                {classes.map((cls) => (
                  <TouchableOpacity
                    key={cls.id}
                    style={[styles.classCard, { borderLeftColor: cls.color }]}
                    onLongPress={() => deleteClass(cls.id)}
                  >
                    <View style={[styles.classIconContainer, { backgroundColor: cls.color + '20' }]}>
                      <BookOpen size={28} color={cls.color} />
                    </View>
                    <View style={styles.classContent}>
                      <Text style={styles.className}>{cls.name}</Text>
                      {cls.section && (
                        <Text style={styles.classSection}>{cls.section}</Text>
                      )}
                      <View style={styles.classMetaRow}>
                        <Clock size={14} color={colors.textSecondary} />
                        <Text style={styles.classMetaText}>{cls.time}</Text>
                      </View>
                      <View style={styles.classMetaRow}>
                        <CalendarIcon size={14} color={colors.textSecondary} />
                        <Text style={styles.classMetaText}>{cls.daysOfWeek.join(', ')}</Text>
                      </View>
                      {cls.professor && (
                        <View style={styles.classMetaRow}>
                          <User size={14} color={colors.textSecondary} />
                          <Text style={styles.classMetaText}>{cls.professor}</Text>
                        </View>
                      )}
                      <Text style={styles.classDates}>
                        {new Date(cls.startDate).toLocaleDateString()} - {new Date(cls.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      ) : (
        <>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowCreateGroupModal(true)}>
              <Plus size={20} color={colors.surface} />
              <Text style={styles.primaryButtonText}>Create Group</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowJoinGroupModal(true)}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.secondaryButtonText}>Join Group</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {studyGroups.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color={colors.textLight} />
                <Text style={styles.emptyText}>No study groups yet</Text>
                <Text style={styles.emptySubtext}>Create or join a study group</Text>
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
                        <Text style={styles.groupMetaText}>{group.members.length} members</Text>
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
        </>
      )}

      <Modal visible={showClassModal} transparent animationType="fade" onRequestClose={() => setShowClassModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Class</Text>
              <TouchableOpacity onPress={() => setShowClassModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Class Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Introduction to Psychology"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Section</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Section A"
                placeholderTextColor={colors.textLight}
                value={section}
                onChangeText={setSection}
              />

              <Text style={styles.label}>Days of Week *</Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      selectedDays.includes(day) && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => toggleDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDays.includes(day) && { color: colors.surface },
                      ]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 09:00 AM - 10:30 AM"
                placeholderTextColor={colors.textLight}
                value={time}
                onChangeText={setTime}
              />

              <Text style={styles.label}>Professor</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Dr. Smith"
                placeholderTextColor={colors.textLight}
                value={professor}
                onChangeText={setProfessor}
              />

              <Text style={styles.label}>Start Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                value={startDate}
                onChangeText={setStartDate}
              />

              <Text style={styles.label}>End Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textLight}
                value={endDate}
                onChangeText={setEndDate}
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorGrid}>
                {CLASS_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  (!name || selectedDays.length === 0 || !time || !startDate || !endDate) && styles.createButtonDisabled
                ]}
                onPress={handleAddClass}
                disabled={!name || selectedDays.length === 0 || !time || !startDate || !endDate}
              >
                <Text style={styles.createButtonText}>Add Class</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showCreateGroupModal} transparent animationType="fade" onRequestClose={() => setShowCreateGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
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
                  (!groupName || !groupClass || !groupSchool) && styles.createButtonDisabled
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

      <Modal visible={showJoinGroupModal} transparent animationType="fade" onRequestClose={() => setShowJoinGroupModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}>
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
                  (!joinCode || !joinEmail) && styles.createButtonDisabled
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

      <Modal visible={showGroupDetailModal} transparent animationType="fade" onRequestClose={() => setShowGroupDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContent, styles.detailModalContent, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedGroup?.name}</Text>
              <TouchableOpacity onPress={() => setShowGroupDetailModal(false)}>
                <X size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedGroup && (
              <>
                <ScrollView style={styles.groupDetailInfo} showsVerticalScrollIndicator={false}>
                  <Text style={styles.detailLabel}>Class:</Text>
                  <Text style={styles.detailValue}>{selectedGroup.className}</Text>
                  <Text style={styles.detailLabel}>School:</Text>
                  <Text style={styles.detailValue}>{selectedGroup.school}</Text>
                  {selectedGroup.description && (
                    <>
                      <Text style={styles.detailLabel}>Description:</Text>
                      <Text style={styles.detailValue}>{selectedGroup.description}</Text>
                    </>
                  )}
                  <View style={styles.codeContainerLarge}>
                    <Text style={styles.detailLabel}>Group Code:</Text>
                    <View style={styles.codeRow}>
                      <Text style={styles.codeTextLarge}>{selectedGroup.code}</Text>
                      <TouchableOpacity onPress={() => copyGroupCode(selectedGroup.code)} style={styles.copyButton}>
                        <Copy size={20} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>

                <Text style={styles.sectionTitle}>Members ({selectedGroup.members.length})</Text>
                <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
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
                <ScrollView style={styles.messagesList} showsVerticalScrollIndicator={false}>
                  {selectedGroup.messages.length === 0 ? (
                    <Text style={styles.emptySubtext}>No messages yet</Text>
                  ) : (
                    selectedGroup.messages.map((msg) => (
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
                                <Text style={styles.attachmentName} numberOfLines={1}>
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
                  <TextInput
                    style={styles.emailInput}
                    placeholder="Your email"
                    placeholderTextColor={colors.textLight}
                    value={messageSenderEmail}
                    onChangeText={setMessageSenderEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {attachments.length > 0 && (
                    <ScrollView horizontal style={styles.attachmentsPreview} showsHorizontalScrollIndicator={false}>
                      {attachments.map((attachment, idx) => (
                        <View key={idx} style={styles.attachmentPreviewChip}>
                          <FileText size={14} color={colors.primary} />
                          <Text style={styles.attachmentPreviewName} numberOfLines={1}>
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
                    <TouchableOpacity style={styles.attachButton} onPress={pickDocument}>
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
                      style={[styles.sendButton, (!messageText || !messageSenderEmail) && styles.sendButtonDisabled]}
                      onPress={handleSendMessage}
                      disabled={!messageText || !messageSenderEmail}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 8,
  },
  activeTab: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.surface,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.primary,
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
  classList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  classCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    borderLeftWidth: 6,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  classIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  classContent: {
    flex: 1,
  },
  className: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 4,
  },
  classSection: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  classMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  classMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  classDates: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 8,
  },
  groupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
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
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupContent: {
    flex: 1,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700' as const,
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupMetaText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  codeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600' as const,
  },
  codeText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700' as const,
    marginRight: 8,
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
    maxHeight: '90%',
  },
  detailModalContent: {
    maxHeight: '85%',
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.surface,
  },
  groupDetailInfo: {
    maxHeight: 140,
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  codeTextLarge: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '700' as const,
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginTop: 16,
    marginBottom: 12,
  },
  membersList: {
    maxHeight: 100,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '600' as const,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  attachmentsPreview: {
    maxHeight: 60,
    marginBottom: 8,
  },
  attachmentPreviewChip: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '10',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  attachmentName: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600' as const,
    maxWidth: 150,
  },
});
