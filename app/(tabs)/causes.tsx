import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Heart, BookOpen, Leaf, Brain, Users, GraduationCap } from 'lucide-react-native';
import colors from '@/constants/colors';

import { useApp } from '@/contexts/AppContext';

export default function CausesScreen() {
  const { videoConfig } = useApp();
  const causes = [
    {
      icon: BookOpen,
      title: 'School Supplies',
      description: 'Providing essential school supplies to students in underserved communities.',
      color: colors.primary,
    },
    {
      icon: GraduationCap,
      title: 'Scholarships',
      description: 'Supporting students with scholarships to pursue their educational dreams.',
      color: colors.secondary,
    },
    {
      icon: Users,
      title: 'Teach for America',
      description: 'Supporting teachers who are making a difference in low-income communities.',
      color: colors.warning,
    },
    {
      icon: Leaf,
      title: 'Environmental Education',
      description: 'Promoting environmental awareness and sustainability education programs.',
      color: colors.success,
    },
    {
      icon: Brain,
      title: 'Mental Health',
      description: 'Funding mental health resources and counseling services for students.',
      color: '#56CCF2',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Our Causes</Text>
          <Text style={styles.subtitle}>Making a difference together</Text>
        </View>
        <View style={styles.heartContainer}>
          <Heart size={32} color={colors.secondary} fill={colors.secondary} />
        </View>
      </View>

      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>
          View your impact, read about causes, and watch student inspirational talks.
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>Your Impact</Text>
          <Text style={styles.impactText}>
            Every month, <Text style={styles.impactHighlight}>$1 of your $5 subscription</Text> goes directly to support education, environment, and mental health initiatives.
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>$12</Text>
              <Text style={styles.statLabel}>Per Year</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>100%</Text>
              <Text style={styles.statLabel}>Transparent</Text>
            </View>
          </View>
        </View>

        <View style={styles.pricingCard}>
          <Text style={styles.pricingTitle}>Subscription Options</Text>
          <View style={styles.pricingOption}>
            <View style={styles.pricingLeft}>
              <Text style={styles.pricingPrice}>$5</Text>
              <Text style={styles.pricingPeriod}>per month</Text>
            </View>
            <View style={styles.pricingRight}>
              <Text style={styles.pricingDonation}>$1/month to charity</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.pricingOption}>
            <View style={styles.pricingLeft}>
              <Text style={styles.pricingPrice}>$20</Text>
              <Text style={styles.pricingPeriod}>per year</Text>
            </View>
            <View style={styles.pricingRight}>
              <Text style={styles.pricingDonation}>$12/year to charity</Text>
              <Text style={styles.savingsBadge}>Save $40/year</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Supported Causes</Text>

        {causes.map((cause, index) => (
          <View key={index} style={[styles.causeCard, { borderLeftColor: cause.color }]}>
            <View style={[styles.causeIcon, { backgroundColor: cause.color + '20' }]}>
              <cause.icon size={28} color={cause.color} />
            </View>
            <View style={styles.causeContent}>
              <Text style={styles.causeTitle}>{cause.title}</Text>
              <Text style={styles.causeDescription}>{cause.description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.missionCard}>
          <Text style={styles.missionTitle}>Our Mission</Text>
          <Text style={styles.missionText}>
            Cause Student AI Planner believes that every student deserves the tools and support to succeed.
            By using our app, you&rsquo;re not just organizing your academic life—you&rsquo;re contributing to a
            movement that empowers students everywhere through education, environmental stewardship,
            and mental health support.
          </Text>
          <Text style={styles.missionText}>
            Together, we&rsquo;re creating a brighter future for students in the USA and around the world.
          </Text>
        </View>

        {((videoConfig as any)?.essay1?.content || (videoConfig as any)?.essay2?.content) && (
          <>
            <Text style={styles.sectionTitle}>Featured Student Essays</Text>

            {(videoConfig as any)?.essay1?.content ? (
              <View style={styles.essayCard}>
                <View style={styles.essayHeader}>
                  <View style={styles.essayIcon}>
                    <BookOpen size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.essayTitle}>{(videoConfig as any).essay1.title}</Text>
                    <Text style={styles.essayAuthor}>By {(videoConfig as any).essay1.author}</Text>
                  </View>
                </View>
                <Text style={styles.essayContent}>{(videoConfig as any).essay1.content}</Text>
              </View>
            ) : null}

            {(videoConfig as any)?.essay2?.content ? (
              <View style={styles.essayCard}>
                <View style={styles.essayHeader}>
                  <View style={styles.essayIcon}>
                    <BookOpen size={20} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.essayTitle}>{(videoConfig as any).essay2.title}</Text>
                    <Text style={styles.essayAuthor}>By {(videoConfig as any).essay2.author}</Text>
                  </View>
                </View>
                <Text style={styles.essayContent}>{(videoConfig as any).essay2.content}</Text>
              </View>
            ) : null}
          </>
        )}

        <Text style={styles.sectionTitle}>Student Inspirational Talks</Text>
        <Text style={styles.sectionSubtitle}>Watch inspiring stories from students making a difference</Text>

        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>How I Changed the World as a Student</Text>
          <YoutubePlayer
            height={190}
            width="100%"
            videoId={videoConfig?.causesVideo1Id || "dQw4w9WgXcQ"}
            play={false}
          />
        </View>

        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>From Underperforming to High Achieving</Text>
          <YoutubePlayer
            height={190}
            width="100%"
            videoId={videoConfig?.causesVideo2Id || "dQw4w9WgXcQ"}
            play={false}
          />
        </View>

        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>What School Means to Me</Text>
          <YoutubePlayer
            height={190}
            width="100%"
            videoId={videoConfig?.causesVideo3Id || "dQw4w9WgXcQ"}
            play={false}
          />
        </View>

        <View style={styles.videoCard}>
          <Text style={styles.videoTitle}>Overcoming Challenges in My Academic Journey</Text>
          <YoutubePlayer
            height={190}
            width="100%"
            videoId={videoConfig?.causesVideo4Id || "dQw4w9WgXcQ"}
            play={false}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Thank you for being part of our community and making a difference! 💙
          </Text>
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
  heartContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  impactCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  impactTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: colors.surface,
    marginBottom: 12,
  },
  impactText: {
    fontSize: 15,
    color: colors.surface,
    lineHeight: 22,
    marginBottom: 20,
  },
  impactHighlight: {
    fontWeight: '700' as const,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.surface,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.surface,
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pricingTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  pricingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  pricingLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  pricingPrice: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
  },
  pricingPeriod: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  pricingRight: {
    alignItems: 'flex-end',
  },
  pricingDonation: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.secondary,
    marginBottom: 4,
  },
  savingsBadge: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: colors.text,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  causeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    borderLeftWidth: 4,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  causeIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  causeContent: {
    flex: 1,
  },
  causeTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 6,
  },
  causeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  missionCard: {
    backgroundColor: colors.secondaryLight,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  missionText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: -8,
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  essayCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  essayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  essayIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  essayTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.text,
  },
  essayAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  essayContent: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 24,
  },
});
