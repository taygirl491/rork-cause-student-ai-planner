import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Heart, BookOpen, Brain, GraduationCap, Square, CheckSquare } from 'lucide-react-native';
import colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useResponsive } from '@/utils/responsive';
import apiService from '@/utils/apiService';

const RULES = [
  'Your video must address one of the following topics: (a) How I Keep Organized at School, (b) How I Changed the World as a Student, (c) How I Went From Underachieving to High Achieving Student, (d) What School Means to Me, (e) How I Protect My Mental Health at School.',
  'Your video must be no longer than 4 minutes. If your video is more than 4 minutes, you will be disqualified from the contest.',
  'Your video must state your first name ONLY and university.',
  'You must be 18 years or older to submit an entry to the video contest.',
  'Please do not use any profanity or offensive language in your video, or it will be disqualified.',
  'Your video will be judged by how many "likes" it receives on the Cause Planner app, as well as how well it addresses the topic.',
];

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  school: '',
  videoLink: '',
  phone: '',
  email: '',
  address: '',
};

export default function CausesScreen() {
  const { videoConfig } = useApp();
  const { isTablet, normalize } = useResponsive();

  const [form, setForm] = useState(EMPTY_FORM);
  const [permission, setPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      icon: Brain,
      title: 'Mental Health',
      description: 'Funding mental health resources and counseling services for students.',
      color: '#56CCF2',
    },
  ];

  const videoHeight = isTablet ? 320 : 190;
  const hPad = isTablet ? 40 : 20;

  const handleField = (field: keyof typeof EMPTY_FORM, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const missing = Object.entries(form).find(([, v]) => !v.trim());
    if (missing) {
      Alert.alert('Missing Field', 'Please fill in all fields before submitting.');
      return;
    }
    if (!permission) {
      Alert.alert('Permission Required', 'You must grant permission to showcase your video on the app.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiService.post('/api/pep-talks/submit', { ...form, permission });
      if (response.success) {
        Alert.alert('Submitted! 🎉', 'Your entry has been received. Good luck!');
        setForm(EMPTY_FORM);
        setPermission(false);
      } else {
        Alert.alert('Error', response.error || 'Something went wrong. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not submit. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
          Check out your impact, explore causes that matter, and vibe with student pep talks below 👇
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={[styles.contentWrapper, isTablet && styles.contentWrapperTablet]}>

            {/* Impact card */}
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

            {/* Supported causes */}
            <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(22) }]}>Supported Causes</Text>

            {causes.map((cause, index) => (
              <View key={index} style={[styles.causeCard, { marginHorizontal: hPad, borderLeftColor: cause.color }]}>
                <View style={[styles.causeIcon, { backgroundColor: cause.color + '20' }]}>
                  <cause.icon size={28} color={cause.color} />
                </View>
                <View style={styles.causeContent}>
                  <Text style={[styles.causeTitle, { fontSize: normalize(17) }]}>{cause.title}</Text>
                  <Text style={[styles.causeDescription, { fontSize: normalize(14) }]}>{cause.description}</Text>
                </View>
              </View>
            ))}

            {/* Mission */}
            <View style={[styles.missionCard, { marginHorizontal: hPad }]}>
              <Text style={[styles.missionTitle, { fontSize: normalize(20) }]}>Our Mission 🌍</Text>
              <Text style={[styles.missionText, { fontSize: normalize(15) }]}>
                We believe every student deserves the tools to absolutely crush it in school. When you use our app, you're not just getting your life together – you're helping students everywhere access education and get mental health support.
              </Text>
              <Text style={[styles.missionText, { fontSize: normalize(15) }]}>
                Basically, you're making the world better while acing your classes. That's what we call a win-win.
              </Text>
            </View>

            {/* Pep Talks Contest rules */}
            <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(22) }]}>Student Pep Talks Contest! 🎤</Text>

            <View style={[styles.contestCard, { marginHorizontal: hPad }]}>
              <Text style={[styles.contestPrize, { fontSize: normalize(17) }]}>
                Submit your video for a chance to win a <Text style={styles.prizeHighlight}>$300 cash prize</Text>!
              </Text>
              <Text style={[styles.rulesHeading, { fontSize: normalize(15) }]}>Rules for entry:</Text>
              {RULES.map((rule, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={[styles.ruleNumber, { fontSize: normalize(14) }]}>{i + 1}.</Text>
                  <Text style={[styles.ruleText, { fontSize: normalize(14) }]}>{rule}</Text>
                </View>
              ))}
            </View>

            {/* Submission form */}
            <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(20), marginTop: 8 }]}>Submit Your Entry</Text>

            <View style={[styles.formCard, { marginHorizontal: hPad }]}>
              {([
                { label: 'First Name', field: 'firstName', placeholder: 'Your first name' },
                { label: 'Last Name', field: 'lastName', placeholder: 'Your last name' },
                { label: 'School / University', field: 'school', placeholder: 'e.g. University of Lagos' },
                { label: 'YouTube Video Link', field: 'videoLink', placeholder: 'https://youtube.com/watch?v=...' },
                { label: 'Phone Number', field: 'phone', placeholder: '+1 234 567 8900', keyboardType: 'phone-pad' },
                { label: 'Email', field: 'email', placeholder: 'you@example.com', keyboardType: 'email-address' },
                { label: 'Address', field: 'address', placeholder: '123 Main St, City, Country' },
              ] as { label: string; field: keyof typeof EMPTY_FORM; placeholder: string; keyboardType?: any }[]).map(({ label, field, placeholder, keyboardType }) => (
                <View key={field} style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { fontSize: normalize(14) }]}>{label}</Text>
                  <TextInput
                    style={[styles.input, { fontSize: normalize(15) }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textSecondary}
                    value={form[field]}
                    onChangeText={v => handleField(field, v)}
                    keyboardType={keyboardType || 'default'}
                    autoCapitalize={field === 'email' || field === 'videoLink' ? 'none' : 'words'}
                    autoCorrect={false}
                  />
                </View>
              ))}

              {/* Permission checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setPermission(p => !p)}
                activeOpacity={0.7}
              >
                {permission
                  ? <CheckSquare size={22} color={colors.primary} />
                  : <Square size={22} color={colors.textSecondary} />
                }
                <Text style={[styles.checkboxLabel, { fontSize: normalize(13) }]}>
                  I permit my video to be showcased on the Cause Planner app.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={[styles.submitButtonText, { fontSize: normalize(16) }]}>Submit Entry</Text>
                }
              </TouchableOpacity>
            </View>

            {/* Pep Talk videos */}
            <Text style={[styles.sectionTitle, { paddingHorizontal: hPad, fontSize: normalize(22), marginTop: 8 }]}>Pep Talks 🎥</Text>
            <Text style={[styles.sectionSubtitle, { paddingHorizontal: hPad }]}>Motivation from students like you.</Text>

            {(() => {
              const cfg = videoConfig as any;
              const slots = [
                { topic: 'How I Changed the World as a Student', idKey: 'causesVideo1Id', titleKey: 'causesVideo1Title', nameKey: 'causesVideo1Name', schoolKey: 'causesVideo1School' },
                { topic: 'From Underperforming to High Achieving', idKey: 'causesVideo2Id', titleKey: 'causesVideo2Title', nameKey: 'causesVideo2Name', schoolKey: 'causesVideo2School' },
                { topic: 'What School Means to Me', idKey: 'causesVideo3Id', titleKey: 'causesVideo3Title', nameKey: 'causesVideo3Name', schoolKey: 'causesVideo3School' },
                { topic: 'Overcoming Challenges in My Academic Journey', idKey: 'causesVideo4Id', titleKey: 'causesVideo4Title', nameKey: 'causesVideo4Name', schoolKey: 'causesVideo4School' },
                { topic: 'How I Protect My Mental Health at School', idKey: 'causesVideo5Id', titleKey: 'causesVideo5Title', nameKey: 'causesVideo5Name', schoolKey: 'causesVideo5School' },
              ].filter(v => !!cfg?.[v.idKey]);

              if (slots.length === 0) {
                return (
                  <View style={[styles.emptyVideos, { marginHorizontal: hPad }]}>
                    <Text style={[styles.emptyVideosText, { fontSize: normalize(14) }]}>
                      No pep talk videos yet — check back soon! 🎬
                    </Text>
                  </View>
                );
              }

              return slots.map((v) => {
                const title = cfg?.[v.titleKey] || v.topic;
                const name = cfg?.[v.nameKey] || '';
                const school = cfg?.[v.schoolKey] || '';
                return (
                  <View key={v.idKey} style={[styles.videoCard, { marginHorizontal: hPad }]}>
                    <Text style={[styles.videoTitle, { fontSize: normalize(16) }]}>{title}</Text>
                    <YoutubePlayer
                      height={videoHeight}
                      width="100%"
                      videoId={cfg[v.idKey]}
                      play={false}
                    />
                    {(name || school) ? (
                      <Text style={[styles.videoByline, { fontSize: normalize(13) }]}>
                        {name ? `By ${name}` : ''}
                        {name && school ? ' · ' : ''}
                        {school}
                      </Text>
                    ) : null}
                  </View>
                );
              });
            })()}

            <View style={[styles.footer, { paddingHorizontal: hPad }]}>
              <Text style={styles.footerText}>
                Thank you for being part of our community and making a difference! 💙
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    marginTop: -8,
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
    marginBottom: 24,
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
  contestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  contestPrize: {
    color: colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  prizeHighlight: {
    fontWeight: '800' as const,
    color: colors.primary,
  },
  rulesHeading: {
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
  },
  ruleRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  ruleNumber: {
    fontWeight: '700' as const,
    color: colors.primary,
    minWidth: 18,
  },
  ruleText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
    marginTop: 4,
  },
  checkboxLabel: {
    flex: 1,
    color: colors.text,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700' as const,
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
  videoByline: {
    color: colors.textSecondary,
    marginTop: 8,
  },
  emptyVideos: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyVideosText: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
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
});
