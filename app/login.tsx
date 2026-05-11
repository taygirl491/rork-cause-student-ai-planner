import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Modal, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import colors from '@/constants/colors';
import * as NotificationService from '@/utils/notificationService';
import Button from '@/components/Button';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

const ADMIN_EMAIL = 'minatoventuresinc@gmail.com';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const { login, isLoggingIn, loginError, resetPassword } = useAuth();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo: string }>();

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const openForgotModal = () => {
    // Pre-fill from the login form's email; if empty the modal will show an input
    setResetEmail(email.trim());
    setShowForgotModal(true);
  };

  const handleForgotPassword = async () => {
    const target = resetEmail.trim();
    if (!target) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(target);
      setShowForgotModal(false);
      Alert.alert('Reset Link Sent', `A password reset link has been sent to ${target}. Check your inbox.`);
    } catch (error: any) {
      setShowForgotModal(false);
      Alert.alert('Error', error.message || 'Failed to send reset email');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const isAdminEmail = trimmedEmail === ADMIN_EMAIL;

    setIsNavigating(true);
    try {
      if (isAdminEmail) {
        // Admin path — handle account recreation if it was deleted
        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, password);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            await createUserWithEmailAndPassword(auth, trimmedEmail, password);
          } else {
            throw err;
          }
        }
        router.replace('/admin' as any);
        return;
      }

      const user = await login(trimmedEmail, password);
      await AsyncStorage.setItem('@onboarding_complete', 'true');

      if (user) {
        NotificationService.registerForPushNotificationsAsync()
          .then(token => {
            if (token) NotificationService.savePushToken(user.uid, token, user.email || undefined);
          })
          .catch(() => {});
      }

      if (returnTo) {
        router.replace(returnTo as any);
      } else {
        router.replace('/home');
      }
    } catch (error: any) {
      setIsNavigating(false);

      let errorTitle = 'Login Failed';
      let errorMessage = 'Unable to sign in. Please try again.';

      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        errorTitle = 'Incorrect Password';
        errorMessage = 'The password you entered is incorrect. Please try again or use "Forgot Password" to reset it.';
      } else if (error.code === 'auth/user-not-found') {
        errorTitle = 'Account Not Found';
        errorMessage = 'No account exists with this email. Would you like to create a new account?';
      } else if (error.code === 'auth/invalid-email') {
        errorTitle = 'Invalid Email';
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/user-disabled') {
        errorTitle = 'Account Disabled';
        errorMessage = 'This account has been disabled. Please contact support for assistance.';
      } else if (error.code === 'auth/too-many-requests') {
        errorTitle = 'Too Many Attempts';
        errorMessage = 'Too many failed login attempts. Please wait a few minutes and try again, or reset your password.';
      } else if (error.code === 'auth/network-request-failed') {
        errorTitle = 'Connection Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(errorTitle, errorMessage);
    }
  };

  const handleRegister = () => {
    router.push('/register' as any);
  };

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>

              <View style={styles.iconContainer}>
                <Image source={require('../assets/images/logo.png')} style={styles.logo} />
              </View>
              <Text style={styles.subtitle}>Empowering Students to Excel</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Mail size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoggingIn}
                />
              </View>

              <View style={styles.inputContainer}>
                <View style={styles.inputIcon}>
                  <Lock size={20} color={colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  editable={!isLoggingIn}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <View pointerEvents="none">
                    {showPassword ? (
                      <EyeOff size={20} color={colors.textSecondary} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={openForgotModal}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <Button
                title="Login"
                onPress={handleLogin}
                isLoading={isLoggingIn || isNavigating}
                style={styles.loginButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Create New Account"
                onPress={handleRegister}
                variant="outline"
                disabled={isLoggingIn || isNavigating}
                style={styles.registerButton}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Forgot Password Modal */}
        <Modal
          visible={showForgotModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowForgotModal(false)}
        >
          <SafeAreaView style={styles.safeAreaModal}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1 }}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => setShowForgotModal(false)}
                style={styles.modalOverlay}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={(e) => e.stopPropagation()}
                >
                  <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Reset Password?</Text>

                    {email.trim() ? (
                      <Text style={styles.modalSubtitle}>
                        We&apos;ll send a password reset link to{' '}
                        <Text style={{ fontWeight: '700', color: colors.text }}>{resetEmail}</Text>.
                        {'\n\n'}
                        Do you want to continue?
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.modalSubtitle}>
                          Enter your email address and we&apos;ll send you a link to reset your password.
                        </Text>
                        <TextInput
                          style={styles.modalInput}
                          placeholder="Email Address"
                          placeholderTextColor={colors.textSecondary}
                          value={resetEmail}
                          onChangeText={setResetEmail}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                          autoFocus
                        />
                      </>
                    )}

                    <View style={styles.modalButtons}>
                      <Button
                        title={email.trim() ? 'No' : 'Cancel'}
                        onPress={() => setShowForgotModal(false)}
                        variant="outline"
                        style={styles.modalButton}
                      />

                      <Button
                        title={email.trim() ? 'Yes, Send Link' : 'Send Link'}
                        onPress={handleForgotPassword}
                        isLoading={isResetting}
                        style={styles.modalButton}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  safeAreaModal: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputIcon: {
    paddingLeft: 16,
    paddingRight: 12,
  },
  eyeIcon: {
    paddingRight: 16,
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 16,
    fontSize: 16,
    color: colors.text,
  },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerButton: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  registerButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonTextCancel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
