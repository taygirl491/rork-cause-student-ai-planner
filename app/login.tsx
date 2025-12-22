import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mail, Lock, GraduationCap, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import colors from '@/constants/colors';
import { registerForPushNotificationsAsync, savePushToken } from '@/functions/Notify';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebaseConfig';

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

  const handleForgotPassword = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setIsResetting(true);
    try {
      await resetPassword(resetEmail.trim());
      setShowForgotModal(false);
      setResetEmail('');
      Alert.alert('Success', 'Password reset email sent! Check your inbox.');
    } catch (error: any) {
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

    setIsNavigating(true);
    try {
      const user = await login(email.trim(), password);
      // Ensure onboarding is marked as complete on successful login
      await AsyncStorage.setItem('@onboarding_complete', 'true');

      const token = await registerForPushNotificationsAsync();
      if (user && token) {
        await savePushToken(user.uid, token, user.email || undefined);
      }

      if (user?.email === 'minatoventuresinc@gmail.com') {
        router.replace('/admin' as any);
        return;
      }

      if (returnTo) {
        router.replace(returnTo as any);
      } else {
        router.replace('/home');
      }
    } catch (error: any) {
      setIsNavigating(false);
      // Special handling for admin account creation
      if (email.trim().toLowerCase() === 'minatoventuresinc@gmail.com') {
        try {
          setIsNavigating(true);
          await createUserWithEmailAndPassword(auth, email.trim(), password);
          // If successful, proceed to admin
          router.replace('/admin' as any);
          return;
        } catch (createError: any) {
          setIsNavigating(false);
          console.log("Admin creation failed or already exists:", createError);
          // If the account already exists (but login failed), it means the password is wrong
          if (createError.code === 'auth/email-already-in-use') {
            Alert.alert(
              'Admin Login Issue',
              'The admin account already exists, but the password provided is incorrect. Please use the "Forgot Password" button to reset it.'
            );
            return;
          } else {
            // Alert for other creation errors (e.g. weak password, network, etc.)
            Alert.alert(
              'Admin Creation Error',
              `Failed to create admin account: ${createError.message}`
            );
            return;
          }
        }
      }

      // Provide user-friendly error messages
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
                <GraduationCap size={64} color="#fff" strokeWidth={2} />
              </View>
              <Text style={styles.title}>Cause Student</Text>
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
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={() => setShowForgotModal(true)}
                style={styles.forgotPasswordButton}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.loginButton, (isLoggingIn || isNavigating) && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoggingIn || isNavigating}
              >
                <Text style={styles.loginButtonText}>
                  {(isLoggingIn || isNavigating) ? 'Logging in...' : 'Login'}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.registerButton}
                onPress={handleRegister}
                disabled={isLoggingIn || isNavigating}
              >
                <Text style={styles.registerButtonText}>Create New Account</Text>
              </TouchableOpacity>
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
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>

                  <TextInput
                    style={styles.modalInput}
                    placeholder="Email Address"
                    placeholderTextColor={colors.textSecondary}
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalButtonCancel]}
                      onPress={() => setShowForgotModal(false)}
                    >
                      <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.modalButton,
                        styles.modalButtonConfirm,
                        isResetting && styles.disabledButton
                      ]}
                      onPress={handleForgotPassword}
                      disabled={isResetting}
                    >
                      {isResetting ? (
                        <Text style={styles.modalButtonTextConfirm}>Sending...</Text>
                      ) : (
                        <Text style={styles.modalButtonTextConfirm}>Send Link</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
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
