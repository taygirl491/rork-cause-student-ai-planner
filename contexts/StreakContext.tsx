import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '@/utils/apiService';
import { useAuth } from './AuthContext';
import { formatLocalDate } from '@/utils/timeUtils';

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
    updateStreak: (opts?: { suppressAnimation?: boolean }) => Promise<{ increased: boolean; milestone: number | false; backendReachable: boolean; newStreakCount: number }>;
    refreshStreak: () => Promise<void>;
    awardPoints: (points: number, activityType: 'task' | 'streak' | 'goal' | 'habit' | 'feature') => Promise<{ points: number; level: number; leveledUp: boolean } | null>;
    triggerAnimation: (streakNumber?: number) => void;
    showDailyModal: boolean;
    setShowDailyModal: (show: boolean) => void;
    showAnimation: boolean;
    setShowAnimation: (show: boolean) => void;
    animStreakNumber: number;
    modalStreakCount: number;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const STREAK_CACHE_KEY = 'user-streak-data';
const pendingCheckInKey = (uid: string) => `@pendingStreakCheckIn_${uid}`;
const modalShownKey = (uid: string) => `@streak_modal_shown_${uid}`;

export function StreakProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [streakData, setStreakData] = useState<StreakData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Animation state
    const [showAnimation, setShowAnimation] = useState(false);
    const [animStreakNumber, setAnimStreakNumber] = useState(0);

    // Modal state for daily streak
    const [showDailyModal, setShowDailyModal] = useState(false);
    const [modalStreakCount, setModalStreakCount] = useState(0);
    const [sessionChecked, setSessionChecked] = useState(false);

    // Prevents loadStreakData's GET response from overwriting the optimistic
    // streak count while performDailyCheckIn is mid-flight.
    const checkInInProgress = React.useRef(false);

    useEffect(() => {
        if (user?.uid) {
            loadStreakData();
            if (!sessionChecked) {
                performDailyCheckIn();
            }
        } else {
            setStreakData(null);
            setIsLoading(false);
            setSessionChecked(false);
        }
    }, [user?.uid]);

    /**
     * Shows the daily streak modal immediately from cache (optimistic),
     * then syncs the check-in to the backend in the background.
     *
     * The modal reads streakData.current live, so when the backend responds
     * and updates the state, the displayed count corrects itself automatically.
     *
     * If the backend is unreachable, a pending flag is stored in AsyncStorage
     * so loadStreakData can retry the check-in on the next successful connection.
     */
    const performDailyCheckIn = async () => {
        if (!user?.uid || sessionChecked) return;

        checkInInProgress.current = true;
        try {
            const today = new Date().toDateString();

            // Read both values in parallel — both are local AsyncStorage reads (fast)
            const [lastShown, cached] = await Promise.all([
                AsyncStorage.getItem(modalShownKey(user.uid)),
                AsyncStorage.getItem(STREAK_CACHE_KEY),
            ]);

            if (lastShown === today) {
                setSessionChecked(true);
                return;
            }

            // ── Optimistic show ──────────────────────────────────────────────
            // If we have cached streak data, show the modal immediately.
            // The modal reads from streakData.current (live state) which is
            // already populated from the cache in loadStreakData. It will update
            // automatically once the backend responds.
            if (cached) {
                const cachedData = JSON.parse(cached) as StreakData;
                const optimisticCount = Math.max(1, cachedData.current + 1);
                setStreakData({ ...cachedData, current: optimisticCount });
                setModalStreakCount(optimisticCount);
                setShowDailyModal(true);
                await AsyncStorage.setItem(modalShownKey(user.uid), today);
            }

            // ── Background backend sync ──────────────────────────────────────
            // If we already showed the modal optimistically (cached !== null),
            // suppress the animation inside updateStreak so a second popup doesn't fire.
            // The already-open modal will silently show the correct backend number
            // because it reads from streakData.current which updateStreak updates.
            const result = await updateStreak({ suppressAnimation: !!cached });
            setSessionChecked(true);

            if (result.backendReachable) {
                // Backend was reachable — clear any pending retry flag
                await AsyncStorage.removeItem(pendingCheckInKey(user.uid));

                // Cancel today's warning (user just opened the app) and reschedule
                // for tomorrow at 10 PM so they're reminded if they forget tomorrow.
                if (result.newStreakCount > 0) {
                    const NotificationService = await import('@/utils/notificationService');
                    NotificationService.scheduleStreakWarningNotification(result.newStreakCount).catch(() => {});
                }

                // Correct the optimistic modal count with the real backend value.
                // The optimistic count was cachedData.current + 1 which may differ
                // from the actual backend streak (e.g., streak jumped multiple days
                // or cache was stale). This keeps the modal in sync with the
                // gamification tab which reads streakData.current.
                if (cached && result.newStreakCount > 0) {
                    setModalStreakCount(result.newStreakCount);
                }

                // First-time user or cache was cleared: show modal based on backend result.
                // Set streak data explicitly so modal never reads stale null state.
                if (!cached && result.increased) {
                    const confirmedCount = Math.max(1, result.newStreakCount);
                    setStreakData(prev => ({
                        ...(prev ?? { longest: 0, totalTasksCompleted: 0, streakFreezes: 0, points: 0, level: 1, lastCompletionDate: null }),
                        current: confirmedCount,
                    }));
                    setModalStreakCount(confirmedCount);
                    setShowDailyModal(true);
                    await AsyncStorage.setItem(modalShownKey(user.uid), today);
                }
            } else {
                // Backend unreachable (cold start still warming up or offline).
                // Store a pending flag so loadStreakData retries on next connection.
                await AsyncStorage.setItem(pendingCheckInKey(user.uid), today);
                console.log('[Streak] Backend unreachable — check-in queued for retry');
            }
        } catch (error) {
            console.error('[Streak] Error in daily check-in:', error);
            setSessionChecked(true);
        } finally {
            checkInInProgress.current = false;
        }
    };

    const loadStreakData = React.useCallback(async (options?: { silent?: boolean }) => {
        try {
            if (!options?.silent) setIsLoading(true);

            // ── Cache-first: hydrate UI instantly ────────────────────────────
            const cached = await AsyncStorage.getItem(STREAK_CACHE_KEY);
            if (cached) {
                setStreakData(JSON.parse(cached));
            }

            // ── Background backend fetch ──────────────────────────────────────
            if (user?.uid) {
                const clientToday = formatLocalDate(new Date());
                const [streakRes, statsRes] = await Promise.all([
                    apiService.get(`/api/streak/${user.uid}?clientToday=${clientToday}`),
                    apiService.get(`/api/gamification/stats/${user.uid}`)
                ]);

                if (streakRes || statsRes) {
                    setStreakData(prevData => {
                        const combinedData = { ...prevData } as StreakData;
                        let hasUpdates = false;

                        if (streakRes && streakRes.success && streakRes.streak) {
                            if (checkInInProgress.current) {
                                // Check-in is in flight — don't let the GET overwrite
                                // the optimistic current count with the pre-increment value.
                                const { current: _ignored, ...rest } = streakRes.streak;
                                Object.assign(combinedData, rest);
                            } else {
                                Object.assign(combinedData, streakRes.streak);
                            }
                            hasUpdates = true;
                        }

                        if (statsRes && statsRes.points !== undefined) {
                            combinedData.points = statsRes.points;
                            combinedData.level = statsRes.level || 1;
                            hasUpdates = true;
                        }

                        if (hasUpdates) {
                            AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(combinedData)).catch(err =>
                                console.error('[Streak] Error caching streak data:', err)
                            );
                            return combinedData;
                        }
                        return prevData;
                    });

                    // ── Retry pending check-in ────────────────────────────────
                    // If a previous session failed to record the check-in (backend
                    // was cold), retry it now that the backend is confirmed reachable.
                    if (user?.uid) {
                        const pending = await AsyncStorage.getItem(pendingCheckInKey(user.uid));
                        if (pending) {
                            const today = new Date().toDateString();
                            // Only retry if the pending check-in is from today (same day retry)
                            if (pending === today) {
                                console.log('[Streak] Retrying pending check-in...');
                                // Suppress animation — the modal already fired in the previous session
                                const retryResult = await updateStreak({ suppressAnimation: true });
                                if (retryResult.backendReachable) {
                                    await AsyncStorage.removeItem(pendingCheckInKey(user.uid));
                                    console.log('[Streak] Pending check-in successfully synced');
                                }
                            } else {
                                // Pending is from a previous day — discard (can't backfill)
                                await AsyncStorage.removeItem(pendingCheckInKey(user.uid));
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[Streak] Error loading streak data:', error);
        } finally {
            if (!options?.silent) setIsLoading(false);
        }
    }, [user?.uid]);

    const triggerAnimation = (streakNumber?: number) => {
        setAnimStreakNumber(streakNumber || streakData?.current || 0);
        setShowAnimation(true);
    };

    const updateStreak = React.useCallback(async (opts?: { suppressAnimation?: boolean }): Promise<{ increased: boolean; milestone: number | false; backendReachable: boolean; newStreakCount: number }> => {
        try {
            if (!user?.uid) {
                throw new Error('User not authenticated');
            }

            const response = await apiService.post('/api/streak/update', {
                userId: user.uid,
                clientToday: formatLocalDate(new Date()),
            });

            if (response.success) {
                setStreakData(prevData => {
                    const newStreakData = {
                        ...prevData,
                        ...response.streak,
                    } as StreakData;

                    AsyncStorage.setItem(STREAK_CACHE_KEY, JSON.stringify(newStreakData)).catch(err =>
                        console.error('[Streak] Error caching streak data:', err)
                    );

                    return newStreakData;
                });

                // Only trigger animation if caller hasn't already shown the modal optimistically.
                // When suppressAnimation is true the already-open modal silently updates its
                // number via the streakData state update above — no second popup fires.
                if (response.increased && !opts?.suppressAnimation) {
                    triggerAnimation(response.streak.current);
                }

                return {
                    increased: response.increased,
                    milestone: response.milestone,
                    backendReachable: true,
                    newStreakCount: response.streak?.current ?? 1,
                };
            }

            return { increased: false, milestone: false, backendReachable: true, newStreakCount: 0 };
        } catch (error) {
            console.error('[Streak] Error updating streak:', error);
            return { increased: false, milestone: false, backendReachable: false, newStreakCount: 0 };
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
            console.error('[Streak] Error awarding points:', error);
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
            animStreakNumber,
            modalStreakCount,
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
