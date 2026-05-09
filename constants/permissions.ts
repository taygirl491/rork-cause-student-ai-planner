export type SubscriptionTier = 'free' | 'standard' | 'premium' | 'unlimited';

export interface Features {
  canCreateGroup: boolean;
  canSyncSyllabus: boolean;
  aiInquiryLimit: number | 'unlimited';
  canAccessNotes: boolean;
  canAccessGoals: boolean;
}

export const PERMISSIONS: Record<SubscriptionTier, Features> = {
  free: {
    canCreateGroup: false,      // Basic: Join only
    canSyncSyllabus: false,
    aiInquiryLimit: 0,          // No access in free mode
    canAccessNotes: false,
    canAccessGoals: true,
  },
  standard: {
    canCreateGroup: true,
    canSyncSyllabus: false,
    aiInquiryLimit: 50,
    canAccessNotes: true,
    canAccessGoals: true,
  },
  premium: {
    canCreateGroup: true,
    canSyncSyllabus: true,
    aiInquiryLimit: 100,
    canAccessNotes: true,
    canAccessGoals: true,
  },
  unlimited: {
    canCreateGroup: true,
    canSyncSyllabus: true,
    aiInquiryLimit: 200,
    canAccessNotes: true,
    canAccessGoals: true,
  },
};
