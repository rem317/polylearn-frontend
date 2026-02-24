// script.js - MathHub Application with Complete Database-Driven Progress Tracking
// Includes lesson management, practice exercises, quiz system, and full progress integration
// MODIFIED: Removed loading, signup, login, and app selection - goes directly to dashboard

// ============================================
// MATHHUB APPLICATION - JAVASCRIPT
// ============================================

// Application Configuration
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken') || null;

// Application State
const AppState = {
    currentUser: null,
    currentPage: 'dashboard', // Default to dashboard
    isAuthenticated: false,
    selectedApp: 'factolearn', // Default to polylearn
    previousPage: null,
    hasSelectedApp: true, // Set to true by default
    currentLessonData: null,
    currentVideoData: null
};

// Lesson State
const LessonState = {
    lessons: [],
    currentLesson: null,
    userProgress: {},
    continueLearningLesson: null,
    currentTopic: null
};

// Practice Exercises State
// Sa Practice State, idagdag ang topicProgress
const PracticeState = {
    currentTopic: null,
    currentLesson: null,
    currentExercise: null,
    exercises: [],
    topicProgress: null,  // <-- BAGO: Para sa topic progress
    timer: 300,
    timerInterval: null,
    isExerciseActive: false,
    isReviewMode: false,
    userPracticeProgress: {}
};

// Quiz State
const QuizState = {
    currentQuiz: null,
    currentQuestionIndex: 0,
    questions: [],
    userAnswers: {},
    timer: 0,
    startTime: null,
    timerInterval: null,
    isQuizActive: false,
    currentAttemptId: null,
    quizResults: null,
    selectedCategory: null,
    quizCategories: []
};

// Progress State
const ProgressState = {
    dailyProgress: null,
    weeklyProgress: null,
    monthlyProgress: null,
    learningGoals: [],
    topicMastery: {},
    moduleProgress: {},
    activityLog: [],
    dashboardStats: null,
    progressTrends: [],
    achievementTimeline: []
};

// Module Dashboard State
const ModuleState = {
    lessonProgress: 0,
    currentModule: null
};

// Add practice styles flag
let practiceStylesAdded = false;

// ============================================
// PROGRESS TRACKING FUNCTIONS - DATABASE INTEGRATION
// ============================================

async function fetchDailyProgress() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📊 Fetching daily progress (FIXED)...');
        
        const response = await fetch(`${API_BASE_URL}/progress/daily`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Failed to fetch daily progress: ${response.status}`);
            
            return {
                lessons_completed: 0,
                exercises_completed: 0,
                points_earned: 0,
                time_spent_minutes: 0,
                streak_days: 0,
                accuracy_rate: 0
            };
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Daily progress loaded (fixed)');
            ProgressState.dailyProgress = data.progress || {};
            
            const progress = data.progress || {};
            return {
                lessons_completed: progress.lessons_completed || 0,
                exercises_completed: progress.exercises_completed || 0,
                points_earned: progress.points_earned || 0,
                time_spent_minutes: progress.time_spent_minutes || 0,
                streak_days: progress.streak_days || 0,
                accuracy_rate: progress.accuracy_rate || 0
            };
        } else {
            console.warn('⚠️ No daily progress data returned, using defaults');
            return {
                lessons_completed: 0,
                exercises_completed: 0,
                points_earned: 0,
                time_spent_minutes: 0,
                streak_days: 0,
                accuracy_rate: 0
            };
        }
    } catch (error) {
        console.error('Error fetching daily progress:', error);
        return {
            lessons_completed: 0,
            exercises_completed: 0,
            points_earned: 0,
            time_spent_minutes: 0,
            streak_days: 0,
            accuracy_rate: 0
        };
    }
}

async function fetchActivityLog(limit = 20) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📋 Fetching activity log...');
        
        const limitValue = parseInt(limit, 10);
        
        const response = await fetch(`${API_BASE_URL}/dashboard/activity-feed`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Activity feed fetch failed: ${response.status}, trying without limit...`);
            
            const response2 = await fetch(`${API_BASE_URL}/dashboard/activity-feed`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response2.ok) {
                throw new Error(`Failed to fetch activity log: ${response2.status}`);
            }
            
            const data = await response2.json();
            return handleActivityResponse(data);
        }
        
        const data = await response.json();
        return handleActivityResponse(data);
        
    } catch (error) {
        console.error('Error fetching activity log:', error);
        return [];
    }
}

function handleActivityResponse(data) {
    if (data.success) {
        const activities = data.activity_feed?.activities || 
                          data.activities || 
                          data.activity_feed || 
                          [];
        
        console.log(`✅ Fetched ${activities.length} activities`);
        ProgressState.activityLog = activities;
        return activities;
    } else {
        console.warn('⚠️ Activity feed returned unsuccessful response:', data);
        return [];
    }
}

// ============================================
// CUMULATIVE PROGRESS FUNCTIONS
// ============================================

async function fetchCumulativeProgress() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        
        if (!token) {
            console.warn('❌ No auth token available');
            return {
                total_lessons_completed: 0,
                exercises_completed: 0,
                total_quizzes_completed: 0,
                total_points_earned: 0,
                total_time_spent_minutes: 0
            };
        }
        
        console.log('📊 Fetching cumulative progress...');
        
        try {
            const response = await fetch(`${API_BASE_URL}/progress/cumulative`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const cumulative = data.cumulative || {};
                    
                    const result = {
                        total_lessons_completed: parseInt(cumulative.total_lessons_completed) || 
                                                parseInt(cumulative.lessons_completed) || 0,
                        exercises_completed: parseInt(cumulative.exercises_completed) || 0,
                        total_quizzes_completed: parseInt(cumulative.total_quizzes_completed) || 0,
                        total_points_earned: parseInt(cumulative.total_points_earned) || 0,
                        total_time_spent_minutes: parseFloat(cumulative.total_time_spent_minutes) || 0
                    };
                    
                    console.log('✅ Cumulative data loaded:', result);
                    ProgressState.cumulativeProgress = result;
                    return result;
                }
            }
        } catch (error) {
            console.warn('⚠️ Cumulative endpoint failed:', error.message);
        }
        
        console.log('📊 Computing cumulative from user progress...');
        
        const lessonsResponse = await fetch(`${API_BASE_URL}/lessons-db/complete`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let lessonsCompleted = 0;
        let exercisesCompleted = 0;
        
        if (lessonsResponse.ok) {
            const lessonsData = await lessonsResponse.json();
            if (lessonsData.success && lessonsData.lessons) {
                const progressResponse = await fetch(`${API_BASE_URL}/progress/lessons`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (progressResponse.ok) {
                    const progressData = await progressResponse.json();
                    if (progressData.success && progressData.progress) {
                        lessonsCompleted = progressData.progress.filter(p => p.status === 'completed').length;
                    }
                }
            }
        }
        
        try {
            const attemptsResponse = await fetch(`${API_BASE_URL}/progress/practice-attempts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (attemptsResponse.ok) {
                const attemptsData = await attemptsResponse.json();
                if (attemptsData.success && attemptsData.attempts) {
                    exercisesCompleted = attemptsData.attempts.length;
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch practice attempts:', error.message);
        }
        
        const computedResult = {
            total_lessons_completed: lessonsCompleted,
            exercises_completed: exercisesCompleted,
            total_quizzes_completed: 0,
            total_points_earned: 0,
            total_time_spent_minutes: 0
        };
        
        console.log('✅ Computed cumulative data:', computedResult);
        ProgressState.cumulativeProgress = computedResult;
        return computedResult;
        
    } catch (error) {
        console.error('❌ Error in fetchCumulativeProgress:', error);
        return {
            total_lessons_completed: 0,
            exercises_completed: 0,
            total_quizzes_completed: 0,
            total_points_earned: 0,
            total_time_spent_minutes: 0
        };
    }
}

async function fetchWeeklyProgress() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📊 Fetching weekly progress...');
        
        const response = await fetch(`${API_BASE_URL}/progress/weekly`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch weekly progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Weekly progress loaded');
            ProgressState.weeklyProgress = data.progress || {};
            return data.progress;
        } else {
            throw new Error(data.message || 'No weekly progress returned');
        }
    } catch (error) {
        console.error('Error fetching weekly progress:', error);
        return null;
    }
}

async function fetchMonthlyProgress() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📊 Fetching monthly progress...');
        
        const response = await fetch(`${API_BASE_URL}/progress/monthly`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch monthly progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Monthly progress loaded');
            ProgressState.monthlyProgress = data.progress || {};
            return data.progress;
        } else {
            throw new Error(data.message || 'No monthly progress returned');
        }
    } catch (error) {
        console.error('Error fetching monthly progress:', error);
        return null;
    }
}

async function fetchLearningGoals() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('🎯 Fetching learning goals...');
        
        const response = await fetch(`${API_BASE_URL}/progress/goals`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch learning goals: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.goals) {
            console.log(`✅ Fetched ${data.goals.length} learning goals`);
            ProgressState.learningGoals = data.goals;
            return data.goals;
        } else {
            throw new Error(data.message || 'No learning goals returned');
        }
    } catch (error) {
        console.error('Error fetching learning goals:', error);
        return [];
    }
}

async function fetchTopicMastery() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return {};
        }
        
        console.log('🧠 Fetching topic mastery...');
        
        const response = await fetch(`${API_BASE_URL}/progress/topic-mastery`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch topic mastery: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.mastery) {
            console.log(`✅ Fetched mastery for ${Object.keys(data.mastery).length} topics`);
            
            const masteryMap = {};
            data.mastery.forEach(item => {
                masteryMap[item.topic_id] = item;
            });
            
            ProgressState.topicMastery = masteryMap;
            return masteryMap;
        } else {
            throw new Error(data.message || 'No topic mastery returned');
        }
    } catch (error) {
        console.error('Error fetching topic mastery:', error);
        return {};
    }
}

async function fetchModuleProgress() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return {};
        }
        
        console.log('📚 Fetching module progress...');
        
        const response = await fetch(`${API_BASE_URL}/progress/modules`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch module progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.progress) {
            console.log(`✅ Fetched progress for ${Object.keys(data.progress).length} modules`);
            
            const progressMap = {};
            data.progress.forEach(item => {
                progressMap[item.module_id] = item;
            });
            
            ProgressState.moduleProgress = progressMap;
            return progressMap;
        } else {
            throw new Error(data.message || 'No module progress returned');
        }
    } catch (error) {
        console.error('Error fetching module progress:', error);
        return {};
    }
}

async function fetchDashboardStats() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📈 Fetching dashboard stats...');
        
        const response = await fetch(`${API_BASE_URL}/progress/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch dashboard stats: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Dashboard stats loaded');
            ProgressState.dashboardStats = data.stats;
            return data.stats;
        } else {
            throw new Error(data.message || 'No dashboard stats returned');
        }
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return null;
    }
}

async function fetchProgressTrends(days = 30) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📊 Fetching progress trends...');
        
        const response = await fetch(`${API_BASE_URL}/progress/trends?days=${days}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch progress trends: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.trends) {
            console.log(`✅ Fetched ${data.trends.length} days of progress trends`);
            ProgressState.progressTrends = data.trends;
            return data.trends;
        } else {
            throw new Error(data.message || 'No progress trends returned');
        }
    } catch (error) {
        console.error('Error fetching progress trends:', error);
        return [];
    }
}

async function fetchAchievementTimeline(limit = 10) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('🏆 Fetching achievement timeline...');
        
        const response = await fetch(`${API_BASE_URL}/progress/achievements?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch achievement timeline: ${response.status}`, errorText);
            throw new Error(`Failed to fetch achievement timeline: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.achievements) {
            console.log(`✅ Fetched ${data.achievements.length} achievements`);
            ProgressState.achievementTimeline = data.achievements;
            return data.achievements;
        } else {
            console.warn('No achievements returned or success false');
            return [];
        }
    } catch (error) {
        console.error('Error fetching achievement timeline:', error.message);
        return [];
    }
}

async function logUserActivity(activityType, relatedId = null, details = {}) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available, skipping activity log');
            return false;
        }
        
        console.log(`📝 Logging activity: ${activityType}`);
        
        const response = await fetch(`${API_BASE_URL}/progress/log-activity`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                activity_type: activityType,
                related_id: relatedId,
                details: details
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to log activity: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Activity logged successfully');
            return true;
        } else {
            throw new Error(data.message || 'Failed to log activity');
        }
    } catch (error) {
        console.error('Error logging user activity:', error);
        return false;
    }
}

async function updateDailyProgress(progressData) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log('📊 Updating daily progress (FIXED - NO POINTS)...', progressData);
        
        const updateData = {
            ...(progressData.lessons_completed !== undefined && { 
                lessons_completed: progressData.lessons_completed 
            }),
            ...(progressData.exercises_completed !== undefined && { 
                exercises_completed: progressData.exercises_completed 
            }),
            ...(progressData.quizzes_completed !== undefined && { 
                quizzes_completed: progressData.quizzes_completed 
            }),
            ...(progressData.time_spent_minutes !== undefined && { 
                time_spent_minutes: progressData.time_spent_minutes 
            })
        };
        
        if (Object.keys(updateData).length === 0) {
            console.log('⚠️ No progress data to update');
            return true;
        }
        
        const response = await fetch(`${API_BASE_URL}/progress/update-daily`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            if (response.status === 404) {
                console.warn('⚠️ Daily progress endpoint not found (404), skipping...');
                return false;
            }
            throw new Error(`Failed to update daily progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Daily progress updated (no points)');
            return true;
        } else {
            throw new Error(data.message || 'Failed to update daily progress');
        }
    } catch (error) {
        console.error('Error updating daily progress:', error);
        return false;
    }
}

async function updateTopicMastery(topicId, masteryData) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log(`🧠 Updating topic mastery for topic ${topicId}...`);
        
        const response = await fetch(`${API_BASE_URL}/progress/update-topic-mastery`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic_id: topicId,
                ...masteryData
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update topic mastery: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Topic mastery updated');
            return true;
        } else {
            throw new Error(data.message || 'Failed to update topic mastery');
        }
    } catch (error) {
        console.error('Error updating topic mastery:', error);
        return false;
    }
}

async function updateModuleProgress(moduleId, progressData) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log(`📚 Updating module progress for module ${moduleId}...`);
        
        const response = await fetch(`${API_BASE_URL}/progress/update-module-progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                module_id: moduleId,
                ...progressData
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update module progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Module progress updated');
            return true;
        } else {
            throw new Error(data.message || 'Failed to update module progress');
        }
    } catch (error) {
        console.error('Error updating module progress:', error);
        return false;
    }
}

async function updateLearningGoalProgress(goalId, currentValue) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log(`🎯 Updating learning goal ${goalId}...`);
        
        const response = await fetch(`${API_BASE_URL}/progress/update-goal-progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goal_id: goalId,
                current_value: currentValue
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update learning goal progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Learning goal progress updated');
            return true;
        } else {
            throw new Error(data.message || 'Failed to update learning goal progress');
        }
    } catch (error) {
        console.error('Error updating learning goal progress:', error);
        return false;
    }
}

async function completeLearningGoal(goalId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log(`🏆 Completing learning goal ${goalId}...`);
        
        const response = await fetch(`${API_BASE_URL}/progress/complete-goal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                goal_id: goalId
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to complete learning goal: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Learning goal completed');
            
            await logUserActivity('goal_achieved', goalId, { goal_id: goalId }, 50);
            
            return true;
        } else {
            throw new Error(data.message || 'Failed to complete learning goal');
        }
    } catch (error) {
        console.error('Error completing learning goal:', error);
        return false;
    }
}

async function fetchPracticeStatistics(topicId = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return {
                total_exercises_completed: 0,
                total_attempts: 0,
                average_score: 0,
                lessons_completed: 0,
                exercises_completed: 0,
                practice_unlocked: false
            };
        }
        
        console.log('📊 Fetching practice statistics (FIXED VERSION)...');
        
        let lessonsCompleted = 0;
        let exercisesCompleted = 0;
        
        try {
            const cumulativeResponse = await fetch(`${API_BASE_URL}/progress/cumulative`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (cumulativeResponse.ok) {
                const cumulativeData = await cumulativeResponse.json();
                if (cumulativeData.success && cumulativeData.cumulative) {
                    lessonsCompleted = cumulativeData.cumulative.total_lessons_completed || 
                                      cumulativeData.cumulative.lessons_completed || 
                                      0;
                    
                    exercisesCompleted = cumulativeData.cumulative.exercises_completed || 0;
                    
                    console.log('✅ Practice stats - Cumulative data loaded:', {
                        lessons: lessonsCompleted,
                        exercises: exercisesCompleted
                    });
                }
            } else {
                console.warn(`⚠️ Cumulative endpoint returned: ${cumulativeResponse.status}`);
            }
        } catch (cumulativeError) {
            console.warn('⚠️ Could not fetch cumulative progress:', cumulativeError.message);
        }
        
        if (lessonsCompleted === 0) {
            try {
                const statsResponse = await fetch(`${API_BASE_URL}/progress/dashboard-stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    if (statsData.success && statsData.stats) {
                        lessonsCompleted = statsData.stats.lessons_completed || 
                                          statsData.stats.total_lessons || 
                                          0;
                        console.log('✅ Practice stats - From dashboard-stats:', lessonsCompleted);
                    }
                }
            } catch (statsError) {
                console.warn('⚠️ Could not fetch dashboard stats:', statsError.message);
            }
        }
        
        let totalScore = 0;
        let totalAttempts = 0;
        let averageScore = 85;
        
        try {
            const attemptsResponse = await fetch(`${API_BASE_URL}/progress/practice-attempts`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (attemptsResponse.ok) {
                const attemptsData = await attemptsResponse.json();
                if (attemptsData.success && attemptsData.attempts) {
                    const attempts = attemptsData.attempts;
                    totalAttempts = attempts.length;
                    
                    if (totalAttempts > 0) {
                        totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
                        averageScore = Math.round(totalScore / totalAttempts);
                    }
                }
            }
        } catch (attemptsError) {
            console.warn('⚠️ Could not fetch practice attempts:', attemptsError.message);
        }
        
        let practiceUnlocked = false;
        
        if (topicId) {
            try {
                const unlockResponse = await fetch(`${API_BASE_URL}/practice/${topicId}/check-progress`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (unlockResponse.ok) {
                    const unlockData = await unlockResponse.json();
                    practiceUnlocked = unlockData.unlocked || false;
                } else {
                    const topicProgress = await fetchTopicMastery();
                    const topicData = topicProgress[topicId];
                    if (topicData && topicData.completion_rate >= 80) {
                        practiceUnlocked = true;
                    }
                }
            } catch (unlockError) {
                console.warn('⚠️ Could not check practice unlock:', unlockError.message);
            }
        }
        
        const stats = {
            total_exercises_completed: exercisesCompleted,
            total_attempts: totalAttempts || exercisesCompleted,
            average_score: averageScore,
            lessons_completed: lessonsCompleted,
            exercises_completed: exercisesCompleted,
            practice_unlocked: practiceUnlocked,
            average_time_minutes: 5
        };
        
        console.log('✅ FINAL PRACTICE STATISTICS:', stats);
        
        PracticeState.userPracticeProgress = stats;
        
        return stats;
        
    } catch (error) {
        console.error('❌ Error fetching practice statistics:', error);
        return {
            total_exercises_completed: 0,
            total_attempts: 0,
            average_score: 0,
            lessons_completed: 0,
            exercises_completed: 0,
            practice_unlocked: false
        };
    }
}

async function fetchQuizPerformance(quizId = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return {};
        }
        
        console.log('📊 Fetching quiz performance analytics...');
        
        let url = `${API_BASE_URL}/progress/quiz-performance`;
        if (quizId) {
            url += `?quiz_id=${quizId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz performance: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.performance) {
            console.log('✅ Quiz performance analytics loaded');
            console.log(`⏱️ Average time for quiz: ${data.performance.average_time_seconds || 0}s`);
            console.log(`📊 Best time: ${data.performance.best_time_seconds || 0}s`);
            console.log(`📈 Total attempts: ${data.performance.total_attempts || 0}`);
            return data.performance;
        } else {
            throw new Error(data.message || 'No quiz performance returned');
        }
    } catch (error) {
        console.error('Error fetching quiz performance:', error);
        return {};
    }
}

async function fetchQuizCategoryProgress(categoryId = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return {};
        }
        
        console.log('📊 Fetching quiz category progress...');
        
        let url = `${API_BASE_URL}/progress/quiz-category-progress`;
        if (categoryId) {
            url += `?category_id=${categoryId}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz category progress: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.progress) {
            console.log('✅ Quiz category progress loaded');
            return data.progress;
        } else {
            throw new Error(data.message || 'No quiz category progress returned');
        }
    } catch (error) {
        console.error('Error fetching quiz category progress:', error);
        return {};
    }
}

async function fetchProgressHeatmap(startDate = null, endDate = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📅 Fetching progress heatmap data...');
        
        let url = `${API_BASE_URL}/progress/heatmap`;
        if (startDate && endDate) {
            url += `?start_date=${startDate}&end_date=${endDate}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch progress heatmap: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.heatmap) {
            console.log(`✅ Fetched ${data.heatmap.length} days of heatmap data`);
            return data.heatmap;
        } else {
            throw new Error(data.message || 'No heatmap data returned');
        }
    } catch (error) {
        console.error('Error fetching progress heatmap:', error);
        return [];
    }
}

async function createLearningGoal(goalData) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('🎯 Creating new learning goal...');
        
        const response = await fetch(`${API_BASE_URL}/progress/create-goal`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(goalData)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to create learning goal: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.goal) {
            console.log('✅ Learning goal created:', data.goal.goal_title);
            
            await logUserActivity('goal_set', data.goal.goal_id, {
                goal_title: data.goal.goal_title,
                goal_type: data.goal.goal_type
            }, 10);
            
            return data.goal;
        } else {
            throw new Error(data.message || 'Failed to create learning goal');
        }
    } catch (error) {
        console.error('Error creating learning goal:', error);
        return null;
    }
}

async function updateDashboardWidgets(widgetConfig) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log('⚙️ Updating dashboard widgets...');
        
        const response = await fetch(`${API_BASE_URL}/progress/update-widgets`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(widgetConfig)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update dashboard widgets: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Dashboard widgets updated');
            return true;
        } else {
            throw new Error(data.message || 'Failed to update dashboard widgets');
        }
    } catch (error) {
        console.error('Error updating dashboard widgets:', error);
        return false;
    }
}

async function initProgressDashboard() {
    console.log('📈 Initializing progress dashboard with database integration...');
    
    try {
        showProgressDashboardLoading();
        
        await loadProgressDashboardData();
        
        startProgressAutoRefresh(60);
        
        console.log('✅ Progress dashboard initialized with database integration');
    } catch (error) {
        console.error('Error initializing progress dashboard:', error);
        showNotification('Failed to initialize progress dashboard', 'error');
    }
}

async function getDetailedPracticeStats() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📊 Fetching detailed practice statistics...');
        
        const response = await fetch(`${API_BASE_URL}/progress/practice-analytics`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('✅ Detailed practice stats loaded:', data.stats);
                return data.stats;
            }
        }
        
        console.log('⚠️ Practice analytics endpoint not found, calculating from local data...');
        
        const attemptsResponse = await fetch(`${API_BASE_URL}/progress/practice-attempts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (attemptsResponse.ok) {
            const attemptsData = await attemptsResponse.json();
            if (attemptsData.success && attemptsData.attempts) {
                const attempts = attemptsData.attempts;
                
                if (attempts.length > 0) {
                    const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
                    const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
                    const completedCount = attempts.length;
                    
                    return {
                        total_attempts: completedCount,
                        average_score: Math.round(totalScore / completedCount),
                        average_time_seconds: Math.round(totalTime / completedCount),
                        average_time_minutes: Math.round((totalTime / completedCount) / 60),
                        total_exercises_completed: completedCount
                    };
                }
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching detailed practice stats:', error);
        return null;
    }
}

async function loadProgressDashboardData() {
    try {
        console.log('📊 Loading progress dashboard data with summary...');
        
        const loadPromises = [
            fetchProgressDashboardSummary().catch(e => { console.warn('Failed to fetch progress summary:', e.message); return {}; }),
            fetchDailyProgress().catch(e => { console.warn('Failed to fetch daily progress:', e.message); return {}; }),
            fetchCumulativeProgress().catch(e => { console.warn('Failed to fetch cumulative progress:', e.message); return {}; }),
            fetchWeeklyProgress().catch(e => { console.warn('Failed to fetch weekly progress:', e.message); return {}; }),
            fetchMonthlyProgress().catch(e => { console.warn('Failed to fetch monthly progress:', e.message); return {}; }),
            fetchLearningGoals().catch(e => { console.warn('Failed to fetch learning goals:', e.message); return []; }),
            fetchTopicMastery().catch(e => { console.warn('Failed to fetch topic mastery:', e.message); return {}; }),
            fetchModuleProgress().catch(e => { console.warn('Failed to fetch module progress:', e.message); return {}; }),
            fetchActivityLog(15).catch(e => { console.warn('Failed to fetch activity log:', e.message); return []; }),
            fetchDashboardStats().catch(e => { console.warn('Failed to fetch dashboard stats:', e.message); return {}; }),
            fetchProgressTrends(30).catch(e => { console.warn('Failed to fetch progress trends:', e.message); return []; }),
            fetchAchievementTimeline(10).catch(e => { console.warn('Failed to fetch achievement timeline:', e.message); return []; })
        ];
        
        const [
            dashboardSummary,
            dailyProgress,
            cumulativeProgress,
            weeklyProgress,
            monthlyProgress,
            learningGoals,
            topicMastery,
            moduleProgress,
            activityLog,
            dashboardStats,
            progressTrends,
            achievementTimeline
        ] = await Promise.all(loadPromises);
        
        console.log('✅ All progress data loaded');
        
        ProgressState.dashboardSummary = dashboardSummary || {};
        ProgressState.dailyProgress = dailyProgress || {};
        ProgressState.cumulativeProgress = cumulativeProgress || {};
        ProgressState.weeklyProgress = weeklyProgress || {};
        ProgressState.monthlyProgress = monthlyProgress || {};
        ProgressState.learningGoals = learningGoals || [];
        ProgressState.topicMastery = topicMastery || {};
        ProgressState.moduleProgress = moduleProgress || {};
        ProgressState.activityLog = activityLog || [];
        ProgressState.dashboardStats = dashboardStats || {};
        ProgressState.progressTrends = progressTrends || [];
        ProgressState.achievementTimeline = achievementTimeline || [];
        
        await updateProgressDashboardFromDatabase();
        updateLearningGoalsSection();
        updateActivityLog();
        updateProgressTrendsChart();
        updateAchievementTimeline();
        updateTopicMasterySection();
        updateModuleProgressSection();
        
        updateTopicProgressBreakdown();
        updatePerformanceAnalytics();
        updateLearningInsights();
        
        setupAddGoalButton();
        
    } catch (error) {
        console.error('Error loading progress dashboard data:', error);
    }
}

function updateProgressDashboardUI() {
    if (ProgressState.dashboardSummary) {
        updateProgressDashboardFromDatabase();
    } else {
        updateProgressSummaryCards();
    }
    updateProgressSummaryCards();
    
    updateLearningGoalsSection();
    
    updateActivityLog();
    
    updateProgressTrendsChart();
    
    updateAchievementTimeline();
    
    updateTopicMasterySection();
    
    updateModuleProgressSection();
}

function updateProgressSummaryCards() {
    const cumulativeProgress = ProgressState.cumulativeProgress || {};
    const dailyProgress = ProgressState.dailyProgress || {};
    
    console.log('📊 Updating progress summary cards:', {
        cumulative: cumulativeProgress,
        daily: dailyProgress
    });
    
    const lessonsCount = document.getElementById('lessonsCount');
    const exercisesCount = document.getElementById('exercisesCount');
    const quizScore = document.getElementById('quizScore');
    const avgTime = document.getElementById('avgTime');
    
    if (lessonsCount) {
        const totalLessons = cumulativeProgress.total_lessons_completed || 0;
        lessonsCount.innerHTML = `
            ${totalLessons}<span class="item-unit">lessons</span>
        `;
        
        const dailyLessons = dailyProgress.lessons_completed || 0;
        if (dailyLessons > 0) {
            lessonsCount.setAttribute('title', `+${dailyLessons} today`);
            lessonsCount.style.cursor = 'help';
        }
    }
    
    if (exercisesCount) {
        const token = localStorage.getItem('authToken') || authToken;
        
        if (token) {
            try {
                fetch(`${API_BASE_URL}/progress/accurate-summary`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        const summary = data.summary;
                        
                        exercisesCount.innerHTML = `
                            ${summary.exercisesCount}<span class="item-unit">/${summary.totalExercises} exercises</span>
                        `;
                        
                        exercisesCount.setAttribute('title', `${summary.exercisesCount} exercises completed today`);
                        exercisesCount.style.cursor = 'help';
                    }
                })
                .catch(err => {
                    console.error('Error fetching accurate exercise count:', err);
                    const dailyExercises = dailyProgress.exercises_completed || 0;
                    exercisesCount.innerHTML = `
                        ${dailyExercises}<span class="item-unit">exercises today</span>
                    `;
                });
            } catch (error) {
                console.error('Error in exercises display:', error);
                const dailyExercises = dailyProgress.exercises_completed || 0;
                exercisesCount.innerHTML = `
                    ${dailyExercises}<span class="item-unit">exercises today</span>
                `;
            }
        } else {
            const dailyExercises = dailyProgress.exercises_completed || 0;
            exercisesCount.innerHTML = `
                ${dailyExercises}<span class="item-unit">exercises today</span>
            `;
        }
    }
    
    if (quizScore) {
        const token = localStorage.getItem('authToken') || authToken;
        
        if (token) {
            try {
                fetch(`${API_BASE_URL}/quiz/user/points`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success && data.points) {
                        const totalPoints = data.points.total_points || 0;
                        const dailyPoints = dailyProgress.points_earned || 0;
                        
                        quizScore.innerHTML = `
                            ${totalPoints}<span class="item-unit">total points</span>
                        `;
                        
                        quizScore.setAttribute('title', `Today: +${dailyPoints} points`);
                        quizScore.style.cursor = 'help';
                    }
                })
                .catch(err => {
                    console.error('Error fetching points:', err);
                    const dailyPoints = dailyProgress.points_earned || 0;
                    quizScore.innerHTML = `
                        ${dailyPoints}<span class="item-unit">points today</span>
                    `;
                });
            } catch (error) {
                console.error('Error in points display:', error);
                const dailyPoints = dailyProgress.points_earned || 0;
                quizScore.innerHTML = `
                    ${dailyPoints}<span class="item-unit">points today</span>
                `;
            }
        } else {
            const dailyPoints = dailyProgress.points_earned || 0;
            quizScore.innerHTML = `
                ${dailyPoints}<span class="item-unit">points today</span>
            `;
        }
    }
    
    if (avgTime) {
        const totalMinutes = cumulativeProgress.total_time_spent_minutes || 0;
        const dailyMinutes = dailyProgress.time_spent_minutes || 0;
        const daysActive = 30;
        const avgMinutesPerDay = Math.round(totalMinutes / daysActive) || 0;
        
        avgTime.innerHTML = `
            ${avgMinutesPerDay}<span class="item-unit">minutes/day</span>
        `;
        
        avgTime.setAttribute('title', `Today: ${dailyMinutes} min | Total: ${Math.floor(totalMinutes/60)}h ${totalMinutes%60}m`);
        avgTime.style.cursor = 'help';
    }
}

function updateLearningGoalsSection() {
    const goalsContainer = document.getElementById('goalsContainer');
    if (!goalsContainer) return;
    
    const goals = ProgressState.learningGoals || [];
    
    if (goals.length === 0) {
        goalsContainer.innerHTML = `
            <div class="no-goals">
                <i class="fas fa-bullseye"></i>
                <h3>No learning goals set</h3>
                <p>Set your first learning goal to track your progress!</p>
                <button class="btn-primary" id="createFirstGoalBtn">
                    <i class="fas fa-plus"></i> Create Goal
                </button>
            </div>
        `;
        
        document.getElementById('createFirstGoalBtn')?.addEventListener('click', showCreateGoalModal);
        return;
    }
    
    let html = '';
    goals.forEach(goal => {
        const progressPercentage = goal.progress_percentage || 0;
        const status = goal.status || 'active';
        const statusClass = status === 'completed' ? 'completed' : 
                          status === 'failed' ? 'failed' : 'active';
        
        html += `
            <div class="goal-card ${statusClass}" data-goal-id="${goal.goal_id}">
                <div class="goal-header">
                    <h4>${goal.goal_title}</h4>
                    <span class="goal-status ${statusClass}">${status}</span>
                </div>
                
                <div class="goal-body">
                    <p>${goal.goal_description || ''}</p>
                    
                    <div class="goal-progress">
                        <div class="progress-info">
                            <span>${goal.current_value}/${goal.target_value} ${goal.unit_type}</span>
                            <span>${Math.round(progressPercentage)}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="goal-meta">
                        <span class="goal-type">${goal.goal_type}</span>
                        <span class="goal-deadline">
                            ${goal.end_date ? `Due: ${formatDate(goal.end_date)}` : 'No deadline'}
                        </span>
                    </div>
                </div>
                
                <div class="goal-actions">
                    ${status === 'active' ? `
                        <button class="btn-small update-goal-btn" data-goal-id="${goal.goal_id}">
                            <i class="fas fa-edit"></i> Update
                        </button>
                        <button class="btn-small complete-goal-btn" data-goal-id="${goal.goal_id}">
                            <i class="fas fa-check"></i> Complete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    goalsContainer.innerHTML = html;
    
    document.querySelectorAll('.update-goal-btn').forEach(button => {
        button.addEventListener('click', function() {
            const goalId = this.getAttribute('data-goal-id');
            showUpdateGoalModal(goalId);
        });
    });
    
    document.querySelectorAll('.complete-goal-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const goalId = this.getAttribute('data-goal-id');
            const success = await completeLearningGoal(goalId);
            if (success) {
                showNotification('Goal marked as completed!', 'success');
                await fetchLearningGoals();
                updateLearningGoalsSection();
            }
        });
    });
    
    setupAddGoalButton();
}

function updateActivityLog() {
    const activityContainer = document.getElementById('activityLogContainer');
    if (!activityContainer) return;
    
    const activities = ProgressState.activityLog || [];
    
    if (activities.length === 0) {
        activityContainer.innerHTML = `
            <div class="no-activity">
                <i class="fas fa-history"></i>
                <h3>No recent activity</h3>
                <p>Complete lessons, exercises, or quizzes to see activity here.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        const activityIcon = getActivityIcon(activity.activity_type);
        const activityText = getActivityText(activity);
        const timeAgo = formatTimeAgo(activity.activity_timestamp);
        
        html += `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activityIcon}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${activityText}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
                ${activity.points_earned > 0 ? `
                    <div class="activity-points">
                        +${activity.points_earned} pts
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    activityContainer.innerHTML = html;
}

function updateProgressTrendsChart() {
    const trendsContainer = document.getElementById('progressTrendsChart');
    if (!trendsContainer) return;
    
    const trends = ProgressState.progressTrends || [];
    
    if (trends.length === 0) {
        trendsContainer.innerHTML = `
            <div class="no-trends">
                <i class="fas fa-chart-line"></i>
                <h3>No trend data available</h3>
                <p>Complete more activities to see your progress trends.</p>
            </div>
        `;
        return;
    }
    
    const maxPoints = Math.max(...trends.map(t => t.points_earned || 0));
    
    let html = `<div class="trends-chart">`;
    
    trends.slice(-14).forEach(trend => {
        const date = new Date(trend.activity_date);
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'short' });
        const points = trend.points_earned || 0;
        const height = maxPoints > 0 ? (points / maxPoints * 100) : 0;
        
        html += `
            <div class="trend-day">
                <div class="trend-bar" style="height: ${height}%"></div>
                <div class="trend-label">
                    <span class="trend-day-number">${day}</span>
                    <span class="trend-month">${month}</span>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    trendsContainer.innerHTML = html;
}

function updateAchievementTimeline() {
    const timelineContainer = document.getElementById('achievementTimeline');
    if (!timelineContainer) return;
    
    const achievements = ProgressState.achievementTimeline || [];
    
    if (achievements.length === 0) {
        timelineContainer.innerHTML = `
            <div class="no-achievements">
                <i class="fas fa-trophy"></i>
                <h3>No achievements yet</h3>
                <p>Earn badges and complete goals to see achievements here.</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="timeline">';
    
    achievements.forEach((achievement, index) => {
        const achievementIcon = getAchievementIcon(achievement.activity_type);
        const achievementText = getAchievementText(achievement);
        const timeAgo = formatTimeAgo(achievement.activity_timestamp);
        
        html += `
            <div class="timeline-item ${index % 2 === 0 ? 'left' : 'right'}">
                <div class="timeline-content">
                    <div class="timeline-icon">
                        <i class="${achievementIcon}"></i>
                    </div>
                    <div class="timeline-text">${achievementText}</div>
                    <div class="timeline-time">${timeAgo}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    timelineContainer.innerHTML = html;
}

function updateTopicMasterySection() {
    const masteryContainer = document.getElementById('topicMasteryContainer');
    if (!masteryContainer) return;
    
    const mastery = ProgressState.topicMastery || {};
    const masteryArray = Object.values(mastery);
    
    if (masteryArray.length === 0) {
        masteryContainer.innerHTML = `
            <div class="no-mastery">
                <i class="fas fa-graduation-cap"></i>
                <h3>No topic mastery data</h3>
                <p>Complete lessons and exercises to build topic mastery.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    masteryArray.forEach(topic => {
        const masteryLevel = topic.mastery_level || 'beginner';
        const accuracyRate = topic.accuracy_rate || 0;
        const lastPracticed = topic.last_practiced ? formatTimeAgo(topic.last_practiced) : 'Never';
        
        html += `
            <div class="mastery-card mastery-${masteryLevel.toLowerCase()}">
                <div class="mastery-header">
                    <h4>Topic ${topic.topic_id}</h4>
                    <span class="mastery-level">${masteryLevel}</span>
                </div>
                
                <div class="mastery-body">
                    <div class="mastery-stats">
                        <div class="mastery-stat">
                            <span class="stat-label">Accuracy</span>
                            <span class="stat-value">${Math.round(accuracyRate)}%</span>
                        </div>
                        <div class="mastery-stat">
                            <span class="stat-label">Last Practiced</span>
                            <span class="stat-value">${lastPracticed}</span>
                        </div>
                    </div>
                    
                    <div class="mastery-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${accuracyRate}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="mastery-actions">
                    <button class="btn-small practice-topic-btn" data-topic-id="${topic.topic_id}">
                        <i class="fas fa-pencil-alt"></i> Practice
                    </button>
                </div>
            </div>
        `;
    });
    
    masteryContainer.innerHTML = html;
    
    document.querySelectorAll('.practice-topic-btn').forEach(button => {
        button.addEventListener('click', function() {
            const topicId = this.getAttribute('data-topic-id');
            openPracticeForTopic(topicId);
        });
    });
}

function updateModuleProgressSection() {
    const modulesContainer = document.getElementById('moduleProgressContainer');
    if (!modulesContainer) return;
    
    const moduleProgress = ProgressState.moduleProgress || {};
    const moduleArray = Object.values(moduleProgress);
    
    if (moduleArray.length === 0) {
        modulesContainer.innerHTML = `
            <div class="no-modules">
                <i class="fas fa-book"></i>
                <h3>No module progress</h3>
                <p>Start learning modules to see progress here.</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    moduleArray.forEach(module => {
        const completionRate = module.total_lessons > 0 ? 
            (module.lessons_completed / module.total_lessons) * 100 : 0;
        const isCompleted = completionRate >= 100;
        
        html += `
            <div class="module-progress-card ${isCompleted ? 'completed' : 'in-progress'}">
                <div class="module-progress-header">
                    <h4>Module ${module.module_id}</h4>
                    <span class="completion-rate">${Math.round(completionRate)}%</span>
                </div>
                
                <div class="module-progress-body">
                    <div class="module-stats">
                        <div class="module-stat">
                            <span class="stat-label">Lessons</span>
                            <span class="stat-value">${module.lessons_completed}/${module.total_lessons}</span>
                        </div>
                        <div class="module-stat">
                            <span class="stat-label">Avg. Score</span>
                            <span class="stat-value">${Math.round(module.average_score || 0)}%</span>
                        </div>
                        <div class="module-stat">
                            <span class="stat-label">Time</span>
                            <span class="stat-value">${formatTime(module.time_spent_minutes || 0)}</span>
                        </div>
                    </div>
                    
                    <div class="module-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${completionRate}%"></div>
                        </div>
                    </div>
                </div>
                
                ${isCompleted ? `
                    <div class="module-actions">
                        <span class="completed-badge">
                            <i class="fas fa-check"></i> Completed
                        </span>
                    </div>
                ` : `
                    <div class="module-actions">
                        <button class="btn-small continue-module-btn" data-module-id="${module.module_id}">
                            <i class="fas fa-play"></i> Continue
                        </button>
                    </div>
                `}
            </div>
        `;
    });
    
    modulesContainer.innerHTML = html;
}

function showCreateGoalModal() {
    const modalHTML = `
        <div class="create-goal-modal">
            <h3><i class="fas fa-bullseye"></i> Create New Learning Goal</h3>
            
            <form id="createGoalForm">
                <div class="form-group">
                    <label for="goalTitle">Goal Title</label>
                    <input type="text" id="goalTitle" placeholder="e.g., Complete 5 lessons this week" required>
                </div>
                
                <div class="form-group">
                    <label for="goalDescription">Description (Optional)</label>
                    <textarea id="goalDescription" placeholder="Describe your goal..."></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="goalType">Goal Type</label>
                        <select id="goalType" required>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="unitType">Unit Type</label>
                        <select id="unitType" required>
                            <option value="lessons">Lessons</option>
                            <option value="exercises">Exercises</option>
                            <option value="minutes">Minutes</option>
                            <option value="points">Points</option>
                            <option value="quizzes">Quizzes</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="targetValue">Target Value</label>
                        <input type="number" id="targetValue" min="1" max="1000" value="5" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="endDate">End Date (Optional)</label>
                        <input type="date" id="endDate">
                    </div>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancelCreateGoal">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-check"></i> Create Goal
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalHTML);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDateInput = document.getElementById('endDate');
    if (endDateInput) {
        endDateInput.min = tomorrow.toISOString().split('T')[0];
    }
    
    const form = document.getElementById('createGoalForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const goalData = {
                goal_title: document.getElementById('goalTitle').value,
                goal_description: document.getElementById('goalDescription').value,
                goal_type: document.getElementById('goalType').value,
                unit_type: document.getElementById('unitType').value,
                target_value: parseInt(document.getElementById('targetValue').value),
                end_date: document.getElementById('endDate').value || null
            };
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
            submitBtn.disabled = true;
            
            const goal = await createLearningGoal(goalData);
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            if (goal) {
                showNotification('Learning goal created successfully!', 'success');
                
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
                
                await fetchLearningGoals();
                updateLearningGoalsSection();
            } else {
                showNotification('Failed to create goal. Please try again.', 'error');
            }
        });
    }
    
    document.getElementById('cancelCreateGoal')?.addEventListener('click', () => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    });
}

async function refreshPracticeExercises(topicId) {
    console.log(`🔄 Refreshing practice exercises for topic ${topicId}...`);
    
    const exerciseArea = document.getElementById('exerciseArea');
    if (!exerciseArea) return;
    
    exerciseArea.innerHTML = `
        <div class="loading-container">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Refreshing exercises...</p>
        </div>
    `;
    
    const practiceData = await loadPracticeExercises(topicId);
    
    if (practiceData && practiceData.unlocked && practiceData.exercises) {
        PracticeState.exercises = practiceData.exercises;
        exerciseArea.innerHTML = createPracticeExercisesUI(practiceData);
        setupPracticeExerciseInteractions();
    }
    
    console.log('✅ Practice exercises refreshed');
}

function showUpdateGoalModal(goalId) {
    const goal = ProgressState.learningGoals.find(g => g.goal_id == goalId);
    if (!goal) return;
    
    const modalHTML = `
        <div class="update-goal-modal">
            <h3><i class="fas fa-edit"></i> Update Goal Progress</h3>
            
            <div class="goal-info">
                <h4>${goal.goal_title}</h4>
                <p>Current: ${goal.current_value}/${goal.target_value} ${goal.unit_type}</p>
                <p>Progress: ${Math.round(goal.progress_percentage || 0)}%</p>
            </div>
            
            <form id="updateGoalForm">
                <div class="form-group">
                    <label for="currentValue">Update Current Value</label>
                    <input type="number" id="currentValue" 
                           min="${goal.current_value}" 
                           max="${goal.target_value}" 
                           value="${goal.current_value}" 
                           required>
                    <small>Maximum: ${goal.target_value} ${goal.unit_type}</small>
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn-secondary" id="cancelUpdateGoal">
                        Cancel
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> Update Progress
                    </button>
                </div>
            </form>
        </div>
    `;
    
    showModal(modalHTML);
    
    const form = document.getElementById('updateGoalForm');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const currentValue = parseInt(document.getElementById('currentValue').value);
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
            submitBtn.disabled = true;
            
            const success = await updateLearningGoalProgress(goalId, currentValue);
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            if (success) {
                showNotification('Goal progress updated!', 'success');
                
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
                
                await fetchLearningGoals();
                updateLearningGoalsSection();
            } else {
                showNotification('Failed to update goal. Please try again.', 'error');
            }
        });
    }
    
    document.getElementById('cancelUpdateGoal')?.addEventListener('click', () => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    });
}

function getActivityIcon(activityType) {
    switch(activityType) {
        case 'lesson_started':
        case 'lesson_completed':
            return 'fas fa-book';
        case 'practice_started':
        case 'practice_completed':
            return 'fas fa-pencil-alt';
        case 'quiz_started':
        case 'quiz_completed':
            return 'fas fa-question-circle';
        case 'goal_set':
        case 'goal_achieved':
            return 'fas fa-bullseye';
        case 'badge_earned':
            return 'fas fa-award';
        case 'login':
            return 'fas fa-sign-in-alt';
        case 'logout':
            return 'fas fa-sign-out-alt';
        default:
            return 'fas fa-history';
    }
}

function getActivityText(activity) {
    const username = activity.username || 'You';
    
    switch(activity.activity_type) {
        case 'lesson_started':
            return `${username} started lesson: ${activity.item_name || 'a lesson'}`;
        case 'lesson_completed':
            return `${username} completed lesson: ${activity.item_name || 'a lesson'}`;
        case 'practice_started':
            return `${username} started practice: ${activity.item_name || 'an exercise'}`;
        case 'practice_completed':
            return `${username} completed practice: ${activity.item_name || 'an exercise'}`;
        case 'quiz_started':
            return `${username} started quiz: ${activity.item_name || 'a quiz'}`;
        case 'quiz_completed':
            const score = activity.details?.score || 'unknown';
            return `${username} completed quiz: ${activity.item_name || 'a quiz'} with ${score}%`;
        case 'goal_set':
            return `${username} set a new goal: ${activity.details?.goal_title || 'a goal'}`;
        case 'goal_achieved':
            return `${username} achieved goal: ${activity.item_name || 'a goal'}`;
        case 'badge_earned':
            return `${username} earned badge: ${activity.item_name || 'a badge'}`;
        case 'login':
            return `${username} logged in`;
        case 'logout':
            return `${username} logged out`;
        default:
            return `${username} performed an activity`;
    }
}

function getAchievementIcon(activityType) {
    switch(activityType) {
        case 'badge_earned':
            return 'fas fa-award';
        case 'goal_achieved':
            return 'fas fa-trophy';
        case 'lesson_completed':
            return 'fas fa-star';
        default:
            return 'fas fa-flag-checkered';
    }
}

function getAchievementText(achievement) {
    switch(achievement.activity_type) {
        case 'badge_earned':
            return `Earned badge: ${achievement.achievement_name || 'a badge'}`;
        case 'goal_achieved':
            return `Achieved goal: ${achievement.achievement_name || 'a goal'}`;
        case 'lesson_completed':
            return `Completed lesson: ${achievement.item_name || 'a lesson'}`;
        default:
            return `Made progress: ${achievement.achievement_name || 'an achievement'}`;
    }
}

function formatTime(minutes) {
    if (minutes < 60) {
        return `${minutes}m`;
    } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}h ${mins}m`;
    }
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    
    return date.toLocaleDateString();
}

function formatDate(dateString) {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

// ============================================
// QUIZ MANAGEMENT FUNCTIONS
// ============================================

async function fetchQuizCategories() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📚 Fetching quiz categories...');
        
        const response = await fetch(`${API_BASE_URL}/quiz/categories`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz categories: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.categories) {
            console.log(`✅ Fetched ${data.categories.length} quiz categories`);
            return data.categories;
        } else {
            throw new Error(data.message || 'No quiz categories returned');
        }
    } catch (error) {
        console.error('Error fetching quiz categories:', error);
        return [];
    }
}

async function fetchQuizzesForCategory(categoryId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log(`📝 Fetching quizzes for category ${categoryId}...`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/category/${categoryId}/quizzes`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quizzes: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.quizzes) {
            console.log(`✅ Fetched ${data.quizzes.length} quizzes`);
            return data.quizzes;
        } else {
            throw new Error(data.message || 'No quizzes returned');
        }
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        return [];
    }
}

async function checkQuizAccess(quizId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return { canAccess: false, reason: 'Not authenticated' };
        }
        
        console.log(`🔍 Checking quiz access for quiz ${quizId}...`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/${quizId}/check-access`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to check quiz access: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log(`✅ Quiz access check: ${data.canAccess ? 'ACCESS GRANTED' : 'ACCESS DENIED'}`);
            return data;
        } else {
            throw new Error(data.message || 'Failed to check access');
        }
    } catch (error) {
        console.error('Error checking quiz access:', error);
        return { canAccess: false, reason: 'Error checking access' };
    }
}

async function startQuizAttempt(quizId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log(`🚀 Starting quiz attempt for quiz ${quizId}...`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/${quizId}/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to start quiz attempt: ${response.status}`, errorText);
            
            let errorMessage = `Failed to start quiz attempt: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (data.success && data.attempt) {
            console.log(`✅ Quiz attempt started. Attempt ID: ${data.attempt.attempt_id}`);
            console.log(`⏱️ Start time: ${data.attempt.start_time}`);
            
            await logUserActivity('quiz_started', quizId, {
                quiz_id: quizId,
                attempt_id: data.attempt.attempt_id,
                start_time: data.attempt.start_time
            });
            
            return data.attempt;
        } else {
            throw new Error(data.message || 'Failed to start quiz attempt');
        }
    } catch (error) {
        console.error('Error starting quiz attempt:', error);
        showNotification(`Failed to start quiz: ${error.message}`, 'error');
        return null;
    }
}

async function updateQuizTimeInDatabase(elapsedSeconds) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token || !QuizState.currentAttemptId || !QuizState.currentQuiz) return;
        
        console.log(`⏱️ Updating quiz time in quiz_performance table: ${elapsedSeconds} seconds`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/performance/update-time`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quiz_id: QuizState.currentQuiz,
                attempt_id: QuizState.currentAttemptId,
                time_spent_seconds: elapsedSeconds,
                average_time_seconds: elapsedSeconds
            })
        });
        
        if (!response.ok) {
            console.warn(`Failed to update time: ${response.status}`);
        } else {
            const data = await response.json();
            if (data.success) {
                console.log(`✅ Quiz time updated in quiz_performance table: ${elapsedSeconds}s`);
                if (data.performance) {
                    console.log(`📊 Updated average time: ${data.performance.average_time_seconds}s`);
                }
            }
        }
    } catch (error) {
        console.error('Error updating quiz time:', error);
    }
}

async function fetchQuizQuestions(quizId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log(`❓ Fetching questions for quiz ${quizId}...`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/${quizId}/questions`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz questions: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.questions) {
            console.log(`✅ Fetched ${data.questions.length} questions`);
            return data.questions;
        } else {
            throw new Error(data.message || 'No questions returned');
        }
    } catch (error) {
        console.error('Error fetching quiz questions:', error);
        return [];
    }
}

async function submitQuizAnswer(attemptId, questionId, answerData) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log(`📝 Submitting answer for question ${questionId}...`);
        
        const requestBody = {
            attempt_id: parseInt(attemptId, 10),
            question_id: parseInt(questionId, 10),
            user_answer: answerData.user_answer || ''
        };
        
        if (answerData.selected_option_id !== undefined) {
            requestBody.selected_option_id = parseInt(answerData.selected_option_id, 10);
        }
        
        console.log('📦 Request body (with parsed integers):', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/quiz/answer`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to submit answer: ${response.status}`, errorText);
            
            let errorMessage = `Failed to submit answer: ${response.status}`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) {
                    errorMessage = errorData.message;
                    
                    if (errorData.message.includes('mysqld_stmt_execute')) {
                        console.error('MySQL statement execution error - parameter mismatch');
                        console.error('Expected parameters:', {
                            attempt_id: 'INT',
                            question_id: 'INT', 
                            selected_option_id: 'INT or NULL',
                            user_answer: 'VARCHAR'
                        });
                    }
                }
            } catch (e) {
            }
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Answer submitted successfully');
            return data;
        } else {
            throw new Error(data.message || 'Failed to submit answer');
        }
    } catch (error) {
        console.error('Error submitting quiz answer:', error);
        return null;
    }
}

async function completeQuizAttempt(attemptId, timeSpentSeconds = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log(`🏁 Completing quiz attempt ${attemptId}...`);
        console.log(`⏱️ Total time spent: ${timeSpentSeconds || 'unknown'} seconds`);
        
        const requestBody = {};
        if (timeSpentSeconds !== null) {
            requestBody.time_spent_seconds = timeSpentSeconds;
        }
        
        const response = await fetch(`${API_BASE_URL}/quiz/attempt/${attemptId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Failed to complete quiz attempt: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.results) {
            console.log('✅ Quiz attempt completed successfully');
            console.log(`⏱️ Time recorded: ${data.results.time_spent_seconds} seconds`);
            console.log(`📊 Average time for this quiz: ${data.results.average_time_seconds || 'N/A'} seconds`);
            
            await logUserActivity('quiz_completed', data.results.quiz_id, {
                quiz_id: data.results.quiz_id,
                attempt_id: attemptId,
                score: data.results.score,
                time_spent_seconds: data.results.time_spent_seconds,
                average_time_seconds: data.results.average_time_seconds
            });
            
            await updateDailyProgress({
                quizzes_completed: 1
            });
            
            return data.results;
        } else {
            throw new Error(data.message || 'Failed to complete quiz attempt');
        }
    } catch (error) {
        console.error('Error completing quiz attempt:', error);
        return null;
    }
}

async function getQuizResults(attemptId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log(`📊 Getting results for attempt ${attemptId}...`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/attempt/${attemptId}/results`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to get quiz results: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.results) {
            console.log('✅ Quiz results fetched successfully');
            return data.results;
        } else {
            throw new Error(data.message || 'Failed to get quiz results');
        }
    } catch (error) {
        console.error('Error getting quiz results:', error);
        return null;
    }
}

async function fetchUserQuizAttempts() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📋 Fetching user quiz attempts...');
        
        const response = await fetch(`${API_BASE_URL}/quiz/user/attempts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch quiz attempts: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.attempts) {
            console.log(`✅ Fetched ${data.attempts.length} quiz attempts`);
            return data.attempts;
        } else {
            throw new Error(data.message || 'No quiz attempts returned');
        }
    } catch (error) {
        console.error('Error fetching quiz attempts:', error);
        return [];
    }
}

async function fetchLeaderboard(period = 'weekly') {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log(`🏆 Fetching ${period} leaderboard...`);
        
        const response = await fetch(`${API_BASE_URL}/quiz/leaderboard/${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch leaderboard: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.leaderboard) {
            console.log(`✅ Fetched leaderboard with ${data.leaderboard.length} entries`);
            return data.leaderboard;
        } else {
            throw new Error(data.message || 'No leaderboard data returned');
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return [];
    }
}

async function fetchUserBadges() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('🎖️ Fetching user badges...');
        
        const response = await fetch(`${API_BASE_URL}/dashboard/badges`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Badges query failed: ${response.status}`);
            
            if (response.status === 404) {
                console.log('📝 Badges endpoint not found, returning empty array');
                return [];
            }
            
            throw new Error(`Failed to fetch badges: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.badges && data.badges.earned) {
                console.log(`✅ Fetched ${data.badges.earned.length} badges`);
                return data.badges.earned;
            } else if (data.badges && Array.isArray(data.badges)) {
                console.log(`✅ Fetched ${data.badges.length} badges`);
                return data.badges;
            } else if (data.earned && Array.isArray(data.earned)) {
                console.log(`✅ Fetched ${data.earned.length} badges`);
                return data.earned;
            } else if (Array.isArray(data)) {
                console.log(`✅ Fetched ${data.length} badges`);
                return data;
            }
        }
        
        console.log('ℹ️ No badges found for user');
        return [];
        
    } catch (error) {
        console.error('⚠️ Error fetching badges:', error.message);
        return [];
    }
}

async function fetchUserPoints() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return { total_points: 0, points_history: [] };
        }
        
        console.log('💰 Fetching user points...');
        
        const response = await fetch(`${API_BASE_URL}/quiz/user/points`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch points: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.points) {
            console.log(`✅ User has ${data.points.total_points} points`);
            return data.points;
        } else {
            throw new Error(data.message || 'No points data returned');
        }
    } catch (error) {
        console.error('Error fetching points:', error);
        return { total_points: 0, points_history: [] };
    }
}

async function initQuizDashboard() {
    console.log('🧠 Initializing quiz dashboard...');
    
    try {
        await loadQuizCategories();
        
        await loadQuizStatsFromServer();
        
        await loadLeaderboard();
        
        await loadUserBadges();
        
        console.log('✅ Quiz dashboard initialized');
    } catch (error) {
        console.error('Error initializing quiz dashboard:', error);
        showNotification('Failed to initialize quiz dashboard', 'error');
    }
}

async function loadQuizCategories() {
    try {
        const categories = await fetchQuizCategories();
        QuizState.quizCategories = categories;
        
        const categoriesContainer = document.getElementById('quizCategoriesGrid');
        if (!categoriesContainer) {
            console.error('Quiz categories grid not found');
            return;
        }
        
        if (categories.length === 0) {
            categoriesContainer.innerHTML = `
                <div class="no-categories">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No quiz categories available</h3>
                    <p>Check back later for new quizzes!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        categories.forEach(category => {
            html += `
                <div class="quiz-category-card" data-category-id="${category.category_id}">
                    <div class="quiz-category-icon" style="background: ${category.color || '#3498db'}">
                        <i class="${category.icon || 'fas fa-question-circle'}"></i>
                    </div>
                    <div class="quiz-category-info">
                        <h3 class="quiz-category-title">${category.category_name}</h3>
                        <p class="quiz-category-desc">${category.description || 'Test your knowledge in this category'}</p>
                        <div class="quiz-category-stats">
                            <span class="quiz-category-stat">
                                <i class="fas fa-question-circle"></i> ${category.quiz_count || 0} Quizzes
                            </span>
                            <span class="quiz-category-stat">
                                <i class="fas fa-trophy"></i> ${category.user_completed || 0} Completed
                            </span>
                        </div>
                    </div>
                    <button class="quiz-category-btn" data-category-id="${category.category_id}">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            `;
        });
        
        categoriesContainer.innerHTML = html;
        
        document.querySelectorAll('.quiz-category-btn').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const categoryId = this.getAttribute('data-category-id');
                await loadQuizzesForCategory(categoryId);
            });
        });
        
        document.querySelectorAll('.quiz-category-card').forEach(card => {
            card.addEventListener('click', function() {
                const categoryId = this.getAttribute('data-category-id');
                document.querySelectorAll('.quiz-category-card').forEach(c => {
                    c.classList.remove('selected');
                });
                this.classList.add('selected');
                QuizState.selectedCategory = categoryId;
            });
        });
        
    } catch (error) {
        console.error('Error loading quiz categories:', error);
        const categoriesContainer = document.getElementById('quizCategoriesGrid');
        if (categoriesContainer) {
            categoriesContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load quiz categories</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
}

async function loadQuizzesForCategory(categoryId) {
    try {
        const quizzes = await fetchQuizzesForCategory(categoryId);
        
        const selectedCategory = QuizState.quizCategories.find(cat => cat.category_id == categoryId);
        if (!selectedCategory) return;
        
        showQuizInterfaceForCategory(selectedCategory, quizzes);
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        showNotification('Failed to load quizzes', 'error');
    }
}

function showQuizInterfaceForCategory(category, quizzes) {
    const categoriesGrid = document.getElementById('quizCategoriesGrid');
    const quizInterface = document.getElementById('quizInterface');
    const badgesContainer = document.getElementById('badgesContainer');
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    
    if (categoriesGrid) categoriesGrid.classList.add('hidden');
    if (badgesContainer) badgesContainer.classList.add('hidden');
    if (leaderboardContainer) leaderboardContainer.classList.add('hidden');
    
    const quizActiveTitle = document.getElementById('quizActiveTitle');
    if (quizActiveTitle) {
        quizActiveTitle.textContent = `${category.category_name} Quizzes`;
    }
    
    const quizOptionsGrid = document.getElementById('quizOptionsGrid');
    if (quizOptionsGrid) {
        if (quizzes.length === 0) {
            quizOptionsGrid.innerHTML = `
                <div class="no-quizzes">
                    <i class="fas fa-clipboard-check"></i>
                    <h3>No quizzes available in this category</h3>
                    <p>Check back later for new quizzes!</p>
                </div>
            `;
        } else {
            let html = '';
            quizzes.forEach(quiz => {
                const difficultyClass = `difficulty-${quiz.difficulty}`;
                const difficultyColor = quiz.difficulty === 'easy' ? '#27ae60' : 
                                      quiz.difficulty === 'medium' ? '#f39c12' : '#e74c3c';
                
                html += `
                    <div class="quiz-option-card" data-quiz-id="${quiz.quiz_id}">
                        <div class="quiz-option-header">
                            <h4>${quiz.quiz_title}</h4>
                            <span class="quiz-option-difficulty ${difficultyClass}" style="background: ${difficultyColor}">
                                ${quiz.difficulty}
                            </span>
                        </div>
                        
                        <div class="quiz-option-body">
                            <p>${quiz.description || 'Test your knowledge with this quiz.'}</p>
                            
                            <div class="quiz-option-meta">
                                <span class="quiz-option-meta-item">
                                    <i class="fas fa-question-circle"></i> ${quiz.total_questions} Questions
                                </span>
                                <span class="quiz-option-meta-item">
                                    <i class="fas fa-clock"></i> ${quiz.duration_minutes} min
                                </span>
                                <span class="quiz-option-meta-item">
                                    <i class="fas fa-trophy"></i> ${quiz.passing_score}% to pass
                                </span>
                            </div>
                            
                            ${quiz.user_attempts && quiz.user_attempts.length > 0 ? `
                                <div class="quiz-option-attempts">
                                    <strong>Your Best Score:</strong> 
                                    ${Math.max(...quiz.user_attempts.map(a => a.score))}%
                                    (${quiz.user_attempts.length} attempt${quiz.user_attempts.length > 1 ? 's' : ''})
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="quiz-option-actions">
                            <button class="quiz-start-btn" data-quiz-id="${quiz.quiz_id}">
                                <i class="fas fa-play"></i> Start Quiz
                            </button>
                            ${quiz.user_attempts && quiz.user_attempts.length > 0 ? `
                                <button class="quiz-review-btn" data-quiz-id="${quiz.quiz_id}">
                                    <i class="fas fa-chart-bar"></i> Review
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            quizOptionsGrid.innerHTML = html;
            
            document.querySelectorAll('.quiz-start-btn').forEach(button => {
                button.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const quizId = this.getAttribute('data-quiz-id');
                    await startQuiz(quizId);
                });
            });
            
            document.querySelectorAll('.quiz-review-btn').forEach(button => {
                button.addEventListener('click', async function(e) {
                    e.stopPropagation();
                    const quizId = this.getAttribute('data-quiz-id');
                    await reviewQuiz(quizId);
                });
            });
        }
    }
    
    const currentQuestionNum = document.getElementById('currentQuestionNum');
    const totalQuestions = document.getElementById('totalQuestions');
    if (currentQuestionNum && totalQuestions) {
        currentQuestionNum.textContent = '1';
        totalQuestions.textContent = quizzes.length > 0 ? quizzes.length : '0';
    }
    
    const backButton = document.createElement('button');
    backButton.className = 'quiz-back-btn';
    backButton.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Categories';
    backButton.addEventListener('click', () => {
        if (quizInterface) quizInterface.classList.add('hidden');
        if (categoriesGrid) categoriesGrid.classList.remove('hidden');
        if (badgesContainer) badgesContainer.classList.remove('hidden');
        if (leaderboardContainer) leaderboardContainer.classList.remove('hidden');
        
        if (quizOptionsGrid) {
            quizOptionsGrid.innerHTML = '';
        }
    });
    
    const quizInterfaceHeader = document.querySelector('.quiz-interface-header');
    if (quizInterfaceHeader && !quizInterfaceHeader.querySelector('.quiz-back-btn')) {
        quizInterfaceHeader.prepend(backButton);
    }
    
    if (quizInterface) {
        quizInterface.classList.remove('hidden');
    }
}

async function loadUserQuizStats() {
    try {
        const attempts = await fetchUserQuizAttempts();
        const points = await fetchUserPoints();
        
        const quizCurrentScore = document.getElementById('quizCurrentScore');
        const quizAccuracy = document.getElementById('quizAccuracy');
        const quizTimeSpent = document.getElementById('quizTimeSpent');
        const quizRank = document.getElementById('quizRank');
        
        if (attempts.length > 0) {
            const completedQuizzes = attempts.filter(a => a.completion_status === 'completed').length;
            const averageScore = attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length;
            const totalTimeSpent = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
            
            const userRank = Math.max(1, Math.floor(Math.random() * 100) + 1);
            
            if (quizCurrentScore) {
                quizCurrentScore.textContent = `${Math.round(averageScore)}%`;
            }
            
            if (quizAccuracy) {
                const accuracy = attempts.length > 0 ? 
                    (attempts.filter(a => a.score >= 70).length / attempts.length) * 100 : 0;
                quizAccuracy.textContent = `${Math.round(accuracy)}%`;
            }
            
            if (quizTimeSpent) {
                const hours = Math.floor(totalTimeSpent / 3600);
                const minutes = Math.floor((totalTimeSpent % 3600) / 60);
                quizTimeSpent.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            }
            
            if (quizRank) {
                quizRank.textContent = `#${userRank}`;
            }
        } else {
            if (quizCurrentScore) quizCurrentScore.textContent = '0%';
            if (quizAccuracy) quizAccuracy.textContent = '0%';
            if (quizTimeSpent) quizTimeSpent.textContent = '0m';
            if (quizRank) quizRank.textContent = '#--';
        }
        
    } catch (error) {
        console.error('Error loading user quiz stats:', error);
        const quizCurrentScore = document.getElementById('quizCurrentScore');
        const quizAccuracy = document.getElementById('quizAccuracy');
        const quizTimeSpent = document.getElementById('quizTimeSpent');
        const quizRank = document.getElementById('quizRank');
        
        if (quizCurrentScore) quizCurrentScore.textContent = '0%';
        if (quizAccuracy) quizAccuracy.textContent = '0%';
        if (quizTimeSpent) quizTimeSpent.textContent = '0m';
        if (quizRank) quizRank.textContent = '#--';
    }
}

async function loadLeaderboard() {
    try {
        const leaderboard = await fetchLeaderboard('weekly');
        
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;
        
        if (leaderboard.length === 0) {
            leaderboardList.innerHTML = `
                <div class="no-leaderboard">
                    <i class="fas fa-trophy"></i>
                    <h3>No leaderboard data yet</h3>
                    <p>Complete quizzes to appear on the leaderboard!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        leaderboard.forEach((entry, index) => {
            const isCurrentUser = entry.user_id === AppState.currentUser?.id;
            const rankClass = index === 0 ? 'first' : 
                            index === 1 ? 'second' : 
                            index === 2 ? 'third' : '';
            
            html += `
                <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="leaderboard-rank ${rankClass}">${index + 1}</div>
                    <div class="leaderboard-user">
                        <div class="leaderboard-user-name">${entry.full_name || entry.username}</div>
                        <div class="leaderboard-user-stats">
                            <span class="leaderboard-stat">
                                <i class="fas fa-star"></i> ${entry.total_points} pts
                            </span>
                            <span class="leaderboard-stat">
                                <i class="fas fa-trophy"></i> ${entry.quizzes_completed} quizzes
                            </span>
                        </div>
                    </div>
                    <div class="leaderboard-score">${entry.accuracy_rate}%</div>
                </div>
            `;
        });
        
        leaderboardList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load leaderboard</p>
                </div>
            `;
        }
    }
}

async function loadUserBadges() {
    try {
        const badges = await fetchUserBadges();
        
        const badgesGrid = document.getElementById('badgesGrid');
        if (!badgesGrid) return;
        
        badgesGrid.innerHTML = '';
        
        if (!badges || badges.length === 0) {
            badgesGrid.innerHTML = `
                <div class="no-badges">
                    <i class="fas fa-award"></i>
                    <h3>No badges yet</h3>
                    <p>Complete quizzes and exercises to earn badges!</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        badges.forEach(badge => {
            const badgeName = badge.badge_name || badge.name || 'Achievement Badge';
            const badgeDescription = badge.description || badge.desc || 'Achievement badge earned through excellence';
            const badgeIcon = badge.icon || badge.badge_icon || 'fas fa-award';
            const badgeColor = badge.color || badge.badge_color || '#3498db';
            const earnedDate = badge.earned_at || badge.date_earned || badge.created_at;
            
            html += `
                <div class="badge-item" title="${badgeName} - Earned: ${formatDate(earnedDate) || 'Recently'}">
                    <div class="badge-icon" style="background: ${badgeColor}">
                        <i class="${badgeIcon}"></i>
                    </div>
                    <div class="badge-info">
                        <h4>${badgeName}</h4>
                        <p>${badgeDescription}</p>
                        ${earnedDate ? `<small>Earned: ${formatTimeAgo(earnedDate)}</small>` : ''}
                    </div>
                </div>
            `;
        });
        
        badgesGrid.innerHTML = html;
        
    } catch (error) {
        console.error('⚠️ Error loading badges:', error);
        const badgesGrid = document.getElementById('badgesGrid');
        if (badgesGrid) {
            badgesGrid.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Unable to load badges</h3>
                    <p>Please try refreshing the page</p>
                </div>
            `;
        }
    }
}

async function startQuiz(quizId) {
    try {
        console.log(`🚀 Starting quiz ${quizId}...`);
        
        const accessCheck = await checkQuizAccess(quizId);
        
        if (!accessCheck.canAccess) {
            showNotification(accessCheck.reason || 'You need to complete the required lessons first', 'error');
            return;
        }
        
        const attempt = await startQuizAttempt(quizId);
        if (!attempt) {
            showNotification('Failed to start quiz', 'error');
            return;
        }
        
        const questions = await fetchQuizQuestions(quizId);
        if (questions.length === 0) {
            showNotification('No questions available for this quiz', 'error');
            return;
        }
        
        QuizState.currentQuiz = quizId;
        QuizState.currentAttemptId = attempt.attempt_id;
        QuizState.questions = questions;
        QuizState.currentQuestionIndex = 0;
        QuizState.userAnswers = {};
        QuizState.timer = attempt.time_spent_seconds || 0;
        QuizState.isQuizActive = true;
        
        showActualQuizInterface(questions);
        
    } catch (error) {
        console.error('Error starting quiz:', error);
        showNotification('Failed to start quiz', 'error');
    }
}

function showActualQuizInterface(questions) {
    const quizInterface = document.getElementById('quizInterface');
    const quizOptionsGrid = document.getElementById('quizOptionsGrid');
    
    if (!quizInterface || !quizOptionsGrid) return;
    
    quizOptionsGrid.innerHTML = '';
    
    loadQuizQuestion(0);
}

function loadQuizQuestion(questionIndex) {
    if (questionIndex < 0 || questionIndex >= QuizState.questions.length) return;
    
    const question = QuizState.questions[questionIndex];
    QuizState.currentQuestionIndex = questionIndex;
    
    console.log('🔍 Loading question:', {
        index: questionIndex,
        questionId: question.question_id,
        questionText: question.question_text,
        questionType: question.question_type,
        options: question.options
    });
    
    if (questionIndex === 0 && !QuizState.startTime) {
        QuizState.startTime = new Date();
        console.log(`⏱️ Quiz started at: ${QuizState.startTime.toISOString()}`);
    }
    
    const currentQuestionNum = document.getElementById('currentQuestionNum');
    const totalQuestions = document.getElementById('totalQuestions');
    const quizQuestionText = document.getElementById('quizQuestionText');
    const quizOptionsGrid = document.getElementById('quizOptionsGrid');
    const quizProgressDots = document.getElementById('quizProgressDots');
    
    if (currentQuestionNum) {
        currentQuestionNum.textContent = questionIndex + 1;
    }
    
    if (totalQuestions) {
        totalQuestions.textContent = QuizState.questions.length;
    }
    
    if (quizQuestionText) {
        quizQuestionText.textContent = question.question_text;
    }
    
    if (quizOptionsGrid) {
        let optionsHTML = '';
        
        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
            console.log('🔍 Question options:', question.options);
            
            if (question.options && Array.isArray(question.options) && question.options.length > 0) {
                question.options.forEach((option, index) => {
                    const optionId = option.id || option.option_id || index;
                    const optionText = option.text || option.option_text || `Option ${String.fromCharCode(65 + index)}`;
                    
                    optionsHTML += `
                        <div class="quiz-option" data-option-id="${optionId}">
                            <div class="quiz-option-selector">
                                <i class="fas fa-circle"></i>
                            </div>
                            <div class="quiz-option-text">${optionText}</div>
                        </div>
                    `;
                });
            } else {
                console.warn('⚠️ No options found for question, creating defaults');
                const defaultOptions = [
                    { id: 1, text: 'Option A' },
                    { id: 2, text: 'Option B' },
                    { id: 3, text: 'Option C' },
                    { id: 4, text: 'Option D' }
                ];
                
                defaultOptions.forEach(option => {
                    optionsHTML += `
                        <div class="quiz-option" data-option-id="${option.id}">
                            <div class="quiz-option-selector">
                                <i class="fas fa-circle"></i>
                            </div>
                            <div class="quiz-option-text">${option.text}</div>
                        </div>
                    `;
                });
            }
        } else {
            optionsHTML = `
                <div class="quiz-text-input-container">
                    <input type="text" 
                           class="quiz-text-input" 
                           id="quizTextAnswer" 
                           placeholder="Type your answer here...">
                    <button class="quiz-submit-answer-btn" id="submitTextAnswerBtn">
                        Submit Answer
                    </button>
                </div>
            `;
        }
        
        quizOptionsGrid.innerHTML = optionsHTML;
        
        if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
            document.querySelectorAll('.quiz-option').forEach(option => {
                option.addEventListener('click', function() {
                    document.querySelectorAll('.quiz-option').forEach(opt => {
                        opt.classList.remove('selected');
                    });
                    
                    this.classList.add('selected');
                    
                    const questionId = question.question_id;
                    const optionId = this.getAttribute('data-option-id');
                    QuizState.userAnswers[questionId] = optionId;
                    
                    console.log('✅ Selected answer:', {
                        questionId: questionId,
                        optionId: optionId
                    });
                    
                    updateProgressDots();
                    
                    setTimeout(() => {
                        saveAnswerAndContinue(questionId, optionId);
                    }, 500);
                });
            });
        }
        
        const submitTextAnswerBtn = document.getElementById('submitTextAnswerBtn');
        if (submitTextAnswerBtn) {
            submitTextAnswerBtn.addEventListener('click', function() {
                const questionId = question.question_id;
                const answerText = document.getElementById('quizTextAnswer').value;
                
                if (answerText.trim()) {
                    QuizState.userAnswers[questionId] = answerText;
                    saveAnswerAndContinue(questionId, answerText);
                } else {
                    showNotification('Please enter an answer', 'error');
                }
            });
        }
    }
    
    updateProgressDots();
    
    updateQuizTimer();
}

async function saveAnswerAndContinue(questionId, answer) {
    try {
        if (!QuizState.currentAttemptId) {
            console.error('No active quiz attempt');
            return;
        }
        
        const currentQuestion = QuizState.questions[QuizState.currentQuestionIndex];
        if (!currentQuestion) {
            console.error('No current question found');
            return;
        }
        
        const answerData = {
            user_answer: answer.toString()
        };
        
        if (currentQuestion.question_type === 'multiple_choice' || 
            currentQuestion.question_type === 'true_false') {
            answerData.selected_option_id = parseInt(answer);
        }
        
        console.log('📤 Submitting answer:', {
            attemptId: QuizState.currentAttemptId,
            questionId: questionId,
            answerData: answerData
        });
        
        const result = await submitQuizAnswer(QuizState.currentAttemptId, questionId, answerData);
        
        if (result) {
            console.log('✅ Answer saved:', result);
            
            if (QuizState.currentQuestionIndex < QuizState.questions.length - 1) {
                setTimeout(() => {
                    loadQuizQuestion(QuizState.currentQuestionIndex + 1);
                }, 300);
            } else {
                await submitQuiz();
            }
        } else {
            showNotification('Answer may not have been saved. Continuing anyway...', 'warning');
            
            if (QuizState.currentQuestionIndex < QuizState.questions.length - 1) {
                setTimeout(() => {
                    loadQuizQuestion(QuizState.currentQuestionIndex + 1);
                }, 300);
            } else {
                await submitQuiz();
            }
        }
    } catch (error) {
        console.error('Error saving answer:', error);
        showNotification('Failed to save answer, but continuing...', 'error');
        
        if (QuizState.currentQuestionIndex < QuizState.questions.length - 1) {
            setTimeout(() => {
                loadQuizQuestion(QuizState.currentQuestionIndex + 1);
            }, 500);
        } else {
            await submitQuiz();
        }
    }
}

function updateProgressDots() {
    const quizProgressDots = document.getElementById('quizProgressDots');
    if (!quizProgressDots) return;
    
    const dots = quizProgressDots.querySelectorAll('.progress-dot');
    dots.forEach((dot, index) => {
        const isCurrent = index === QuizState.currentQuestionIndex;
        const isAnswered = QuizState.userAnswers[QuizState.questions[index].question_id] !== undefined;
        
        dot.classList.remove('current', 'answered');
        if (isCurrent) dot.classList.add('current');
        if (isAnswered) dot.classList.add('answered');
    });
}

function updateQuizTimer() {
    const timerDisplay = document.getElementById('timerDisplay');
    if (!timerDisplay) return;
    
    if (!QuizState.timerInterval) {
        if (!QuizState.startTime) {
            QuizState.startTime = new Date();
            console.log(`⏱️ Quiz started at: ${QuizState.startTime.toISOString()}`);
        }
        
        QuizState.timerInterval = setInterval(async () => {
            const now = new Date();
            QuizState.timer = Math.floor((now - QuizState.startTime) / 1000);
            
            const minutes = Math.floor(QuizState.timer / 60);
            const seconds = QuizState.timer % 60;
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            if (QuizState.timer % 30 === 0 && QuizState.timer > 0) {
                await updateQuizTimeInDatabase(QuizState.timer);
            }
        }, 1000);
    }
}

function stopQuizTimer() {
    if (QuizState.timerInterval) {
        clearInterval(QuizState.timerInterval);
        QuizState.timerInterval = null;
    }
}

async function submitQuiz() {
    try {
        const currentQuestion = QuizState.questions[QuizState.currentQuestionIndex];
        if (currentQuestion) {
            const selectedOption = document.querySelector('.quiz-option.selected');
            if (selectedOption) {
                const questionId = currentQuestion.question_id;
                const optionId = selectedOption.getAttribute('data-option-id') || selectedOption.getAttribute('data-option-value');
                QuizState.userAnswers[questionId] = optionId;
            }
        }
        
        stopQuizTimer();
        
        const finalTimeSpent = QuizState.timer;
        console.log(`⏱️ Final time spent: ${finalTimeSpent} seconds`);
        
        await updateQuizTimeInDatabase(finalTimeSpent);
        
        for (const [questionId, answer] of Object.entries(QuizState.userAnswers)) {
            const answerData = {
                user_answer: answer
            };
            
            if (typeof answer === 'string' && answer.match(/^\d+$/)) {
                answerData.selected_option_id = parseInt(answer);
            }
            
            await submitQuizAnswer(QuizState.currentAttemptId, parseInt(questionId), answerData);
        }
        
        const results = await completeQuizAttempt(QuizState.currentAttemptId, finalTimeSpent);
        
        if (results) {
            QuizState.quizResults = results;
            showQuizResults(results);
        } else {
            throw new Error('Failed to get quiz results');
        }
        
    } catch (error) {
        console.error('Error submitting quiz:', error);
        showNotification('Failed to submit quiz', 'error');
    }
}

function showQuizResults(results) {
    const quizInterface = document.getElementById('quizInterface');
    const quizResultsContainer = document.getElementById('quizResultsContainer');
    
    if (!quizInterface || !quizResultsContainer) return;
    
    quizInterface.classList.add('hidden');
    
    const quizResultsSubtitle = document.getElementById('quizResultsSubtitle');
    const quizResultsScore = document.getElementById('quizResultsScore');
    const correctAnswersCount = document.getElementById('correctAnswersCount');
    const timeTaken = document.getElementById('timeTaken');
    const scoreEarned = document.getElementById('scoreEarned');
    const accuracyRate = document.getElementById('accuracyRate');
    
    if (quizResultsSubtitle) {
        const quizTitle = QuizState.quizCategories.find(cat => 
            cat.quizzes?.some(q => q.quiz_id == QuizState.currentQuiz)
        )?.category_name || 'Quiz';
        quizResultsSubtitle.textContent = `${quizTitle} Completed`;
    }
    
    if (quizResultsScore) {
        quizResultsScore.textContent = `${Math.round(results.score)}%`;
    }
    
    if (correctAnswersCount) {
        correctAnswersCount.textContent = results.correct_answers || 0;
    }
    
    if (timeTaken) {
        const minutes = Math.floor(results.time_spent_seconds / 60);
        const seconds = results.time_spent_seconds % 60;
        timeTaken.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    if (scoreEarned) {
        scoreEarned.textContent = results.points_earned || 0;
    }
    
    if (accuracyRate) {
        accuracyRate.textContent = `${Math.round(results.score)}%`;
    }
    
    const reviewQuizBtn = document.getElementById('reviewQuizBtn');
    const newQuizBtn = document.getElementById('newQuizBtn');
    const backToQuizzesBtn = document.getElementById('backToQuizzesBtn');
    
    if (reviewQuizBtn) {
        reviewQuizBtn.addEventListener('click', () => {
            reviewQuiz(QuizState.currentQuiz, QuizState.currentAttemptId);
        });
    }
    
    if (newQuizBtn) {
        newQuizBtn.addEventListener('click', () => {
            resetQuizInterface();
            initQuizDashboard();
        });
    }
    
    if (backToQuizzesBtn) {
        backToQuizzesBtn.addEventListener('click', () => {
            resetQuizInterface();
            initQuizDashboard();
        });
    }
    
    quizResultsContainer.classList.remove('hidden');
}

function resetQuizInterface() {
    const quizInterface = document.getElementById('quizInterface');
    const quizResultsContainer = document.getElementById('quizResultsContainer');
    const quizCategoriesGrid = document.getElementById('quizCategoriesGrid');
    const badgesContainer = document.getElementById('badgesContainer');
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    
    if (quizInterface) quizInterface.classList.add('hidden');
    if (quizResultsContainer) quizResultsContainer.classList.add('hidden');
    if (quizCategoriesGrid) quizCategoriesGrid.classList.remove('hidden');
    if (badgesContainer) badgesContainer.classList.remove('hidden');
    if (leaderboardContainer) leaderboardContainer.classList.remove('hidden');
    
    QuizState.currentQuiz = null;
    QuizState.currentAttemptId = null;
    QuizState.questions = [];
    QuizState.currentQuestionIndex = 0;
    QuizState.userAnswers = {};
    QuizState.timer = 0;
    QuizState.startTime = null;
    QuizState.isQuizActive = false;
    QuizState.quizResults = null;
    
    stopQuizTimer();
}

async function reviewQuiz(quizId, attemptId = null) {
    try {
        let results;
        
        if (attemptId) {
            results = await getQuizResults(attemptId);
        } else {
            const attempts = await fetchUserQuizAttempts();
            const quizAttempts = attempts.filter(a => a.quiz_id == quizId && a.completion_status === 'completed');
            
            if (quizAttempts.length === 0) {
                showNotification('No completed attempts found for this quiz', 'error');
                return;
            }
            
            const latestAttempt = quizAttempts.sort((a, b) => new Date(b.end_time) - new Date(a.end_time))[0];
            results = await getQuizResults(latestAttempt.attempt_id);
        }
        
        if (!results) {
            showNotification('Failed to load quiz review', 'error');
            return;
        }
        
        showQuizReview(results);
        
    } catch (error) {
        console.error('Error reviewing quiz:', error);
        showNotification('Failed to load quiz review', 'error');
    }
}

function showQuizReview(results) {
    const modalHTML = `
        <div class="quiz-review-modal">
            <div class="review-header">
                <h3><i class="fas fa-chart-bar"></i> Quiz Review</h3>
                <div class="review-score">
                    Score: <span class="score-value">${Math.round(results.score)}%</span>
                </div>
            </div>
            
            <div class="review-body">
    `;
    
    results.questions.forEach((question, index) => {
        const userAnswer = question.user_answer;
        const isCorrect = question.is_correct;
        
        modalHTML += `
            <div class="review-question ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="question-header">
                    <h4>Question ${index + 1}</h4>
                    <span class="result-badge ${isCorrect ? 'correct-badge' : 'incorrect-badge'}">
                        ${isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                </div>
                
                <div class="question-text">
                    <p>${question.question_text}</p>
                </div>
                
                <div class="answer-review">
                    <div class="user-answer">
                        <strong>Your Answer:</strong> ${userAnswer || 'No answer provided'}
                    </div>
                    
                    ${!isCorrect && question.correct_answer ? `
                        <div class="correct-answer">
                            <strong>Correct Answer:</strong> ${question.correct_answer}
                        </div>
                    ` : ''}
                    
                    ${question.explanation ? `
                        <div class="explanation">
                            <strong>Explanation:</strong> ${question.explanation}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    modalHTML += `
            </div>
            
            <div class="review-footer">
                <button class="btn-primary" id="closeReviewBtn">
                    <i class="fas fa-times"></i> Close Review
                </button>
            </div>
        </div>
    `;
    
    showModal(modalHTML);
    
    document.getElementById('closeReviewBtn').addEventListener('click', () => {
        const modal = document.querySelector('.modal-overlay');
        if (modal) modal.remove();
    });
}

// ============================================
// FEEDBACK FUNCTIONS
// ============================================

function initFeedback() {
    console.log('💬 Initializing feedback system...');
    
    setupRatingStars();
    
    setupFeedbackForm();
    
    console.log('✅ Feedback system initialized');
}

function setupRatingStars() {
    const stars = document.querySelectorAll('.star');
    const ratingValue = document.getElementById('ratingValue');
    
    if (!stars.length || !ratingValue) return;
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.getAttribute('onclick').match(/rate\((\d+)\)/)[1]);
            
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('active');
                    s.innerHTML = '★';
                } else {
                    s.classList.remove('active');
                    s.innerHTML = '☆';
                }
            });
            
            ratingValue.value = rating;
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.getAttribute('onclick').match(/rate\((\d+)\)/)[1]);
            
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });
        
        star.addEventListener('mouseout', function() {
            stars.forEach(s => s.classList.remove('hover'));
        });
    });
}

function setupFeedbackForm() {
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackSuccess = document.getElementById('feedbackSuccess');
    
    if (!feedbackForm) return;
    
    feedbackForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const feedbackType = document.getElementById('feedbackType').value;
        const feedbackMessage = document.getElementById('feedbackMessage').value.trim();
        const rating = parseInt(document.getElementById('ratingValue').value) || 0;
        
        if (!feedbackMessage) {
            showNotification('Please enter your feedback message', 'error');
            return;
        }
        
        if (feedbackMessage.length < 10) {
            showNotification('Please provide more detailed feedback (at least 10 characters)', 'error');
            return;
        }
        
        const success = await submitFeedback(feedbackType, feedbackMessage, rating);
        
        if (success) {
            if (feedbackSuccess) {
                feedbackSuccess.style.display = 'block';
            }
            
            feedbackForm.reset();
            
            const stars = document.querySelectorAll('.star');
            stars.forEach(star => {
                star.classList.remove('active');
                star.innerHTML = '☆';
            });
            document.getElementById('ratingValue').value = 0;
            
            setTimeout(() => {
                if (feedbackSuccess) {
                    feedbackSuccess.style.display = 'none';
                }
            }, 5000);
            
            showNotification('Thank you for your feedback!', 'success');
        }
    });
}

async function submitFeedback(feedbackType, feedbackMessage, rating = 0) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        
        const userAgent = navigator.userAgent;
        const pageUrl = window.location.href;
        
        const feedbackData = {
            feedback_type: feedbackType,
            feedback_message: feedbackMessage,
            rating: rating,
            user_agent: userAgent,
            page_url: pageUrl,
            ip_address: null
        };
        
        console.log('📤 Submitting feedback:', feedbackData);
        
        const response = await fetch(`${API_BASE_URL}/feedback/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(feedbackData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to submit feedback:', errorText);
            throw new Error(`Failed to submit feedback: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Feedback submitted successfully');
            
            if (token) {
                await logUserActivity('feedback_submitted', data.feedback_id, {
                    feedback_type: feedbackType,
                    rating: rating
                }, 10);
            }
            
            return true;
        } else {
            throw new Error(data.message || 'Failed to submit feedback');
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Failed to submit feedback. Please try again.', 'error');
        return false;
    }
}

async function fetchUserFeedback(limit = 10, page = 1) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📋 Fetching user feedback...');
        
        const response = await fetch(`${API_BASE_URL}/feedback/user?limit=${limit}&page=${page}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch feedback: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.feedback) {
            console.log(`✅ Fetched ${data.feedback.length} feedback items`);
            return data.feedback;
        } else {
            throw new Error(data.message || 'No feedback returned');
        }
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return [];
    }
}

async function fetchFeedbackStats() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📊 Fetching feedback statistics...');
        
        const response = await fetch(`${API_BASE_URL}/feedback/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch feedback stats: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.stats) {
            console.log('✅ Feedback statistics loaded');
            return data.stats;
        } else {
            throw new Error(data.message || 'No feedback stats returned');
        }
    } catch (error) {
        console.error('Error fetching feedback stats:', error);
        return null;
    }
}

async function updateFeedbackStatus(feedbackId, status, adminNotes = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log(`🔄 Updating feedback ${feedbackId} status to ${status}...`);
        
        const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}/update-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: status,
                admin_notes: adminNotes
            })
        });
        
        if (!response.ok) {
            throw new Error(`Failed to update feedback status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Feedback status updated');
            return true;
        } else {
            throw new Error(data.message || 'Failed to update feedback status');
        }
    } catch (error) {
        console.error('Error updating feedback status:', error);
        return false;
    }
}

function initFeedbackDashboard() {
    console.log('💬 Initializing feedback dashboard...');
    
    try {
        initFeedback();
        
        if (AppState.currentUser?.role === 'admin') {
            loadFeedbackManagement();
        }
        
        console.log('✅ Feedback dashboard initialized');
    } catch (error) {
        console.error('Error initializing feedback dashboard:', error);
        showNotification('Failed to initialize feedback dashboard', 'error');
    }
}

async function loadFeedbackManagement() {
    try {
        const feedbackContainer = document.getElementById('feedbackManagementContainer');
        if (!feedbackContainer) return;
        
        if (AppState.currentUser?.role !== 'admin') {
            feedbackContainer.innerHTML = `
                <div class="access-denied">
                    <i class="fas fa-lock"></i>
                    <h3>Admin Access Required</h3>
                    <p>Only administrators can access feedback management.</p>
                </div>
            `;
            return;
        }
        
        const [stats, feedbackList] = await Promise.all([
            fetchFeedbackStats(),
            fetchAllFeedback(20, 1)
        ]);
        
        updateFeedbackManagementUI(stats, feedbackList);
        
    } catch (error) {
        console.error('Error loading feedback management:', error);
        const feedbackContainer = document.getElementById('feedbackManagementContainer');
        if (feedbackContainer) {
            feedbackContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load feedback management</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
}

async function fetchAllFeedback(limit = 20, page = 1, status = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        console.log('📋 Fetching all feedback...');
        
        let url = `${API_BASE_URL}/feedback/all?limit=${limit}&page=${page}`;
        if (status) {
            url += `&status=${status}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch feedback: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.feedback) {
            console.log(`✅ Fetched ${data.feedback.length} feedback items`);
            return data.feedback;
        } else {
            throw new Error(data.message || 'No feedback returned');
        }
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return [];
    }
}

function updateFeedbackManagementUI(stats, feedbackList) {
    const feedbackContainer = document.getElementById('feedbackManagementContainer');
    if (!feedbackContainer) return;
    
    let html = `
        <div class="feedback-management">
            <div class="feedback-stats">
                <h3><i class="fas fa-chart-bar"></i> Feedback Overview</h3>
                ${stats ? `
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">${stats.total_feedback || 0}</div>
                            <div class="stat-label">Total Feedback</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.new_feedback || 0}</div>
                            <div class="stat-label">New</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.resolved_feedback || 0}</div>
                            <div class="stat-label">Resolved</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.average_rating ? stats.average_rating.toFixed(1) : '0.0'}</div>
                            <div class="stat-label">Avg. Rating</div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="feedback-list">
                <h3><i class="fas fa-list"></i> Recent Feedback</h3>
                <div class="feedback-filters">
                    <select id="feedbackStatusFilter" class="form-control">
                        <option value="all">All Status</option>
                        <option value="new">New</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                    </select>
                    <button class="btn-primary" id="refreshFeedbackBtn">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                </div>
    `;
    
    if (feedbackList && feedbackList.length > 0) {
        html += `<div class="feedback-items">`;
        
        feedbackList.forEach(feedback => {
            const statusClass = `status-${feedback.status}`;
            const ratingStars = '★'.repeat(feedback.rating || 0) + '☆'.repeat(5 - (feedback.rating || 0));
            
            html += `
                <div class="feedback-item ${statusClass}" data-feedback-id="${feedback.feedback_id}">
                    <div class="feedback-header">
                        <div class="feedback-meta">
                            <span class="feedback-type">${feedback.feedback_type}</span>
                            <span class="feedback-date">${formatDate(feedback.created_at)}</span>
                        </div>
                        <div class="feedback-actions">
                            <span class="feedback-status ${statusClass}">${feedback.status}</span>
                            <button class="btn-small view-feedback-btn" data-feedback-id="${feedback.feedback_id}">
                                <i class="fas fa-eye"></i> View
                            </button>
                        </div>
                    </div>
                    
                    <div class="feedback-body">
                        <p class="feedback-message">${feedback.feedback_message}</p>
                        
                        ${feedback.rating > 0 ? `
                            <div class="feedback-rating">
                                <span class="rating-stars">${ratingStars}</span>
                                <span class="rating-value">${feedback.rating}/5</span>
                            </div>
                        ` : ''}
                        
                        <div class="feedback-user">
                            <i class="fas fa-user"></i>
                            ${feedback.user_id ? `User #${feedback.user_id}` : 'Anonymous'}
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    } else {
        html += `
            <div class="no-feedback">
                <i class="fas fa-comment-slash"></i>
                <h3>No feedback yet</h3>
                <p>No feedback has been submitted yet.</p>
            </div>
        `;
    }
    
    html += `</div></div>`;
    
    feedbackContainer.innerHTML = html;
    
    setupFeedbackManagementEvents();
}

function setupFeedbackManagementEvents() {
    document.querySelectorAll('.view-feedback-btn').forEach(button => {
        button.addEventListener('click', function() {
            const feedbackId = this.getAttribute('data-feedback-id');
            showFeedbackDetailsModal(feedbackId);
        });
    });
    
    const statusFilter = document.getElementById('feedbackStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', async function() {
            const status = this.value === 'all' ? null : this.value;
            const feedbackList = await fetchAllFeedback(20, 1, status);
            updateFeedbackManagementUI(null, feedbackList);
        });
    }
    
    const refreshBtn = document.getElementById('refreshFeedbackBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const statusFilter = document.getElementById('feedbackStatusFilter');
            const status = statusFilter && statusFilter.value !== 'all' ? statusFilter.value : null;
            
            const [stats, feedbackList] = await Promise.all([
                fetchFeedbackStats(),
                fetchAllFeedback(20, 1, status)
            ]);
            
            updateFeedbackManagementUI(stats, feedbackList);
            showNotification('Feedback list refreshed', 'success');
        });
    }
}

async function showFeedbackDetailsModal(feedbackId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) return;
        
        console.log(`🔍 Fetching feedback details for ID: ${feedbackId}`);
        
        const response = await fetch(`${API_BASE_URL}/feedback/${feedbackId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch feedback details: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.feedback) {
            const feedback = data.feedback;
            const ratingStars = '★'.repeat(feedback.rating || 0) + '☆'.repeat(5 - (feedback.rating || 0));
            
            const modalHTML = `
                <div class="feedback-details-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-comment-dots"></i> Feedback Details</h3>
                    </div>
                    
                    <div class="modal-body">
                        <div class="feedback-info">
                            <div class="info-row">
                                <strong>ID:</strong> <span>${feedback.feedback_id}</span>
                            </div>
                            <div class="info-row">
                                <strong>Type:</strong> <span class="feedback-type">${feedback.feedback_type}</span>
                            </div>
                            <div class="info-row">
                                <strong>Status:</strong> <span class="feedback-status status-${feedback.status}">${feedback.status}</span>
                            </div>
                            <div class="info-row">
                                <strong>Submitted:</strong> <span>${formatDate(feedback.created_at)}</span>
                            </div>
                            ${feedback.reviewed_at ? `
                                <div class="info-row">
                                    <strong>Reviewed:</strong> <span>${formatDate(feedback.reviewed_at)}</span>
                                </div>
                            ` : ''}
                            ${feedback.resolved_at ? `
                                <div class="info-row">
                                    <strong>Resolved:</strong> <span>${formatDate(feedback.resolved_at)}</span>
                                </div>
                            ` : ''}
                            ${feedback.user_id ? `
                                <div class="info-row">
                                    <strong>User ID:</strong> <span>${feedback.user_id}</span>
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="feedback-message-container">
                            <h4>Feedback Message:</h4>
                            <div class="feedback-message">
                                ${feedback.feedback_message}
                            </div>
                        </div>
                        
                        ${feedback.rating > 0 ? `
                            <div class="feedback-rating-container">
                                <h4>Rating:</h4>
                                <div class="rating-display">
                                    <span class="rating-stars">${ratingStars}</span>
                                    <span class="rating-value">${feedback.rating}/5</span>
                                </div>
                            </div>
                        ` : ''}
                        
                        <div class="feedback-meta-container">
                            <h4>Metadata:</h4>
                            <div class="meta-info">
                                ${feedback.page_url ? `
                                    <div class="meta-row">
                                        <strong>Page URL:</strong> <span>${feedback.page_url}</span>
                                    </div>
                                ` : ''}
                                ${feedback.user_agent ? `
                                    <div class="meta-row">
                                        <strong>User Agent:</strong> <span class="user-agent">${feedback.user_agent}</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        ${feedback.admin_notes ? `
                            <div class="admin-notes-container">
                                <h4>Admin Notes:</h4>
                                <div class="admin-notes">
                                    ${feedback.admin_notes}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="modal-footer">
                        <div class="status-actions">
                            <select id="updateStatusSelect" class="form-control">
                                <option value="new" ${feedback.status === 'new' ? 'selected' : ''}>New</option>
                                <option value="reviewed" ${feedback.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                                <option value="in_progress" ${feedback.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                                <option value="resolved" ${feedback.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                                <option value="closed" ${feedback.status === 'closed' ? 'selected' : ''}>Closed</option>
                            </select>
                            <button class="btn-primary" id="updateStatusBtn" data-feedback-id="${feedback.feedback_id}">
                                <i class="fas fa-save"></i> Update Status
                            </button>
                        </div>
                        
                        <div class="admin-notes-input">
                            <textarea id="adminNotesInput" placeholder="Add admin notes here...">${feedback.admin_notes || ''}</textarea>
                            <button class="btn-secondary" id="saveNotesBtn" data-feedback-id="${feedback.feedback_id}">
                                <i class="fas fa-edit"></i> Save Notes
                            </button>
                        </div>
                        
                        <button class="btn-secondary" id="closeFeedbackModal">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;
            
            showModal(modalHTML);
            
            setupFeedbackModalInteractions(feedbackId);
        }
    } catch (error) {
        console.error('Error showing feedback details:', error);
        showNotification('Failed to load feedback details', 'error');
    }
}

function setupFeedbackModalInteractions(feedbackId) {
    const updateStatusBtn = document.getElementById('updateStatusBtn');
    if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', async function() {
            const statusSelect = document.getElementById('updateStatusSelect');
            const status = statusSelect.value;
            
            const success = await updateFeedbackStatus(feedbackId, status);
            
            if (success) {
                showNotification('Feedback status updated', 'success');
                
                const statusFilter = document.getElementById('feedbackStatusFilter');
                const currentStatus = statusFilter && statusFilter.value !== 'all' ? statusFilter.value : null;
                const feedbackList = await fetchAllFeedback(20, 1, currentStatus);
                updateFeedbackManagementUI(null, feedbackList);
                
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
            }
        });
    }
    
    const saveNotesBtn = document.getElementById('saveNotesBtn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', async function() {
            const adminNotes = document.getElementById('adminNotesInput').value;
            
            const success = await updateFeedbackStatus(feedbackId, null, adminNotes);
            
            if (success) {
                showNotification('Admin notes saved', 'success');
            }
        });
    }
    
    const closeBtn = document.getElementById('closeFeedbackModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
        });
    }
}

function addFeedbackStyles() {
    if (document.querySelector('#feedback-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'feedback-styles';
    style.textContent = `
        .rating {
            display: flex;
            gap: 5px;
            margin: 10px 0;
        }
        
        .star {
            font-size: 24px;
            color: #ddd;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .star:hover,
        .star.hover {
            color: #f39c12;
        }
        
        .star.active {
            color: #f39c12;
        }
        
        #feedbackForm .form-group {
            margin-bottom: 20px;
        }
        
        #feedbackForm label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #2c3e50;
        }
        
        #feedbackForm select,
        #feedbackForm textarea {
            width: 100%;
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        #feedbackForm textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        #feedbackForm select:focus,
        #feedbackForm textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }
        
        .success-message {
            display: none;
            background: #d4edda;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
            border: 1px solid #c3e6cb;
        }
        
        .success-message i {
            font-size: 20px;
            margin-right: 10px;
            color: #28a745;
        }
        
        .feedback-management {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .feedback-stats {
            margin-bottom: 30px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .feedback-filters {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        
        .feedback-items {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .feedback-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            border-left: 4px solid #3498db;
            transition: all 0.3s;
        }
        
        .feedback-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .feedback-item.status-new {
            border-left-color: #3498db;
        }
        
        .feedback-item.status-reviewed {
            border-left-color: #f39c12;
        }
        
        .feedback-item.status-in_progress {
            border-left-color: #9b59b6;
        }
        
        .feedback-item.status-resolved {
            border-left-color: #27ae60;
        }
        
        .feedback-item.status-closed {
            border-left-color: #95a5a6;
        }
        
        .feedback-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .feedback-meta {
            display: flex;
            gap: 15px;
            font-size: 12px;
            color: #6c757d;
        }
        
        .feedback-type {
            background: #e3f2fd;
            color: #1976d2;
            padding: 3px 8px;
            border-radius: 10px;
            text-transform: capitalize;
        }
        
        .feedback-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .feedback-status {
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .status-new {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .status-reviewed {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-in_progress {
            background: #f3e5f5;
            color: #7b1fa2;
        }
        
        .status-resolved {
            background: #d4edda;
            color: #155724;
        }
        
        .status-closed {
            background: #e9ecef;
            color: #495057;
        }
        
        .feedback-message {
            line-height: 1.6;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .feedback-rating {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        
        .rating-stars {
            font-size: 16px;
            color: #f39c12;
        }
        
        .feedback-user {
            font-size: 12px;
            color: #6c757d;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .no-feedback {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .no-feedback i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #3498db;
        }
        
        .access-denied {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .feedback-details-modal {
            background: white;
            border-radius: 10px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #eee;
        }
        
        .feedback-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .info-row:last-child {
            margin-bottom: 0;
        }
        
        .feedback-message-container,
        .feedback-rating-container,
        .feedback-meta-container,
        .admin-notes-container {
            margin-bottom: 20px;
        }
        
        .feedback-message-container h4,
        .feedback-rating-container h4,
        .feedback-meta-container h4,
        .admin-notes-container h4 {
            margin-bottom: 10px;
            color: #2c3e50;
        }
        
        .feedback-message {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            line-height: 1.6;
        }
        
        .rating-display {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .meta-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
        }
        
        .meta-row {
            margin-bottom: 8px;
        }
        
        .meta-row:last-child {
            margin-bottom: 0;
        }
        
        .user-agent {
            font-size: 12px;
            color: #6c757d;
            word-break: break-all;
        }
        
        .admin-notes {
            background: #fffde7;
            padding: 15px;
            border-radius: 8px;
            line-height: 1.6;
        }
        
        .status-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .admin-notes-input {
            margin-bottom: 15px;
        }
        
        .admin-notes-input textarea {
            width: 100%;
            min-height: 80px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 10px;
            resize: vertical;
        }
        
        .modal-footer .btn-primary,
        .modal-footer .btn-secondary {
            width: 100%;
            justify-content: center;
            margin-bottom: 10px;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// LESSON MANAGEMENT FUNCTIONS
// ============================================

// Fetch all lessons from database - FILTERED BY SELECTED APP
async function fetchAllLessons(appName = null) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return [];
        }
        
        // IMPORTANT: Get the current selected app from parameter, then localStorage, then default
        // Kung may appName parameter, gamitin yun. Kung wala, kunin sa localStorage.
        // Kung wala sa localStorage, saka lang gumamit ng default na 'factolearn'
        const selectedApp = appName || localStorage.getItem('selectedApp') || 'factolearn';
        
        // Get the userId from AppState
        const userId = AppState.currentUser ? AppState.currentUser.id : 0;
        
        console.log(`📚 Fetching lessons for app: ${selectedApp} from database with userId: ${userId}`);
        
        const response = await fetch(`${API_BASE_URL}/lessons-db/complete?app=${selectedApp}&userId=${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error(`❌ Failed to fetch lessons: ${response.status} ${response.statusText}`);
            
            try {
                const errorData = await response.json();
                console.error('Error details:', errorData);
            } catch (e) {
                // Ignore if response is not JSON
            }
            
            throw new Error(`Failed to fetch lessons: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.lessons) {
            console.log(`✅ Fetched ${data.lessons.length} lessons for ${selectedApp} from database`);
            
            // FILTER by lesson_name - siguraduhin na ang lesson_name ay match sa selectedApp
            // Kung may mga lesson na ibang app, i-filter out
            const filteredLessons = data.lessons.filter(lesson => 
                lesson.lesson_name === selectedApp
            );
            
            console.log(`✅ After filtering: ${filteredLessons.length} lessons match ${selectedApp}`);
            
            // Kung walang match, return lahat ng lessons pero may warning
            if (filteredLessons.length === 0 && data.lessons.length > 0) {
                console.warn(`⚠️ No lessons exactly match ${selectedApp}, but found ${data.lessons.length} lessons with different names`);
                console.warn('Lesson names found:', [...new Set(data.lessons.map(l => l.lesson_name))]);
            }
            
            return filteredLessons.length > 0 ? filteredLessons : data.lessons;
        } else {
            console.warn('⚠️ No lessons returned or success false:', data);
            return [];
        }
    } catch (error) {
        console.error('❌ Error fetching lessons:', error);
        return [];
    }
}

async function fetchUserLessonProgress() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return {};
        }
        
        console.log('📊 Fetching user lesson progress...');
        
        const response = await fetch(`${API_BASE_URL}/progress/lessons`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('✅ User progress loaded');
                
                const progressMap = {};
                data.progress.forEach(progress => {
                    progressMap[progress.content_id] = {
                        status: progress.completion_status,
                        percentage: progress.percentage || 0,
                        time_spent: progress.time_spent_seconds || 0,
                        last_accessed: progress.last_accessed
                    };
                });
                
                return progressMap;
            }
        }
        
        return {};
    } catch (error) {
        console.error('Error fetching user progress:', error);
        return {};
    }
}

function getContinueLearningLesson(lessons, progress) {
    if (lessons.length === 0) return null;
    
    let continueLesson = null;
    let maxLastAccessed = null;
    
    for (const lesson of lessons) {
        const lessonProgress = progress[lesson.content_id] || {};
        
        if (lessonProgress.status === 'completed') continue;
        
        if (lessonProgress.last_accessed) {
            const lastAccessed = new Date(lessonProgress.last_accessed);
            if (!maxLastAccessed || lastAccessed > maxLastAccessed) {
                maxLastAccessed = lastAccessed;
                continueLesson = lesson;
            }
        }
    }
    
    if (!continueLesson) {
        for (const lesson of lessons) {
            const lessonProgress = progress[lesson.content_id] || {};
            if (lessonProgress.status !== 'completed') {
                continueLesson = lesson;
                break;
            }
        }
    }
    
    if (!continueLesson && lessons.length > 0) {
        continueLesson = lessons[0];
    }
    
    return continueLesson;
}

async function loadRecentLessons(container, lessons, progress) {
    if (!container) return;
    
    const sortedLessons = [...lessons].sort((a, b) => {
        const progressA = progress[a.content_id] || {};
        const progressB = progress[b.content_id] || {};
        
        if (progressA.last_accessed && progressB.last_accessed) {
            return new Date(progressB.last_accessed) - new Date(progressA.last_accessed);
        }
        
        return a.content_order - b.content_order;
    });
    
    const recentLessons = sortedLessons.slice(0, 4);
    
    let html = '';
    
    recentLessons.forEach(lesson => {
        const lessonProgress = progress[lesson.content_id] || {};
        const status = lessonProgress.status || 'not_started';
        const percentage = lessonProgress.percentage || 0;
        
        let statusText = 'Start';
        let statusClass = 'locked';
        let icon = 'fas fa-lock';
        
        if (status === 'completed') {
            statusText = 'Completed';
            statusClass = 'completed';
            icon = 'fas fa-check';
        } else if (status === 'in_progress') {
            statusText = percentage > 0 ? 'Continue' : 'Start';
            statusClass = 'current';
            icon = percentage > 0 ? 'fas fa-play' : 'fas fa-play';
        }
        
        html += `
            <div class="lesson-item ${statusClass}" data-lesson-id="${lesson.content_id}">
                <div class="lesson-info">
                    <div class="lesson-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div>
                        <div class="lesson-title">${lesson.content_title}</div>
                        <div class="lesson-duration">
                            <i class="fas fa-video"></i> ${Math.round((lesson.video_duration_seconds || 0) / 60)} min
                        </div>
                    </div>
                </div>
                <div class="lesson-actions">
                    <button class="${status === 'completed' ? 'review-btn' : 'start-btn'}" 
                            data-lesson-id="${lesson.content_id}">
                        ${status === 'completed' ? 'Review' : statusText}
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('.lesson-item').forEach(item => {
        item.addEventListener('click', function() {
            const lessonId = this.getAttribute('data-lesson-id');
            openLesson(lessonId);
        });
    });
    
    container.querySelectorAll('.start-btn, .review-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const lessonId = this.getAttribute('data-lesson-id');
            openLesson(lessonId);
        });
    });
}

// Update continue learning module in home dashboard - WITH APP FILTERING
async function updateContinueLearningModule() {
    try {
        const container = document.getElementById('continueLearningContainer');
        if (!container) {
            console.error('Continue learning container not found');
            return;
        }
        
        container.innerHTML = `
            <div class="loading-container">
                <div class="loading-text">
                    <i class="fas fa-spinner fa-spin"></i> Loading lessons...
                </div>
            </div>
        `;
        
        // IMPORTANT: Kunin ang selected app mula sa localStorage
        // Kung wala, gumamit ng 'factolearn' bilang default
        const selectedApp = localStorage.getItem('selectedApp') || 'factolearn';
        console.log(`📚 Updating continue learning for app: ${selectedApp}`);
        
        // I-save sa AppState
        AppState.selectedApp = selectedApp;
        
        // Check if user is authenticated
        if (!AppState.currentUser) {
            console.warn('User not authenticated');
            container.innerHTML = `
                <div class="no-lessons">
                    <i class="fas fa-user-lock"></i>
                    <h3>Please login to view lessons</h3>
                    <p>Login to access your learning progress.</p>
                </div>
            `;
            return;
        }
        
        // Fetch lessons filtered by the selected app
        const [lessons, progress] = await Promise.all([
            fetchAllLessons(selectedApp),  // ← Pass ang selectedApp dito
            fetchUserLessonProgress()
        ]);
        
        if (!lessons || lessons.length === 0) {
            container.innerHTML = `
                <div class="no-lessons">
                    <i class="fas fa-book"></i>
                    <h3>No lessons available for ${selectedApp}</h3>
                    <p>Check back later for new lessons!</p>
                </div>
            `;
            return;
        }
        
        // Log kung anong lessons ang nakuha
        console.log(`📊 Lessons loaded for ${selectedApp}:`, 
            lessons.map(l => ({ id: l.content_id, title: l.content_title, name: l.lesson_name }))
        );
        
        // Store in global state
        LessonState.lessons = lessons;
        LessonState.userProgress = progress || {};
        
        // Get continue learning lesson
        const continueLesson = getContinueLearningLesson(lessons, LessonState.userProgress);
        LessonState.continueLearningLesson = continueLesson;
        
        if (!continueLesson) {
            container.innerHTML = `
                <div class="no-lessons">
                    <i class="fas fa-trophy"></i>
                    <h3>All Lessons Completed in ${selectedApp}!</h3>
                    <p>Great job! You've completed all available lessons.</p>
                    <button class="btn-primary" id="reviewAllLessons">
                        <i class="fas fa-redo"></i> Review Lessons
                    </button>
                </div>
            `;
            
            document.getElementById('reviewAllLessons')?.addEventListener('click', () => {
                navigateTo('moduleDashboard');
            });
            
            return;
        }
        
        // Rest of your rendering code...
        // (continue with the existing code from line 5936 onwards)
        
    } catch (error) {
        console.error('❌ Error updating continue learning module:', error);
        const container = document.getElementById('continueLearningContainer');
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load lessons</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
}

async function openLesson(lessonId) {
    try {
        console.log('📖 Opening lesson:', lessonId);
        
        const lesson = await fetchLessonDetails(lessonId);
        
        if (lesson) {
            LessonState.currentLesson = lesson;
            LessonState.currentTopic = lesson.topic_id || 3;
            
            // I-save ang lesson ID sa PracticeState
            PracticeState.currentLesson = {
                id: lessonId,
                title: lesson.content_title,
                topic_id: lesson.topic_id || 3
            };
            
            await logUserActivity('lesson_started', lessonId, {
                lesson_title: lesson.content_title
            });
            
            navigateTo('moduleDashboard');
        } else {
            showNotification('Failed to load lesson. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error opening lesson:', error);
        showNotification('Error loading lesson', 'error');
    }
}

function openPracticeForTopic(topicId) {
    console.log('📝 Opening practice for topic:', topicId);
    
    PracticeState.currentTopic = topicId;
    
    navigateTo('practice');
}

async function fetchLessonDetails(lessonId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('🔍 Fetching lesson details for ID:', lessonId);
        
        const response = await fetch(`${API_BASE_URL}/lessons-db/${lessonId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch lesson details: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.lesson) {
            console.log('✅ Lesson details loaded:', data.lesson.content_title);
            return data.lesson;
        } else {
            throw new Error(data.message || 'No lesson returned');
        }
    } catch (error) {
        console.error('Error fetching lesson details:', error);
        return null;
    }
}

async function fetchLessonContent(lessonId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        console.log('📄 Fetching lesson content for ID:', lessonId);
        
        const response = await fetch(`${API_BASE_URL}/lessons-db/${lessonId}/content`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch lesson content: ${response.status}`);
        };
        
        const data = await response.json();
        
        if (data.success && data.content) {
            console.log('✅ Lesson content loaded');
            return data.content;
        } else {
            throw new Error(data.message || 'No content returned');
        }
    } catch (error) {
        console.error('Error fetching lesson content:', error);
        return null;
    }
}

async function updateLessonProgress(contentId, progressData) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return false;
        }
        
        console.log('📝 Updating lesson progress (FIXED VERSION):', {
            contentId: contentId,
            status: progressData.completion_status,
            percentage: progressData.percentage
        });
        
        const currentProgress = LessonState.userProgress[contentId];
        const isAlreadyCompleted = currentProgress && currentProgress.status === 'completed';
        const isMarkingComplete = progressData.completion_status === 'completed';
        
        if (isAlreadyCompleted && isMarkingComplete) {
            console.log('⚠️ Lesson already marked as completed, skipping...');
            return true;
        }
        
        const response = await fetch(`${API_BASE_URL}/lessons-db/${contentId}/progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(progressData)
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('✅ Lesson progress updated successfully');
                
                if (!LessonState.userProgress[contentId]) {
                    LessonState.userProgress[contentId] = {};
                }
                Object.assign(LessonState.userProgress[contentId], progressData);
                
                if (isMarkingComplete && !isAlreadyCompleted) {
                    console.log('🎯 Lesson newly completed, updating daily progress...');
                    await updateDailyProgress({
                        lessons_completed: 1,
                        total_time_minutes: Math.floor((progressData.time_spent_seconds || 0) / 60)
                    });
                } else if (isMarkingComplete && isAlreadyCompleted) {
                    console.log('⚠️ Lesson already completed before, not updating daily progress');
                }
                
                return true;
            }
        }
        
        return false;
    } catch (error) {
        console.error('Error updating lesson progress:', error);
        return false;
    }
}

// ============================================
// LESSON CONTENT DISPLAY FUNCTIONS
// ============================================

async function displayLessonContent() {
    try {
        const lessonContentContainer = document.getElementById('lessonContent');
        if (!lessonContentContainer) {
            console.error('Lesson content container not found');
            return;
        }
        
        lessonContentContainer.innerHTML = `
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading lesson content from database...</p>
            </div>
        `;
        
        const currentLesson = LessonState.currentLesson;
        if (!currentLesson) {
            lessonContentContainer.innerHTML = `
                <div class="no-content">
                    <i class="fas fa-book"></i>
                    <h3>No lesson selected</h3>
                    <p>Please select a lesson to view its content.</p>
                </div>
            `;
            return;
        }
        
        const contentDescription = currentLesson.content_description;
        
        if (!contentDescription || contentDescription.trim() === '') {
            const htmlContent = generateDefaultLessonContent(currentLesson);
            lessonContentContainer.innerHTML = htmlContent;
        } else {
            const htmlContent = convertMarkdownToHTML(contentDescription);
            lessonContentContainer.innerHTML = htmlContent;
        }
        
        setupLessonContentInteractions();
        
        addPracticeButtonToLesson();
        
    } catch (error) {
        console.error('Error displaying lesson content:', error);
        const lessonContentContainer = document.getElementById('lessonContent');
        if (lessonContentContainer) {
            lessonContentContainer.innerHTML = `
                <div class="error-content">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load lesson content</h3>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }
}

async function addPracticeButtonToLesson() {
    const currentLesson = LessonState.currentLesson;
    if (!currentLesson) return;
    
    const lessonProgress = currentLesson.progress || {};
    const percentage = lessonProgress.percentage || 0;
    const topicId = currentLesson.topic_id || 1;
    
    const practiceUnlocked = await checkPracticeUnlocked(topicId);
    
    if (percentage >= 80 && practiceUnlocked) {
        const practiceBtnHtml = `
            <div class="practice-cta">
                <h3><i class="fas fa-pencil-alt"></i> Ready to Practice?</h3>
                <p>You've completed ${percentage}% of this lesson. Test your knowledge with practice exercises!</p>
                <button class="btn-success" id="goToPracticeBtn" data-topic-id="${topicId}">
                    <i class="fas fa-play-circle"></i> Start Practice Exercises
                </button>
            </div>
        `;
        
        const lessonContent = document.getElementById('lessonContent');
        const existingPracticeCTA = lessonContent.querySelector('.practice-cta');
        
        if (!existingPracticeCTA) {
            lessonContent.querySelector('.lesson-content-wrapper')?.insertAdjacentHTML('beforeend', practiceBtnHtml);
            
            const practiceBtn = document.getElementById('goToPracticeBtn');
            if (practiceBtn) {
                practiceBtn.addEventListener('click', function() {
                    const topicId = this.getAttribute('data-topic-id');
                    openPracticeForTopic(topicId);
                });
            }
        }
    } else if (percentage >= 80 && !practiceUnlocked) {
        const lockHtml = `
            <div class="practice-cta locked">
                <h3><i class="fas fa-lock"></i> Practice Locked</h3>
                <p>Complete all lessons in this topic to unlock practice exercises.</p>
                <button class="btn-secondary" disabled>
                    <i class="fas fa-lock"></i> Complete All Lessons First
                </button>
            </div>
        `;
        
        const lessonContent = document.getElementById('lessonContent');
        const existingPracticeCTA = lessonContent.querySelector('.practice-cta');
        
        if (!existingPracticeCTA) {
            lessonContent.querySelector('.lesson-content-wrapper')?.insertAdjacentHTML('beforeend', lockHtml);
        }
    }
}

function convertMarkdownToHTML(text) {
    if (!text) return '';
    
    let html = text
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        .replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>')
        .replace(/^-\s+(.*$)/gm, '<li>$1</li>')
        
        .replace(/`(.*?)`/g, '<code>$1</code>')
        
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    if (html.includes('<li>')) {
        html = html.replace(/(<li>.*?<\/li>)+/gs, '<ol>$&</ol>');
    }
    
    const sections = html.split('</p><p>');
    html = sections.map(section => {
        if (!section.startsWith('<h') && !section.startsWith('<ol') && !section.startsWith('<ul') && !section.startsWith('<li>')) {
            return `<p>${section}</p>`;
        }
        return section;
    }).join('');
    
    html = html
        .replace(/<h1>/g, '<h1 class="lesson-title">')
        .replace(/<h2>/g, '<h2 class="lesson-subtitle">')
        .replace(/<h3>/g, '<h3 class="lesson-section">')
        .replace(/<p>/g, '<p class="lesson-paragraph">')
        .replace(/<code>/g, '<code class="lesson-code">');
    
    return `
        <div class="lesson-content-wrapper">
            ${html}
            <div class="lesson-interactive">
                <button class="btn-secondary" id="showMoreExamples">
                    <i class="fas fa-plus-circle"></i> Show More Examples
                </button>
                <button class="btn-secondary" id="practiceProblems">
                    <i class="fas fa-pencil-alt"></i> Practice Problems
                </button>
                <button class="btn-secondary" id="downloadNotes">
                    <i class="fas fa-download"></i> Download Notes
                </button>
            </div>
        </div>
    `;
}

function generateDefaultLessonContent(lesson) {
    const lessonId = lesson.content_id;
    
    if (lessonId == 3) {
        return `
            <div class="lesson-content-wrapper">
                <h1 class="lesson-title">Factorials: Introduction and Applications</h1>
                
                <div class="lesson-meta">
                    <span class="meta-item">
                        <i class="fas fa-clock"></i> ${Math.round(lesson.video_duration_seconds / 60)} minutes
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-book"></i> ${lesson.module_name || 'Module 1'}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-tag"></i> ${lesson.topic_title || 'Factorials'}
                    </span>
                </div>
                
                <h2 class="lesson-subtitle">What is a Factorial?</h2>
                <p class="lesson-paragraph">
                    A factorial is a mathematical operation that multiplies a number by every number below it. 
                    The factorial of a non-negative integer n, denoted by n!, is the product of all positive integers 
                    less than or equal to n.
                </p>
                
                <div class="example-box">
                    <p><strong>Formula:</strong> n! = n × (n - 1) × (n - 2) × ... × 3 × 2 × 1</p>
                    <p><strong>Examples:</strong></p>
                    <ul>
                        <li>5! = 5 × 4 × 3 × 2 × 1 = 120</li>
                        <li>4! = 4 × 3 × 2 × 1 = 24</li>
                        <li>3! = 3 × 2 × 1 = 6</li>
                        <li>2! = 2 × 1 = 2</li>
                        <li>1! = 1</li>
                        <li>0! = 1 (by definition)</li>
                    </ul>
                </div>
                
                <h2 class="lesson-subtitle">Properties of Factorials</h2>
                <ul class="lesson-list">
                    <li>n! = n × (n-1)!</li>
                    <li>Factorials grow very quickly</li>
                    <li>Used in permutations and combinations</li>
                    <li>Used in probability calculations</li>
                    <li>Used in series expansions (like Taylor series)</li>
                </ul>
                
                <h2 class="lesson-subtitle">Example: Simplify Expressions</h2>
                <div class="example-box">
                    <p><strong>Problem 1:</strong> Simplify 10! / 8!</p>
                    <p><strong>Solution:</strong></p>
                    <p>10! / 8! = (10 × 9 × 8!) / 8! = 10 × 9 = 90</p>
                    
                    <p><strong>Problem 2:</strong> Simplify (n+1)! / n!</p>
                    <p><strong>Solution:</strong></p>
                    <p>(n+1)! / n! = (n+1) × n! / n! = n + 1</p>
                </div>
                
                <h2 class="lesson-subtitle">Practice Problems</h2>
                <div class="practice-box">
                    <p><strong>Try these problems:</strong></p>
                    <ol>
                        <li>Calculate 6!</li>
                        <li>Simplify 12! / 10!</li>
                        <li>If 8! = 40320, what is 9!?</li>
                        <li>Solve for n if n! / (n-2)! = 30</li>
                        <li>How many ways can you arrange 5 different books on a shelf? (Hint: 5!)</li>
                    </ol>
                </div>
                
                <div class="lesson-tips">
                    <h3><i class="fas fa-lightbulb"></i> Tips & Tricks</h3>
                    <ul>
                        <li>Remember that 0! = 1 (important for many formulas)</li>
                        <li>When simplifying fractions with factorials, cancel common factors</li>
                        <li>Factorials grow fast: 10! is already 3.6 million</li>
                        <li>Use factorial notation to write compact expressions</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    return `
        <div class="lesson-content-wrapper">
            <h1 class="lesson-title">${lesson.content_title || 'Polynomial Division'}</h1>
            
            <div class="lesson-meta">
                <span class="meta-item">
                    <i class="fas fa-clock"></i> ${Math.round(lesson.video_duration_seconds / 60)} minutes
                </span>
                <span class="meta-item">
                    <i class="fas fa-book"></i> ${lesson.module_name || 'Module'}
                </span>
                <span class="meta-item">
                    <i class="fas fa-tag"></i> ${lesson.topic_title || 'Topic'}
                </span>
            </div>
            
            <h2 class="lesson-subtitle">Introduction</h2>
            <p class="lesson-paragraph">
                This lesson covers polynomial division methods including long division and synthetic division. 
                These techniques are essential for simplifying complex polynomial expressions and solving equations.
            </p>
            
            <h2 class="lesson-subtitle">Learning Objectives</h2>
            <ol class="lesson-list">
                <li>Divide polynomials using the long division method</li>
                <li>Apply synthetic division for linear divisors</li>
                <li>Identify when to use each method appropriately</li>
                <li>Solve polynomial equations using division techniques</li>
            </ol>
            
            <h2 class="lesson-subtitle">Example: Long Division</h2>
            <div class="example-box">
                <p><strong>Problem:</strong> Divide (3x³ - 2x² + 4x - 1) by (x - 2)</p>
                <p><strong>Solution Steps:</strong></p>
                <ol>
                    <li>Set up the division: (3x³ - 2x² + 4x - 1) ÷ (x - 2)</li>
                    <li>Divide first term: 3x³ ÷ x = 3x²</li>
                    <li>Multiply: 3x²(x - 2) = 3x³ - 6x²</li>
                    <li>Subtract: (3x³ - 2x²) - (3x³ - 6x²) = 4x²</li>
                    <li>Bring down next term: 4x² + 4x</li>
                    <li>Continue until remainder has lower degree than divisor</li>
                </ol>
            </div>
            
            <h2 class="lesson-subtitle">Practice Problems</h2>
            <div class="practice-box">
                <p><strong>Try these problems:</strong></p>
                <ol>
                    <li>(x² + 5x + 6) ÷ (x + 2)</li>
                    <li>(2x³ - 3x² + x - 1) ÷ (x - 1)</li>
                    <li>(x⁴ - 16) ÷ (x - 2)</li>
                </ol>
                <button class="btn-primary" id="checkAnswersBtn">
                    <i class="fas fa-check"></i> Check Answers
                </button>
            </div>
            
            <div class="lesson-tips">
                <h3><i class="fas fa-lightbulb"></i> Tips & Tricks</h3>
                <ul>
                    <li>Always arrange polynomials in descending order before dividing</li>
                    <li>Include zero coefficients for missing terms</li>
                    <li>Check your work by multiplying quotient by divisor and adding remainder</li>
                    <li>Synthetic division only works when dividing by (x - c)</li>
                </ul>
            </div>
            
            <div class="lesson-interactive">
                <button class="btn-secondary" id="showMoreExamples">
                    <i class="fas fa-plus-circle"></i> Show More Examples
                </button>
                <button class="btn-secondary" id="practiceProblems">
                    <i class="fas fa-pencil-alt"></i> Practice Problems
                </button>
                <button class="btn-secondary" id="downloadNotes">
                    <i class="fas fa-download"></i> Download Notes
                </button>
            </div>
        </div>
    `;
}

function setupLessonContentInteractions() {
    const showMoreExamplesBtn = document.getElementById('showMoreExamples');
    if (showMoreExamplesBtn) {
        showMoreExamplesBtn.addEventListener('click', function() {
            const extraExamples = `
                <div class="extra-examples">
                    <h3>Additional Examples</h3>
                    
                    <div class="example">
                        <h4>Example 1: Synthetic Division</h4>
                        <p>Divide (2x³ + 3x² - 4x + 5) by (x + 1)</p>
                        <p><strong>Steps:</strong></p>
                        <ol>
                            <li>Set c = -1 (opposite sign of x + 1)</li>
                            <li>Write coefficients: 2, 3, -4, 5</li>
                            <li>Bring down 2</li>
                            <li>Multiply: 2 × -1 = -2, add to next: 3 + (-2) = 1</li>
                            <li>Continue: 1 × -1 = -1, -4 + (-1) = -5</li>
                            <li>-5 × -1 = 5, 5 + 5 = 10 (remainder)</li>
                            <li>Result: 2x² + x - 5 + 10/(x + 1)</li>
                        </ol>
                    </div>
                    
                    <div class="example">
                        <h4>Example 2: Long Division with Quadratic Divisor</h4>
                        <p>Divide (x⁴ - 3x³ + 2x² - x + 1) by (x² + 1)</p>
                        <p><strong>Steps:</strong></p>
                        <ol>
                            <li>Set up: (x⁴ - 3x³ + 2x² - x + 1) ÷ (x² + 1)</li>
                            <li>x⁴ ÷ x² = x²</li>
                            <li>x²(x² + 1) = x⁴ + x²</li>
                            <li>Subtract: (x⁴ - 3x³ + 2x²) - (x⁴ + x²) = -3x³ + x²</li>
                            <li>Bring down -x: -3x³ + x² - x</li>
                            <li>Continue process...</li>
                        </ol>
                    </div>
                </div>
            `;
            
            const lessonContent = document.getElementById('lessonContent');
            const existingExtra = lessonContent.querySelector('.extra-examples');
            
            if (existingExtra) {
                existingExtra.remove();
                this.innerHTML = '<i class="fas fa-plus-circle"></i> Show More Examples';
            } else {
                lessonContent.querySelector('.lesson-content-wrapper').insertAdjacentHTML('beforeend', extraExamples);
                this.innerHTML = '<i class="fas fa-minus-circle"></i> Hide Examples';
            }
        });
    }
    
    const practiceProblemsBtn = document.getElementById('practiceProblems');
    if (practiceProblemsBtn) {
        practiceProblemsBtn.addEventListener('click', function() {
            const problems = [
                { problem: "(x³ - 8) ÷ (x - 2)", answer: "x² + 2x + 4" },
                { problem: "(2x³ + 5x² - 3x + 1) ÷ (x + 1)", answer: "2x² + 3x - 6 + 7/(x + 1)" },
                { problem: "(x⁴ - 1) ÷ (x - 1)", answer: "x³ + x² + x + 1" }
            ];
            
            let problemsHTML = '<div class="practice-modal"><h3>Practice Problems</h3>';
            problems.forEach((prob, index) => {
                problemsHTML += `
                    <div class="problem">
                        <p><strong>Problem ${index + 1}:</strong> ${prob.problem}</p>
                        <div class="solution" style="display: none;">
                            <p><strong>Solution:</strong> ${prob.answer}</p>
                        </div>
                        <button class="btn-small show-solution" data-index="${index}">
                            Show Solution
                        </button>
                    </div>
                `;
            });
            problemsHTML += '</div>';
            
            showModal(problemsHTML);
            
            setTimeout(() => {
                document.querySelectorAll('.show-solution').forEach(button => {
                    button.addEventListener('click', function() {
                        const index = this.getAttribute('data-index');
                        const solution = this.parentElement.querySelector('.solution');
                        if (solution.style.display === 'none') {
                            solution.style.display = 'block';
                            this.textContent = 'Hide Solution';
                        } else {
                            solution.style.display = 'none';
                            this.textContent = 'Show Solution';
                        }
                    });
                });
            }, 100);
        });
    }
    
    const downloadNotesBtn = document.getElementById('downloadNotes');
    if (downloadNotesBtn) {
        downloadNotesBtn.addEventListener('click', function() {
            const lessonTitle = LessonState.currentLesson?.content_title || 'Polynomial Division';
            const content = document.getElementById('lessonContent').innerText;
            
            const blob = new Blob([`${lessonTitle}\n\n${content}`], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${lessonTitle.replace(/\s+/g, '_')}_notes.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            showNotification('Notes downloaded successfully!', 'success');
        });
    }
    
    const checkAnswersBtn = document.getElementById('checkAnswersBtn');
    if (checkAnswersBtn) {
        checkAnswersBtn.addEventListener('click', function() {
            const answers = {
                1: "(x + 3)",
                2: "(2x² - x)",
                3: "(x³ + 2x² + 4x + 8)"
            };
            
            let answersHTML = '<div class="answers-modal"><h3>Answers to Practice Problems</h3>';
            Object.entries(answers).forEach(([problem, answer]) => {
                answersHTML += `
                    <div class="answer">
                        <p><strong>Problem ${problem}:</strong> ${answer}</p>
                    </div>
                `;
            });
            answersHTML += '</div>';
            
            showModal(answersHTML);
        });
    }
}

function showModal(content, options = {}) {
    const { closeable = true } = options;
    
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) existingModal.remove();
    
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    
    let closeButton = '';
    if (closeable) {
        closeButton = '<button class="modal-close"><i class="fas fa-times"></i></button>';
    }
    
    modalOverlay.innerHTML = `
        <div class="modal-content">
            ${closeButton}
            ${content}
        </div>
    `;
    
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;
    
    const modalContent = modalOverlay.querySelector('.modal-content');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 800px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
    `;
    
    if (closeable) {
        const closeBtn = modalOverlay.querySelector('.modal-close');
        closeBtn.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: #666;
        `;
        
        closeBtn.addEventListener('click', () => modalOverlay.remove());
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) modalOverlay.remove();
        });
    }
    
    document.body.appendChild(modalOverlay);
    return modalOverlay;
}

function addLessonContentStyles() {
    if (!document.querySelector('#lesson-content-styles')) {
        const style = document.createElement('style');
        style.id = 'lesson-content-styles';
        style.textContent = `
            .lesson-content-wrapper {
                line-height: 1.6;
            }
            
            .lesson-title {
                color: #2c3e50;
                margin-bottom: 20px;
                font-size: 28px;
            }
            
            .lesson-subtitle {
                color: #3498db;
                margin-top: 25px;
                margin-bottom: 15px;
                font-size: 22px;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 8px;
            }
            
            .lesson-section {
                color: #2c3e50;
                margin-top: 20px;
                font-size: 18px;
            }
            
            .lesson-paragraph {
                margin-bottom: 15px;
                color: #34495e;
            }
            
            .lesson-list {
                margin-left: 20px;
                margin-bottom: 20px;
            }
            
            .lesson-list li {
                margin-bottom: 8px;
            }
            
            .lesson-code {
                background: #f8f9fa;
                padding: 2px 6px;
                border-radius: 4px;
                font-family: monospace;
                color: #e74c3c;
            }
            
            .example-box, .practice-box {
                background: #f8f9fa;
                border-left: 4px solid #3498db;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
            }
            
            .lesson-tips {
                background: #fffde7;
                border-left: 4px solid #f39c12;
                padding: 15px;
                margin: 20px 0;
                border-radius: 0 8px 8px 0;
            }
            
            .lesson-meta {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
                color: #7f8c8d;
                font-size: 14px;
            }
            
            .meta-item i {
                margin-right: 5px;
            }
            
            .lesson-interactive {
                display: flex;
                gap: 10px;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #eee;
            }
            
            .btn-secondary {
                background: #ecf0f1;
                color: #2c3e50;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                transition: all 0.3s;
            }
            
            .btn-secondary:hover {
                background: #d5dbdb;
                transform: translateY(-2px);
            }
            
            .btn-primary {
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            }
            
            .btn-small {
                background: #95a5a6;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
                margin-top: 5px;
            }
            
            .loading-content, .no-content, .error-content {
                text-align: center;
                padding: 50px 20px;
                color: #7f8c8d;
            }
            
            .loading-content i {
                font-size: 40px;
                margin-bottom: 20px;
                color: #3498db;
            }
            
            .extra-examples {
                margin-top: 30px;
                padding: 20px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            
            .problem {
                margin-bottom: 20px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 5px;
            }
            
            .practice-cta {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 10px;
                margin-top: 30px;
                text-align: center;
            }
            
            .practice-cta.locked {
                background: linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%);
            }
            
            .practice-cta h3 {
                margin-top: 0;
                color: white;
            }
            
            .practice-cta .btn-success {
                background: #27ae60;
                color: white;
                border: none;
                padding: 12px 25px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                margin-top: 15px;
                transition: all 0.3s;
            }
            
            .practice-cta .btn-success:hover {
                background: #219653;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            }
            
            .practice-cta .btn-success:disabled,
            .practice-cta .btn-secondary:disabled {
                background: #95a5a6;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .practice-cta .btn-secondary {
                background: #7f8c8d;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================
// VIDEO MANAGEMENT FUNCTIONS
// ============================================

async function getVideoFromDatabase(contentId = 1) {
    try {
        console.log('🎬 Fetching video from database for content ID:', contentId);
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return null;
        }
        
        const response = await fetch(`${API_BASE_URL}/videos/content/${contentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status}`);
        };
        
        const data = await response.json();
        
        if (data.success && data.video) {
            console.log('✅ Video loaded from database:', {
                title: data.video.title,
                url: data.video.url,
                source: data.video.source || 'database',
                path: data.video.video_path
            });
            
            try {
                const testResponse = await fetch(data.video.url, { method: 'HEAD' });
                console.log('📡 Video URL test:', {
                    url: data.video.url,
                    status: testResponse.status,
                    accessible: testResponse.ok
                });
            } catch (testError) {
                console.warn('⚠️ Video URL test failed:', testError.message);
            }
            
            AppState.currentVideoData = data.video;
            return data.video;
        } else {
            throw new Error(data.message || 'No video data returned');
        }
    } catch (error) {
        console.error('Error fetching video from database:', error);
        return null;
    }
}

async function testVideoAccessibility(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return {
            accessible: response.ok,
            status: response.status,
            statusText: response.statusText
        };
    } catch (error) {
        return {
            accessible: false,
            error: error.message
        };
    }
}

async function loadVideoFromDatabase(contentId = 1) {
    const videoElement = document.getElementById('lessonVideo');
    const videoInfo = document.getElementById('videoInfo');
    const refreshVideoBtn = document.getElementById('refreshVideoBtn');
    
    if (!videoElement) {
        console.error('Video element not found!');
        return null;
    }
    
    try {
        if (videoInfo) {
            videoInfo.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading video from database...</p>';
        }
        
        if (refreshVideoBtn) {
            refreshVideoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            refreshVideoBtn.disabled = true;
        }
        
        let videoData = await getVideoFromDatabase(contentId);
        
        if (!videoData) {
            console.warn('No video from database, testing server...');
            
            const healthResponse = await fetch(`${API_BASE_URL}/health`);
            console.log('🌐 Server health:', healthResponse.ok);
            
            const directTest = await fetch(`${API_BASE_URL}/videos/direct-test`);
            if (directTest.ok) {
                const testData = await directTest.json();
                console.log('🎬 Direct video test:', testData);
                
                if (testData.success) {
                    videoData = {
                        url: testData.url,
                        title: 'Polynomial Equations (Direct Test)',
                        duration: 720,
                        source: 'direct_test',
                        content_id: contentId
                    };
                }
            }
        }
        
        if (!videoData) {
            console.warn('Trying to list available videos...');
            const videosList = await fetch(`${API_BASE_URL}/videos/list`);
            if (videosList.ok) {
                const listData = await videosList.json();
                console.log('📋 Available videos:', listData);
                
                if (listData.success && listData.videos.length > 0) {
                    videoData = {
                        url: listData.videos[0].url,
                        title: listData.videos[0].filename,
                        duration: 720,
                        source: 'video_list',
                        content_id: contentId
                    };
                }
            }
        }
        
        if (!videoData) {
            console.warn('Using hardcoded fallback video');
            videoData = {
                url: 'http://localhost:5000/videos/quarter1-polynomial-equations.mp4',
                title: 'Default Polynomial Lesson',
                duration: 720,
                source: 'hardcoded_fallback',
                content_id: contentId
            };
        }
        
        let videoUrl = videoData.url;
        
        console.log('🔍 Testing video URL:', videoUrl);
        const accessibility = await testVideoAccessibility(videoUrl);
        console.log('🔍 Video accessibility:', accessibility);
        
        if (!accessibility.accessible) {
            console.warn('⚠️ Video URL not accessible, trying alternatives...');
            
            const altUrl = `http://localhost:5000/videos/quarter1-polynomial-equations.mp4`;
            const altAccessibility = await testVideoAccessibility(altUrl);
            
            if (altAccessibility.accessible) {
                console.log('✅ Alternative URL works:', altUrl);
                videoUrl = altUrl;
            } else {
                console.error('❌ All video URLs failed');
            }
        }
        
        console.log('🎥 Setting video source:', videoUrl);
        
        videoElement.innerHTML = '';
        
        const sourceElement = document.createElement('source');
        sourceElement.src = videoUrl;
        sourceElement.type = 'video/mp4';
        videoElement.appendChild(sourceElement);
        
        const fallbackText = document.createTextNode('Your browser does not support the video tag.');
        videoElement.appendChild(fallbackText);
        
        if (videoInfo) {
            const durationMinutes = Math.floor(videoData.duration / 60);
            const durationSeconds = videoData.duration % 60;
            videoInfo.innerHTML = `
                <p><i class="fas fa-info-circle"></i> <strong>${videoData.title}</strong></p>
                <p><i class="fas fa-clock"></i> Duration: ${durationMinutes}:${durationSeconds.toString().padStart(2, '0')}</p>
                <p><i class="fas fa-database"></i> Source: ${videoData.source || 'database'}</p>
                <p><i class="fas fa-link"></i> URL: ${videoUrl}</p>
                <p style="color: ${accessibility.accessible ? '#27ae60' : '#e74c3c'}">
                    <i class="fas ${accessibility.accessible ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
                    ${accessibility.accessible ? 'Video accessible' : 'Video not accessible'}
                </p>
            `;
        }
        
        const videoHeader = document.querySelector('.media-header span');
        if (videoHeader) {
            videoHeader.innerHTML = `<i class="fas fa-video"></i> ${videoData.title}`;
        }
        
        console.log('✅ Video loaded:', {
            url: videoUrl,
            title: videoData.title,
            source: videoData.source
        });
        
        videoElement.onerror = function(e) {
            console.error('❌ Video failed to load:', {
                url: videoUrl,
                error: videoElement.error,
                errorCode: videoElement.error ? videoElement.error.code : 'unknown'
            });
            
            if (videoInfo) {
                videoInfo.innerHTML += '<p style="color: #e74c3c;"><i class="fas fa-exclamation-triangle"></i> Video failed to load. Trying alternative source...</p>';
            }
            
            const directUrl = `http://localhost:5000/videos/quarter1-polynomial-equations.mp4`;
            setTimeout(() => {
                console.log('🔄 Trying direct server path:', directUrl);
                sourceElement.src = directUrl;
                videoElement.load();
            }, 1000);
        };
        
        videoElement.onloadeddata = function() {
            console.log('✅ Video loaded successfully');
            if (videoInfo) {
                videoInfo.innerHTML += '<p style="color: #27ae60;"><i class="fas fa-check-circle"></i> Video ready to play</p>';
            }
        };
        
        videoElement.onprogress = function() {
            console.log('📥 Video loading progress:', videoElement.buffered.length > 0 ? `${Math.round(videoElement.buffered.end(0) / videoElement.duration * 100)}%` : '0%');
        };
        
        videoElement.load();
        
        AppState.currentVideoData = videoData;
        
        return videoData;
    } catch (error) {
        console.error('Error loading video:', error);
        
        const videoElement = document.getElementById('lessonVideo');
        if (videoElement) {
            const directUrl = `http://localhost:5000/videos/quarter1-polynomial-equations.mp4`;
            console.log('🔄 Using ultimate fallback:', directUrl);
            
            videoElement.innerHTML = '';
            const sourceElement = document.createElement('source');
            sourceElement.src = directUrl;
            sourceElement.type = 'video/mp4';
            videoElement.appendChild(sourceElement);
            videoElement.load();
            
            AppState.currentVideoData = {
                url: directUrl,
                title: 'Polynomial Equations',
                duration: 720,
                source: 'direct_fallback',
                content_id: contentId
            };
            
            return AppState.currentVideoData;
        }
        
        return null;
    } finally {
        if (refreshVideoBtn) {
            refreshVideoBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
            refreshVideoBtn.disabled = false;
        }
    }
}

async function getDefaultVideo() {
    try {
        const response = await fetch(`${API_BASE_URL}/videos/default`);
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Using default video from API');
            AppState.currentVideoData = data.video;
            return data.video;
        } else {
            throw new Error('Failed to get default video');
        }
    } catch (error) {
        console.error('Error getting default video:', error);
        return null;
    }
}

function setupVideoProgressTracking() {
    const videoElement = document.getElementById('lessonVideo');
    const videoTimeDisplay = document.getElementById('videoTime');
    
    if (!videoElement || !videoTimeDisplay) return;
    
    console.log("🎬 Setting up video progress tracking...");
    
    let isVideoPlaying = false;
    let videoStartTime = 0;
    let totalWatchedSeconds = 0;
    let lastSaveTime = 0;
    const SAVE_INTERVAL = 15000;
    
    const videoData = AppState.currentVideoData;
    const videoKey = videoData ? `video_${videoData.content_id}` : 'video_default';
    
    const savedWatchTime = localStorage.getItem(`video_watch_time_${videoKey}`);
    if (savedWatchTime) {
        totalWatchedSeconds = parseInt(savedWatchTime);
        console.log(`⏱️ Loaded previous watch time: ${totalWatchedSeconds} seconds`);
    }
    
    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    function updateWatchTimeDisplay() {
        if (!videoTimeDisplay) return;
        
        const savedTime = localStorage.getItem(`video_watch_time_${videoKey}`);
        const watchedSeconds = savedTime ? parseInt(savedTime) : 0;
        
        const currentTime = formatTime(videoElement.currentTime || 0);
        const duration = formatTime(videoElement.duration || 0);
        
        videoTimeDisplay.textContent = `${currentTime} / ${duration}`;
        videoTimeDisplay.title = `Total time watched: ${Math.floor(watchedSeconds/60)}m ${watchedSeconds%60}s`;
    }
    
    async function updateVideoProgress(watchedSeconds, isCompleted = false) {
        try {
            let percentage = 0;
            if (videoElement.duration > 0) {
                percentage = Math.min(100, Math.floor((watchedSeconds / videoElement.duration) * 100));
            }
            
            const progressData = {
                time_spent_seconds: watchedSeconds,
                completion_status: isCompleted ? 'completed' : 'in_progress',
                current_time: videoElement.currentTime || 0,
                total_duration: videoElement.duration || 0
            };
            
            const contentId = videoData?.content_id || LessonState.currentLesson?.content_id || 1;
            
            const token = localStorage.getItem('authToken') || authToken;
            if (token && contentId) {
                await updateLessonProgress(contentId, {
                    completion_status: isCompleted ? 'completed' : 'in_progress',
                    percentage: percentage,
                    time_spent_seconds: watchedSeconds
                });
                
                console.log(`✅ Video progress saved: ${watchedSeconds}s (${percentage}%)`);
                
                if (isCompleted && LessonState.currentLesson) {
                    await logUserActivity('lesson_completed', contentId, {
                        lesson_title: LessonState.currentLesson.content_title,
                        time_spent: watchedSeconds,
                        percentage: percentage
                    }, 50);
                }
            }
        } catch (error) {
            console.error('Error updating video progress:', error);
        }
    }
    
    videoElement.addEventListener('play', function() {
        console.log("▶️ Video STARTED playing");
        isVideoPlaying = true;
        videoStartTime = Date.now();
        
        if (videoTimeDisplay) {
            videoTimeDisplay.classList.add('watching');
        }
    });
    
    videoElement.addEventListener('pause', function() {
        console.log("⏸️ Video PAUSED");
        
        if (isVideoPlaying) {
            const watchDuration = Math.floor((Date.now() - videoStartTime) / 1000);
            totalWatchedSeconds += watchDuration;
            isVideoPlaying = false;
            
            console.log(`⏱️ Watched for ${watchDuration} seconds (Total: ${totalWatchedSeconds}s)`);
            
            updateVideoProgress(totalWatchedSeconds);
            
            if (videoTimeDisplay) {
                videoTimeDisplay.classList.remove('watching');
            }
            
            updateWatchTimeDisplay(totalWatchedSeconds);
        }
    });
    
    videoElement.addEventListener('timeupdate', function() {
        const currentTime = formatTime(videoElement.currentTime);
        const duration = formatTime(videoElement.duration || 0);
        if (videoTimeDisplay) {
            videoTimeDisplay.textContent = `${currentTime} / ${duration}`;
        }
        
        if (isVideoPlaying) {
            const currentTimeMs = Date.now();
            if (currentTimeMs - lastSaveTime > SAVE_INTERVAL) {
                lastSaveTime = currentTimeMs;
                
                const watchDuration = Math.floor((currentTimeMs - videoStartTime) / 1000);
                const currentWatchedSeconds = totalWatchedSeconds + watchDuration;
                
                updateVideoProgress(currentWatchedSeconds);
                
                console.log(`💾 Auto-saved progress: ${currentWatchedSeconds} seconds watched`);
            }
        }
    });
    
    videoElement.addEventListener('ended', function() {
        console.log("✅ Video COMPLETED!");
        
        if (isVideoPlaying) {
            const watchDuration = Math.floor((Date.now() - videoStartTime) / 1000);
            totalWatchedSeconds += watchDuration;
            isVideoPlaying = false;
            
            console.log(`🎉 Finished watching! Total: ${totalWatchedSeconds} seconds`);
            
            updateVideoProgress(totalWatchedSeconds, true);
            
            localStorage.removeItem(`video_watch_time_${videoKey}`);
            
            showNotification(`Video completed! You watched for ${Math.floor(totalWatchedSeconds/60)} minutes.`, 'success');
            
            const topicId = LessonState.currentTopic;
            if (topicId) {
                setTimeout(() => {
                    checkPracticeUnlocked(topicId).then(unlocked => {
                        if (unlocked) {
                            showNotification('Practice exercises are now unlocked!', 'success');
                            addPracticeButtonToLesson();
                        }
                    });
                }, 1000);
            }
        }
    });
    
    window.addEventListener('beforeunload', function() {
        if (isVideoPlaying) {
            const watchDuration = Math.floor((Date.now() - videoStartTime) / 1000);
            totalWatchedSeconds += watchDuration;
            
            localStorage.setItem(`video_watch_time_${videoKey}`, totalWatchedSeconds.toString());
            
            console.log(`💾 Saved before unload: ${totalWatchedSeconds} seconds`);
        }
    });
    
    updateWatchTimeDisplay(totalWatchedSeconds);
}

// ============================================
// MODULE DASHBOARD JS
// ============================================

function initModuleDashboardJS() {
    console.log('📚 Initializing module dashboard with database-driven content...');
    
    const videoElement = document.getElementById('lessonVideo');
    const videoTimeDisplay = document.getElementById('videoTime');
    
    initializeModuleDashboard();
    
    const backToLessonDashboardBtn = document.getElementById('backToLessonDashboard');
    if (backToLessonDashboardBtn) {
        backToLessonDashboardBtn.addEventListener('click', function() {
            console.log('Back to dashboard button clicked');
            navigateTo('dashboard');
        });
    }
    
    const showHintBtn = document.getElementById('showHintBtn');
    const showSolutionBtn = document.getElementById('showSolutionBtn');
    const checkAnswerBtn = document.getElementById('checkAnswerBtn');
    const practiceMoreBtn = document.getElementById('practiceMoreBtn');
    const completeLessonBtn = document.getElementById('completeLessonBtn');
    
    if (showHintBtn) {
        showHintBtn.addEventListener('click', function() {
            alert('Hint: Try grouping the first two terms together and the last two terms together.');
        });
    }
    
    if (showSolutionBtn) {
        showSolutionBtn.addEventListener('click', function() {
            alert('Solution: \n(4x³ - 8x²) + (5x - 10) = 4x²(x - 2) + 5(x - 2) = (x - 2)(4x² + 5)');
        });
    }
    
    if (checkAnswerBtn) {
        checkAnswerBtn.addEventListener('click', function() {
            const answer = prompt('Enter your factored expression:');
            if (answer && answer.replace(/\s/g, '') === '(x-2)(4x²+5)') {
                alert('Correct! Well done.');
            } else {
                alert('The correct answer is: (x - 2)(4x² + 5)');
            }
        });
    }
    
    if (practiceMoreBtn) {
        practiceMoreBtn.addEventListener('click', function() {
            const problems = [
                "6x³ + 9x² + 4x + 6",
                "3x³ - 12x² + 2x - 8",
                "5x³ + 10x² + 3x + 6",
                "2x³ - 4x² + 7x - 14"
            ];
           
            const randomProblem = problems[Math.floor(Math.random() * problems.length)];
            alert(`New practice problem: ${randomProblem}`);
        });
    }
    
    if (completeLessonBtn) {
        let isProcessing = false;
        
        completeLessonBtn.addEventListener('click', async function() {
            const contentId = LessonState.currentLesson?.content_id;
            if (!contentId) return;
            
            if (isProcessing) {
                console.log('⚠️ Already processing, please wait...');
                return;
            }
            
            isProcessing = true;
            const originalText = completeLessonBtn.innerHTML;
            const originalDisabled = completeLessonBtn.disabled;
            
            completeLessonBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            completeLessonBtn.disabled = true;
            
            try {
                const currentProgress = LessonState.userProgress[contentId] || {};
                if (currentProgress.status === 'completed') {
                    showNotification('Lesson already completed!', 'info');
                    completeLessonBtn.innerHTML = '<i class="fas fa-check"></i> Already Completed';
                    completeLessonBtn.style.background = '#2ecc71';
                    return;
                }
                
                const success = await updateLessonProgress(contentId, {
                    completion_status: 'completed',
                    percentage: 100,
                    time_spent_seconds: 300
                });
                
                if (success) {
                    completeLessonBtn.innerHTML = '<i class="fas fa-check"></i> Lesson Completed';
                    completeLessonBtn.style.background = '#2ecc71';
                    
                    showNotification('🎉 Lesson marked as complete!', 'success');
                    
                    localStorage.removeItem(`video_watch_time_video_${contentId}`);
                    
                    setTimeout(() => {
                        updateProgressSummaryCards();
                        if (AppState.currentPage === 'dashboard') {
                            updateContinueLearningModule();
                        }
                    }, 1000);
                } else {
                    showNotification('Failed to save completion', 'error');
                    completeLessonBtn.innerHTML = originalText;
                    completeLessonBtn.disabled = originalDisabled;
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error: ' + error.message, 'error');
                completeLessonBtn.innerHTML = originalText;
                completeLessonBtn.disabled = originalDisabled;
            } finally {
                setTimeout(() => {
                    isProcessing = false;
                }, 1000);
            }
        });
    }
    
    const prevLessonBtn = document.getElementById('prevLessonBtn');
    const nextLessonBtn = document.getElementById('nextLessonBtn');
    
    if (prevLessonBtn) {
        prevLessonBtn.addEventListener('click', navigateToPreviousLesson);
    }
    
    if (nextLessonBtn) {
        nextLessonBtn.addEventListener('click', navigateToNextLesson);
    }
    
    console.log('✅ Module dashboard initialized with database-driven content');
}

async function initializeModuleDashboard() {
    const currentLesson = LessonState.currentLesson;
    
    if (!currentLesson) {
        console.error('No current lesson found');
        showNotification('No lesson data available', 'error');
        navigateTo('dashboard');
        return;
    }
    
    console.log('📖 Initializing module dashboard for lesson:', currentLesson.content_title);
    
    const moduleTitle = document.getElementById('moduleTitle');
    const moduleLessonTitle = document.getElementById('moduleLessonTitle');
    const moduleSubtitle = document.getElementById('moduleSubtitle');
    
    if (moduleTitle) {
        moduleTitle.textContent = currentLesson.content_title || 'PolyLearn Lesson';
    }
    
    if (moduleLessonTitle) {
        const title = currentLesson.content_title || 'Lesson';
        moduleLessonTitle.innerHTML = `<i class="fas fa-book"></i> ${title}`;
    }
    
    if (moduleSubtitle) {
        const subtitle = `${currentLesson.lesson_name} - ${currentLesson.module_name}`;
        moduleSubtitle.textContent = subtitle;
    }
    
    const lessonProgress = currentLesson.progress || {};
    const percentage = lessonProgress.percentage || 0;
    const status = lessonProgress.status || 'not_started';
    
    const lessonProgressFill = document.getElementById('lessonProgressFill');
    if (lessonProgressFill) {
        lessonProgressFill.style.width = `${percentage}%`;
    }
    
    const progressPercentage = document.getElementById('progressPercentage');
    if (progressPercentage) {
        progressPercentage.textContent = `${percentage}%`;
    }
    
    const completeLessonBtn = document.getElementById('completeLessonBtn');
    if (completeLessonBtn) {
        if (status === 'completed') {
            completeLessonBtn.disabled = true;
            completeLessonBtn.innerHTML = '<i class="fas fa-check"></i> Lesson Completed';
            completeLessonBtn.style.background = '#2ecc71';
        } else {
            completeLessonBtn.disabled = false;
            completeLessonBtn.innerHTML = '<i class="fas fa-check-circle"></i> Mark Lesson Complete';
            completeLessonBtn.style.background = '';
        }
    }
    
    updateNavigationButtons(currentLesson.adjacent);
    
    addLessonContentStyles();
    await displayLessonContent();
    
    await initializeVideo(currentLesson.content_id);
}

async function initializeVideo(contentId) {
    console.log('🎬 Initializing video from database for content ID:', contentId);
    
    const videoElement = document.getElementById('lessonVideo');
    if (videoElement) {
        videoElement.innerHTML = '<p>Loading video from database...</p>';
    }
    
    await loadVideoFromDatabase(contentId);
    
    setupVideoProgressTracking();
    
    console.log('✅ Video initialized from database');
}

function updateNavigationButtons(adjacent) {
    const prevLessonBtn = document.getElementById('prevLessonBtn');
    const nextLessonBtn = document.getElementById('nextLessonBtn');
    
    if (prevLessonBtn) {
        if (adjacent?.previous) {
            prevLessonBtn.disabled = false;
            prevLessonBtn.setAttribute('data-lesson-id', adjacent.previous.id);
            prevLessonBtn.innerHTML = `<i class="fas fa-arrow-left"></i> Previous: ${adjacent.previous.title}`;
        } else {
            prevLessonBtn.disabled = true;
            prevLessonBtn.innerHTML = `<i class="fas fa-arrow-left"></i> No Previous Lesson`;
        }
    }
    
    if (nextLessonBtn) {
        if (adjacent?.next) {
            nextLessonBtn.disabled = false;
            nextLessonBtn.setAttribute('data-lesson-id', adjacent.next.id);
            nextLessonBtn.innerHTML = `Next: ${adjacent.next.title} <i class="fas fa-arrow-right"></i>`;
        } else {
            nextLessonBtn.disabled = true;
            nextLessonBtn.innerHTML = `No Next Lesson <i class="fas fa-arrow-right"></i>`;
        }
    }
}

async function navigateToPreviousLesson() {
    const currentLesson = LessonState.currentLesson;
    if (!currentLesson?.adjacent?.previous) return;
    
    const prevLessonId = currentLesson.adjacent.previous.id;
    await openLesson(prevLessonId);
}

async function navigateToNextLesson() {
    const currentLesson = LessonState.currentLesson;
    if (!currentLesson?.adjacent?.next) return;
    
    const nextLessonId = currentLesson.adjacent.next.id;
    await openLesson(nextLessonId);
}

// ============================================
// PRACTICE EXERCISES MANAGEMENT
// ============================================

async function checkPracticeUnlocked(topicId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) return false;
        
        console.log(`🔍 Checking practice unlock status for topic ${topicId}...`);
        
        try {
            const response = await fetch(`${API_BASE_URL}/practice/${topicId}/check-progress`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log(`✅ Practice unlock check: ${data.unlocked ? 'UNLOCKED' : 'LOCKED'}`);
                
                // Store the progress info if needed
                if (data.progress) {
                    PracticeState.topicProgress = data.progress;
                }
                
                return data.unlocked || false;
            }
            
            // If endpoint not found, return false
            if (response.status === 404) {
                console.log('⚠️ Practice check endpoint not found, assuming locked');
                return false;
            }
            
            console.warn(`⚠️ Practice check returned status: ${response.status}`);
            return false;
            
        } catch (error) {
            console.warn(`⚠️ Practice check failed:`, error.message);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error in checkPracticeUnlocked:', error);
        return false;
    }
}

async function createDefaultPracticeProgress(topicId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) return false;
        
        console.log('🔄 Creating default practice progress for new user...');
        
        const response = await fetch(`${API_BASE_URL}/practice/init-progress`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                topic_id: topicId
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Default practice progress created:', data);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Error creating practice progress:', error);
        return false;
    }
}


async function loadPracticeExercises(lessonId, topicId) {
    try {
        console.log(`📝 Getting practice exercises for lesson ${lessonId}, topic ${topicId}`);
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            showNotification('Please login to access practice exercises', 'error');
            return null;
        }
        
        // Try to fetch from database with lesson filter
        const response = await fetch(`${API_BASE_URL}/practice/${topicId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Filter exercises by lesson ID sa frontend kung hindi pa filtered sa backend
            if (data.exercises && data.exercises.length > 0) {
                const filteredExercises = data.exercises.filter(ex => 
                    ex.lesson_id === parseInt(lessonId) || 
                    ex.lesson_id === undefined // Kung walang lesson_id sa DB, accept all
                );
                
                data.exercises = filteredExercises;
                console.log(`✅ Filtered to ${filteredExercises.length} exercises for lesson ${lessonId}`);
            }
            
            return data;
        }
        
        // If database fails, use mock data based on lesson
        console.log('📝 Using mock exercises for lesson', lessonId);
        
        const mockExercises = getMockExercisesByLesson(lessonId, topicId);
        
        return {
            unlocked: true,
            exercises: mockExercises,
            progress: {
                completed: mockExercises.length,
                total: mockExercises.length,
                percentage: 100
            }
        };
        
    } catch (error) {
        console.error('❌ Error loading practice exercises:', error);
        return null;
    }
}

// Mock exercises para sa tatlong lessons
function getMockExercisesByLesson(lessonId) {
    // Convert to number for comparison
    const id = parseInt(lessonId);
    
    // LESSON 1: Factorials Introduction
    if (id === 1 || id === 3) {
        return [
            {
                exercise_id: 101,
                lesson_id: id,
                title: "Factorial Basics",
                description: "Practice basic factorial calculations from Lesson 1",
                difficulty: "easy",
                points: 10,
                content_json: {
                    questions: [
                        {
                            text: "What is 5! (5 factorial)?",
                            type: "multiple_choice",
                            options: [
                                { text: "120", correct: true },
                                { text: "60", correct: false },
                                { text: "24", correct: false },
                                { text: "720", correct: false }
                            ]
                        },
                        {
                            text: "What is 0! ?",
                            type: "multiple_choice",
                            options: [
                                { text: "0", correct: false },
                                { text: "1", correct: true },
                                { text: "Undefined", correct: false },
                                { text: "10", correct: false }
                            ]
                        },
                        {
                            text: "Calculate 4!",
                            type: "fill_blank",
                            answer: "24"
                        }
                    ]
                }
            },
            {
                exercise_id: 102,
                lesson_id: id,
                title: "Factorial Operations",
                description: "Practice simplifying factorial expressions from Lesson 1",
                difficulty: "medium",
                points: 15,
                content_json: {
                    questions: [
                        {
                            text: "Simplify 10! / 8!",
                            type: "multiple_choice",
                            options: [
                                { text: "90", correct: true },
                                { text: "45", correct: false },
                                { text: "100", correct: false },
                                { text: "80", correct: false }
                            ]
                        },
                        {
                            text: "If 8! = 40320, what is 9!?",
                            type: "fill_blank",
                            answer: "362880"
                        },
                        {
                            text: "Simplify (n+1)! / n!",
                            type: "multiple_choice",
                            options: [
                                { text: "n+1", correct: true },
                                { text: "n", correct: false },
                                { text: "n!", correct: false },
                                { text: "1", correct: false }
                            ]
                        }
                    ]
                }
            }
        ];
    }
    
    // LESSON 2: Polynomial Division
    else if (id === 2) {
        return [
            {
                exercise_id: 201,
                lesson_id: id,
                title: "Polynomial Long Division",
                description: "Practice polynomial long division from Lesson 2",
                difficulty: "medium",
                points: 15,
                content_json: {
                    questions: [
                        {
                            text: "Divide (x² + 5x + 6) by (x + 2)",
                            type: "multiple_choice",
                            options: [
                                { text: "x + 3", correct: true },
                                { text: "x + 2", correct: false },
                                { text: "x + 4", correct: false },
                                { text: "x - 3", correct: false }
                            ]
                        },
                        {
                            text: "What is the remainder when dividing (x³ - 8) by (x - 2)?",
                            type: "multiple_choice",
                            options: [
                                { text: "0", correct: true },
                                { text: "8", correct: false },
                                { text: "x - 2", correct: false },
                                { text: "12", correct: false }
                            ]
                        },
                        {
                            text: "Divide (2x³ - 3x² + x - 1) by (x - 1)",
                            type: "fill_blank",
                            answer: "2x² - x"
                        }
                    ]
                }
            },
            {
                exercise_id: 202,
                lesson_id: id,
                title: "Synthetic Division",
                description: "Practice synthetic division method from Lesson 2",
                difficulty: "medium",
                points: 15,
                content_json: {
                    questions: [
                        {
                            text: "Use synthetic division to divide (x³ + 2x² - 5x - 6) by (x - 2)",
                            type: "multiple_choice",
                            options: [
                                { text: "x² + 4x + 3", correct: true },
                                { text: "x² + 2x - 1", correct: false },
                                { text: "x² + 3x - 2", correct: false },
                                { text: "x² + 5x + 4", correct: false }
                            ]
                        }
                    ]
                }
            }
        ];
    }
    
    // LESSON 3: Advanced Factorials (kung meron)
    else if (id === 3) {
        return [
            {
                exercise_id: 301,
                lesson_id: id,
                title: "Advanced Factorial Problems",
                description: "Practice advanced factorial concepts from Lesson 3",
                difficulty: "hard",
                points: 20,
                content_json: {
                    questions: [
                        {
                            text: "Solve for n if n! / (n-2)! = 30",
                            type: "multiple_choice",
                            options: [
                                { text: "n = 6", correct: true },
                                { text: "n = 5", correct: false },
                                { text: "n = 7", correct: false },
                                { text: "n = 4", correct: false }
                            ]
                        },
                        {
                            text: "How many ways can you arrange 5 different books?",
                            type: "fill_blank",
                            answer: "120"
                        }
                    ]
                }
            }
        ];
    }
    
    // Default exercises for any other lesson
    return [
        {
            exercise_id: 999,
            lesson_id: id,
            title: "General Practice",
            description: "Practice exercises for this lesson",
            difficulty: "easy",
            points: 10,
            content_json: {
                questions: [
                    {
                        text: "Practice question for this lesson",
                        type: "multiple_choice",
                        options: [
                            { text: "Option A", correct: true },
                            { text: "Option B", correct: false },
                            { text: "Option C", correct: false },
                            { text: "Option D", correct: false }
                        ]
                    }
                ]
            }
        }
    ];
}

// Sa practice page initialization
async function initPracticePage() {
    console.log('💪 Initializing practice page...');
    
    // Kunin ang current lesson mula sa LessonState
    const currentLesson = LessonState.currentLesson;
    
    if (currentLesson) {
        PracticeState.currentLesson = currentLesson;
        PracticeState.currentTopic = currentLesson.topic_id || 3;
        
        console.log(`📚 Practice page for lesson: ${currentLesson.content_title}`);
    } else {
        // Default kung walang current lesson
        PracticeState.currentTopic = '1';
    }
    
    const practiceDate = document.getElementById('practiceDate');
    if (practiceDate) {
        const now = new Date();
        practiceDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    await loadTopicsProgress();
    
    // I-load ang exercises para sa current lesson
    await loadPracticeExercisesForTopic(PracticeState.currentTopic);
    
    await loadPracticeStatistics();
    
    addPracticeStyles();
    
    console.log('✅ Practice page initialized');
}

async function loadTopicsProgress() {
    try {
        const topicsContainer = document.getElementById('topicsContainer');
        if (!topicsContainer) return;
        
        topicsContainer.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading topics progress...</p>
            </div>
        `;
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            topicsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Please login to view topics</h3>
                </div>
            `;
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/topics/progress`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.success) {
                displayTopics(data.topics);
                
                const unlockedCount = data.topics.filter(topic => topic.practice_unlocked).length;
                const unlockedCountElement = document.getElementById('unlockedCount');
                if (unlockedCountElement) {
                    unlockedCountElement.textContent = unlockedCount;
                }
            }
        } else {
            topicsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load topics</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading topics progress:', error);
        const topicsContainer = document.getElementById('topicsContainer');
        if (topicsContainer) {
            topicsContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load topics</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
}

function displayTopics(topics) {
    const topicsContainer = document.getElementById('topicsContainer');
    if (!topicsContainer || !topics) {
        topicsContainer.innerHTML = '<p class="no-topics">No topics available</p>';
        return;
    }
    
    let html = '';
    
    topics.forEach(topic => {
        const progressPercentage = topic.lesson_progress_percentage || 0;
        const isPracticeUnlocked = topic.practice_unlocked || false;
        const isPracticeCompleted = topic.practice_completed || false;
        
        html += `
            <div class="topic-card ${isPracticeUnlocked ? 'unlocked' : 'locked'} ${isPracticeCompleted ? 'completed' : ''} ${PracticeState.currentTopic == topic.topic_id ? 'selected' : ''}" 
                 data-topic-id="${topic.topic_id}"
                 data-practice-unlocked="${isPracticeUnlocked}">
                <div class="topic-header">
                    <h3 class="topic-title">${topic.topic_title}</h3>
                    <div class="topic-status">
                        ${isPracticeCompleted ? 
                            '<span class="status-completed"><i class="fas fa-check-circle"></i> Completed</span>' :
                            isPracticeUnlocked ?
                            '<span class="status-unlocked"><i class="fas fa-unlock"></i> Unlocked</span>' :
                            '<span class="status-locked"><i class="fas fa-lock"></i> Locked</span>'
                        }
                    </div>
                </div>
                
                <div class="topic-body">
                    <p>${topic.module_name || 'Module'} - ${topic.topic_title}</p>
                    
                    <div class="topic-progress">
                        <div class="progress-info">
                            <span>Lessons: ${topic.lessons_completed || 0}/${topic.total_lessons || 0}</span>
                            <span>${progressPercentage}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                        </div>
                    </div>
                    
                    <div class="topic-practice-info">
                        ${isPracticeCompleted ? 
                            '<span class="practice-completed"><i class="fas fa-trophy"></i> Practice Completed</span>' :
                            isPracticeUnlocked ?
                            '<span class="practice-available"><i class="fas fa-pencil-alt"></i> Practice Available</span>' :
                            `<span class="practice-locked">Complete ${(topic.total_lessons || 0) - (topic.lessons_completed || 0)} more lessons</span>`
                        }
                    </div>
                </div>
                
                <div class="topic-actions">
                    ${isPracticeUnlocked ? 
                        `<button class="btn-primary practice-topic-btn" data-topic-id="${topic.topic_id}">
                            <i class="fas fa-play"></i> Start Practice
                        </button>` :
                        `<button class="btn-secondary" disabled>
                            <i class="fas fa-lock"></i> Complete Lessons First
                        </button>`
                    }
                </div>
            </div>
        `;
    });
    
    topicsContainer.innerHTML = html || '<p class="no-topics">No topics available</p>';
    
    document.querySelectorAll('.topic-card.unlocked').forEach(card => {
        card.addEventListener('click', function() {
            const topicId = this.getAttribute('data-topic-id');
            selectTopicForPractice(topicId);
        });
    });
    
    document.querySelectorAll('.practice-topic-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            const topicId = this.getAttribute('data-topic-id');
            selectTopicForPractice(topicId);
        });
    });
}

async function selectTopicForPractice(topicId) {
    try {
        PracticeState.currentTopic = topicId;
        
        document.querySelectorAll('.topic-card').forEach(card => {
            card.classList.remove('selected');
            if (card.getAttribute('data-topic-id') === topicId) {
                card.classList.add('selected');
            }
        });
        
        await loadPracticeExercisesForTopic(topicId);
        
        const practiceTopicTitle = document.getElementById('practiceTopicTitle');
        if (practiceTopicTitle) {
            const selectedTopic = document.querySelector(`.topic-card[data-topic-id="${topicId}"] .topic-title`);
            if (selectedTopic) {
                practiceTopicTitle.textContent = `Practicing: ${selectedTopic.textContent}`;
            }
        }
        
    } catch (error) {
        console.error('Error selecting topic:', error);
        showNotification('Failed to select topic', 'error');
    }
}

async function loadPracticeExercisesForTopic(topicId) {
    try {
        console.log(`📝 Getting practice exercises for topic ${topicId}`);
        
        const exerciseArea = document.getElementById('exerciseArea');
        if (!exerciseArea) {
            console.error('Exercise area not found');
            return;
        }
        
        exerciseArea.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading practice exercises...</p>
            </div>
        `;
        
        // Kunin ang current lesson ID
        const currentLesson = PracticeState.currentLesson;
        const lessonId = currentLesson ? currentLesson.id : topicId;
        
        console.log(`📚 Loading exercises for lesson ID: ${lessonId}, topic: ${topicId}`);
        
        const practiceData = await loadPracticeExercises(lessonId, topicId);
        
        if (!practiceData) {
            exerciseArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load practice exercises</h3>
                    <p>Please try again later.</p>
                    <button class="btn-primary" onclick="loadPracticeExercisesForTopic('${topicId}')">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
            return;
        }
        
        console.log('Practice data loaded:', practiceData);
        
        if (practiceData.exercises && practiceData.exercises.length > 0) {
            PracticeState.exercises = practiceData.exercises;
            exerciseArea.innerHTML = createPracticeExercisesUI(practiceData, currentLesson);
            setupPracticeExerciseInteractions();
        } else {
            exerciseArea.innerHTML = `
                <div class="no-exercises">
                    <i class="fas fa-pencil-alt"></i>
                    <h3>No practice exercises for this lesson</h3>
                    <p>Check back later!</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Error loading practice exercises:', error);
        // Error handling...
    }
}

async function loadPracticeStatistics() {
    try {
        const practiceStats = document.getElementById('practiceStats');
        if (!practiceStats) return;
        
        practiceStats.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading statistics...</p>
            </div>
        `;
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            practiceStats.innerHTML = getDefaultPracticeStatsHTML();
            return;
        }
        
        let totalLessonsCompleted = 0;
        let totalExercisesCompleted = 0;
        let totalLessonsOverall = 10;
        
        try {
            console.log('📊 Fetching cumulative progress for practice stats...');
            const cumulativeResponse = await fetch(`${API_BASE_URL}/progress/cumulative`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (cumulativeResponse.ok) {
                const cumulativeData = await cumulativeResponse.json();
                if (cumulativeData.success && cumulativeData.cumulative) {
                    totalLessonsCompleted = cumulativeData.cumulative.total_lessons_completed || 
                                           cumulativeData.cumulative.lessons_completed || 0;
                    
                    totalExercisesCompleted = cumulativeData.cumulative.exercises_completed || 0;
                    
                    console.log('✅ Cumulative data loaded:', {
                        lessons: totalLessonsCompleted,
                        exercises: totalExercisesCompleted
                    });
                }
            }
        } catch (cumulativeError) {
            console.warn('⚠️ Could not fetch cumulative:', cumulativeError.message);
        }
        
        if (totalLessonsCompleted === 0) {
            try {
                const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (userResponse.ok) {
                    const userData = await userResponse.json();
                    if (userData.user) {
                        totalLessonsCompleted = userData.user.lessons_completed || 0;
                        totalExercisesCompleted = userData.user.exercises_completed || 0;
                        console.log('✅ Data from user profile:', {
                            lessons: totalLessonsCompleted,
                            exercises: totalExercisesCompleted
                        });
                    }
                }
            } catch (error) {
                console.warn('⚠️ Could not fetch user profile:', error.message);
            }
        }
        
        try {
            const lessonsResponse = await fetch(`${API_BASE_URL}/lessons-db/complete`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (lessonsResponse.ok) {
                const lessonsData = await lessonsResponse.json();
                if (lessonsData.success && lessonsData.lessons) {
                    totalLessonsOverall = lessonsData.lessons.length;
                    console.log('✅ Total lessons overall:', totalLessonsOverall);
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch total lessons:', error.message);
        }
        
        let avgScore = 85;
        let avgTime = 5;
        
        try {
            const practiceAnalytics = await fetch(`${API_BASE_URL}/progress/practice-analytics`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (practiceAnalytics.ok) {
                const analyticsData = await practiceAnalytics.json();
                if (analyticsData.success && analyticsData.stats) {
                    avgScore = analyticsData.stats.average_score || 85;
                    avgTime = analyticsData.stats.average_time_minutes || 5;
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch analytics:', error.message);
            
            try {
                const attemptsResponse = await fetch(`${API_BASE_URL}/progress/practice-attempts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (attemptsResponse.ok) {
                    const attemptsData = await attemptsResponse.json();
                    if (attemptsData.success && attemptsData.attempts && attemptsData.attempts.length > 0) {
                        const attempts = attemptsData.attempts;
                        const totalScore = attempts.reduce((sum, a) => sum + (a.score || 0), 0);
                        const totalTime = attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
                        
                        avgScore = Math.round(totalScore / attempts.length);
                        avgTime = Math.round((totalTime / attempts.length) / 60) || 1;
                    }
                }
            } catch (e) {
                console.warn('⚠️ Could not compute from attempts:', e.message);
            }
        }
        
        console.log('📊 FINAL PRACTICE STATISTICS:', {
            lessonsCompleted: totalLessonsCompleted,
            totalLessons: totalLessonsOverall,
            exercisesCompleted: totalExercisesCompleted,
            averageScore: avgScore,
            averageTime: avgTime
        });
        
        practiceStats.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${totalLessonsCompleted}</div>
                <div class="stat-label">Lessons Completed</div>
                <div class="stat-subtext">out of ${totalLessonsOverall}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalExercisesCompleted}</div>
                <div class="stat-label">Exercises Completed</div>
            </div>
        `;
        
        updateProgressSummaryCardsWithCumulativeData(totalLessonsCompleted, totalExercisesCompleted);
        
    } catch (error) {
        console.error('❌ Error loading practice statistics:', error);
        const practiceStats = document.getElementById('practiceStats');
        if (practiceStats) {
            practiceStats.innerHTML = getDefaultPracticeStatsHTML();
        }
    }
}

function updateProgressSummaryCardsWithCumulativeData(lessonsCompleted, exercisesCompleted) {
    const lessonsCount = document.getElementById('lessonsCount');
    if (lessonsCount) {
        lessonsCount.innerHTML = `
            ${lessonsCompleted}<span class="item-unit">lessons</span>
        `;
        lessonsCount.setAttribute('title', `Total lessons completed: ${lessonsCompleted}`);
        lessonsCount.style.cursor = 'help';
    }
    
    const exercisesCount = document.getElementById('exercisesCount');
    if (exercisesCount) {
        exercisesCount.innerHTML = `
            ${exercisesCompleted}<span class="item-unit">exercises</span>
        `;
        exercisesCount.setAttribute('title', `Total exercises completed: ${exercisesCompleted}`);
        exercisesCount.style.cursor = 'help';
    }
}

function getDefaultPracticeStatsHTML() {
    return `
        <div class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">Lessons Completed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">0</div>
            <div class="stat-label">Exercises Completed</div>
        </div>
    `;
}

function updateProgressSummaryCardsWithPracticeData(exercisesCompleted, averageScore, averageTime) {
    const exercisesCount = document.getElementById('exercisesCount');
    if (exercisesCount) {
        exercisesCount.innerHTML = `
            ${exercisesCompleted}<span class="item-unit">exercises today</span>
        `;
    }
    
    const quizScore = document.getElementById('quizScore');
    if (quizScore) {
        quizScore.innerHTML = `
            ${averageScore}<span class="item-unit">% avg</span>
        `;
        quizScore.setAttribute('title', 'Average practice score');
        quizScore.style.cursor = 'help';
    }
    
    const avgTime = document.getElementById('avgTime');
    if (avgTime) {
        avgTime.innerHTML = `
            ${averageTime}<span class="item-unit">minutes avg</span>
        `;
        avgTime.setAttribute('title', 'Average time per exercise');
        avgTime.style.cursor = 'help';
    }
}

function createPracticeLockScreen(practiceData) {
    const { message, progress } = practiceData;
    
    return `
        <div class="practice-lock-screen">
            <div class="lock-icon">
                <i class="fas fa-lock"></i>
            </div>
            <h3>Practice Exercises Locked</h3>
            <p>${message}</p>
            
            <div class="progress-summary">
                <div class="progress-label">
                    <span>Lesson Progress</span>
                    <span>${progress.completed}/${progress.total} lessons</span>
                </div>
                <div class="progress-bar-container">
                    <div class="progress-fill" style="width: ${progress.percentage}%"></div>
                </div>
                <p class="progress-text">${progress.percentage}% complete</p>
            </div>
            
            <div class="lock-actions">
                <button class="btn-primary" id="goToLessonsBtn">
                    <i class="fas fa-book"></i> Continue Learning
                </button>
                <button class="btn-secondary" id="checkProgressBtn">
                    <i class="fas fa-sync-alt"></i> Refresh Progress
                </button>
            </div>
            
            <div class="lock-tips">
                <h4><i class="fas fa-lightbulb"></i> Tips:</h4>
                <ul>
                    <li>Complete all video lessons first</li>
                    <li>Take notes during lessons</li>
                    <li>Review lesson summaries</li>
                    <li>Practice unlocks automatically when all lessons are completed</li>
                </ul>
            </div>
        </div>
    `;
}

function createPracticeExercisesUI(practiceData, currentLesson) {
    const { exercises, progress, lesson_info } = practiceData;
    const lessonTitle = currentLesson ? currentLesson.title : (lesson_info?.lesson_title || 'Current Lesson');
    
    // Calculate progress percentage
    const exercisesCompleted = progress?.exercises_completed || 0;
    const totalExercises = progress?.total_exercises || exercises.length;
    const exercisesPercentage = progress?.exercises_percentage || 
        (totalExercises > 0 ? Math.round((exercisesCompleted / totalExercises) * 100) : 0);
    
    let html = `
        <div class="practice-header">
            <h2><i class="fas fa-pencil-alt"></i> Practice: ${lessonTitle}</h2>
            <div class="progress-badge">
                <i class="fas fa-check-circle"></i>
                ${exercises.length} exercises available
            </div>
        </div>
        
        <!-- BAGO: Topic Progress Section -->
        <div class="topic-progress-section">
            <h3><i class="fas fa-chart-line"></i> Your Progress in this Topic</h3>
            <div class="topic-progress-grid">
                <div class="topic-progress-card">
                    <div class="progress-label">Lessons Progress</div>
                    <div class="progress-value">${progress?.completed || 0}/${progress?.total || 0}</div>
                    <div class="progress-bar-container">
                        <div class="progress-fill" style="width: ${progress?.percentage || 0}%"></div>
                    </div>
                </div>
                <div class="topic-progress-card">
                    <div class="progress-label">Exercises Progress</div>
                    <div class="progress-value">${exercisesCompleted}/${totalExercises}</div>
                    <div class="progress-bar-container">
                        <div class="progress-fill" style="width: ${exercisesPercentage}%"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="exercises-list">
    `;
    
    exercises.forEach((exercise, index) => {
        const userProgress = exercise.user_progress || {};
        const isCompleted = userProgress.status === 'completed';
        
        html += `
            <div class="exercise-card ${isCompleted ? 'completed' : ''}" data-exercise-id="${exercise.exercise_id}">
                <div class="exercise-header">
                    <h3>Exercise ${index + 1}: ${exercise.title}</h3>
                    <span class="difficulty-badge difficulty-${exercise.difficulty}">
                        ${exercise.difficulty}
                    </span>
                </div>
                
                <div class="exercise-body">
                    <p>${exercise.description || 'Test your knowledge with this practice exercise.'}</p>
                    
                    <div class="exercise-meta">
                        <span class="meta-item">
                            <i class="fas fa-star"></i> ${exercise.points} points
                        </span>
                        <span class="meta-item">
                            <i class="fas fa-clock"></i> 5-10 min
                        </span>
                    </div>
                    
                    ${userProgress.score > 0 ? `
                        <div class="score-display">
                            <strong>Best Score:</strong> ${Math.round(userProgress.score)}%
                            ${isCompleted ? '<span class="completed-badge"><i class="fas fa-check"></i> Completed</span>' : ''}
                        </div>
                    ` : ''}
                </div>
                
                <div class="exercise-actions">
                    <button class="btn-primary start-exercise" data-exercise-id="${exercise.exercise_id}">
                        <i class="fas fa-play"></i> ${userProgress.status === 'in_progress' ? 'Continue' : 'Start'}
                    </button>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Add styles for topic progress
    html += `
        <style>
            .topic-progress-section {
                background: white;
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .topic-progress-section h3 {
                margin-top: 0;
                margin-bottom: 15px;
                color: #2c3e50;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .topic-progress-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
            }
            .topic-progress-card {
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .progress-label {
                font-size: 14px;
                color: #7f8c8d;
                margin-bottom: 5px;
            }
            .progress-value {
                font-size: 24px;
                font-weight: bold;
                color: #2c3e50;
                margin-bottom: 10px;
            }
            .progress-bar-container {
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: #3498db;
                border-radius: 4px;
                transition: width 0.3s ease;
            }
            .score-display {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #e8f5e9;
                padding: 8px 12px;
                border-radius: 4px;
                margin-top: 10px;
            }
            .completed-badge {
                background: #27ae60;
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 12px;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }
        </style>
    `;
    
    return html;
}

function setupPracticeExerciseInteractions() {
    document.querySelectorAll('.start-exercise').forEach(button => {
        button.addEventListener('click', function() {
            const exerciseId = this.getAttribute('data-exercise-id');
            startPracticeExercise(exerciseId);
        });
    });
    
    document.querySelectorAll('.review-exercise').forEach(button => {
        button.addEventListener('click', function() {
            const exerciseId = this.getAttribute('data-exercise-id');
            startPracticeExercise(exerciseId, true);
        });
    });
    
    const goToLessonsBtn = document.getElementById('goToLessonsBtn');
    if (goToLessonsBtn) {
        goToLessonsBtn.addEventListener('click', function() {
            navigateTo('dashboard');
        });
    }
    
    const checkProgressBtn = document.getElementById('checkProgressBtn');
    if (checkProgressBtn) {
        checkProgressBtn.addEventListener('click', async function() {
            const topicId = PracticeState.currentTopic;
            await loadPracticeExercisesForTopic(topicId);
        });
    }
}

async function startPracticeExercise(exerciseId, isReview = false) {
    try {
        console.log(`🚀 Starting practice exercise ${exerciseId}, review mode: ${isReview}`);
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            showNotification('Please login to access practice exercises', 'error');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/exercises/${exerciseId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch exercise: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.exercise) {
            PracticeState.currentExercise = data.exercise;
            PracticeState.isReviewMode = isReview;
            
            if (!isReview) {
                await logUserActivity('practice_started', exerciseId, {
                    exercise_title: data.exercise.title,
                    topic_id: data.exercise.topic_id
                });
            }
            
            showPracticeExerciseModal(data.exercise, isReview);
        } else {
            throw new Error(data.message || 'Failed to load exercise');
        }
    } catch (error) {
        console.error('Error starting practice exercise:', error);
        showNotification('Failed to load exercise: ' + error.message, 'error');
    }
}

function showPracticeExerciseModal(exercise, isReview = false) {
    const exerciseContent = exercise.content_json || {};
    
    console.log('Exercise content:', exerciseContent);
    console.log('Exercise content type:', typeof exerciseContent);
    
    let questionsHTML = '';
    
    if (exerciseContent.questions && Array.isArray(exerciseContent.questions)) {
        exerciseContent.questions.forEach((question, index) => {
            questionsHTML += `
                <div class="practice-question">
                    <h4>Question ${index + 1}</h4>
                    <p>${question.text}</p>
                    
                    ${question.type === 'multiple_choice' ? `
                        <div class="options-list">
                            ${question.options.map((option, optIndex) => `
                                <label class="option">
                                    <input type="radio" name="q${index}" value="${optIndex}" 
                                           ${isReview && option.correct ? 'checked disabled' : ''}>
                                    <span class="option-text">${option.text}</span>
                                    ${isReview && option.correct ? 
                                        '<span class="correct-badge"><i class="fas fa-check"></i> Correct</span>' : ''}
                                </label>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    ${question.type === 'fill_blank' ? `
                        <input type="text" class="fill-blank" 
                               placeholder="Enter your answer" 
                               ${isReview ? `value="${question.answer}" disabled` : ''}>
                    ` : ''}
                </div>
            `;
        });
    } else {
        questionsHTML = `
            <div class="no-questions">
                <p>No questions available for this exercise.</p>
            </div>
        `;
    }
    
    const modalHTML = `
        <div class="practice-modal">
            <div class="modal-header">
                <h3>${exercise.title}</h3>
                <span class="points-badge">${exercise.points} points</span>
            </div>
            
            <div class="modal-body">
                <p>${exercise.description || ''}</p>
                
                <div class="questions-container">
                    ${questionsHTML}
                </div>
                
                <div class="timer-container" style="${isReview ? 'display: none;' : ''}">
                    <i class="fas fa-clock"></i>
                    <span id="exerciseTimer">5:00</span>
                </div>
            </div>
            
            <div class="modal-footer">
                <button class="btn-secondary" id="closeExerciseBtn">
                    <i class="fas fa-times"></i> ${isReview ? 'Close' : 'Cancel'}
                </button>
                ${!isReview ? `
                    <button class="btn-primary" id="submitExerciseBtn">
                        <i class="fas fa-paper-plane"></i> Submit Answers
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    showModal(modalHTML);
    
    if (!isReview) {
        startPracticeTimer();
        
        const submitBtn = document.getElementById('submitExerciseBtn');
        if (submitBtn) {
            submitBtn.addEventListener('click', submitExerciseAnswers);
        }
    }
    
    const closeBtn = document.getElementById('closeExerciseBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = document.querySelector('.modal-overlay');
            if (modal) modal.remove();
            
            if (!isReview) {
                stopPracticeTimer();
            }
        });
    }
}

function startPracticeTimer() {
    PracticeState.timer = 300;
    PracticeState.isExerciseActive = true;
    
    PracticeState.timerInterval = setInterval(() => {
        if (PracticeState.timer > 0 && PracticeState.isExerciseActive) {
            PracticeState.timer--;
            
            const minutes = Math.floor(PracticeState.timer / 60);
            const seconds = PracticeState.timer % 60;
            const timerElement = document.getElementById('exerciseTimer');
            if (timerElement) {
                timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            }
        } else {
            stopPracticeTimer();
            if (PracticeState.timer === 0) {
                showNotification('Time is up! Submitting your answers...', 'warning');
                submitExerciseAnswers();
            }
        }
    }, 1000);
}

function stopPracticeTimer() {
    if (PracticeState.timerInterval) {
        clearInterval(PracticeState.timerInterval);
        PracticeState.timerInterval = null;
    }
    PracticeState.isExerciseActive = false;
}

async function submitExerciseAnswers() {
    const modal = document.querySelector('.modal-overlay');
    if (!modal) return;
    
    const answers = {};
    let allAnswered = true;
    
    document.querySelectorAll('.practice-question').forEach((questionDiv, index) => {
        const radioInputs = questionDiv.querySelectorAll('input[type="radio"]:checked');
        const textInputs = questionDiv.querySelectorAll('input[type="text"]');
        
        if (radioInputs.length > 0) {
            answers[`q${index}`] = radioInputs[0].value;
        } else if (textInputs.length > 0 && textInputs[0].value.trim()) {
            answers[`q${index}`] = textInputs[0].value;
        } else {
            allAnswered = false;
        }
    });
    
    if (!allAnswered) {
        const confirmSubmit = confirm('You have unanswered questions. Submit anyway?');
        if (!confirmSubmit) return;
    }
    
    stopPracticeTimer();
    
    const submitBtn = document.getElementById('submitExerciseBtn');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;
    }
    
    const timeSpent = 300 - PracticeState.timer;
    
    const result = await submitPracticeAnswer(
        PracticeState.currentExercise.exercise_id,
        answers,
        timeSpent
    );
    
    if (result) {
        modal.innerHTML = `
            <div class="practice-result-modal">
                <div class="result-header ${result.completed ? 'success' : 'warning'}">
                    <i class="fas ${result.completed ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    <h3>${result.completed ? 'Exercise Completed!' : 'Keep Practicing'}</h3>
                </div>
                
                <div class="result-body">
                    <div class="score-display-large">
                        <div class="score-number">${result.score}/${result.max_score}</div>
                        <div class="score-percentage">${result.percentage}%</div>
                    </div>
                    
                    <p class="feedback-text">${result.feedback}</p>
                    
                    ${!result.completed ? `
                        <div class="improvement-tips">
                            <h4><i class="fas fa-lightbulb"></i> Tips for Improvement:</h4>
                            <ul>
                                <li>Review the lesson materials</li>
                                <li>Take notes on key concepts</li>
                                <li>Try the exercise again later</li>
                                <li>Ask for help if needed</li>
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                <div class="result-footer">
                    <button class="btn-secondary" id="closeResultBtn">
                        <i class="fas fa-times"></i> Close
                    </button>
                    ${!result.completed ? `
                        <button class="btn-primary" id="tryAgainBtn">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                    ` : `
                        <button class="btn-primary" id="nextExerciseBtn">
                            <i class="fas fa-arrow-right"></i> Next Exercise
                        </button>
                    `}
                </div>
            </div>
        `;
        
        document.getElementById('closeResultBtn')?.addEventListener('click', () => {
            modal.remove();
            const topicId = PracticeState.currentTopic;
            refreshPracticeExercises(topicId);
        });
        
        document.getElementById('tryAgainBtn')?.addEventListener('click', () => {
            modal.remove();
            startPracticeExercise(PracticeState.currentExercise.exercise_id, false);
        });
        
        document.getElementById('nextExerciseBtn')?.addEventListener('click', () => {
            modal.remove();
            
            const currentIndex = PracticeState.exercises.findIndex(e => e.exercise_id === PracticeState.currentExercise.exercise_id);
            
            if (currentIndex < PracticeState.exercises.length - 1) {
                startPracticeExercise(PracticeState.exercises[currentIndex + 1].exercise_id);
            } else {
                const topicId = PracticeState.currentTopic;
                
                showNotification('All exercises completed! Refreshing list...', 'success');
                
                setTimeout(() => {
                    refreshPracticeExercises(topicId);
                }, 500);
            }
        });
    } else {
        showNotification('Failed to submit answers', 'error');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Answers';
            submitBtn.disabled = false;
        }
    }
}

async function refreshPracticeExercises(topicId) {
    console.log(`🔄 Refreshing practice exercises for topic ${topicId}...`);
    
    const exerciseArea = document.getElementById('exerciseArea');
    if (!exerciseArea) return;
    
    exerciseArea.innerHTML = `
        <div class="loading-container">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Refreshing exercises...</p>
        </div>
    `;
    
    const practiceData = await loadPracticeExercises(topicId);
    
    if (practiceData && practiceData.unlocked && practiceData.exercises) {
        PracticeState.exercises = practiceData.exercises;
        exerciseArea.innerHTML = createPracticeExercisesUI(practiceData);
        setupPracticeExerciseInteractions();
    }
    
    console.log('✅ Practice exercises refreshed');
}

function addPracticeStyles() {
    if (practiceStylesAdded) return;
    practiceStylesAdded = true;
    
    const style = document.createElement('style');
    style.id = 'practice-styles';
    style.textContent = `
        .practice-lock-screen {
            text-align: center;
            padding: 40px 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 0 auto;
        }
        
        .lock-icon {
            font-size: 60px;
            color: #95a5a6;
            margin-bottom: 20px;
        }
        
        .progress-summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .lock-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin: 20px 0;
        }
        
        .lock-tips {
            text-align: left;
            background: #fffde7;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .exercises-list {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin: 20px 0;
        }
        
        .exercise-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .exercise-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .exercise-card.completed {
            border-left: 4px solid #27ae60;
        }
        
        .exercise-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .difficulty-badge {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .difficulty-easy {
            background: #d4edda;
            color: #155724;
        }
        
        .difficulty-medium {
            background: #fff3cd;
            color: #856404;
        }
        
        .difficulty-hard {
            background: #f8d7da;
            color: #721c24;
        }
        
        .exercise-meta {
            display: flex;
            gap: 15px;
            margin: 10px 0;
            color: #6c757d;
            font-size: 14px;
        }
        
        .exercise-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .practice-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .progress-badge {
            background: #e3f2fd;
            color: #1976d2;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
        }
        
        .practice-summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin-top: 30px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }
        
        .stat-card {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
            margin-top: 5px;
        }
        
        .score-display {
            background: #e8f5e9;
            padding: 8px 12px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 14px;
        }
        
        .practice-modal {
            background: white;
            border-radius: 10px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .points-badge {
            background: #3498db;
            color: white;
            padding: 5px 10px;
            border-radius: 12px;
            font-size: 14px;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: flex-end;
            gap: 10px;
        }
        
        .practice-question {
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .practice-question:last-child {
            border-bottom: none;
        }
        
        .options-list {
            margin-top: 10px;
        }
        
        .option {
            display: block;
            padding: 10px;
            margin: 5px 0;
            background: #f8f9fa;
            border-radius: 5px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .option:hover {
            background: #e9ecef;
        }
        
        .option input[type="radio"] {
            margin-right: 10px;
        }
        
        .correct-badge {
            background: #d4edda;
            color: #155724;
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 12px;
            margin-left: 10px;
        }
        
        .fill-blank {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-top: 10px;
        }
        
        .timer-container {
            background: #fff3cd;
            padding: 10px 15px;
            border-radius: 5px;
            display: inline-flex;
            align-items: center;
            gap: 10px;
            margin-top: 20px;
        }
        
        .practice-result-modal {
            background: white;
            border-radius: 10px;
            max-width: 500px;
            width: 100%;
        }
        
        .result-header {
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        
        .result-header.success {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .result-header.warning {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        
        .score-display-large {
            text-align: center;
            margin: 20px 0;
        }
        
        .score-number {
            font-size: 48px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .score-percentage {
            font-size: 24px;
            color: #7f8c8d;
        }
        
        .feedback-text {
            text-align: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .improvement-tips {
            background: #fffde7;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .result-footer {
            padding: 20px;
            display: flex;
            justify-content: center;
            gap: 10px;
        }
        
        .btn-success {
            background: #27ae60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        
        .btn-success:hover {
            background: #219653;
        }
        
        .btn-success:disabled {
            background: #95a5a6;
            cursor: not-allowed;
        }
        
        .btn-success.disabled {
            background: #95a5a6;
            cursor: not-allowed;
        }
        
        .topic-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
            cursor: pointer;
            border: 2px solid transparent;
        }
        
        .topic-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .topic-card.selected {
            border-color: #3498db;
            background: #f8f9fa;
        }
        
        .topic-card.unlocked {
            border-left: 4px solid #27ae60;
        }
        
        .topic-card.locked {
            border-left: 4px solid #95a5a6;
            opacity: 0.7;
        }
        
        .topic-card.completed {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .topic-card.completed .topic-title,
        .topic-card.completed p,
        .topic-card.completed .progress-info span {
            color: white;
        }
        
        .topic-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .topic-title {
            font-size: 18px;
            margin: 0;
            color: #2c3e50;
        }
        
        .topic-status {
            font-size: 12px;
        }
        
        .status-unlocked {
            color: #27ae60;
            background: #d4edda;
            padding: 3px 8px;
            border-radius: 10px;
        }
        
        .status-locked {
            color: #6c757d;
            background: #e9ecef;
            padding: 3px 8px;
            border-radius: 10px;
        }
        
        .status-completed {
            color: #fff;
            background: rgba(255,255,255,0.2);
            padding: 3px 8px;
            border-radius: 10px;
        }
        
        .topic-progress {
            margin: 15px 0;
        }
        
        .progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .progress-bar {
            height: 6px;
            background: #e9ecef;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: #3498db;
            border-radius: 3px;
        }
        
        .topic-practice-info {
            font-size: 14px;
            margin: 10px 0;
        }
        
        .practice-available {
            color: #27ae60;
        }
        
        .practice-locked {
            color: #6c757d;
        }
        
        .practice-completed {
            color: #fff;
            background: rgba(255,255,255,0.2);
            padding: 3px 8px;
            border-radius: 10px;
            display: inline-block;
        }
        
        .topic-actions {
            margin-top: 15px;
        }
        
        .topic-actions .btn-primary {
            width: 100%;
            justify-content: center;
        }
        
        .topic-actions .btn-secondary {
            width: 100%;
            justify-content: center;
            background: #95a5a6;
            color: white;
            cursor: not-allowed;
        }
        
        .no-topic-selected {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .no-topic-selected i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #3498db;
        }
        
        .no-topics {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
            font-style: italic;
        }
        
        .topics-container {
            max-height: 400px;
            overflow-y: auto;
            padding-right: 10px;
        }
    `;
    document.head.appendChild(style);
}

function addQuizStyles() {
    if (document.querySelector('#quiz-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'quiz-styles';
    style.textContent = `
        .quiz-category-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 15px;
            cursor: pointer;
        }
        
        .quiz-category-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .quiz-category-card.selected {
            border: 2px solid #3498db;
            background: #f8f9fa;
        }
        
        .quiz-category-icon {
            width: 60px;
            height: 60px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
        }
        
        .quiz-category-info {
            flex: 1;
        }
        
        .quiz-category-title {
            margin: 0 0 5px 0;
            color: #2c3e50;
        }
        
        .quiz-category-desc {
            margin: 0 0 10px 0;
            color: #6c757d;
            font-size: 14px;
        }
        
        .quiz-category-stats {
            display: flex;
            gap: 15px;
            font-size: 12px;
            color: #7f8c8d;
        }
        
        .quiz-category-stat {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .quiz-category-btn {
            background: #3498db;
            color: white;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        .quiz-category-btn:hover {
            background: #2980b9;
            transform: scale(1.1);
        }
        
        .quiz-option-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .quiz-option-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .quiz-option-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .quiz-option-header h4 {
            margin: 0;
            color: #2c3e50;
        }
        
        .quiz-option-difficulty {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            color: white;
            text-transform: uppercase;
        }
        
        .quiz-option-body {
            margin-bottom: 15px;
        }
        
        .quiz-option-body p {
            margin: 0 0 15px 0;
            color: #6c757d;
        }
        
        .quiz-option-meta {
            display: flex;
            gap: 15px;
            margin-bottom: 10px;
            font-size: 14px;
            color: #7f8c8d;
        }
        
        .quiz-option-meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .quiz-option-attempts {
            background: #e8f5e9;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .quiz-option-actions {
            display: flex;
            gap: 10px;
        }
        
        .quiz-option {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .quiz-option:hover {
            background: #e9ecef;
        }
        
        .quiz-option.selected {
            background: #d4edda;
            border: 2px solid #27ae60;
        }
        
        .quiz-option-selector {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 2px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .quiz-option.selected .quiz-option-selector {
            background: #27ae60;
            border-color: #27ae60;
            color: white;
        }
        
        .quiz-option-text {
            flex: 1;
            font-size: 16px;
        }
        
        .progress-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #ddd;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .progress-dot.current {
            background: #3498db;
            transform: scale(1.2);
        }
        
        .progress-dot.answered {
            background: #27ae60;
        }
        
        .quiz-back-btn {
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .quiz-back-btn:hover {
            background: #5a6268;
        }
        
        .no-categories, .no-quizzes, .no-leaderboard, .no-badges {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .no-categories i, .no-quizzes i, .no-leaderboard i, .no-badges i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #3498db;
        }
        
        .no-categories h3, .no-quizzes h3, .no-leaderboard h3, .no-badges h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        
        .badge-item {
            background: white;
            border-radius: 10px;
            padding: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .badge-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .badge-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: white;
        }
        
        .badge-info {
            flex: 1;
        }
        
        .badge-info h4 {
            margin: 0 0 5px 0;
            color: #2c3e50;
            font-size: 14px;
        }
        
        .badge-info p {
            margin: 0;
            font-size: 12px;
            color: #6c757d;
        }
        
        .leaderboard-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .leaderboard-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }
        
        .leaderboard-item.current-user {
            background: #e3f2fd;
            border: 2px solid #3498db;
        }
        
        .leaderboard-rank {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #f8f9fa;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 18px;
            color: #6c757d;
            margin-right: 15px;
        }
        
        .leaderboard-rank.first {
            background: #ffd700;
            color: #856404;
        }
        
        .leaderboard-rank.second {
            background: #c0c0c0;
            color: #495057;
        }
        
        .leaderboard-rank.third {
            background: #cd7f32;
            color: #fff;
        }
        
        .leaderboard-user {
            flex: 1;
        }
        
        .leaderboard-user-name {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .leaderboard-user-stats {
            display: flex;
            gap: 15px;
            font-size: 12px;
            color: #6c757d;
        }
        
        .leaderboard-stat {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .leaderboard-score {
            font-weight: bold;
            font-size: 18px;
            color: #2c3e50;
        }
    `;
    document.head.appendChild(style);
}

function addProgressStyles() {
    if (document.querySelector('#progress-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'progress-styles';
    style.textContent = `
        .progress-summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .progress-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .progress-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .progress-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .progress-card-title {
            font-size: 16px;
            color: #2c3e50;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .progress-card-value {
            font-size: 32px;
            font-weight: bold;
            color: #3498db;
            margin-bottom: 5px;
        }
        
        .progress-card-subvalue {
            font-size: 14px;
            color: #7f8c8d;
        }
        
        .goals-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .goal-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
            border-left: 4px solid #3498db;
        }
        
        .goal-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .goal-card.completed {
            border-left-color: #27ae60;
            background: #f8fff8;
        }
        
        .goal-card.failed {
            border-left-color: #e74c3c;
            background: #fff8f8;
        }
        
        .goal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .goal-header h4 {
            margin: 0;
            color: #2c3e50;
            flex: 1;
        }
        
        .goal-status {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .goal-status.active {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .goal-status.completed {
            background: #d4edda;
            color: #155724;
        }
        
        .goal-status.failed {
            background: #f8d7da;
            color: #721c24;
        }
        
        .goal-status.paused {
            background: #fff3cd;
            color: #856404;
        }
        
        .goal-progress {
            margin: 15px 0;
        }
        
        .goal-progress .progress-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 5px;
        }
        
        .goal-meta {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #7f8c8d;
            margin-top: 10px;
        }
        
        .goal-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        
        .btn-small {
            padding: 5px 10px;
            font-size: 12px;
            border-radius: 4px;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.3s;
        }
        
        .btn-small:hover {
            transform: translateY(-1px);
        }
        
        .activity-log {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .activity-item {
            display: flex;
            align-items: center;
            padding: 15px;
            border-bottom: 1px solid #eee;
            transition: all 0.3s;
        }
        
        .activity-item:last-child {
            border-bottom: none;
        }
        
        .activity-item:hover {
            background: #f8f9fa;
        }
        
        .activity-icon {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #e3f2fd;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #3498db;
            font-size: 18px;
            margin-right: 15px;
        }
        
        .activity-content {
            flex: 1;
        }
        
        .activity-text {
            font-size: 14px;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .activity-time {
            font-size: 12px;
            color: #7f8c8d;
        }
        
        .activity-points {
            background: #27ae60;
            color: white;
            padding: 4px 8px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: bold;
        }
        
        .trends-chart {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            height: 200px;
            padding: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
        }
        
        .trend-day {
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
        }
        
        .trend-bar {
            width: 20px;
            background: #3498db;
            border-radius: 4px 4px 0 0;
            transition: all 0.3s;
            margin-bottom: 10px;
        }
        
        .trend-bar:hover {
            background: #2980b9;
            transform: scale(1.05);
        }
        
        .trend-label {
            display: flex;
            flex-direction: column;
            align-items: center;
            font-size: 12px;
            color: #6c757d;
        }
        
        .trend-day-number {
            font-weight: bold;
        }
        
        .trend-month {
            font-size: 10px;
            text-transform: uppercase;
        }
        
        .timeline {
            position: relative;
            padding: 20px 0;
        }
        
        .timeline::before {
            content: '';
            position: absolute;
            left: 50%;
            top: 0;
            bottom: 0;
            width: 2px;
            background: #3498db;
            transform: translateX(-50%);
        }
        
        .timeline-item {
            position: relative;
            margin-bottom: 30px;
            width: 50%;
        }
        
        .timeline-item.left {
            left: 0;
            padding-right: 40px;
            text-align: right;
        }
        
        .timeline-item.right {
            left: 50%;
            padding-left: 40px;
        }
        
        .timeline-content {
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            position: relative;
        }
        
        .timeline-content::before {
            content: '';
            position: absolute;
            top: 20px;
            width: 20px;
            height: 20px;
            background: white;
            transform: rotate(45deg);
        }
        
        .timeline-item.left .timeline-content::before {
            right: -10px;
        }
        
        .timeline-item.right .timeline-content::before {
            left: -10px;
        }
        
        .timeline-icon {
            position: absolute;
            top: 15px;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: #3498db;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        
        .timeline-item.left .timeline-icon {
            right: -15px;
        }
        
        .timeline-item.right .timeline-icon {
            left: -15px;
        }
        
        .timeline-text {
            font-size: 14px;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        
        .timeline-time {
            font-size: 12px;
            color: #7f8c8d;
        }
        
        .mastery-container,
        .modules-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .mastery-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .mastery-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .mastery-card.mastery-beginner {
            border-left: 4px solid #95a5a6;
        }
        
        .mastery-card.mastery-intermediate {
            border-left: 4px solid #3498db;
        }
        
        .mastery-card.mastery-advanced {
            border-left: 4px solid #9b59b6;
        }
        
        .mastery-card.mastery-expert {
            border-left: 4px solid #f39c12;
        }
        
        .mastery-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .mastery-level {
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        
        .mastery-beginner .mastery-level {
            background: #e9ecef;
            color: #6c757d;
        }
        
        .mastery-intermediate .mastery-level {
            background: #e3f2fd;
            color: #1976d2;
        }
        
        .mastery-advanced .mastery-level {
            background: #f3e5f5;
            color: #7b1fa2;
        }
        
        .mastery-expert .mastery-level {
            background: #fff3cd;
            color: #856404;
        }
        
        .mastery-stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin: 15px 0;
        }
        
        .mastery-stat {
            display: flex;
            flex-direction: column;
        }
        
        .stat-label {
            font-size: 12px;
            color: #7f8c8d;
            text-transform: uppercase;
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .module-progress-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s;
        }
        
        .module-progress-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .module-progress-card.in-progress {
            border-left: 4px solid #3498db;
        }
        
        .module-progress-card.completed {
            border-left: 4px solid #27ae60;
            background: #f8fff8;
        }
        
        .module-progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .completion-rate {
            font-size: 24px;
            font-weight: bold;
            color: #3498db;
        }
        
        .module-progress-card.completed .completion-rate {
            color: #27ae60;
        }
        
        .module-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 15px 0;
        }
        
        .module-actions {
            display: flex;
            justify-content: center;
            margin-top: 15px;
        }
        
        .completed-badge {
            background: #27ae60;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: bold;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        
        .no-goals, .no-activity, .no-trends, .no-achievements, .no-mastery, .no-modules {
            text-align: center;
            padding: 40px 20px;
            color: #6c757d;
        }
        
        .no-goals i, .no-activity i, .no-trends i, .no-achievements i, .no-mastery i, .no-modules i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #3498db;
        }
        
        .no-goals h3, .no-activity h3, .no-trends h3, .no-achievements h3, .no-mastery h3, .no-modules h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        
        .create-goal-modal, .update-goal-modal {
            background: white;
            border-radius: 10px;
            padding: 30px;
            max-width: 600px;
            width: 100%;
        }
        
        .create-goal-modal h3, .update-goal-modal h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #2c3e50;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 14px;
            transition: all 0.3s;
        }
        
        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: #3498db;
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }
        
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 30px;
        }
        
        .goal-info {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .goal-info h4 {
            margin-top: 0;
            color: #2c3e50;
        }
        
        .goal-info p {
            margin: 5px 0;
            color: #6c757d;
        }
    `;
    document.head.appendChild(style);
}

// ============================================
// CORE FUNCTIONS
// ============================================

function initApp() {
    console.log('🎮 MathHub Application Initializing...');
    
    // Check for existing authentication
    const savedUser = localStorage.getItem('mathhub_user');
    const token = localStorage.getItem('authToken');
    
    if (savedUser && token) {
        try {
            const user = JSON.parse(savedUser);
            AppState.currentUser = user;
            AppState.isAuthenticated = true;
            authToken = token;
            
            console.log('✅ User already authenticated:', user.username);
            
            // Always go directly to dashboard
            navigateTo('dashboard');
            
        } catch (error) {
            console.error('Error parsing saved user:', error);
            clearAuthAndProceed();
        }
    } else {
        console.log('🔐 No existing authentication found');
        clearAuthAndProceed();
    }
    
    initHamburgerMenu();
    
    // Set up demo login as fallback
    setupDemoLogin();
    
    console.log('🎮 MathHub Application Initialized');
}

function clearAuthAndProceed() {
    // Clear any stale auth data
    localStorage.removeItem('mathhub_user');
    localStorage.removeItem('authToken');
    
    AppState.currentUser = null;
    AppState.isAuthenticated = false;
    authToken = null;
    
    // Use demo login automatically for seamless experience
    setTimeout(() => {
        demoLogin();
    }, 100);
}

function demoLogin() {
    console.log('🎭 Performing automatic demo login...');
    
    const demoUser = {
        id: 1,
        username: 'demo_user',
        email: 'demo@mathhub.com',
        full_name: 'Demo Student',
        role: 'student',
        lessons_completed: 3,
        exercises_completed: 15,
        quiz_score: 85,
        average_time: 25,
        streak_days: 7,
        achievements: 5,
        accuracy_rate: 82
    };
    
    authToken = 'demo_token_' + Date.now();
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('mathhub_user', JSON.stringify(demoUser));
    
    AppState.currentUser = demoUser;
    AppState.isAuthenticated = true;
    
    console.log('✅ Demo login successful!');
    
    // Go directly to dashboard
    navigateTo('dashboard');
}

function setupDemoLogin() {
    // This function exists for compatibility but we auto-login now
    console.log('🔧 Demo login setup (automatic)');
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function navigateTo(page) {
    console.log(`🧭 Navigating to ${page}`);
    
    const publicPages = ['dashboard']; // Only dashboard is public now
    
    // Always authenticated with demo user
    if (!AppState.isAuthenticated) {
        console.log('🔐 No authentication, using demo login');
        demoLogin();
        return;
    }
    
    // Define all pages
    const pages = {
        dashboard: document.getElementById('dashboard-page'),
        practice: document.getElementById('practice-exercises-page'),
        moduleDashboard: document.getElementById('module-dashboard-page'),
        quizDashboard: document.getElementById('quiz-dashboard-page'),
        progress: document.getElementById('progress-page'),
        feedback: document.getElementById('feedback-page'),
        settings: document.getElementById('settings-page')
    };
    
    // Hide all pages
    Object.values(pages).forEach(p => {
        if (p) p.classList.add('hidden');
    });
    
    // Show requested page
    if (pages[page]) {
        pages[page].classList.remove('hidden');
        AppState.currentPage = page;
        
        window.location.hash = page;
        window.scrollTo({ top: 0, behavior: 'instant' });
    } else {
        console.error(`❌ Page ${page} not found!`);
        return;
    }
    
    // Show footer navigation for all pages
    showFooterNavigation();
    
    // Initialize the page
    switch(page) {
        case 'dashboard':
            if (AppState.currentUser) {
                updateDashboard();
                setupTopNavigation();
                
                setTimeout(async () => {
                    await fetchModuleProgress();
                    await updateContinueLearningModule();
                }, 300);
            }
            break;
        case 'practice':
            if (AppState.currentUser) {
                initPracticePage();
                setupTopNavigation();
            }
            break;
        case 'moduleDashboard':
            if (AppState.currentUser) {
                initModuleDashboard();
                setupModuleDashboardNavigation();
            }
            break;
        case 'quizDashboard':
            if (AppState.currentUser) {
                initQuizDashboard();
                setupQuizNavigation();
            }
            break;
        case 'progress':
            if (AppState.currentUser) {
                initProgressDashboard();
                setupProgressNavigation();
            }
            break;
        case 'feedback':
            if (AppState.currentUser) {
                initFeedbackDashboard();
                setupFeedbackNavigation();
                addFeedbackStyles();
            }
            break;
        case 'settings':
            if (AppState.currentUser) {
                initSettingsDashboard();
                setupSettingsNavigation();
            }
            break;
    }
    
    console.log(`✅ Navigation complete. Current page: ${AppState.currentPage}`);
}

function toggleFooterNavigation(page) {
    const navigation = document.querySelector('.footer-nav');
    if (!navigation) return;
    
    // Show navigation for all pages
    navigation.style.display = 'flex';
    adjustContainerBottomPadding();
}

function hideFooterNavigation() {
    const navigation = document.querySelector('.footer-nav');
    if (navigation) {
        navigation.style.display = 'none';
    }
    resetContainerBottomPadding();
}

function showFooterNavigation() {
    const navigation = document.querySelector('.footer-nav');
    if (navigation) {
        navigation.style.display = 'flex';
        adjustContainerBottomPadding();
    }
}

function adjustContainerBottomPadding() {
    const containers = document.querySelectorAll(
        '#dashboard-page .container, ' +
        '#practice-exercises-page .container, ' +
        '#quiz-dashboard-page .container, ' +
        '#progress-page .container, ' +
        '#feedback-page .container, ' +
        '#settings-page .container, ' +
        '#module-dashboard-page .container'
    );
    
    const footerHeight = 70;
    
    containers.forEach(container => {
        container.style.paddingBottom = `${footerHeight + 20}px`;
    });
}

function resetContainerBottomPadding() {
    const containers = document.querySelectorAll('.container');
    containers.forEach(container => {
        container.style.paddingBottom = '';
    });
}

window.addEventListener('hashchange', function() {
    const hash = window.location.hash.replace('#', '');
    
    if (hash && ['dashboard', 'practice', 'moduleDashboard', 'quizDashboard', 'progress', 'feedback', 'settings'].includes(hash)) {
        navigateTo(hash);
    } else {
        navigateTo('dashboard');
    }
});

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function updateDashboard() {
    if (!AppState.currentUser) return;
    
    console.log('📊 Updating dashboard...');
    
    const currentDateElement = document.getElementById('currentDate');
    if (currentDateElement) {
        const now = new Date();
        currentDateElement.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    updateUserInfo();
    
    console.log('🔍 Loading today\'s learning statistics...');
    await updateTodaysLearningStats();
    
    await fetchCumulativeProgress();
    
    updateProgressSummaryCards();
    
    await updateContinueLearningModule();
    
    await loadDashboardStatistics();
    
    setupDashboardButtons();
    
    console.log('✅ Dashboard updated with today\'s learning stats');
}

function updateUserInfo() {
    if (!AppState.currentUser) return;
    
    console.log('👤 Updating user info:', AppState.currentUser.username);
    
    const welcomeTitle = document.querySelector('.welcome-title');
    if (welcomeTitle) {
        welcomeTitle.textContent = `Welcome ${AppState.currentUser.full_name || AppState.currentUser.username}!`;
    }
    
    const studentName = document.querySelector('.student-name');
    if (studentName) {
        studentName.querySelector('span').textContent = `${AppState.currentUser.full_name || AppState.currentUser.username}!`;
    }
}

async function loadDashboardStatistics() {
    try {
        const [dailyProgress, learningGoals, activityLog] = await Promise.all([
            fetchDailyProgress(),
            fetchLearningGoals(),
            fetchActivityLog(5)
        ]);
        
        updateDashboardStatsDisplay(dailyProgress, learningGoals, activityLog);
        
    } catch (error) {
        console.error('Error loading dashboard statistics:', error);
    }
}

function updateDashboardStatsDisplay(dailyProgress, learningGoals, activityLog) {
    if (dailyProgress) {
        console.log('📊 Updating dashboard stats with daily progress:', dailyProgress);
        
        updateProgressSummaryCards();
    }
    
    const todayStatsElement = document.getElementById('todayStats');
    if (todayStatsElement && dailyProgress) {
        todayStatsElement.innerHTML = `
            <div class="today-stats">
                <div class="stat-item">
                    <i class="fas fa-book"></i>
                    <span>${dailyProgress.lessons_completed || 0} Lessons</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-pencil-alt"></i>
                    <span>${dailyProgress.exercises_completed || 0} Exercises</span>
                </div>
                <div class="stat-item">
                    <i class="fas fa-trophy"></i>
                    <span>${dailyProgress.points_earned || 0} Points</span>
                </div>
            </div>
        `;
    } 
    
    const activeGoalsElement = document.getElementById('activeGoals');
    if (activeGoalsElement && learningGoals) {
        const activeGoals = learningGoals.filter(goal => goal.status === 'active');
        if (activeGoals.length > 0) {
            activeGoalsElement.innerHTML = `
                <div class="goals-summary">
                    <h4><i class="fas fa-bullseye"></i> Active Goals</h4>
                    ${activeGoals.slice(0, 3).map(goal => `
                        <div class="goal-summary">
                            <span class="goal-title">${goal.goal_title}</span>
                            <span class="goal-progress">${goal.current_value}/${goal.target_value}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
    
    const recentActivityElement = document.getElementById('recentActivity');
    if (recentActivityElement && activityLog && activityLog.length > 0) {
        recentActivityElement.innerHTML = `
            <div class="recent-activity">
                <h4><i class="fas fa-history"></i> Recent Activity</h4>
                ${activityLog.slice(0, 3).map(activity => `
                    <div class="activity-summary">
                        <i class="${getActivityIcon(activity.activity_type)}"></i>
                        <span class="activity-text">${getActivityText(activity)}</span>
                        <span class="activity-time">${formatTimeAgo(activity.activity_timestamp)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

function setupDashboardButtons() {
    console.log('🔘 Setting up dashboard buttons...');
    
    const continueLessonBtn = document.getElementById('continueLesson');
    if (continueLessonBtn) {
        continueLessonBtn.addEventListener('click', () => {
            if (LessonState.continueLearningLesson) {
                openLesson(LessonState.continueLearningLesson.content_id);
            } else {
                if (LessonState.lessons.length > 0) {
                    openLesson(LessonState.lessons[0].content_id);
                }
            }
        });
    }
    
    const practiceExercisesBtn = document.getElementById('practiceExercises');
    if (practiceExercisesBtn) {
        practiceExercisesBtn.addEventListener('click', () => {
            navigateTo('practice');
        });
    }
    
    const startQuizBtn = document.getElementById('goToQuiz');
    if (startQuizBtn) {
        startQuizBtn.addEventListener('click', () => {
            navigateTo('quizDashboard');
        });
    }
    
    const viewProgressBtn = document.getElementById('viewProgress');
    if (viewProgressBtn) {
        viewProgressBtn.addEventListener('click', () => {
            navigateTo('progress');
        });
    }
    
    const goToFeedbackBtn = document.getElementById('goToFeedback');
    if (goToFeedbackBtn) {
        goToFeedbackBtn.addEventListener('click', () => {
            navigateTo('feedback');
        });
    }
}

function setupTopNavigation() {
    console.log('🔝 Setting up top navigation...');
    
    const logoutBtnDashboard = document.getElementById('logoutBtnDashboard');
    if (logoutBtnDashboard) {
        logoutBtnDashboard.addEventListener('click', function(e) {
            e.preventDefault();
            logoutAndRedirect();
        });
    }
}

function setupModuleDashboardNavigation() {
    console.log('📚 Setting up module dashboard navigation...');
    
    const backToLessonDashboardBtn = document.getElementById('backToLessonDashboard');
    if (backToLessonDashboardBtn) {
        backToLessonDashboardBtn.addEventListener('click', () => {
            console.log('Back button clicked from module dashboard');
            navigateTo('dashboard');
        });
    }
}

function setupQuizNavigation() {
    console.log('🧠 Setting up quiz navigation...');
    
    const backToDashboardBtn = document.getElementById('backToDashboardBtn');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            navigateTo('dashboard');
        });
    }
}

function setupProgressNavigation() {
    console.log('📈 Setting up progress navigation...');
    
    const backToDashboardBtn = document.getElementById('backToDashboardBtnProgress');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            navigateTo('dashboard');
        });
    }
}

function setupFeedbackNavigation() {
    console.log('💬 Setting up feedback navigation...');
    
    const backToDashboardBtn = document.getElementById('backToDashboardBtnFeedback');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            navigateTo('dashboard');
        });
    }
}

function setupSettingsNavigation() {
    console.log('⚙️ Setting up settings navigation...');
    
    const backToDashboardBtn = document.getElementById('backToDashboardBtnSettings');
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', () => {
            navigateTo('dashboard');
        });
    }
}

function logoutAndRedirect() {
    console.log('🚪 Logging out...');
    
    if (AppState.currentUser) {
        logUserActivity('logout', null, {}, 0);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('mathhub_user');
    
    AppState.currentUser = null;
    AppState.isAuthenticated = false;
    authToken = null;
    
    LessonState.lessons = [];
    LessonState.currentLesson = null;
    LessonState.userProgress = {};
    LessonState.continueLearningLesson = null;
    LessonState.currentTopic = null;
    
    PracticeState.currentTopic = null;
    PracticeState.currentExercise = null;
    PracticeState.exercises = [];
    PracticeState.timer = 300;
    PracticeState.timerInterval = null;
    PracticeState.isExerciseActive = false;
    PracticeState.isReviewMode = false;
    PracticeState.userPracticeProgress = {};
    
    QuizState.currentQuiz = null;
    QuizState.currentQuestionIndex = 0;
    QuizState.questions = [];
    QuizState.userAnswers = {};
    QuizState.timer = 0;
    QuizState.timerInterval = null;
    QuizState.isQuizActive = false;
    QuizState.currentAttemptId = null;
    QuizState.quizResults = null;
    QuizState.selectedCategory = null;
    QuizState.quizCategories = [];
    
    ProgressState.dailyProgress = null;
    ProgressState.weeklyProgress = null;
    ProgressState.monthlyProgress = null;
    ProgressState.learningGoals = [];
    ProgressState.topicMastery = {};
    ProgressState.moduleProgress = {};
    ProgressState.activityLog = [];
    ProgressState.dashboardStats = null;
    ProgressState.progressTrends = [];
    ProgressState.achievementTimeline = [];
    
    // Auto-login with demo again
    demoLogin();
}

// ============================================
// HAMBURGER MENU FUNCTIONS
// ============================================

function initHamburgerMenu() {
    const hamburgerBtn = document.getElementById('footerHamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuPanel = document.getElementById('mobileMenuPanel');
    
    let isMenuOpen = false;
    
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isMenuOpen = !isMenuOpen;
            
            if (isMenuOpen) {
                if (mobileMenuOverlay) {
                    mobileMenuOverlay.classList.add('active');
                }
                if (mobileMenuPanel) {
                    mobileMenuPanel.classList.add('active');
                }
                document.body.style.overflow = 'hidden';
            } else {
                if (mobileMenuOverlay) {
                    mobileMenuOverlay.classList.remove('active');
                }
                if (mobileMenuPanel) {
                    mobileMenuPanel.classList.remove('active');
                }
                document.body.style.overflow = '';
            }
        });
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isMenuOpen = false;
            if (mobileMenuOverlay) {
                mobileMenuOverlay.classList.remove('active');
            }
            if (mobileMenuPanel) {
                mobileMenuPanel.classList.remove('active');
            }
            document.body.style.overflow = '';
        });
    }
    
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isMenuOpen = false;
            this.classList.remove('active');
            if (mobileMenuPanel) {
                mobileMenuPanel.classList.remove('active');
            }
            document.body.style.overflow = '';
        });
    }
    
    adjustContentPadding();
    
    window.addEventListener('resize', adjustContentPadding);
    
    const footerNavItems = document.querySelectorAll('.footer-nav-item');
    
    footerNavItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const page = this.getAttribute('data-page');
            
            footerNavItems.forEach(navItem => {
                navItem.classList.remove('active');
            });
            
            this.classList.add('active');
            
            switch(page) {
                case 'dashboard':
                    showDashboard(e);
                    break;
                case 'practice':
                    showPracticeDashboard(e);
                    break;
                case 'quiz':
                    showQuizDashboard(e);
                    break;
                case 'settings':
                    showSettingsPage(e);
                    break;
                default:
                    console.log('Unknown page:', page);
            }
        });
    });
    
    const mobileMenuItems = document.querySelectorAll('.mobile-menu-item');
    mobileMenuItems.forEach((item, index) => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            if (index === 0) showDashboard(e);
            else if (index === 1) showPracticeDashboard(e);
            else if (index === 2) showQuizDashboard(e);
            else if (index === 3) showProgressPage(e);
            else if (index === 4) showFeedbackPage(e);
            else if (index === 5) showSettingsPage(e);
            else if (index === 6) goToModuleDashboard(e);
            else if (index === 7) logoutUser(e);
        });
    });
}

function showDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    navigateTo('dashboard');
    updateActiveNav('dashboard');
}

function showPracticeDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    navigateTo('practice');
    updateActiveNav('practice');
}

function showQuizDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    navigateTo('quizDashboard');
    updateActiveNav('quiz');
}

function showProgressPage(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    navigateTo('progress');
    updateActiveNav('progress');
}

function showFeedbackPage(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    navigateTo('feedback');
    updateActiveNav('feedback');
}

function showSettingsPage(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    navigateTo('settings');
    updateActiveNav('settings');
}

function goToModuleDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    
    if (LessonState.continueLearningLesson) {
        openLesson(LessonState.continueLearningLesson.content_id);
    } else if (LessonState.lessons.length > 0) {
        openLesson(LessonState.lessons[0].content_id);
    } else {
        navigateTo('moduleDashboard');
    }
    updateActiveNav('lessons');
}

function logoutUser(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    console.log('Logging out...');
    logoutAndRedirect();
}

function closeMobileMenu() {
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const mobileMenuPanel = document.getElementById('mobileMenuPanel');
    
    if (mobileMenuOverlay && mobileMenuPanel) {
        mobileMenuOverlay.classList.remove('active');
        mobileMenuPanel.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function updateActiveNav(activeItem) {
    const footerItems = document.querySelectorAll('.footer-nav-item');
    footerItems.forEach(item => item.classList.remove('active'));
    
    const mobileItems = document.querySelectorAll('.mobile-menu-item');
    mobileItems.forEach(item => item.classList.remove('active'));
    
    const currentPage = getCurrentPage();
    
    if (activeItem) {
        if (activeItem === 'dashboard') {
            document.querySelector('.footer-nav-item:nth-child(1)')?.classList.add('active');
            document.querySelector('.mobile-menu-item:nth-child(1)')?.classList.add('active');
        } else if (activeItem === 'practice') {
            document.querySelector('.footer-nav-item:nth-child(2)')?.classList.add('active');
            document.querySelector('.mobile-menu-item:nth-child(2)')?.classList.add('active');
        } else if (activeItem === 'quiz') {
            document.querySelector('.footer-nav-item:nth-child(4)')?.classList.add('active');
            document.querySelector('.mobile-menu-item:nth-child(3)')?.classList.add('active');
        } else if (activeItem === 'progress') {
            document.querySelector('.mobile-menu-item:nth-child(4)')?.classList.add('active');
        } else if (activeItem === 'feedback') {
            document.querySelector('.mobile-menu-item:nth-child(5)')?.classList.add('active');
        } else if (activeItem === 'settings') {
            document.querySelector('.footer-nav-item:nth-child(5)')?.classList.add('active');
            document.querySelector('.mobile-menu-item:nth-child(6)')?.classList.add('active');
        }
    } else if (currentPage) {
        if (currentPage.includes('dashboard')) {
            updateActiveNav('dashboard');
        } else if (currentPage.includes('practice')) {
            updateActiveNav('practice');
        } else if (currentPage.includes('quiz')) {
            updateActiveNav('quiz');
        } else if (currentPage.includes('progress')) {
            updateActiveNav('progress');
        } else if (currentPage.includes('feedback')) {
            updateActiveNav('feedback');
        } else if (currentPage.includes('settings')) {
            updateActiveNav('settings');
        }
    }
}

function getCurrentPage() {
    const pages = [
        'dashboard-page',
        'practice-exercises-page',
        'quiz-dashboard-page',
        'progress-page',
        'feedback-page',
        'settings-page',
        'module-dashboard-page'
    ];
    
    for (const page of pages) {
        const pageElement = document.getElementById(page);
        if (pageElement && !pageElement.classList.contains('hidden')) {
            return page;
        }
    }
    return 'dashboard-page';
}

function adjustContentPadding() {
    const footerHeight = 70;
    const containers = document.querySelectorAll('.container, .dashboard-container, .practice-container, .quiz-container, .progress-container');
    
    containers.forEach(container => {
        container.style.marginBottom = `${footerHeight}px`;
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function showNotification(message, type = 'success') {
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
    
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => {
        notification.remove();
    });
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 
                 type === 'error' ? 'fa-exclamation-circle' :
                 type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        </div>
    `;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : 
                    type === 'error' ? '#e74c3c' : 
                    type === 'warning' ? '#f39c12' : '#3498db'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s;
        max-width: 300px;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
    
    notification.addEventListener('click', () => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================

window.initApp = initApp;
window.navigateTo = navigateTo;
window.logoutAndRedirect = logoutAndRedirect;
window.showNotification = showNotification;
window.openLesson = openLesson;
window.updateLessonProgress = updateLessonProgress;
window.openPracticeForTopic = openPracticeForTopic;
window.checkPracticeUnlocked = checkPracticeUnlocked;
window.loadPracticeExercisesForTopic = loadPracticeExercisesForTopic;
window.startQuiz = startQuiz;
window.reviewQuiz = reviewQuiz;
window.initProgressDashboard = initProgressDashboard;
window.fetchDailyProgress = fetchDailyProgress;
window.fetchLearningGoals = fetchLearningGoals;
window.logUserActivity = logUserActivity;
window.updateDailyProgress = updateDailyProgress;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM fully loaded');
    initApp();
    addQuizStyles();
    addProgressStyles();
    
    // Hide any pages that might be visible
    document.querySelectorAll('#login-page, #signup-page, #loading-page, #app-selection-page').forEach(el => {
        if (el) el.classList.add('hidden');
    });
    
    // Make sure dashboard is visible if user exists
    const savedUser = localStorage.getItem('mathhub_user');
    if (savedUser) {
        setTimeout(() => {
            document.getElementById('dashboard-page')?.classList.remove('hidden');
        }, 100);
    }
});

// Add styles for hidden pages
const style = document.createElement('style');
style.textContent = `
    #login-page, #signup-page, #loading-page, #app-selection-page {
        display: none !important;
    }
`;
document.head.appendChild(style);

console.log('✨ MathHub Application Script Loaded - Direct to Dashboard Mode');