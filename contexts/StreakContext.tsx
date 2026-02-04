import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '@/utils/apiService';
import { useAuth } from './AuthContext';
import StreakFireAnimation from '@/components/StreakFireAnimation';

interface StreakData {
    current: number;
    longest: number;
    totalTasksCompleted: number;
    lastCompletionDate: string | null;
    streakFreezes: number;
    points: number;
    level: number;
}

interface StreakContextType {
    streakData: StreakData | null;
    isLoading: boolean;
    updateStreak: () => Promise<{ increased: boolean; milestone: number | false }>;
    refreshStreak: () => Promise<void>;
    awardPoints: (points: number, activityType: 'task' | 'streak' | 'goal' | 'habit' | 'feature') => Promise<{ points: number; level: number; leveledUp: boolean } | null>;
    triggerAnimation: (streakNumber?: number) => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const STREAK_CACHE_KEY = 'user-streak-data';

export function StreakProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Animation state
    const [showAnimation, setShowAnimation] = useState(false);
    const [animStreakNumber, setAnimStreakNumber] = useState(0);

    // Load streak data on mount and when user changes
    useEffect(() => {
        if (user?.uid) {
            loadStreakData();
        } else {
            setStreakData(null);
            setIsLoading(false);
        }
    }, [user?.uid]);

    const loadStreakData = async () => {
        try {
            setIsLoading(true);

            // Try to load from cache first
            const cached = await AsyncStorage.getItem(STREAK_CACHE_KEY);
            if (cached) {
                setStreakData(JSON.parse(cached));
            }

            // Fetch fresh data from backend
            if (user?.uid) {
                const [streakRes, statsRes] = await Promise.all([
                    apiService.get(`/api/streak/${user.uid}`),
                    apiService.get(`/api/gamification/stats/${user.uid}`)
                ]);

                if (streakRes.success && statsRes) {
                    const combinedData = {
                        ...streakRes.streak,
                        points: statsRes.points || 0,
                        level: statsRes.level || 1,
                    };
                    setStreakData(combinedData);
                    // Update cache
                    await AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(combinedData));
                }
            }
        } catch (error) {
            console.error('Error loading streak data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const triggerAnimation = (streakNumber?: number) => {
        setAnimStreakNumber(streakNumber || streakData?.current || 0);
        setShowAnimation(true);
    };

    const updateStreak = async (): Promise<{ increased: boolean; milestone: number | false }> => {
        try {
            if (!user?.uid) {
                throw new Error('User not authenticated');
            }

            const response = await apiService.post('/api/streak/update', {
                userId: user.uid,
            });

            if (response.success) {
                const newStreakData = {
                    ...streakData,
                    ...response.streak,
                    // If points were awarded in the same backend call, they might not be here
                    // but we'll fetch stats soon anyway
                } as StreakData;

                setStreakData(newStreakData);
                // Update cache
                await AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(newStreakData));

                if (response.increased) {
                    triggerAnimation(response.streak.current);
                }

                return {
                    increased: response.increased,
                    milestone: response.milestone,
                };
            }

            return { increased: false, milestone: false };
        } catch (error) {
            console.error('Error updating streak:', error);
            return { increased: false, milestone: false };
        }
    };

    const refreshStreak = async () => {
        const oldStreak = streakData?.current || 0;
        await loadStreakData();

        // After loading fresh data, check if streak increased
        // We do this here as well to capture increases that might happen 
        // silently (e.g. from background tasks or sync)
        setStreakData(current => {
            if (current && current.current > oldStreak) {
                // Trigger animation if it increased
                triggerAnimation(current.current);
            }
            return current;
        });
    };

    const awardPoints = async (points: number, activityType: 'task' | 'streak' | 'goal' | 'habit' | 'feature') => {
        try {
            if (!user?.uid) return null;

            const response = await apiService.post('/api/gamification/award', {
                userId: user.uid,
                points,
                activityType
            });

            if (response && response.points !== undefined) {
                setStreakData(prev => prev ? {
                    ...prev,
                    points: response.points,
                    level: response.level
                } : null);
                return response;
            }
            return null;
        } catch (error) {
            console.error('Error awarding points:', error);
            return null;
        }
    };

    return (
        <StreakContext.Provider value={{ streakData, isLoading, updateStreak, refreshStreak, awardPoints, triggerAnimation }}>
            {children}
            <StreakFireAnimation
                visible={showAnimation}
                streakNumber={animStreakNumber}
                onFinish={() => setShowAnimation(false)}
            />
        </StreakContext.Provider>
    );
}

export function useStreak() {
    const context = useContext(StreakContext);
    if (context === undefined) {
        throw new Error('useStreak must be used within a StreakProvider');
    }
    return context;
}
