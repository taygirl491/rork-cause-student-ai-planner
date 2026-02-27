import React from 'react';
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    View,
    ViewStyle,
    TextStyle,
    StyleProp,
} from 'react-native';
import colors from '@/constants/colors';

interface ButtonProps {
    title: string;
    onPress: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    loadingText?: string;
    icon?: React.ReactNode;
}

export default function Button({
    title,
    onPress,
    isLoading = false,
    disabled = false,
    variant = 'primary',
    style,
    textStyle,
    loadingText,
    icon,
}: ButtonProps) {
    const isButtonDisabled = disabled || isLoading;

    const getVariantStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondaryButton;
            case 'outline':
                return styles.outlineButton;
            case 'danger':
                return styles.dangerButton;
            default:
                return styles.primaryButton;
        }
    };

    const getVariantTextStyle = () => {
        switch (variant) {
            case 'outline':
                return styles.outlineText;
            default:
                return styles.text;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.baseButton,
                getVariantStyle(),
                isButtonDisabled && styles.disabledButton,
                style,
            ]}
            onPress={onPress}
            disabled={isButtonDisabled}
            activeOpacity={0.7}
        >
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size="small"
                        color={variant === 'outline' ? colors.primary : '#FFFFFF'}
                        style={styles.loader}
                    />
                    {loadingText ? (
                        <Text style={[getVariantTextStyle(), styles.loadingText, textStyle]}>
                            {loadingText}
                        </Text>
                    ) : null}
                </View>
            ) : (
                <View style={styles.contentContainer}>
                    {icon && <View style={styles.iconContainer}>{icon}</View>}
                    <Text style={[getVariantTextStyle(), textStyle]}>{title}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    baseButton: {
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primaryButton: {
        backgroundColor: colors.primary,
    },
    secondaryButton: {
        backgroundColor: colors.secondary,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    dangerButton: {
        backgroundColor: colors.error,
    },
    disabledButton: {
        opacity: 0.6,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    outlineText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    loader: {
        marginRight: 8,
    },
    loadingText: {
        marginLeft: 0, // ActivityIndicator already has marginRight
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        marginRight: 8,
    },
});
