// Example: How to add "Upgrade to Premium" button to AI Buddy

// Add this to your ai-buddy.tsx imports:
import { Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';

// Add this in your component:
const router = useRouter();

// Add this button in your dashboard (around line 310):
<TouchableOpacity 
    style={styles.premiumBanner} 
    onPress={() => router.push('/payment')}
>
    <Crown size={24} color="#FFD700" />
    <View style={styles.premiumTextContainer}>
        <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
        <Text style={styles.premiumSubtitle}>
            Unlock unlimited AI conversations and advanced features
        </Text>
    </View>
</TouchableOpacity>

// Add these styles:
premiumBanner: {
    backgroundColor: colors.primary + '15',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary + '30',
},
premiumTextContainer: {
    flex: 1,
},
premiumTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
},
premiumSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
},
