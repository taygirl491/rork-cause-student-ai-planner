import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Heart, BookOpen, Brain, Users, GraduationCap } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useResponsive } from '@/utils/responsive';

export default function CausesScreen() {
  const { videoConfig } = useApp();
  const { isTablet, normalize } = useResponsive();

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
      icon: Brain,
      title: 'Mental Health',
      description: 'Funding mental health resources and counseling services for students.',
      color: '#56CCF2',
    },
  ];

  const videoHeight = isTablet ? 320 : 190;
  const hPad = isTablet ? 40 : 20;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={[styles.header, { paddingHorizontal: hPad }]}>
        <View>
          <Text style={[styles.title, { fontSize: normalize(22) }]}>Make It Count 🌍</Text>
          <Text style={styles.subtitle}>Your impact in action</Text>
        </View>
        <View style={styles.heartContainer}>
          <Heart size={32} color={colors.secondary} fill={colors.secondary} />
        </View>
      </View>

      <View style={[styles.descriptionContainer, { paddingHorizontal: hPad }]}>
        <Text style={styles.description}>
          Check out your impact, explore causes that matter, and vibe with student
          pep talks, and student essays below 👇
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Constrain all content to a readable max-width on iPad */}
        <View style={[styles.contentWrapper, isTablet && styles.contentWrapperTablet]}>

          <View style={[styles.impactCard, { marginHorizontal: hPad }]}>
            <Text style={[styles.impactTitle, { fontSize: normalize(24) }]}>Here's the Deal 🤝</Text>
            <Text style={[styles.impactText, { fontSize: normalize(15) }]}>
              10% of our profits go straight to helping students and supporting mental health. Every. Single. Month.
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { fontSize: normalize(28) }]}>100%</Text>
                <Text style={styles.statLabel}>Transparent</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(22) }]}>Supported Causes</Text>

          {causes.map((cause, index) => (
            <View key={index} style={[styles.causeCard, { marginHorizontal: hPad }]}>
              <View style={[styles.causeIcon, { backgroundColor: cause.color + '20' }]}>
                <cause.icon size={28} color={cause.color} />
              </View>
              <View style={styles.causeContent}>
                <Text style={[styles.causeTitle, { fontSize: normalize(17) }]}>{cause.title}</Text>
                <Text style={[styles.causeDescription, { fontSize: normalize(14) }]}>{cause.description}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.missionCard, { marginHorizontal: hPad }]}>
            <Text style={[styles.missionTitle, { fontSize: normalize(20) }]}>Our Mission 🌍</Text>
            <Text style={[styles.missionText, { fontSize: normalize(15) }]}>
              We believe every student deserves the tools to absolutely crush it in school. When you use our app, you're not just getting your life together – you're helping students everywhere access education and get mental health support.
            </Text>
            <Text style={[styles.missionText, { fontSize: normalize(15) }]}>
              Basically, you're making the world better while acing your classes. That's what we call a win-win.
            </Text>
          </View>

          {((videoConfig as any)?.essay1?.content || (videoConfig as any)?.essay2?.content) && (
            <>
              <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(22) }]}>Worth the Read 📖</Text>
              <Text style={[styles.sectionSubtitle, { paddingHorizontal: hPad }]}>Student essay spotlight. Words That Win 📝 - Submit your essay to win.</Text>

              {(videoConfig as any)?.essay1?.content ? (
                <View style={[styles.essayCard, { marginHorizontal: hPad }]}>
                  <View style={styles.essayHeader}>
                    <View style={styles.essayIcon}>
                      <BookOpen size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.essayTitle, { fontSize: normalize(18) }]}>{(videoConfig as any).essay1.title}</Text>
                      <Text style={styles.essayAuthor}>By {(videoConfig as any).essay1.author}</Text>
                    </View>
                  </View>
                  <Text style={[styles.essayContent, { fontSize: normalize(15) }]}>{(videoConfig as any).essay1.content}</Text>
                </View>
              ) : null}

              {(videoConfig as any)?.essay2?.content ? (
                <View style={[styles.essayCard, { marginHorizontal: hPad }]}>
                  <View style={styles.essayHeader}>
                    <View style={styles.essayIcon}>
                      <BookOpen size={20} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.essayTitle, { fontSize: normalize(18) }]}>{(videoConfig as any).essay2.title}</Text>
                      <Text style={styles.essayAuthor}>By {(videoConfig as any).essay2.author}</Text>
                    </View>
                  </View>
                  <Text style={[styles.essayContent, { fontSize: normalize(15) }]}>{(videoConfig as any).essay2.content}</Text>
                </View>
              ) : null}
            </>
          )}

          <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(22) }]}>Pep Talks 🎤</Text>
          <Text style={[styles.sectionSubtitle, { paddingHorizontal: hPad }]}>Motivation from students like you: Lights, Camera, Win! – Submit your vid here for prizes. Must be 18 or over to submit.</Text>

          {[
            { title: 'How I Changed the World as a Student', key: 'causesVideo1Id' },
            { title: 'From Underperforming to High Achieving', key: 'causesVideo2Id' },
            { title: 'What School Means to Me', key: 'causesVideo3Id' },
            { title: 'Overcoming Challenges in My Academic Journey', key: 'causesVideo4Id' },
            { title: 'How I Protect My Mental Health at School', key: 'causesVideo5Id' },
          ].map((v) => (
            <View key={v.key} style={[styles.videoCard, { marginHorizontal: hPad }]}>
              <Text style={[styles.videoTitle, { fontSize: normalize(16) }]}>{v.title}</Text>
              <YoutubePlayer
                height={videoHeight}
                width="100%"
                videoId={(videoConfig as any)?.[v.key] || 'dQw4w9WgXcQ'}
                play={false}
              />
            </View>
          ))}

          <View style={[styles.footer, { paddingHorizontal: hPad }]}>
            <Text style={styles.footerText}>
              Thank you for being part of our community and making a difference! 💙
            </Text>
          </View>
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
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
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
  contentWrapper: {
    width: '100%',
  },
  contentWrapperTablet: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  impactCard: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  impactTitle: {
    fontWeight: '800' as const,
    color: colors.surface,
    marginBottom: 12,
  },
  impactText: {
    color: colors.surface,
    lineHeight: 22,
    marginBottom: 20,
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
    fontWeight: '800' as const,
    color: colors.surface,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.surface,
  },
  sectionTitle: {
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 16,
  },
  causeCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
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
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 6,
  },
  causeDescription: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  missionCard: {
    backgroundColor: colors.secondaryLight,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  missionTitle: {
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  missionText: {
    color: colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  footer: {
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
    marginBottom: 16,
    marginTop: -8,
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  videoTitle: {
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  essayCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
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
    fontWeight: '700' as const,
    color: colors.text,
  },
  essayAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  essayContent: {
    color: colors.text,
    lineHeight: 24,
  },
});
