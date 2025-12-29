import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X, UserCheck, UserX, Shield, ShieldOff, Trash2, Users } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { studyGroupsAPI } from '@/utils/dataAPI';
import { useApp } from '@/contexts/AppContext';

export default function GroupAdminScreen() {
    const router = useRouter();
    const { groupId } = useLocalSearchParams<{ groupId: string }>();
    const { user } = useAuth();
    const { studyGroups, refreshStudyGroups } = useApp();

    const [pendingMembers, setPendingMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const group = studyGroups.find(g => g.id === groupId);
    const isCreator = group?.creatorId === user?.uid;
    const isAdmin = group?.admins?.includes(user?.uid || '');

    useEffect(() => {
        loadPendingMembers();
    }, [groupId]);

    const loadPendingMembers = async () => {
        if (!user?.uid || !groupId) return;

        setLoading(true);
        try {
            const members = await studyGroupsAPI.getPendingMembers(groupId, user.uid);
            setPendingMembers(members);
        } catch (error) {
            console.error('Error loading pending members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveMember = async (email: string) => {
        if (!user?.uid || !groupId) return;

        setActionLoading(email);
        try {
            const success = await studyGroupsAPI.approveMember(groupId, email, user.uid);
            if (success) {
                Alert.alert('Success', 'Member approved!');
                await loadPendingMembers();
                await refreshStudyGroups();
            } else {
                Alert.alert('Error', 'Failed to approve member');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to approve member');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectMember = async (email: string) => {
        if (!user?.uid || !groupId) return;

        Alert.alert(
            'Reject Member',
            'Are you sure you want to reject this request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(email);
                        try {
                            const success = await studyGroupsAPI.rejectMember(groupId, email, user.uid);
                            if (success) {
                                Alert.alert('Success', 'Request rejected');
                                await loadPendingMembers();
                                await refreshStudyGroups();
                            } else {
                                Alert.alert('Error', 'Failed to reject request');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reject request');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handleKickMember = async (email: string, name: string) => {
        if (!user?.uid || !groupId) return;

        Alert.alert(
            'Kick Member',
            `Are you sure you want to remove ${name || email} from the group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Kick',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(email);
                        try {
                            const success = await studyGroupsAPI.kickMember(groupId, email, user.uid);
                            if (success) {
                                Alert.alert('Success', 'Member removed from group');
                                await refreshStudyGroups();
                            } else {
                                Alert.alert('Error', 'Failed to remove member');
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove member');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    const handlePromoteToAdmin = async (memberEmail: string, memberName: string) => {
        if (!user?.uid || !groupId || !isCreator) return;

        // Find the member's userId from the group members
        const member = group?.members.find(m => m.email === memberEmail);
        if (!member) {
            Alert.alert('Error', 'Member not found');
            return;
        }

        // Check if already at max admins
        if (group.admins && group.admins.length >= 4) {
            Alert.alert('Error', 'Maximum of 4 admins allowed per group');
            return;
        }

        Alert.alert(
            'Promote to Admin',
            `Promote ${memberName || memberEmail} to admin?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Promote',
                    onPress: async () => {
                        setActionLoading(memberEmail);
                        try {
                            // Note: We need userId here, but we only have email
                            // This is a limitation - we'd need to store userId in members array
                            Alert.alert('Info', 'Promote feature requires userId. This will be available in the next update.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to promote member');
                        } finally {
                            setActionLoading(null);
                        }
                    },
                },
            ]
        );
    };

    if (!isAdmin) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <View style={styles.header}>
                    <Text style={styles.title}>Access Denied</Text>
                    <TouchableOpacity onPress={() => router.back()}>
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>You must be an admin to access this page</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Admin Panel</Text>
                    <Text style={styles.subtitle}>{group?.name}</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()}>
                    <X size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Pending Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Users size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Pending Requests</Text>
                        {pendingMembers.length > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>{pendingMembers.length}</Text>
                            </View>
                        )}
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                    ) : pendingMembers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No pending requests</Text>
                        </View>
                    ) : (
                        pendingMembers.map((member) => (
                            <View key={member.email} style={styles.memberCard}>
                                <View style={styles.memberInfo}>
                                    <Text style={styles.memberName}>{member.name || 'Unknown'}</Text>
                                    <Text style={styles.memberEmail}>{member.email}</Text>
                                    <Text style={styles.memberDate}>
                                        Requested {new Date(member.requestedAt).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.memberActions}>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.approveButton]}
                                        onPress={() => handleApproveMember(member.email)}
                                        disabled={actionLoading === member.email}
                                    >
                                        {actionLoading === member.email ? (
                                            <ActivityIndicator size="small" color={colors.surface} />
                                        ) : (
                                            <>
                                                <UserCheck size={18} color={colors.surface} />
                                                <Text style={styles.actionButtonText}>Approve</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.actionButton, styles.rejectButton]}
                                        onPress={() => handleRejectMember(member.email)}
                                        disabled={actionLoading === member.email}
                                    >
                                        <UserX size={18} color={colors.surface} />
                                        <Text style={styles.actionButtonText}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Current Members Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Users size={20} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Members ({group?.members.length || 0})</Text>
                    </View>

                    {group?.members.map((member) => {
                        const isThisMemberAdmin = group.admins?.includes(member.email);
                        const isCreatorMember = group.creatorId === member.email;

                        return (
                            <View key={member.email} style={styles.memberCard}>
                                <View style={styles.memberInfo}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.memberName}>{member.name || 'Unknown'}</Text>
                                        {isThisMemberAdmin && (
                                            <View style={styles.adminBadge}>
                                                <Text style={styles.adminBadgeText}>ADMIN</Text>
                                            </View>
                                        )}
                                        {isCreatorMember && (
                                            <View style={styles.creatorBadge}>
                                                <Text style={styles.creatorBadgeText}>CREATOR</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.memberEmail}>{member.email}</Text>
                                </View>
                                {!isCreatorMember && (
                                    <View style={styles.memberActions}>
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.kickButton]}
                                            onPress={() => handleKickMember(member.email, member.name)}
                                            disabled={actionLoading === member.email}
                                        >
                                            <Trash2 size={16} color={colors.surface} />
                                            <Text style={styles.actionButtonText}>Kick</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
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
        paddingBottom: 16,
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
    scrollView: {
        flex: 1,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700' as const,
        color: colors.text,
    },
    countBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    countBadgeText: {
        fontSize: 12,
        fontWeight: '700' as const,
        color: colors.surface,
    },
    emptyState: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    memberCard: {
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: colors.cardShadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: colors.text,
        marginBottom: 4,
    },
    memberEmail: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    memberDate: {
        fontSize: 12,
        color: colors.textLight,
    },
    memberActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    approveButton: {
        backgroundColor: colors.success,
    },
    rejectButton: {
        backgroundColor: colors.error,
    },
    kickButton: {
        backgroundColor: colors.error,
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600' as const,
        color: colors.surface,
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
    },
    creatorBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    creatorBadgeText: {
        fontSize: 10,
        color: '#000',
        fontWeight: '700' as const,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: 20,
        textAlign: 'center',
    },
    backButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600' as const,
        color: colors.surface,
    },
});
