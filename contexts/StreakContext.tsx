import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '@/utils/apiService';
import { useAuth } from './AuthContext';

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
    showDailyModal: boolean;
    setShowDailyModal: (show: boolean) => void;
    showAnimation: boolean;
    setShowAnimation: (show: boolean) => void;
    animStreakNumber: number;
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

    // Modal state for daily streak
    const [showDailyModal, setShowDailyModal] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);

    // Load streak data on mount and when user changes
    useEffect(() => {
        if (user?.uid) {
            loadStreakData().then(() => {
                if (!sessionChecked) {
                    performDailyCheckIn();
                }
            });
        } else {
            setStreakData(null);
            setIsLoading(false);
            setSessionChecked(false);
        }
    }, [user?.uid]);

    const performDailyCheckIn = async () => {
        if (!user?.uid || sessionChecked) return;

        try {
            // Use AsyncStorage to double-check if we already showed the modal today
            // This persists even if the app process is restarted
            const today = new Date().toDateString();
            const lastShown = await AsyncStorage.getItem(`@streak_modal_shown_${user.uid}`);
            
            if (lastShown === today) {
                console.log('[Streak] Already shown today, skipping check-in animation');
                setSessionChecked(true);
                return;
            }

            const result = await updateStreak();
            setSessionChecked(true);

            if (result.increased) {
                setShowDailyModal(true);
                await AsyncStorage.setItem(`@streak_modal_shown_${user.uid}`, today);
            }
        } catch (error) {
            console.error('Error in daily check-in:', error);
        }
    };

    const loadStreakData = React.useCallback(async (options?: { silent?: boolean }) => {
        try {
            if (!options?.silent) setIsLoading(true);

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

                if (streakRes || statsRes) {
                    setStreakData(prevData => {
                        const combinedData = { ...prevData } as StreakData;
                        let hasUpdates = false;

                        // If we successfully fetched a streak, merge it in
                        if (streakRes && streakRes.success && streakRes.streak) {
                            Object.assign(combinedData, streakRes.streak);
                            hasUpdates = true;
                        }

                        // If we successfully fetched gamification stats, merge them in (even if streak failed/empty)
                        if (statsRes && statsRes.points !== undefined) {
                            combinedData.points = statsRes.points;
                            combinedData.level = statsRes.level || 1;
                            hasUpdates = true;
                        }

                        if (hasUpdates) {
                            // Update cache asynchronously
                            AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(combinedData)).catch(err => 
                                console.error('Error caching streak data:', err)
                            );
                            return combinedData;
                        }
                        return prevData;
                    });
                }
            }
        } catch (error) {
            console.error('Error loading streak data:', error);
        } finally {
            if (!options?.silent) setIsLoading(false);
        }
    }, [user?.uid]);

    const triggerAnimation = (streakNumber?: number) => {
        setAnimStreakNumber(streakNumber || streakData?.current || 0);
        setShowAnimation(true);
    };

    const updateStreak = React.useCallback(async (): Promise<{ increased: boolean; milestone: number | false }> => {
        try {
            if (!user?.uid) {
                throw new Error('User not authenticated');
            }

            const response = await apiService.post('/api/streak/update', {
                userId: user.uid,
            });

            if (response.success) {
                let milestone: number | false = false;
                let increased = false;

                setStreakData(prevData => {
                    const newStreakData = {
                        ...prevData,
                        ...response.streak,
                    } as StreakData;
                    
                    // Update cache
                    AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(newStreakData)).catch(err => 
                        console.error('Error caching streak data:', err)
                    );

                    milestone = response.milestone;
                    increased = response.increased;
                    
                    return newStreakData;
                });

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
    }, [user?.uid, streakData?.current]);

    const refreshStreak = React.useCallback(async (options?: { silent?: boolean }) => {
        await loadStreakData(options);
    }, [loadStreakData]);

    const awardPoints = React.useCallback(async (points: number, activityType: 'task' | 'streak' | 'goal' | 'habit' | 'feature') => {
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
    }, [user?.uid]);

    return (
        <StreakContext.Provider value={{
            streakData,
            isLoading,
            updateStreak,
            refreshStreak,
            awardPoints,
            triggerAnimation,
            showDailyModal,
            setShowDailyModal,
            showAnimation,
            setShowAnimation,
            animStreakNumber
        }}>
            {children}
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
