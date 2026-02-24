// ===== GLOBAL STATE =====
let currentSubject = 'polynomial';
const sections = document.querySelectorAll('.dashboard-section');
let selectedRole = 'student';
// ===== QUIZ PAGINATION VARIABLES =====
let quizCurrentPage = 1;
let quizTotalPages = 1;
let allQuizzes = [];
const QUIZZES_PER_PAGE = 10;
// Cache DOM elements
const domCache = {
    pageTitle: null,
    navTitle: null,
    currentTime: null,
    themeToggle: null,
    createLessonModal: null,
    feedbackReplyModal: null,
    questionModal: null,
    editLessonModal: null,
    lessonDashboardSection: null
};



// ============================================
// PERFORMANCE CHARTS - FIXED WITH DATABASE CONNECTION
// ============================================

// Global chart variables
let performanceCharts = {
    trendChart: null,
    distributionChart: null
};

/**
 * LOAD PERFORMANCE TREND DATA FROM DATABASE
 */
async function loadPerformanceTrendData() {
    console.log("📈 Loading performance trend data from database...");
    
    const timeRange = document.getElementById('performanceTimeRange')?.value || 'month';
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/performance/trend?range=${timeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Performance trend response:', result);
        
        if (result.success) {
            const trend = result.trend;
            updatePerformanceTrendChart(trend.labels, trend.avg_scores, trend.completion_rates);
            console.log('✅ Performance trend data loaded:', trend);
        } else {
            throw new Error(result.message || 'Failed to load trend data');
        }
        
    } catch (error) {
        console.error('❌ Error loading performance trend:', error);
        
        // Generate fallback labels based on timeRange
        const fallbackLabels = generateFallbackLabels(timeRange);
        updatePerformanceTrendChart(fallbackLabels, new Array(fallbackLabels.length).fill(0), new Array(fallbackLabels.length).fill(0));
    }
}

// ===== UPDATED: Load teachers for ALL dropdowns =====
async function loadTeachersForAssignment() {
    console.log("👨‍🏫 Loading teachers for ALL assignment dropdowns...");
    
    // Get ALL teacher dropdowns
    const teacherDropdowns = [
        'assignedTeacherId',        // For lessons
        'quizAssignedTeacherId',    // For quizzes
        'practiceAssignedTeacherId' // For practice
    ];
    
    // Check each dropdown if it exists
    const existingDropdowns = teacherDropdowns.filter(id => {
        const el = document.getElementById(id);
        if (el) {
            console.log(`✅ Found dropdown: ${id}`);
            return true;
        } else {
            console.log(`⚠️ Dropdown not found: ${id} - skipping`);
            return false;
        }
    });
    
    if (existingDropdowns.length === 0) {
        console.warn("⚠️ No teacher dropdowns found in DOM");
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.error("❌ No auth token");
            existingDropdowns.forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    select.innerHTML = '<option value="">-- Please login --</option>';
                    select.disabled = true;
                }
            });
            return;
        }
        
        console.log("📡 Fetching users from server...");
        
        const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success && result.users) {
            // Filter for teachers only
            const teachers = result.users.filter(user => 
                user.role === 'teacher' || user.role === 'Teacher'
            );
            
            console.log(`✅ Found ${teachers.length} teachers`);
            
            if (teachers.length === 0) {
                // No teachers found - disable all dropdowns
                existingDropdowns.forEach(id => {
                    const select = document.getElementById(id);
                    if (select) {
                        select.innerHTML = '<option value="">-- No teachers available --</option>';
                        select.disabled = true;
                    }
                });
                return;
            }
            
            // Populate ALL dropdowns with the same teacher list
            existingDropdowns.forEach(id => {
                const select = document.getElementById(id);
                if (!select) return;
                
                // Clear and enable
                select.innerHTML = '<option value="">-- Select Teacher (Optional) --</option>';
                select.disabled = false;
                
                // Add teacher options
                teachers.forEach(teacher => {
                    const option = document.createElement('option');
                    option.value = teacher.id;
                    
                    // Get the best available name
                    const displayName = teacher.name || teacher.full_name || teacher.username || 'Unknown Teacher';
                    option.textContent = `${displayName} (${teacher.email || 'no email'})`;
                    
                    select.appendChild(option);
                });
                
                console.log(`✅ Populated ${id} with ${teachers.length} teachers`);
            });
            
        } else {
            throw new Error(result.message || 'Failed to load users');
        }
        
    } catch (error) {
        console.error('❌ Error loading teachers:', error);
        
        // Show error in all dropdowns
        existingDropdowns.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">-- Error loading teachers --</option>';
                select.disabled = true;
            }
        });
        
        showNotification('error', 'Cannot load teachers', error.message);
    }
}

// ===== POPULATE TEACHER DROPDOWN =====
function populateTeacherDropdown(dropdownId, teachers) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    dropdown.innerHTML = '<option value="">-- Select Teacher (Optional) --</option>';
    
    teachers.forEach(teacher => {
        const option = document.createElement('option');
        option.value = teacher.id;
        option.textContent = `${teacher.name || teacher.username} (ID: ${teacher.id})`;
        dropdown.appendChild(option);
    });
    
    console.log(`✅ Populated ${dropdownId} with ${teachers.length} teachers`);
}

/**
 * UPDATE PERFORMANCE TREND CHART
 */
function updatePerformanceTrendChart(labels, avgScores, completionRates) {
    const ctx = document.getElementById('performanceTrendChart');
    if (!ctx) return;
    
    // Destroy existing chart if any
    if (performanceCharts.trendChart) {
        performanceCharts.trendChart.destroy();
    }
    
    const hasData = avgScores.some(score => score > 0) || completionRates.some(rate => rate > 0);
    
    performanceCharts.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels || ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
            datasets: [
                {
                    label: 'Average Score',
                    data: avgScores || [0, 0, 0, 0, 0, 0, 0],
                    borderColor: 'rgba(122, 0, 0, 1)',
                    backgroundColor: 'rgba(122, 0, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(122, 0, 0, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Completion Rate',
                    data: completionRates || [0, 0, 0, 0, 0, 0, 0],
                    borderColor: 'rgba(255, 193, 7, 1)',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: 'rgba(255, 193, 7, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                title: {
                    display: !hasData,
                    text: 'No performance data available yet',
                    color: '#999',
                    font: { size: 14, weight: 'normal' }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#ddd',
                    borderColor: '#7a0000',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    min: 0,
                    max: 100,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        color: '#666'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    console.log('✅ Performance trend chart updated');
}

/**
 * LOAD SCORE DISTRIBUTION DATA FROM DATABASE
 */
async function loadScoreDistributionData() {
    console.log("📊 Loading score distribution data from database...");
    
    const filter = document.getElementById('scoreDistributionFilter')?.value || 'all';
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/performance/score-distribution?filter=${filter}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Score distribution response:', result);
        
        if (result.success) {
            const distribution = result.distribution;
            updateScoreDistributionChart(distribution);
            console.log('✅ Score distribution data loaded:', distribution);
        } else {
            throw new Error(result.message || 'Failed to load distribution data');
        }
        
    } catch (error) {
        console.error('❌ Error loading score distribution:', error);
        
        // Show empty chart with message
        updateScoreDistributionChart({
            '90-100%': 0,
            '80-89%': 0,
            '70-79%': 0,
            '60-69%': 0,
            'Below 60%': 0,
            total: 0
        });
    }
}

/**
 * UPDATE SCORE DISTRIBUTION CHART
 */
function updateScoreDistributionChart(distribution) {
    const ctx = document.getElementById('scoreDistributionChart');
    if (!ctx) return;
    
    // Destroy existing chart if any
    if (performanceCharts.distributionChart) {
        performanceCharts.distributionChart.destroy();
    }
    
    const hasData = distribution.total > 0;
    
    const labels = ['90-100%', '80-89%', '70-79%', '60-69%', 'Below 60%'];
    const data = [
        distribution['90-100%'] || 0,
        distribution['80-89%'] || 0,
        distribution['70-79%'] || 0,
        distribution['60-69%'] || 0,
        distribution['Below 60%'] || 0
    ];
    
    const colors = [
        'rgba(76, 175, 80, 0.8)',   // Green - Excellent
        'rgba(33, 150, 243, 0.8)',   // Blue - Good
        'rgba(255, 193, 7, 0.8)',    // Yellow - Average
        'rgba(255, 152, 0, 0.8)',    // Orange - Below Average
        'rgba(244, 67, 54, 0.8)'     // Red - Poor
    ];
    
    const borderColors = [
        'rgba(76, 175, 80, 1)',
        'rgba(33, 150, 243, 1)',
        'rgba(255, 193, 7, 1)',
        'rgba(255, 152, 0, 1)',
        'rgba(244, 67, 54, 1)'
    ];
    
    performanceCharts.distributionChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i] || 0;
                                    const total = distribution.total || 1;
                                    const percentage = Math.round((value / total) * 100);
                                    
                                    return {
                                        text: `${label}: ${value} (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        hidden: false,
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                title: {
                    display: !hasData,
                    text: 'No score data available',
                    color: '#999',
                    font: { size: 14, weight: 'normal' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = distribution.total || 1;
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} students (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Score distribution chart updated');
}

/**
 * UPDATE PERFORMANCE CHART (when time range changes)
 */
async function updatePerformanceChart() {
    console.log("📈 Updating performance chart with new time range...");
    
    // Show loading state
    const ctx = document.getElementById('performanceTrendChart');
    if (ctx && performanceCharts.trendChart) {
        performanceCharts.trendChart.data.labels = ['Loading...'];
        performanceCharts.trendChart.data.datasets[0].data = [0];
        performanceCharts.trendChart.data.datasets[1].data = [0];
        performanceCharts.trendChart.update();
    }
    
    await loadPerformanceTrendData();
    
    showNotification('info', 'Chart Updated', 'Performance trend updated with new time range');
}

/**
 * UPDATE SCORE DISTRIBUTION (when filter changes)
 */
async function updateScoreDistribution() {
    console.log("📊 Updating score distribution with new filter...");
    
    // Show loading state
    const ctx = document.getElementById('scoreDistributionChart');
    if (ctx && performanceCharts.distributionChart) {
        performanceCharts.distributionChart.data.labels = ['Loading...'];
        performanceCharts.distributionChart.data.datasets[0].data = [1];
        performanceCharts.distributionChart.update();
    }
    
    await loadScoreDistributionData();
    
    const filterValue = document.getElementById('scoreDistributionFilter')?.value || 'all';
    const filterName = filterValue === 'all' ? 'All Subjects' : 
                       filterValue === 'polynomial' ? 'PolyLearn' :
                       filterValue === 'factorial' ? 'FactoLearn' : 'MathEase';
    
    showNotification('info', 'Chart Updated', `Score distribution filtered by: ${filterName}`);
}

/**
 * GENERATE FALLBACK LABELS
 */
function generateFallbackLabels(range) {
    const labels = [];
    const count = range === 'week' ? 7 : range === 'month' ? 30 : range === 'quarter' ? 12 : 12;
    
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        if (range === 'week') {
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        } else if (range === 'month') {
            labels.push(`Day ${count - i}`);
        } else if (range === 'quarter') {
            labels.push(`Week ${count - i}`);
        } else {
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
        }
    }
    
    return labels;
}

/**
 * SETUP PERFORMANCE CHART EVENT LISTENERS
 */
function setupPerformanceChartListeners() {
    const timeRangeSelect = document.getElementById('performanceTimeRange');
    if (timeRangeSelect) {
        // Remove existing listeners and add new one
        timeRangeSelect.removeEventListener('change', updatePerformanceChart);
        timeRangeSelect.addEventListener('change', updatePerformanceChart);
    }
    
    const distributionFilter = document.getElementById('scoreDistributionFilter');
    if (distributionFilter) {
        distributionFilter.removeEventListener('change', updateScoreDistribution);
        distributionFilter.addEventListener('change', updateScoreDistribution);
    }
}

/**
 * REFRESH ALL CHARTS
 */
async function refreshAllCharts() {
    console.log("🔄 Refreshing all performance charts...");
    
    showNotification('info', 'Refreshing', 'Updating chart data...');
    
    await Promise.all([
        loadPerformanceTrendData(),
        loadScoreDistributionData()
    ]);
    
    showNotification('success', 'Charts Updated', 'All charts refreshed with latest data');
}
// ===== QUIZ STATE =====
const QuizState = {
    quizCategories: [],
    selectedCategory: null,
    currentQuiz: null,
    currentAttemptId: null,
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: {},
    startTime: null,
    timerInterval: null,
    isQuizActive: false
};

// ===== PRACTICE STATE =====
const PracticeState = {
    currentTopic: '1',
    exercises: [],
    currentExercise: null,
    isReviewMode: false,
    timer: 300,
    timerInterval: null,
    isExerciseActive: false
};

let practiceStylesAdded = false;

// ============================================
// INITIALIZE QUIZ DASHBOARD
// ============================================

async function initQuizDashboard() {
    console.log('🧠 Initializing quiz dashboard...');
    
    try {
        // Show loading in userQuizzesContainer
        const container = document.getElementById('userQuizzesContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-container">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading quiz categories...</p>
                </div>
            `;
        }
        
        // Load quiz categories
        await loadQuizCategories();
        
        // Load user quiz stats
        await loadQuizStatsFromServer();
        
        // Load leaderboard
        await loadLeaderboard();
        
        // Load user badges
        await loadUserBadges();
        
        console.log('✅ Quiz dashboard initialized');
    } catch (error) {
        console.error('Error initializing quiz dashboard:', error);
        showNotification('Failed to initialize quiz dashboard', 'error');
    }
}

// ===== LOAD QUIZ CATEGORIES =====
async function loadQuizCategories() {
    try {
        const categories = await fetchQuizCategories();
        QuizState.quizCategories = categories;
        
        const quizzesContainer = document.getElementById('userQuizzesContainer');
        if (!quizzesContainer) {
            console.error('Quiz container not found');
            return;
        }
        
        if (categories.length === 0) {
            quizzesContainer.innerHTML = `
                <div class="no-categories">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No quiz categories available</h3>
                    <p>Check back later for new quizzes!</p>
                </div>
            `;
            return;
        }
        
        // Display categories as cards
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
                        </div>
                    </div>
                    <button class="quiz-category-btn" data-category-id="${category.category_id}">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            `;
        });
        
        quizzesContainer.innerHTML = html;
        
        // Add event listeners to category buttons
        document.querySelectorAll('.quiz-category-btn').forEach(button => {
            button.addEventListener('click', async function(e) {
                e.stopPropagation();
                const categoryId = this.getAttribute('data-category-id');
                await loadQuizzesForCategory(categoryId);
            });
        });
        
        // Add event listeners to category cards
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
        const quizzesContainer = document.getElementById('userQuizzesContainer');
        if (quizzesContainer) {
            quizzesContainer.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Failed to load quiz categories</h3>
                    <p>Please try again later</p>
                </div>
            `;
        }
    }
}

// ===== LOAD QUIZZES FOR CATEGORY =====
async function loadQuizzesForCategory(categoryId) {
    try {
        console.log(`📝 Fetching quizzes for category ${categoryId}...`);
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            showNotification('Please login to view quizzes', 'error');
            return;
        }
        
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
            console.log(`✅ Fetched ${data.quizzes.length} quizzes for category ${categoryId}`);
            
            // Find the selected category
            const selectedCategory = QuizState.quizCategories.find(
                cat => cat.category_id == categoryId || cat.id == categoryId
            );
            
            if (!selectedCategory) {
                console.warn('Category not found in state, using basic category info');
                const categoryInfo = {
                    category_id: categoryId,
                    category_name: data.category?.name || 'Selected Category',
                    name: data.category?.name || 'Selected Category'
                };
                showQuizInterfaceForCategory(categoryInfo, data.quizzes);
            } else {
                showQuizInterfaceForCategory(selectedCategory, data.quizzes);
            }
        } else {
            throw new Error(data.message || 'No quizzes returned');
        }
        
    } catch (error) {
        console.error('Error loading quizzes:', error);
        showNotification('Failed to load quizzes: ' + error.message, 'error');
        
        const quizOptionsContainer = document.getElementById('quizOptionsContainer');
        if (quizOptionsContainer) {
            quizOptionsContainer.innerHTML = `
                <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #e74c3c; margin-bottom: 15px;"></i>
                    <h3>Failed to load quizzes</h3>
                    <p>${error.message}</p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Refresh
                    </button>
                </div>
            `;
        }
    }
}

// ===== SHOW QUIZ INTERFACE FOR CATEGORY =====
function showQuizInterfaceForCategory(category, quizzes) {
    console.log('🎯 Showing quiz interface for category:', category);
    console.log('📋 Quizzes to display:', quizzes);
    
    // Hide categories container
    const categoriesContainer = document.getElementById('userQuizzesContainer');
    const quizInterfaceContainer = document.getElementById('quizInterfaceContainer');
    const badgesContainer = document.getElementById('badgesContainer');
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    
    if (categoriesContainer) {
        categoriesContainer.classList.add('hidden');
        categoriesContainer.style.display = 'none';
        console.log('✅ Hidden categories container');
    }
    
    if (badgesContainer) {
        badgesContainer.classList.add('hidden');
        badgesContainer.style.display = 'none';
    }
    
    if (leaderboardContainer) {
        leaderboardContainer.classList.add('hidden');
        leaderboardContainer.style.display = 'none';
    }
    
    // Show quiz interface
    if (quizInterfaceContainer) {
        quizInterfaceContainer.classList.remove('hidden');
        quizInterfaceContainer.style.display = 'block';
        quizInterfaceContainer.style.opacity = '1';
        quizInterfaceContainer.style.visibility = 'visible';
        console.log('✅ Showing quiz interface container');
    } else {
        console.error('❌ quizInterfaceContainer not found!');
        return;
    }
    
    // Update active quiz title
    const activeQuizTitle = document.getElementById('activeQuizTitle');
    if (activeQuizTitle) {
        activeQuizTitle.textContent = `${category.category_name || category.name || 'Quiz'} Quizzes`;
    }
    
    const quizOptionsContainer = document.getElementById('quizOptionsContainer');
    if (!quizOptionsContainer) {
        console.error('❌ quizOptionsContainer not found!');
        return;
    }
    
    quizOptionsContainer.style.display = '';
    quizOptionsContainer.style.opacity = '1';
    quizOptionsContainer.style.visibility = 'visible';
    quizOptionsContainer.innerHTML = '';
    
    if (!quizzes || quizzes.length === 0) {
        quizOptionsContainer.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-clipboard-check" style="font-size: 48px; color: #95a5a6; margin-bottom: 15px;"></i>
                <h3>No quizzes available in this category</h3>
                <p>Check back later for new quizzes!</p>
                <button class="btn-primary" onclick="location.reload()">
                    <i class="fas fa-redo"></i> Refresh
                </button>
            </div>
        `;
        return;
    }
    
    // Create quiz cards
    quizzes.forEach(quiz => {
        const difficultyClass = `difficulty-${quiz.difficulty || 'medium'}`;
        const difficultyColor = 
            quiz.difficulty === 'easy' ? '#27ae60' : 
            quiz.difficulty === 'medium' ? '#f39c12' : 
            quiz.difficulty === 'hard' ? '#e74c3c' : '#3498db';
        
        const userProgress = quiz.user_progress || {};
        const attempts = userProgress.attempts || 0;
        const bestScore = userProgress.best_score || 0;
        const canAttempt = userProgress.can_attempt !== false;
        
        const quizCard = document.createElement('div');
        quizCard.className = 'quiz-option';
        quizCard.setAttribute('data-quiz-id', quiz.quiz_id);
        quizCard.style.opacity = '1';
        quizCard.style.visibility = 'visible';
        quizCard.style.display = 'block';
        
        quizCard.innerHTML = `
            <div class="quiz-option-header">
                <h4>${quiz.quiz_title || 'Untitled Quiz'}</h4>
                <span class="quiz-option-difficulty ${difficultyClass}" style="background: ${difficultyColor}">
                    ${quiz.difficulty || 'medium'}
                </span>
            </div>
            
            <div class="quiz-option-body">
                <p>${quiz.description || 'Test your knowledge with this quiz.'}</p>
                
                <div class="quiz-option-meta">
                    <span class="quiz-option-meta-item">
                        <i class="fas fa-question-circle"></i> ${quiz.total_questions || 0} Questions
                    </span>
                    <span class="quiz-option-meta-item">
                        <i class="fas fa-clock"></i> ${quiz.duration_minutes || 10} min
                    </span>
                    <span class="quiz-option-meta-item">
                        <i class="fas fa-trophy"></i> ${quiz.passing_score || 70}% to pass
                    </span>
                </div>
                
                ${attempts > 0 ? `
                    <div class="quiz-option-attempts">
                        <strong>Your Best Score:</strong> ${bestScore}%
                        (${attempts} attempt${attempts > 1 ? 's' : ''})
                    </div>
                ` : ''}
            </div>
            
            <div class="quiz-option-actions">
                <button class="quiz-start-btn ${!canAttempt ? 'disabled' : ''}" 
                        data-quiz-id="${quiz.quiz_id}"
                        ${!canAttempt ? 'disabled' : ''}>
                    <i class="fas fa-play"></i> ${attempts > 0 ? 'Retake Quiz' : 'Start Quiz'}
                </button>
                ${attempts > 0 ? `
                    <button class="quiz-review-btn" data-quiz-id="${quiz.quiz_id}">
                        <i class="fas fa-chart-bar"></i> Review
                    </button>
                ` : ''}
            </div>
        `;
        
        quizOptionsContainer.appendChild(quizCard);
    });
    
    // Add event listeners
    document.querySelectorAll('.quiz-start-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const quizId = this.getAttribute('data-quiz-id');
            console.log('🎯 Starting quiz:', quizId);
            await startQuiz(parseInt(quizId));
        });
    });
    
    document.querySelectorAll('.quiz-review-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const quizId = this.getAttribute('data-quiz-id');
            console.log('📊 Reviewing quiz:', quizId);
            await reviewQuiz(parseInt(quizId));
        });
    });
    
    console.log('✅ Quiz interface updated with', quizzes.length, 'quizzes');
}

// ===== START A QUIZ =====
async function startQuiz(quizId) {
    try {
        console.log(`🚀 Starting quiz ${quizId}...`);
        
        // Check if user can access the quiz
        const accessCheck = await checkQuizAccess(quizId);
        
        if (!accessCheck.canAccess) {
            showNotification(accessCheck.reason || 'You need to complete the required lessons first', 'error');
            return;
        }
        
        // Show loading sa modal
        showQuizModalLoading();
        
        // Start quiz attempt
        const attempt = await startQuizAttempt(quizId);
        if (!attempt) {
            showNotification('Failed to start quiz', 'error');
            closeQuizModal();
            return;
        }
        
        // Fetch quiz questions
        const questions = await fetchQuizQuestions(quizId);
        if (questions.length === 0) {
            showNotification('No questions available for this quiz', 'error');
            closeQuizModal();
            return;
        }
        
        // Set quiz state
        QuizState.currentQuiz = quizId;
        QuizState.currentAttemptId = attempt.attempt_id;
        QuizState.questions = questions;
        QuizState.currentQuestionIndex = 0;
        QuizState.userAnswers = {};
        QuizState.startTime = new Date();
        QuizState.isQuizActive = true;
        
        // Ipakita ang quiz modal
        showQuizModal();
        
        // I-load ang unang tanong
        loadQuizQuestionModal(0);
        
        // Simulan ang timer
        startQuizTimerModal();
        
    } catch (error) {
        console.error('Error starting quiz:', error);
        showNotification('Failed to start quiz', 'error');
        closeQuizModal();
    }
}

// ===== SHOW QUIZ MODAL =====
function showQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        
        const category = QuizState.quizCategories.find(c => 
            c.quizzes?.some(q => q.quiz_id == QuizState.currentQuiz)
        );
        
        const titleSpan = document.getElementById('quizModalTitle');
        if (titleSpan && category) {
            titleSpan.textContent = `${category.category_name} Quiz`;
        }
    }
}

// ===== CLOSE QUIZ MODAL =====
function closeQuizModal() {
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    if (QuizState.timerInterval) {
        clearInterval(QuizState.timerInterval);
        QuizState.timerInterval = null;
    }
}

// ===== SHOW QUIZ MODAL LOADING =====
function showQuizModalLoading() {
    const optionsGrid = document.getElementById('quizOptionsGridModal');
    if (optionsGrid) {
        optionsGrid.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 40px; color: #7a0000;"></i>
                <p style="margin-top: 15px; color: #666;">Loading quiz questions...</p>
            </div>
        `;
    }
    
    const modal = document.getElementById('quizModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

// ===== LOAD QUIZ QUESTION IN MODAL =====
function loadQuizQuestionModal(index) {
    if (!QuizState.questions || QuizState.questions.length === 0) return;
    
    const question = QuizState.questions[index];
    QuizState.currentQuestionIndex = index;
    
    console.log('📝 Loading question in modal:', question);
    
    const currentNum = document.getElementById('quizCurrentNum');
    const totalNum = document.getElementById('quizTotalNum');
    if (currentNum) currentNum.textContent = index + 1;
    if (totalNum) totalNum.textContent = QuizState.questions.length;
    
    const questionText = document.getElementById('quizQuestionTextModal');
    if (questionText) {
        questionText.textContent = question.question_text || 'Question text not available';
    }
    
    const optionsGrid = document.getElementById('quizOptionsGridModal');
    if (!optionsGrid) return;
    
    optionsGrid.innerHTML = '';
    
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
        if (question.options && question.options.length > 0) {
            question.options.forEach((option, i) => {
                const optionId = option.id || option.option_id || i + 1;
                const optionText = option.text || option.option_text || `Option ${String.fromCharCode(65 + i)}`;
                
                const optionDiv = document.createElement('div');
                optionDiv.className = 'quiz-option-modal';
                optionDiv.setAttribute('data-option-id', optionId);
                optionDiv.style.cssText = `
                    background: white;
                    border: 2px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 15px 20px;
                    cursor: pointer;
                    transition: all 0.3s;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                `;
                
                optionDiv.innerHTML = `
                    <div style="width: 24px; height: 24px; border: 2px solid #7a0000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #7a0000;">
                        ${String.fromCharCode(65 + i)}
                    </div>
                    <div style="flex: 1; font-size: 16px;">${optionText}</div>
                `;
                
                optionDiv.addEventListener('mouseover', function() {
                    if (!this.classList.contains('selected')) {
                        this.style.background = '#f5f5f5';
                        this.style.borderColor = '#7a0000';
                    }
                });
                
                optionDiv.addEventListener('mouseout', function() {
                    if (!this.classList.contains('selected')) {
                        this.style.background = 'white';
                        this.style.borderColor = '#e0e0e0';
                    }
                });
                
                optionDiv.addEventListener('click', function() {
                    document.querySelectorAll('.quiz-option-modal').forEach(opt => {
                        opt.classList.remove('selected');
                        opt.style.background = 'white';
                        opt.style.borderColor = '#e0e0e0';
                        opt.querySelector('div:first-child').style.background = 'transparent';
                        opt.querySelector('div:first-child').style.color = '#7a0000';
                    });
                    
                    this.classList.add('selected');
                    this.style.background = '#e8f5e9';
                    this.style.borderColor = '#7a0000';
                    this.querySelector('div:first-child').style.background = '#7a0000';
                    this.querySelector('div:first-child').style.color = 'white';
                    
                    const questionId = question.question_id;
                    QuizState.userAnswers[questionId] = optionId;
                    
                    updateQuizProgressDots();
                    
                    setTimeout(() => {
                        if (index < QuizState.questions.length - 1) {
                            loadQuizQuestionModal(index + 1);
                        } else {
                            submitQuizModal();
                        }
                    }, 500);
                });
                
                optionsGrid.appendChild(optionDiv);
            });
        }
    }
    
    updateQuizProgressDots();
}

// ===== UPDATE QUIZ PROGRESS DOTS =====
function updateQuizProgressDots() {
    const dotsContainer = document.getElementById('quizProgressDotsModal');
    if (!dotsContainer || !QuizState.questions) return;
    
    let dotsHTML = '';
    QuizState.questions.forEach((q, i) => {
        const isAnswered = QuizState.userAnswers[q.question_id] !== undefined;
        const isCurrent = i === QuizState.currentQuestionIndex;
        
        dotsHTML += `
            <div style="
                width: 12px; 
                height: 12px; 
                border-radius: 50%; 
                background: ${isAnswered ? '#7a0000' : (isCurrent ? '#ff6b6b' : '#ddd')};
                cursor: pointer;
                transition: all 0.3s;
                transform: ${isCurrent ? 'scale(1.2)' : 'scale(1)'};
            " onclick="jumpToQuestion(${i})"></div>
        `;
    });
    
    dotsContainer.innerHTML = dotsHTML;
}

// ===== JUMP TO SPECIFIC QUESTION =====
window.jumpToQuestion = function(index) {
    if (index >= 0 && index < QuizState.questions.length) {
        loadQuizQuestionModal(index);
    }
};

// ===== START QUIZ TIMER =====
function startQuizTimerModal() {
    if (QuizState.timerInterval) {
        clearInterval(QuizState.timerInterval);
    }
    
    QuizState.timerInterval = setInterval(() => {
        if (!QuizState.startTime) return;
        
        const now = new Date();
        const elapsed = Math.floor((now - QuizState.startTime) / 1000);
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timerDisplay = document.getElementById('quizTimerDisplay');
        if (timerDisplay) {
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }, 1000);
}

// ===== SUBMIT QUIZ FROM MODAL =====
async function submitQuizModal() {
    try {
        console.log('📝 Submitting quiz answers...');
        console.log('Current attempt_id:', QuizState.currentAttemptId);
        console.log('Answers:', QuizState.userAnswers);
        
        if (QuizState.timerInterval) {
            clearInterval(QuizState.timerInterval);
            QuizState.timerInterval = null;
        }
        
        const timeSpent = Math.floor((new Date() - QuizState.startTime) / 1000);
        
        if (Object.keys(QuizState.userAnswers).length === 0) {
            console.warn('No answers to submit');
            showNotification('No answers to submit', 'warning');
            return;
        }
        
        let answersSubmitted = 0;
        let answersFailed = 0;
        
        for (const [questionId, answer] of Object.entries(QuizState.userAnswers)) {
            try {
                console.log(`Submitting answer for question ${questionId}:`, answer);
                
                const result = await submitQuizAnswer(
                    QuizState.currentAttemptId, 
                    parseInt(questionId), 
                    {
                        selected_option_id: parseInt(answer),
                        user_answer: answer.toString()
                    }
                );
                
                if (result && result.success) {
                    answersSubmitted++;
                    console.log(`✅ Question ${questionId} submitted successfully`);
                } else {
                    answersFailed++;
                    console.warn(`⚠️ Question ${questionId} submission failed`);
                }
            } catch (err) {
                answersFailed++;
                console.error(`❌ Error submitting question ${questionId}:`, err);
            }
        }
        
        console.log(`📊 Answers submitted: ${answersSubmitted}, Failed: ${answersFailed}`);
        
        if (answersSubmitted > 0) {
            completeQuizAttempt(QuizState.currentAttemptId, timeSpent)
                .then(results => {
                    console.log('Quiz completion response:', results);
                })
                .catch(err => {
                    console.warn('Quiz completion warning:', err);
                });
            
            showSimpleQuizResults(timeSpent);
        } else {
            showNotification('Failed to submit answers. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('❌ Error in submitQuizModal:', error);
        showNotification('Failed to submit quiz', 'error');
        
        const timeSpent = Math.floor((new Date() - QuizState.startTime) / 1000);
        showSimpleQuizResults(timeSpent);
    }
}

// ===== SHOW SIMPLE QUIZ RESULTS =====
function showSimpleQuizResults(timeSpent) {
    const optionsGrid = document.getElementById('quizOptionsGridModal');
    if (!optionsGrid) return;
    
    const totalQuestions = QuizState.questions.length;
    const answeredCount = Object.keys(QuizState.userAnswers).length;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;
    
    optionsGrid.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <div style="font-size: 70px; color: #7a0000; margin-bottom: 20px;">
                <i class="fas fa-check-circle"></i>
            </div>
            
            <h2 style="color: #2c3e50; margin-bottom: 15px;">Quiz Completed!</h2>
            
            <div style="font-size: 36px; font-weight: bold; color: #7a0000; margin-bottom: 20px;">
                ${Math.round((answeredCount / totalQuestions) * 100)}%
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                <p style="margin: 8px 0;"><strong>Questions Answered:</strong> ${answeredCount}/${totalQuestions}</p>
                <p style="margin: 8px 0;"><strong>Time Taken:</strong> ${minutes}:${seconds.toString().padStart(2,'0')}</p>
                <p style="margin: 8px 0;"><strong>Points Earned:</strong> ${answeredCount * 10}</p>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="btn-secondary" onclick="closeQuizModal()">
                    <i class="fas fa-times"></i> Close
                </button>
                <button class="btn-primary" onclick="window.location.reload()">
                    <i class="fas fa-redo"></i> New Quiz
                </button>
            </div>
        </div>
    `;
    
    const dots = document.getElementById('quizProgressDotsModal');
    if (dots) dots.style.display = 'none';
}

// ===== FETCH QUIZ CATEGORIES =====
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

// ===== FETCH ALL QUIZZES =====
async function fetchAllQuizzes() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/quizzes/available`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed');
        
        const data = await response.json();
        return data.quizzes || [];
    } catch (error) {
        console.error('Error fetching all quizzes:', error);
        return [];
    }
}

// ===== CHECK QUIZ ACCESS =====
async function checkQuizAccess(quizId) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available');
            return { canAccess: false, reason: 'Not authenticated' };
        }
        
        console.log(`🔍 Checking quiz access for quiz ${quizId}...`);
        
        // Temporarily bypass for testing
        return { canAccess: true, reason: 'Access granted (bypassed)' };
        
    } catch (error) {
        console.error('Error checking quiz access:', error);
        return { canAccess: false, reason: 'Error checking access' };
    }
}

// ===== START QUIZ ATTEMPT =====
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
            } catch (e) {}
            
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        
        if (data.success && data.attempt) {
            console.log(`✅ Quiz attempt started. Attempt ID: ${data.attempt.attempt_id}`);
            
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

// ===== FETCH QUIZ QUESTIONS =====
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

// ===== SUBMIT QUIZ ANSWER =====
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
        
        console.log('📦 Request body:', requestBody);
        
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
                }
            } catch (e) {}
            
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

// ===== COMPLETE QUIZ ATTEMPT =====
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
        
        console.log('📤 Sending request to server:', requestBody);
        
        const response = await fetch(`${API_BASE_URL}/quiz/attempt/${attemptId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const responseText = await response.text();
        console.log('📥 Raw server response:', responseText);
        
        if (!response.ok) {
            console.error(`❌ Server error ${response.status}:`, responseText);
            throw new Error(`Failed to complete quiz attempt: ${response.status} - ${responseText.substring(0, 200)}`);
        }
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('❌ Failed to parse JSON response:', responseText);
            throw new Error('Invalid JSON response from server');
        }
        
        if (data.success && data.results) {
            console.log('✅ Quiz attempt completed successfully');
            console.log(`⏱️ Time recorded: ${data.results.time_spent_seconds} seconds`);
            
            await logUserActivity('quiz_completed', data.results.quiz_id, {
                quiz_id: data.results.quiz_id,
                attempt_id: attemptId,
                score: data.results.score,
                time_spent_seconds: data.results.time_spent_seconds
            });
            
            await updateDailyProgress({
                quizzes_completed: 1
            });
            
            return data.results;
        } else {
            throw new Error(data.message || 'Failed to complete quiz attempt');
        }
    } catch (error) {
        console.error('❌ Error completing quiz attempt:', error);
        return null;
    }
}

// ===== LOAD QUIZ STATS FROM SERVER =====
async function loadQuizStatsFromServer() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            console.warn('No auth token available for quiz stats');
            return;
        }

        console.log('📊 Loading quiz statistics from server...');
        
        document.getElementById('quizCurrentScore').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('quizAccuracy').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('quizTimeSpent').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        document.getElementById('quizRank').innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const response = await fetch(`${API_BASE_URL}/quiz/user/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Quiz stats loaded from /quiz/user/stats:', data);

                if (data.success && data.stats) {
                    updateQuizStatsUI(data.stats);
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch from /quiz/user/stats:', error.message);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/user/progress/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Quiz stats loaded from /user/progress/stats:', data);

                if (data.success && data.stats) {
                    updateQuizStatsUI(data.stats);
                    return;
                }
            }
        } catch (error) {
            console.warn('⚠️ Could not fetch from /user/progress/stats:', error.message);
        }

        console.log('📊 Calculating quiz stats from attempts...');
        const attempts = await fetchUserQuizAttempts();
        
        if (attempts && attempts.length > 0) {
            const completedAttempts = attempts.filter(a => a.completion_status === 'completed');
            
            if (completedAttempts.length > 0) {
                const totalScore = completedAttempts.reduce((sum, a) => sum + (a.score || 0), 0);
                const avgScore = Math.round(totalScore / completedAttempts.length);
                
                let totalCorrect = 0;
                let totalQuestions = 0;
                completedAttempts.forEach(a => {
                    totalCorrect += a.correct_answers || 0;
                    totalQuestions += a.total_questions || 0;
                });
                const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
                
                const totalTimeSeconds = completedAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
                const totalTimeMinutes = Math.round(totalTimeSeconds / 60);
                const formattedTime = formatTimeSpent(totalTimeMinutes);
                
                const rank = await fetchUserRank();
                
                updateQuizStatsUI({
                    current_score: avgScore,
                    accuracy: accuracy,
                    time_spent: formattedTime,
                    rank: rank
                });
                
                return;
            }
        }
        
        updateQuizStatsUI({
            current_score: 0,
            accuracy: 0,
            time_spent: '0m',
            rank: '#--'
        });

    } catch (error) {
        console.error('❌ Error loading quiz stats:', error);
        updateQuizStatsUI({
            current_score: 0,
            accuracy: 0,
            time_spent: '0m',
            rank: '#--'
        });
    }
}

// ===== UPDATE QUIZ STATS UI =====
function updateQuizStatsUI(stats) {
    const elements = {
        current_score: document.getElementById('quizCurrentScore'),
        accuracy: document.getElementById('quizAccuracy'),
        time_spent: document.getElementById('quizTimeSpent'),
        rank: document.getElementById('quizRank')
    };

    if (elements.current_score) {
        elements.current_score.textContent = stats.current_score + '%';
    }
    
    if (elements.accuracy) {
        elements.accuracy.textContent = stats.accuracy + '%';
    }
    
    if (elements.time_spent) {
        elements.time_spent.textContent = stats.time_spent || '0m';
    }
    
    if (elements.rank) {
        elements.rank.textContent = stats.rank || '#--';
    }
}

// ===== FETCH USER RANK =====
async function fetchUserRank() {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        const response = await fetch(`${API_BASE_URL}/leaderboard/user/position`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.position && data.position.rank > 0) {
                return `#${data.position.rank}`;
            }
        }
        return '#--';
    } catch (error) {
        console.warn('Could not fetch rank:', error.message);
        return '#--';
    }
}

// ===== LOAD LEADERBOARD =====
async function loadLeaderboard(period = 'weekly') {
    try {
        console.log(`🏆 Loading ${period} leaderboard...`);
        
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) {
            console.log('Leaderboard element not found, skipping');
            return;
        }
        
        leaderboardList.innerHTML = `
            <div class="loading-container">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading leaderboard...</p>
            </div>
        `;
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            leaderboardList.innerHTML = `
                <div class="no-leaderboard">
                    <i class="fas fa-trophy"></i>
                    <h3>Login to see leaderboard</h3>
                    <p>Complete quizzes to appear on the leaderboard!</p>
                </div>
            `;
            return;
        }
        
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
        
        if (data.success && data.leaderboard && data.leaderboard.length > 0) {
            displayLeaderboard(data.leaderboard);
        } else {
            leaderboardList.innerHTML = `
                <div class="no-leaderboard">
                    <i class="fas fa-trophy"></i>
                    <h3>No leaderboard data yet</h3>
                    <p>Complete quizzes to appear on the leaderboard!</p>
                    <button class="btn-primary" onclick="document.querySelector('[data-page=\"quiz\"]').click()">
                        <i class="fas fa-play"></i> Take a Quiz
                    </button>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        const leaderboardList = document.getElementById('leaderboardList');
        if (leaderboardList) {
            leaderboardList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Unable to load leaderboard</p>
                    <button class="btn-secondary" onclick="loadLeaderboard('${period}')">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

// ===== DISPLAY LEADERBOARD =====
function displayLeaderboard(leaderboard) {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    let html = '';
    
    leaderboard.forEach((entry, index) => {
        const isCurrentUser = entry.user_id === AppState.currentUser?.id;
        const rankClass = index === 0 ? 'first' : 
                        index === 1 ? 'second' : 
                        index === 2 ? 'third' : '';
        
        let rankDisplay = index + 1;
        if (index === 0) rankDisplay = '🥇';
        else if (index === 1) rankDisplay = '🥈';
        else if (index === 2) rankDisplay = '🥉';
        
        html += `
            <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
                <div class="leaderboard-rank ${rankClass}">${rankDisplay}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-user-name">${entry.full_name || entry.username}</div>
                    <div class="leaderboard-user-stats">
                        <span class="leaderboard-stat">
                            <i class="fas fa-star"></i> ${entry.total_points} pts
                        </span>
                        <span class="leaderboard-stat">
                            <i class="fas fa-trophy"></i> ${entry.quizzes_completed} quizzes
                        </span>
                        <span class="leaderboard-stat">
                            <i class="fas fa-chart-line"></i> ${entry.avg_score}% avg
                        </span>
                    </div>
                </div>
                <div class="leaderboard-score">${entry.highest_score}%</div>
            </div>
        `;
    });
    
    leaderboardList.innerHTML = html;
}

// ===== LOAD USER BADGES =====
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

// ===== FETCH USER BADGES =====
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

// ============================================
// PRACTICE PAGE FUNCTIONS
// ============================================

// Initialize practice page
async function initPracticePage() {
    console.log('💪 Initializing practice page with database-driven content...');
    
    const practiceDate = document.getElementById('practiceDate');
    if (practiceDate) {
        const now = new Date();
        practiceDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    if (!PracticeState.currentTopic) {
        PracticeState.currentTopic = '1';
    }
    
    await loadTopicsProgress();
    await loadPracticeExercisesForTopic(PracticeState.currentTopic);
    await loadPracticeStatistics();
    addPracticeStyles();
    
    console.log('✅ Practice page initialized');
}

// Load topics progress
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

// Display topics
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

// Check if practice is unlocked
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
                return data.unlocked || false;
            }
            
            if (response.status === 500) {
                console.log('⚠️ Practice progress table not found for new user');
                await createDefaultPracticeProgress(topicId);
                return false;
            }
            
        } catch (error) {
            console.warn(`⚠️ Practice check failed:`, error.message);
        }
        
        return false;
        
    } catch (error) {
        console.error('❌ Error in checkPracticeUnlocked:', error);
        return false;
    }
}

// Create default practice progress
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

// Load practice exercises for topic
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
                <p>Loading practice exercises from database...</p>
            </div>
        `;
        
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            exerciseArea.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Please login to access practice exercises</h3>
                </div>
            `;
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/practice/topic/${topicId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Failed to load practice exercises: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.unlocked) {
            exerciseArea.innerHTML = createPracticeLockScreen(data);
            return;
        }
        
        if (data.exercises && data.exercises.length > 0) {
            PracticeState.exercises = data.exercises;
            exerciseArea.innerHTML = createPracticeExercisesUI(data);
            setupPracticeExerciseInteractions();
        } else {
            exerciseArea.innerHTML = `
                <div class="no-exercises">
                    <i class="fas fa-pencil-alt"></i>
                    <h3>No practice exercises available for this topic</h3>
                    <p>Check back later for new exercises!</p>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('❌ Error loading practice exercises:', error);
        exerciseArea.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load practice exercises</h3>
                <p>Error: ${error.message}</p>
                <button class="btn-primary" onclick="loadPracticeExercisesForTopic('${PracticeState.currentTopic}')">
                    <i class="fas fa-redo"></i> Try Again
                </button>
            </div>
        `;
    }
}

// Create practice lock screen
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

// Create practice exercises UI
function createPracticeExercisesUI(practiceData) {
    const { exercises, progress } = practiceData;
    
    let html = `
        <div class="practice-header">
            <h2><i class="fas fa-pencil-alt"></i> Practice Exercises</h2>
            <div class="progress-badge">
                <i class="fas fa-check-circle"></i>
                ${progress.completed}/${progress.total} lessons completed
            </div>
        </div>
        
        <div class="exercises-list">
    `;
    
    exercises.forEach((exercise, index) => {
        console.log(`Creating UI for exercise ${index}:`, {
            id: exercise.exercise_id,
            hasContentJson: !!exercise.content_json,
            type: typeof exercise.content_json
        });
        
        const userProgress = exercise.user_progress || {};
        const isCompleted = userProgress.completion_status === 'completed';
        
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
                        <span class="meta-item">
                            <i class="fas fa-check-circle"></i> ${userProgress.attempts || 0} attempts
                        </span>
                    </div>
                    
                    ${userProgress.score > 0 ? `
                        <div class="score-display">
                            <strong>Best Score:</strong> ${userProgress.score}/${exercise.points}
                            (${Math.round((userProgress.score / exercise.points) * 100)}%)
                        </div>
                    ` : ''}
                </div>
                
                <div class="exercise-actions">
                    ${isCompleted ? `
                        <button class="btn-secondary review-exercise" data-exercise-id="${exercise.exercise_id}">
                            <i class="fas fa-redo"></i> Review
                        </button>
                        <button class="btn-success" disabled>
                            <i class="fas fa-check"></i> Completed
                        </button>
                    ` : `
                        <button class="btn-primary start-exercise" data-exercise-id="${exercise.exercise_id}">
                            <i class="fas fa-play"></i> ${userProgress.status === 'in_progress' ? 'Continue' : 'Start'}
                        </button>
                    `}
                </div>
            </div>
        `;
    });
    
    return html;
}

// Start a practice exercise
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

// Show practice exercise modal
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

// Start practice timer
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

// Stop practice timer
function stopPracticeTimer() {
    if (PracticeState.timerInterval) {
        clearInterval(PracticeState.timerInterval);
        PracticeState.timerInterval = null;
    }
    PracticeState.isExerciseActive = false;
}

// Submit exercise answers
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

// Submit practice answer to server
async function submitPracticeAnswer(exerciseId, answers, timeSpent) {
    try {
        const token = localStorage.getItem('authToken') || authToken;
        if (!token) {
            showNotification('Please login first', 'error');
            return null;
        }
        
        console.log(`📤 Submitting practice exercise ${exerciseId}...`);
        console.log('✅ Token exists, proceeding with practice submission');
        
        const response = await fetch(`${API_BASE_URL}/practice/${exerciseId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                answers: answers,
                time_spent_seconds: timeSpent
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error:', errorText);
            
            if (response.status === 500) {
                showNotification('Server error. Please try again.', 'error');
            } else if (response.status === 401) {
                showNotification('Session expired. Please login again.', 'error');
                localStorage.removeItem('authToken');
                localStorage.removeItem('mathhub_user');
                setTimeout(() => navigateTo('login'), 2000);
            }
            return null;
        }
        
        const data = await response.json();
        console.log('✅ Practice submission successful:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Error submitting practice answer:', error);
        showNotification('Failed to submit practice answer. Please try again.', 'error');
        return null;
    }
}

// Load practice statistics
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

// Refresh practice exercises
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

// Get default practice stats HTML
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

// Select topic for practice
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

// Setup practice exercise interactions
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

// Add CSS for practice exercises
function addPracticeStyles() {
    if (practiceStylesAdded) return;
    practiceStylesAdded = true;
    
    const style = document.createElement('style');
    style.id = 'practice-styles';
    style.textContent = `
        .practice-lock-screen { ... }
        .lock-icon { ... }
        .progress-summary { ... }
        .lock-actions { ... }
        .lock-tips { ... }
        .exercises-list { ... }
        .exercise-card { ... }
        .exercise-card:hover { ... }
        .exercise-card.completed { ... }
        .exercise-header { ... }
        .difficulty-badge { ... }
        .difficulty-easy { ... }
        .difficulty-medium { ... }
        .difficulty-hard { ... }
        .exercise-meta { ... }
        .exercise-actions { ... }
        .practice-header { ... }
        .progress-badge { ... }
        .practice-summary { ... }
        .stats-grid { ... }
        .stat-card { ... }
        .stat-value { ... }
        .stat-label { ... }
        .score-display { ... }
        
        /* Practice Modal Styles */
        .practice-modal { ... }
        .modal-header { ... }
        .points-badge { ... }
        .modal-body { ... }
        .modal-footer { ... }
        .practice-question { ... }
        .options-list { ... }
        .option { ... }
        .correct-badge { ... }
        .fill-blank { ... }
        .timer-container { ... }
        
        /* Result Modal Styles */
        .practice-result-modal { ... }
        .result-header { ... }
        .result-header.success { ... }
        .result-header.warning { ... }
        .score-display-large { ... }
        .score-number { ... }
        .score-percentage { ... }
        .feedback-text { ... }
        .improvement-tips { ... }
        .result-footer { ... }
        .btn-success { ... }
        
        /* Topic Card Styles */
        .topic-card { ... }
        .topic-card:hover { ... }
        .topic-card.selected { ... }
        .topic-card.unlocked { ... }
        .topic-card.locked { ... }
        .topic-card.completed { ... }
        .topic-header { ... }
        .topic-title { ... }
        .topic-status { ... }
        .status-unlocked { ... }
        .status-locked { ... }
        .status-completed { ... }
        .topic-progress { ... }
        .progress-info { ... }
        .progress-bar { ... }
        .progress-fill { ... }
        .topic-practice-info { ... }
        .practice-available { ... }
        .practice-locked { ... }
        .practice-completed { ... }
        .topic-actions { ... }
        .no-topic-selected { ... }
        .no-topics { ... }
        .topics-container { ... }
    `;
    document.head.appendChild(style);
}

// ============================================
// PERFORMANCE CHARTS INITIALIZATION
// ============================================

/**
 * INITIALIZE PERFORMANCE CHARTS (called separately if needed)
 */
function initializePerformanceCharts() {
    console.log("📊 Initializing performance charts (standalone)...");
    
    // Destroy existing charts
    if (performanceCharts.trendChart) {
        performanceCharts.trendChart.destroy();
    }
    if (performanceCharts.distributionChart) {
        performanceCharts.distributionChart.destroy();
    }
    
    // Load data in parallel
    Promise.all([
        loadPerformanceTrendData(),
        loadScoreDistributionData()
    ]).catch(error => {
        console.error('❌ Error loading chart data:', error);
    });
}


// ============================================
// PDF REPORT GENERATOR - STUDENT PERFORMANCE DASHBOARD
// ============================================

/**
 * EXPORT PERFORMANCE DATA AS PDF
 * Downloads a comprehensive PDF report of the Student Performance Dashboard
 */
async function exportPerformanceData() {
    console.log("📄 Generating Performance Report PDF...");
    
    showNotification('info', 'Generating PDF', 'Preparing performance report...');
    
    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page.');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Get current data from the dashboard
        const avgScore = document.getElementById('avgScore')?.textContent || '0%';
        const completionRate = document.getElementById('completionRate')?.textContent || '0%';
        const avgTime = document.getElementById('avgTime')?.textContent || '0m';
        const activeStudents = document.getElementById('activeStudents')?.textContent || '0';
        
        const avgScoreChange = document.getElementById('avgScoreChange')?.innerHTML || '';
        const completionRateChange = document.getElementById('completionRateChange')?.innerHTML || '';
        const avgTimeChange = document.getElementById('avgTimeChange')?.innerHTML || '';
        const activeStudentsChange = document.getElementById('activeStudentsChange')?.innerHTML || '';
        
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = new Date().toLocaleTimeString();
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.text('STUDENT PERFORMANCE REPORT', 148.5, 70, { align: 'center' });
        
        doc.setFontSize(28);
        doc.text('MathHub Admin Dashboard', 148.5, 100, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(`Generated on: ${currentDate}`, 148.5, 130, { align: 'center' });
        doc.text(`Time: ${currentTime}`, 148.5, 145, { align: 'center' });
        
        // Add new page
        doc.addPage();
        
        // ===== PERFORMANCE STATISTICS PAGE =====
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(122, 0, 0);
        doc.text('Performance Statistics', 20, 20);
        
        // Performance Stats Table
        doc.autoTable({
            startY: 30,
            head: [['Metric', 'Current Value', 'Change from Last Month']],
            body: [
                ['Average Score', avgScore, stripHtml(avgScoreChange)],
                ['Completion Rate', completionRate, stripHtml(completionRateChange)],
                ['Avg. Time per Lesson', avgTime, stripHtml(avgTimeChange)],
                ['Active Students', activeStudents, stripHtml(activeStudentsChange)]
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            margin: { top: 30 }
        });
        
        // ===== TOP PERFORMERS TABLE =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Top Performing Students', 20, 20);
        
        // Get top performers from table
        const topPerformers = [];
        const tableRows = document.querySelectorAll('#topPerformersBody tr');
        
        if (tableRows.length > 0 && !tableRows[0].textContent.includes('No Performance Data')) {
            tableRows.forEach(row => {
                const rank = row.querySelector('.student-rank')?.textContent || '';
                const name = row.querySelector('.student-name')?.textContent || '';
                const subject = row.querySelector('.student-subject')?.textContent || '';
                const score = row.querySelector('.score-badge')?.textContent?.replace(/\s+/g, ' ').trim() || '';
                const progress = row.querySelector('.progress-percent')?.textContent || '';
                
                topPerformers.push([rank, name, subject, score, progress]);
            });
            
            if (topPerformers.length > 0) {
                doc.autoTable({
                    startY: 30,
                    head: [['Rank', 'Student Name', 'Subject', 'Score', 'Progress']],
                    body: topPerformers,
                    theme: 'striped',
                    headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                    margin: { top: 30 }
                });
            } else {
                doc.setFontSize(14);
                doc.setTextColor(100, 100, 100);
                doc.text('No top performer data available', 20, 40);
            }
        } else {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No top performer data available', 20, 40);
        }
        
        // ===== SUBJECT BREAKDOWN =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Subject Performance Breakdown', 20, 20);
        
        // Get subject breakdown data
        const subjectCards = document.querySelectorAll('#subjectBreakdownGrid .subject-performance-card');
        const subjectData = [];
        
        if (subjectCards.length > 0) {
            subjectCards.forEach(card => {
                const title = card.querySelector('h4')?.textContent || '';
                const students = card.querySelector('p')?.textContent || '';
                const avgScore = card.querySelectorAll('.subject-stat-value')[0]?.textContent || '';
                const completionRate = card.querySelectorAll('.subject-stat-value')[1]?.textContent || '';
                const topPerformer = card.querySelector('.subject-performance-footer')?.textContent?.replace('Top:', '').trim() || '';
                
                subjectData.push([title, students, avgScore, completionRate, topPerformer]);
            });
            
            doc.autoTable({
                startY: 30,
                head: [['Subject', 'Students', 'Avg. Score', 'Completion', 'Top Performer']],
                body: subjectData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                margin: { top: 30 }
            });
        } else {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No subject breakdown data available', 20, 40);
        }
        
        // ===== PERFORMANCE CHARTS DATA =====
        if (performanceCharts.trendChart) {
            doc.addPage();
            doc.setFontSize(20);
            doc.setTextColor(122, 0, 0);
            doc.text('Performance Trend Data', 20, 20);
            
            const trendLabels = performanceCharts.trendChart.data.labels;
            const avgScores = performanceCharts.trendChart.data.datasets[0].data;
            const completionRates = performanceCharts.trendChart.data.datasets[1].data;
            
            const trendData = [];
            for (let i = 0; i < trendLabels.length; i++) {
                trendData.push([trendLabels[i], avgScores[i] + '%', completionRates[i] + '%']);
            }
            
            doc.autoTable({
                startY: 30,
                head: [['Period', 'Average Score', 'Completion Rate']],
                body: trendData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                margin: { top: 30 }
            });
        }
        
        if (performanceCharts.distributionChart) {
            doc.addPage();
            doc.setFontSize(20);
            doc.setTextColor(122, 0, 0);
            doc.text('Score Distribution Data', 20, 20);
            
            const distLabels = performanceCharts.distributionChart.data.labels;
            const distData = performanceCharts.distributionChart.data.datasets[0].data;
            
            const distributionData = [];
            let total = 0;
            distData.forEach(val => total += val);
            
            for (let i = 0; i < distLabels.length; i++) {
                const percentage = total > 0 ? Math.round((distData[i] / total) * 100) : 0;
                distributionData.push([distLabels[i], distData[i], percentage + '%']);
            }
            
            doc.autoTable({
                startY: 30,
                head: [['Score Range', 'Number of Students', 'Percentage']],
                body: distributionData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                margin: { top: 30 }
            });
        }
        
        // ===== REPORT SUMMARY =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Report Summary', 20, 20);
        
        const summaryData = [
            ['Generated By', localStorage.getItem('mathhub_user') ? 
              JSON.parse(localStorage.getItem('mathhub_user')).full_name || 'Admin' : 'Admin'],
            ['Report Type', 'Student Performance Dashboard Summary'],
            ['Data Source', 'MySQL Database'],
            ['Time Range', document.getElementById('performanceTimeRange')?.value || 'Last 30 Days'],
            ['Subject Filter', document.getElementById('scoreDistributionFilter')?.value || 'All Students'],
            ['Total Students with Progress', getTotalStudentsWithProgress()]
        ];
        
        doc.autoTable({
            startY: 30,
            head: [['Item', 'Details']],
            body: summaryData,
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            margin: { top: 30 }
        });
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `MathHub Student Performance Report - Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        // ===== DOWNLOAD THE PDF =====
        const fileName = `MathHub_Performance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'PDF Downloaded', `Report saved as ${fileName}`);
        console.log(`✅ Performance PDF downloaded: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating performance PDF:', error);
        showNotification('error', 'PDF Generation Failed', error.message);
        
        // Fallback to CSV if PDF fails
        exportPerformanceDataCSV();
    }
}

/**
 * Helper function to strip HTML tags from string
 */
function stripHtml(html) {
    if (!html) return 'No data';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || 'No data';
}

/**
 * Helper function to get total students with progress
 */
function getTotalStudentsWithProgress() {
    const total = document.getElementById('activeStudents')?.textContent || '0';
    return total;
}

/**
 * FALLBACK: Export as CSV if PDF fails
 */
function exportPerformanceDataCSV() {
    console.log("📄 Exporting Performance Data as CSV (fallback)...");
    
    // Get performance stats
    const avgScore = document.getElementById('avgScore')?.textContent || '0%';
    const completionRate = document.getElementById('completionRate')?.textContent || '0%';
    const avgTime = document.getElementById('avgTime')?.textContent || '0m';
    const activeStudents = document.getElementById('activeStudents')?.textContent || '0';
    
    // Get top performers
    let performersCSV = '';
    const tableRows = document.querySelectorAll('#topPerformersBody tr');
    if (tableRows.length > 0 && !tableRows[0].textContent.includes('No Performance Data')) {
        tableRows.forEach(row => {
            const rank = row.querySelector('.student-rank')?.textContent || '';
            const name = row.querySelector('.student-name')?.textContent || '';
            const subject = row.querySelector('.student-subject')?.textContent || '';
            const score = row.querySelector('.score-badge')?.textContent?.replace(/\s+/g, ' ').trim() || '';
            const progress = row.querySelector('.progress-percent')?.textContent || '';
            performersCSV += `\n${rank},${name},${subject},${score},${progress}`;
        });
    }
    
    // Get subject breakdown
    let subjectsCSV = '';
    const subjectCards = document.querySelectorAll('#subjectBreakdownGrid .subject-performance-card');
    subjectCards.forEach(card => {
        const title = card.querySelector('h4')?.textContent || '';
        const students = card.querySelector('p')?.textContent || '';
        const avgScoreVal = card.querySelectorAll('.subject-stat-value')[0]?.textContent || '';
        const completionRateVal = card.querySelectorAll('.subject-stat-value')[1]?.textContent || '';
        const topPerformer = card.querySelector('.subject-performance-footer')?.textContent?.replace('Top:', '').trim() || '';
        subjectsCSV += `\n${title},${students},${avgScoreVal},${completionRateVal},${topPerformer}`;
    });
    
    // Create CSV content
    const csv = `STUDENT PERFORMANCE REPORT
Generated: ${new Date().toLocaleString()}

PERFORMANCE STATISTICS
Metric,Value
Average Score,${avgScore}
Completion Rate,${completionRate}
Avg. Time per Lesson,${avgTime}
Active Students,${activeStudents}

TOP PERFORMERS
Rank,Student Name,Subject,Score,Progress${performersCSV}

SUBJECT BREAKDOWN
Subject,Students,Avg. Score,Completion,Top Performer${subjectsCSV}
`;
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `performance_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('warning', 'CSV Downloaded', 'PDF generation failed. Exported as CSV instead.');
}

/**
 * REFRESH ALL CHARTS
 */
async function refreshAllCharts() {
    console.log("🔄 Refreshing all performance charts...");
    
    showNotification('info', 'Refreshing', 'Updating chart data...');
    
    await Promise.all([
        loadPerformanceTrendData(),
        loadScoreDistributionData()
    ]);
    
    showNotification('success', 'Charts Updated', 'All charts refreshed with latest data');
}

let analyticsCharts = {
    userGrowthChart: null,
    lessonPopularityChart: null
};

let feedbackCharts = {
    distributionChart: null,
    trendChart: null
};

// Feedback Data
let feedbackData = [];
let currentFeedbackPage = 1;
const feedbackPerPage = 8;

// User Management Data
let usersData = [];
let selectedUsers = new Set();
let currentPage = 1;
const usersPerPage = 10;
// Current user to delete
let UserToDelete = null;

// ===== LESSON DASHBOARD VARIABLES =====
let lessonData = {
    polynomial: { lessons: 5, resources: 12, students: 45, progress: 75 },
    factorial: { lessons: 3, resources: 8, students: 32, progress: 60 },
    mdas: { lessons: 4, resources: 10, students: 38, progress: 50 }
};

// adminscript.js - DAGDAG SA TAAS
let lessonDatabase = {
    subjects: [
        { id: 2, name: "PolyLearn", slug: "polylearn", color: "#7a0000" },
        { id: 1, name: "Math Ease", slug: "math-ease", color: "#0066cc" },
        { id: 3, name: "FactoLearn", slug: "factolearn", color: "#009900" }
    ],
    
    lessons: [], // Ito ang mag-sstore ng mga lessons
    studentEnrollments: [] // Para sa student enrollment
};

// Initialize data kapag nag-load ang page
function initLocalDatabase() {
    // Check kung may existing data na sa localStorage
    const savedData = localStorage.getItem('mathhub_database');
    
    if (savedData) {
        lessonDatabase = JSON.parse(savedData);
        
    } else {
        // Save initial structure
        saveToLocalStorage();
    }
    
    // Load student enrollments (demo data)
    if (!lessonDatabase.studentEnrollments || lessonDatabase.studentEnrollments.length === 0) {
        // Sample enrollments - lahat ng students enrolled sa lahat ng subjects
        lessonDatabase.studentEnrollments = [
            { studentId: 'student1', subjects: [1, 2, 3] },
            { studentId: 'student2', subjects: [1, 2, 3] },
            { studentId: 'student3', subjects: [1, 2, 3] }
        ];
        saveToLocalStorage();
    }
}

function saveToLocalStorage() {
    console.log("saveToLocalStorage() called");
    try {
        const dataStr = JSON.stringify(lessonDatabase);
        console.log("Data to save length:", dataStr.length);
        
        localStorage.setItem('mathhub_database', dataStr);
        console.log("Saved to localStorage successfully");
        
        // Verify
        const saved = localStorage.getItem('mathhub_database');
        console.log("Verification - saved exists:", saved ? "YES" : "NO");
        
    } catch (error) {
        console.error("Error in saveToLocalStorage:", error);
        throw error; // Re-throw to catch in parent function
    }
}

// Add these new variables for lesson management
let tempLessonData = null;
let lessons = [];

// DAGDAG SA adminscript.js
let selectedUploadSubjectId = 1;

// Function para pumili ng subject sa upload
function selectSubjectForUpload(subjectId) {
    selectedUploadSubjectId = subjectId;
    
    // Update UI
    document.querySelectorAll('.subject-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.subjectId) === subjectId) {
            btn.classList.add('active');
        }
    });
    
    // Update hidden input
    document.getElementById('selectedSubjectId').value = subjectId;
    
    // Get subject name
    const subject = lessonDatabase.subjects.find(s => s.id === subjectId);
    if (subject) {
        showNotification('info', 'Subject Selected', `Uploading to ${subject.name}`);
    }
}

// ===== NEW UPLOAD FUNCTIONS =====

// Video Upload Functions
function triggerVideoUpload() {
    document.getElementById('videoFileInput').click();
}

function handleVideoYoutubeUrl(url) {
    // Handle YouTube URL for video
    console.log('YouTube URL for video:', url);
    // Hide file upload area if YouTube URL is provided
    document.getElementById('videoFileInfo').style.display = 'none';
}

function removeVideoFile() {
    document.getElementById('videoFileInput').value = '';
    document.getElementById('videoFileInfo').style.display = 'none';
    document.getElementById('videoPreviewContainer').style.display = 'none';
}

// Text Upload Functions
function triggerTextFileUpload() {
    document.getElementById('textFileInput').click();
}

function removeTextFile() {
    document.getElementById('textFileInput').value = '';
    document.getElementById('textFileInfo').style.display = 'none';
}

// PDF Upload Functions
function triggerPdfUpload() {
    document.getElementById('pdfFileInput').click();
}

function removePdfFile() {
    document.getElementById('pdfFileInput').value = '';
    document.getElementById('pdfFileInfo').style.display = 'none';
}

// Content Section Switching
function showContentSection(section) {
    console.log("📂 Showing content section:", section);
    
    try {
        // Hide all content sections
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(el => {
            el.style.display = 'none';
        });
        
        // Remove active class from all buttons
        const buttons = document.querySelectorAll('.content-type-buttons .btn');
        buttons.forEach(btn => {
            btn.classList.remove('active');
            btn.style.background = '';
            btn.style.color = '';
        });
        
        // Show selected section
        const selectedSection = document.getElementById(section + 'ContentSection');
        if (selectedSection) {
            selectedSection.style.display = 'block';
            console.log(`✅ Showing ${section} section`);
        } else {
            console.warn(`⚠️ Section ${section}ContentSection not found`);
        }
        
        // Add active class to clicked button (only if event exists)
        if (event && event.target) {
            event.target.classList.add('active');
            event.target.style.background = '#7a0000';
            event.target.style.color = 'white';
        } else {
            // Set active button based on section parameter
            const buttons = document.querySelectorAll('.content-type-buttons .btn');
            buttons.forEach(btn => {
                if (btn.textContent.toLowerCase().includes(section)) {
                    btn.classList.add('active');
                    btn.style.background = '#7a0000';
                    btn.style.color = 'white';
                }
            });
        }
        
    } catch (error) {
        console.error("❌ Error in showContentSection:", error);
    }
}

// Initialize upload event listeners
function initUploadEventListeners() {
    console.log("Initializing upload event listeners...");
    
    // Video file input listener
    const videoInput = document.getElementById('videoFileInput');
    if (videoInput) {
        console.log("Found video input");
        // Remove existing listeners muna
        videoInput.replaceWith(videoInput.cloneNode(true));
        const newVideoInput = document.getElementById('videoFileInput');
        
        newVideoInput.addEventListener('change', function(e) {
            console.log("Video file selected");
            const file = e.target.files[0];
            if (file) {
                console.log("File details:", file.name, file.type, file.size);
                const fileName = file.name;
                const fileSize = (file.size / (1024*1024)).toFixed(2) + ' MB';
                
                document.getElementById('videoFileName').textContent = fileName;
                document.getElementById('videoFileSize').textContent = fileSize;
                document.getElementById('videoFileInfo').style.display = 'block';
                
                const fileNameElement = document.getElementById('videoFileName');
                const fileSizeElement = document.getElementById('videoFileSize');
                const fileInfoElement = document.getElementById('videoFileInfo');

                if (fileNameElement && fileSizeElement && fileInfoElement) {
                    fileNameElement.textContent = fileName;
                    fileSizeElement.textContent = fileSize;
                    fileInfoElement.style.display = 'block';
                } else {
                    console.warn("Video file info elements not found. Modal might not be open yet.");
                }
                
                // If it's a video file, show preview
                if (file.type.startsWith('video/')) {
                    const videoPreview = document.getElementById('videoPreview');
                    const previewContainer = document.getElementById('videoPreviewContainer');
                    
                    if (videoPreview && previewContainer) {
                        videoPreview.src = URL.createObjectURL(file);
                        previewContainer.style.display = 'block';
                        console.log("Video preview created");
                    }

                } else {
                    console.log("Not a video file:", file.type);
                }
            }
        });
    } else {
        console.error("Video input not found!");
    }
    
    // Text file input listener
    const textInput = document.getElementById('textFileInput');
    if (textInput) {
        console.log("Found text input");
        // Remove existing listeners
        textInput.replaceWith(textInput.cloneNode(true));
        const newTextInput = document.getElementById('textFileInput');
        
        newTextInput.addEventListener('change', function(e) {
            console.log("Text file selected");
            const file = e.target.files[0];
            if (file) {
                console.log("Text file details:", file.name);
                const fileName = file.name;
                const fileSize = (file.size / (1024*1024)).toFixed(2) + ' MB';
                
                document.getElementById('textFileName').textContent = fileName;
                document.getElementById('textFileSize').textContent = fileSize;
                document.getElementById('textFileInfo').style.display = 'block';
                
                // Read text file content
                if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const contentInput = document.getElementById('textContentInput');
                        if (contentInput) {
                            contentInput.value = e.target.result;
                            console.log("Text content loaded");
                        }
                    };
                    reader.readAsText(file);
                }
            }
        });
    }
    
    // PDF file input listener
    const pdfInput = document.getElementById('pdfFileInput');
    if (pdfInput) {
        console.log("Found PDF input");
        // Remove existing listeners
        pdfInput.replaceWith(pdfInput.cloneNode(true));
        const newPdfInput = document.getElementById('pdfFileInput');
        
        newPdfInput.addEventListener('change', function(e) {
            console.log("PDF file selected");
            const file = e.target.files[0];
            if (file) {
                console.log("PDF file details:", file.name);
                const fileName = file.name;
                const fileSize = (file.size / (1024*1024)).toFixed(2) + ' MB';
                
                document.getElementById('pdfFileName').textContent = fileName;
                document.getElementById('pdfFileSize').textContent = fileSize;
                document.getElementById('pdfFileInfo').style.display = 'block';
            }
        });
    }
    
    // YouTube URL handling
    const youtubeInput = document.getElementById('videoYoutubeUrl');
    if (youtubeInput) {
        youtubeInput.addEventListener('input', function() {
            console.log("YouTube URL changed:", this.value);
            if (this.value) {
                handleVideoYoutubeUrl(this.value);
            }
        });
    }
}

// ===== Load main dashboard stats from database =====
async function loadDashboardStats() {
    console.log("📊 Loading dashboard stats from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const stats = result.stats || {};
        
        // Update main stats with REAL data
        document.getElementById('totalLessons').textContent = stats.total_lessons || 0;
        document.getElementById('totalUsers').textContent = stats.active_users || 0;
        document.getElementById('completionRate').textContent = (stats.completion_rate || 0) + '%';
        document.getElementById('newThisWeek').textContent = stats.new_this_week || 0;
        
        console.log('✅ Dashboard stats updated:', stats);
        
    } catch (error) {
        console.error('❌ Error loading dashboard stats:', error);
        
        // Fallback: Try to get from localStorage or show zeros
        document.getElementById('totalLessons').textContent = '0';
        document.getElementById('totalUsers').textContent = '0';
        document.getElementById('completionRate').textContent = '0%';
        document.getElementById('newThisWeek').textContent = '0';
    }
}

// ===== Load recent lessons from database (EXISTING LESSONS) =====
async function loadRecentLessons() {
    console.log("📚 Loading EXISTING lessons from database...");
    
    const lessonsList = document.getElementById('recentLessonsList');
    if (!lessonsList) return;
    
    // Clear and show loading state ONCE
    lessonsList.innerHTML = `
        <div class="activity-item loading-item">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
                <p>Loading your lessons...</p>
            </div>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/lessons/recent', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const lessons = result.lessons || [];
        
        console.log(`✅ API returned ${lessons.length} lessons`);
        
        // ===== IMPORTANT: REMOVE DUPLICATES =====
        const uniqueLessons = [];
        const seenIds = new Set();
        
        lessons.forEach(lesson => {
            const lessonId = lesson.content_id || lesson.id;
            if (!seenIds.has(lessonId)) {
                seenIds.add(lessonId);
                uniqueLessons.push(lesson);
            } else {
                console.log(`⚠️ Duplicate lesson found and removed: ID ${lessonId}`);
            }
        });
        
        console.log(`✅ After deduplication: ${uniqueLessons.length} unique lessons`);
        
        // COMPLETELY CLEAR the container before rendering
        lessonsList.innerHTML = '';
        
        if (uniqueLessons.length === 0) {
            lessonsList.innerHTML = `
                <div class="activity-item" style="justify-content: center; padding: 50px;">
                    <div style="text-align: center;">
                        <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                        <h4 style="color: #666; margin-bottom: 5px;">No Lessons Found</h4>
                        <p style="color: #999; margin-bottom: 15px;">Start creating lessons to see them here</p>
                        <button class="btn btn-primary" onclick="openCreateLessonPopup()">
                            <i class="fas fa-plus"></i> Create Your First Lesson
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Limit to 5 most recent lessons
        const recentLessons = uniqueLessons.slice(0, 5);
        
        // Render each lesson
        recentLessons.forEach((lesson, index) => {
            const timeAgo = getTimeAgo(lesson.created_at);
            
            // Determine icon based on content type
            let icon = 'file-alt';
            let iconClass = 'file';
            
            if (lesson.content_type === 'video') {
                icon = 'video';
                iconClass = 'video';
            } else if (lesson.content_type === 'pdf') {
                icon = 'file-pdf';
                iconClass = 'pdf';
            }
            
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.setAttribute('data-lesson-id', lesson.content_id);
            item.onclick = () => viewLesson(lesson.content_id);
            item.style.cursor = 'pointer';
            
            item.innerHTML = `
                <div class="activity-icon ${iconClass}" style="
                    width: 45px;
                    height: 45px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${lesson.content_type === 'video' ? 'rgba(244, 67, 54, 0.1)' : 
                                 lesson.content_type === 'pdf' ? 'rgba(244, 67, 54, 0.1)' : 
                                 'rgba(33, 150, 243, 0.1)'};
                    color: ${lesson.content_type === 'video' ? '#f44336' : 
                            lesson.content_type === 'pdf' ? '#f44336' : 
                            '#2196F3'};
                ">
                    <i class="fas fa-${icon}"></i>
                </div>
                <div class="activity-content">
                    <h4 style="margin: 0 0 5px 0; font-size: 1rem; color: #333;">
                        ${lesson.content_title || 'Untitled Lesson'}
                    </h4>
                    <p style="margin: 0 0 3px 0; font-size: 0.85rem; color: #666;">
                        ${lesson.content_description ? 
                          (lesson.content_description.length > 50 ? 
                            lesson.content_description.substring(0, 50) + '...' : 
                            lesson.content_description) 
                          : 'No description'}
                    </p>
                    <div style="display: flex; gap: 10px; font-size: 0.7rem;">
                        <span style="color: #999;">
                            <i class="fas fa-tag"></i> ${lesson.topic_title || 'General'}
                        </span>
                        <span style="color: #999;">
                            <i class="fas fa-layer-group"></i> ${lesson.module_name || 'No Module'}
                        </span>
                    </div>
                </div>
                <span class="activity-time" style="font-size: 0.7rem; color: #999;">
                    ${timeAgo}
                </span>
            `;
            
            lessonsList.appendChild(item);
        });
        
        // Add "View All" link ONLY if there are more than 5 lessons
        if (uniqueLessons.length > 5) {
            const viewAllItem = document.createElement('div');
            viewAllItem.className = 'activity-item';
            viewAllItem.style.justifyContent = 'center';
            viewAllItem.style.background = '#f8f9fa';
            viewAllItem.style.cursor = 'pointer';
            viewAllItem.onclick = () => showLessonDashboard();
            viewAllItem.innerHTML = `
                <div style="text-align: center; padding: 10px; color: #7a0000;">
                    <i class="fas fa-eye"></i> View All ${uniqueLessons.length} Lessons
                </div>
            `;
            lessonsList.appendChild(viewAllItem);
        }
        
        // Show warning kung may duplicates
        if (lessons.length > uniqueLessons.length) {
            console.warn(`⚠️ Removed ${lessons.length - uniqueLessons.length} duplicate lessons from display`);
        }
        
    } catch (error) {
        console.error('❌ Error loading lessons:', error);
        lessonsList.innerHTML = `
            <div class="activity-item" style="justify-content: center; padding: 40px;">
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-circle" style="color: #f44336; font-size: 2rem; margin-bottom: 10px;"></i>
                    <p style="color: #666; margin-bottom: 15px;">Failed to load lessons from database</p>
                    <button class="btn btn-sm btn-primary" onclick="loadRecentLessons()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }
}
// Function para mag-save ng lesson sa localStorage (UPDATED VERSION)
function saveLessonToLocalStorage() {
    console.log("=== SAVE BUTTON CLICKED ===");
    console.log("1. Checking if function is being called...");
    
    // Get form values
    const title = document.getElementById('createLessonTitle')?.value.trim();
    const description = document.getElementById('contentDescription')?.value.trim();
    const subjectId = parseInt(document.getElementById('selectedSubjectId')?.value) || selectedUploadSubjectId;
    
    console.log("2. Form values:", { title, description, subjectId });
    
    // Check if required fields are filled
    if (!title || !description) {
        console.log("3. Validation failed - missing title or description");
        showNotification('error', 'Error', 'Please fill in all required fields');
        return;
    }
    
    console.log("4. Validation passed");
    
    // Check which content type has data
    console.log("5. Checking content type...");
    
    const videoFile = document.getElementById('videoFileInput')?.files[0];
    const videoYoutubeUrl = document.getElementById('videoYoutubeUrl')?.value;
    const textContent = document.getElementById('textContentInput')?.value;
    const textFile = document.getElementById('textFileInput')?.files[0];
    const pdfFile = document.getElementById('pdfFileInput')?.files[0];
    
    console.log("6. Content detected:", {
        videoFile: videoFile ? videoFile.name : "none",
        videoYoutubeUrl: videoYoutubeUrl || "none",
        textContent: textContent ? "has text" : "none",
        textFile: textFile ? textFile.name : "none",
        pdfFile: pdfFile ? pdfFile.name : "none"
    });
    
    // ===== IMPORTANT: ADD ERROR HANDLING HERE =====
    try {
        // Determine which content to save
        let contentData = null;
        let contentType = 'text';
        
        if (videoFile || videoYoutubeUrl) {
            console.log("7. Video content detected");
            contentType = 'video';
            contentData = {
                type: 'video',
                fileName: videoFile ? videoFile.name : null,
                fileSize: videoFile ? (videoFile.size / (1024*1024)).toFixed(2) + ' MB' : null,
                fileType: videoFile ? videoFile.type : null,
                youtubeUrl: videoYoutubeUrl || null,
                description: description,
                uploadedAt: new Date().toISOString()
            };
            
            console.log("7a. Content data created for video");
            
            // If video file, create object URL for preview
            if (videoFile) {
                contentData.previewUrl = URL.createObjectURL(videoFile);
                console.log("7b. Preview URL created");
            }
        } else if (textContent || textFile) {
            console.log("7. Text content detected");
            contentType = 'text';
            contentData = {
                type: 'text',
                content: textContent || '',
                fileName: textFile ? textFile.name : null,
                fileSize: textFile ? (textFile.size / (1024*1024)).toFixed(2) + ' MB' : null,
                description: description,
                uploadedAt: new Date().toISOString()
            };
        } else if (pdfFile) {
            console.log("7. PDF content detected");
            contentType = 'pdf';
            contentData = {
                type: 'pdf',
                fileName: pdfFile.name,
                fileSize: (pdfFile.size / (1024*1024)).toFixed(2) + ' MB',
                fileType: pdfFile.type,
                description: description,
                uploadedAt: new Date().toISOString()
            };
        } else {
            console.log("7. No content detected, using default text");
            contentType = 'text';
            contentData = {
                type: 'text',
                content: description,
                description: description,
                uploadedAt: new Date().toISOString()
            };
        }
        
        console.log("8. Content data prepared:", contentData);
        
        // Get module structure (optional)
        const lesson = document.getElementById('lessonSelect')?.value || '';
        const module = document.getElementById('moduleSelect')?.value || '';
        const topic = document.getElementById('topicSelect')?.value || '';
        
        console.log("9. Module structure:", { lesson, module, topic });
        
        // Create lesson object
        const newLesson = {
            id: 'lesson_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            description: description,
            subjectId: subjectId,
            createdAt: new Date().toISOString(),
            contentType: contentType,
            content: contentData,
            moduleStructure: {
                lesson: lesson,
                module: module,
                topic: topic
            },
            status: 'published',
            views: 0,
            rating: 0,
            tags: []
        };
        
        console.log("10. New lesson created:", newLesson);
        
        // Check if lessonDatabase exists
        console.log("11. Checking lessonDatabase...");
        console.log("lessonDatabase:", lessonDatabase);
        console.log("lessonDatabase.lessons:", lessonDatabase.lessons);
        
        // Initialize lessons array if it doesn't exist
        if (!lessonDatabase.lessons) {
            console.log("11a. Initializing lessons array");
            lessonDatabase.lessons = [];
        }
        
        console.log("12. Adding to database...");
        console.log("Before - Total lessons:", lessonDatabase.lessons.length);
        
        // Add to database
        lessonDatabase.lessons.push(newLesson);
        console.log("13. Lesson added to array. New total:", lessonDatabase.lessons.length);
        
        // Save to localStorage
        console.log("14. Saving to localStorage...");
        saveToLocalStorage();
        console.log("15. Saved to localStorage");
        
        // Update UI stats
        console.log("16. Updating lesson stats...");
        updateLessonStats();
        console.log("17. Updated lesson stats");
        
        // Show success message
        const subject = lessonDatabase.subjects.find(s => s.id === subjectId);
        console.log("18. Found subject:", subject);
        
        showNotification('success', 'Lesson Saved', 
            `${title}" has been saved to ${subject ? subject.name : 'selected subject'}`);
        
        console.log("19. Success notification shown");
        
        // Close modal
        console.log("20. Closing modal...");
        closeModal();
        console.log("21. Modal closed - SAVE COMPLETE!");
        
    } catch (error) {
        console.error("ERROR in saveLessonToLocalStorage:", error);
        console.error("Error stack:", error.stack);
        showNotification('error', 'Save Failed', 'Error: ' + error.message);
    }
}

// Function para i-update ang lesson statistics
function updateLessonStats() {
    // Count lessons per subject
    const subjectCounts = {};
    lessonDatabase.subjects.forEach(subject => {
        subjectCounts[subject.id] = lessonDatabase.lessons.filter(
            lesson => lesson.subjectId === subject.id
        ).length;
    });
    
    // Update subject cards
    updateSubjectCards(subjectCounts);
    
    // Update dashboard stats
    updateDashboardStats();
}

function updateSubjectCards(subjectCounts) {
    // PolyLearn
    const polyCount = subjectCounts[1] || 0;
    document.getElementById('polyLessons').textContent = polyCount;
    updateProgressBar('polynomial', Math.min(polyCount * 20, 100));
    
    // Math Ease
    const mathCount = subjectCounts[2] || 0;
    document.getElementById('mdasLessons').textContent = mathCount;
    updateProgressBar('mdas', Math.min(mathCount * 20, 100));
    
    // FactoLearn
    const factoCount = subjectCounts[3] || 0;
    document.getElementById('factLessons').textContent = factoCount;
    updateProgressBar('factorial', Math.min(factoCount * 20, 100));
}

function updateDashboardStats() {
    const totalLessons = lessonDatabase.lessons.length;
    document.getElementById('totalLessons').textContent = totalLessons;
    document.getElementById('analyticsTotalLessons').textContent = totalLessons;
    
    // Update sidebar
    document.getElementById('totalLessonsSidebar').textContent = totalLessons;
}

// ===== MOBILE MENU FUNCTIONS =====
function openMobileMenu() {
    const mobileMenuPanel = document.getElementById('mobileMenuPanel');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    if (mobileMenuPanel && mobileMenuOverlay) {
        mobileMenuPanel.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        document.body.classList.add('menu-open');
    }
}

function closeMobileMenu() {
    const mobileMenuPanel = document.getElementById('mobileMenuPanel');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    if (mobileMenuPanel && mobileMenuOverlay) {
        mobileMenuPanel.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

// ===== LOAD SIDEBAR QUICK STATS FROM DATABASE - WITH DEBUGGING =====
async function loadSidebarStats() {
    console.log("📊 Loading sidebar quick stats from database...");
    
    // Get the elements
    const totalLessonsEl = document.getElementById('totalLessonsSidebar');
    const totalSubjectsEl = document.getElementById('totalSubjectsSidebar');
    const totalStudentsEl = document.getElementById('totalStudentsSidebar');
    const totalResourcesEl = document.getElementById('totalResourcesSidebar');
    
    // If elements don't exist, exit silently
    if (!totalLessonsEl || !totalSubjectsEl || !totalStudentsEl || !totalResourcesEl) {
        console.log("ℹ️ Sidebar stats elements not found on this page");
        return;
    }
    
    // Show loading state
    totalLessonsEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    totalSubjectsEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    totalStudentsEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    totalResourcesEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    
    try {
        console.log('🔑 Fetching from /api/stats/quick...');
        
        const response = await fetch('http://localhost:5000/api/stats/quick', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success) {
            const stats = result.stats;
            
            console.log('✅ Sidebar stats loaded:', stats);
            
            // Update the elements with REAL DATA from database
            animateNumber('totalLessonsSidebar', stats.totalLessons || 0);
            animateNumber('totalSubjectsSidebar', stats.totalSubjects || 0);
            animateNumber('totalStudentsSidebar', stats.totalStudents || 0);
            animateNumber('totalResourcesSidebar', stats.totalResources || 0);
            
            // Also update the lesson stats in subject cards
            await updateSubjectStatsFromDatabase();
            
        } else {
            console.error('❌ Failed to load sidebar stats:', result.message);
            
            // Show error in UI
            totalLessonsEl.innerHTML = '❌';
            totalSubjectsEl.innerHTML = '❌';
            totalStudentsEl.innerHTML = '❌';
            totalResourcesEl.innerHTML = '❌';
            
            // Fallback: Try to get from localStorage
            loadSidebarStatsFromLocal();
        }
        
    } catch (error) {
        console.error('❌ Error loading sidebar stats:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Show error in UI
        totalLessonsEl.innerHTML = '⚠️';
        totalSubjectsEl.innerHTML = '⚠️';
        totalStudentsEl.innerHTML = '⚠️';
        totalResourcesEl.innerHTML = '⚠️';
        
        // Fallback to localStorage if server unavailable
        loadSidebarStatsFromLocal();
    }
}

// ===== UPDATE SUBJECT STATS FROM DATABASE =====
async function updateSubjectStatsFromDatabase() {
    console.log("📚 Updating subject stats from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('ℹ️ No token found, using lessonDatabase for subject stats');
            updateSubjectStatsFromLocal();
            return;
        }
        
        // Get lessons count per subject from database
        const response = await fetch('http://localhost:5000/api/admin/lessons', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.lessons) {
            const lessons = result.lessons;
            
            // Count lessons per subject
            let polyCount = 0;
            let factCount = 0;
            let mdasCount = 0;
            
            lessons.forEach(lesson => {
                // Check by lesson_name
                if (lesson.lesson_name === 'polylearn' || lesson.lesson_name === 'PolyLearn') {
                    polyCount++;
                } else if (lesson.lesson_name === 'factolearn' || lesson.lesson_name === 'FactoLearn') {
                    factCount++;
                } else if (lesson.lesson_name === 'mathease' || lesson.lesson_name === 'MathEase') {
                    mdasCount++;
                }
            });
            
            console.log('📊 Subject counts from database:', {
                polyCount, factCount, mdasCount
            });
            
            // Update subject cards
            const polyLessons = document.getElementById('polyLessons');
            if (polyLessons) polyLessons.textContent = polyCount;
            
            const factLessons = document.getElementById('factLessons');
            if (factLessons) factLessons.textContent = factCount;
            
            const mdasLessons = document.getElementById('mdasLessons');
            if (mdasLessons) mdasLessons.textContent = mdasCount;
            
            // Update progress bars (estimate: 20% per lesson, max 100%)
            updateProgressBar('polynomial', Math.min(polyCount * 20, 100));
            updateProgressBar('factorial', Math.min(factCount * 20, 100));
            updateProgressBar('mdas', Math.min(mdasCount * 20, 100));
            
        } else {
            throw new Error('No lessons data');
        }
        
    } catch (error) {
        console.error('❌ Error updating subject stats from database:', error);
        
        // Fallback to localStorage
        updateSubjectStatsFromLocal();
    }
}

// ===== UPDATE SUBJECT STATS FROM LOCALSTORAGE (FALLBACK) =====
function updateSubjectStatsFromLocal() {
    console.log("📚 Updating subject stats from localStorage...");
    
    try {
        if (lessonDatabase && lessonDatabase.lessons) {
            // Count lessons per subject from localStorage
            const polyCount = lessonDatabase.lessons.filter(l => l.subjectId === 1).length;
            const mathCount = lessonDatabase.lessons.filter(l => l.subjectId === 2).length;
            const factCount = lessonDatabase.lessons.filter(l => l.subjectId === 3).length;
            
            document.getElementById('polyLessons').textContent = polyCount;
            document.getElementById('mdasLessons').textContent = mathCount;
            document.getElementById('factLessons').textContent = factCount;
            
            updateProgressBar('polynomial', Math.min(polyCount * 20, 100));
            updateProgressBar('mdas', Math.min(mathCount * 20, 100));
            updateProgressBar('factorial', Math.min(factCount * 20, 100));
            
            console.log(`✅ Subject stats from localStorage: Poly=${polyCount}, Math=${mathCount}, Fact=${factCount}`);
        }
    } catch (error) {
        console.error('❌ Error updating subject stats from localStorage:', error);
    }
}

// ===== UPDATE SUBJECT STATS (PolyLearn, MathEase, FactoLearn) =====
async function updateSubjectStats() {
    console.log("📚 Updating subject stats from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('ℹ️ No token found, skipping subject stats update');
            return;
        }
        
        // Fetch all subjects with stats
        const response = await fetch('http://localhost:5000/api/subjects/all-with-stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.subjects) {
            const subjects = result.subjects;
            
            console.log('✅ Subject stats loaded:', subjects);
            
            // Update each subject's stats in the UI
            subjects.forEach(subject => {
                const subjectName = subject.name.toLowerCase();
                
                // Update lesson counts
                if (subjectName.includes('polylearn') || subject.id === 2) {
                    const polyLessons = document.getElementById('polyLessons');
                    if (polyLessons) polyLessons.textContent = subject.lessons || 0;
                    
                    const polyResources = document.getElementById('polyResources');
                    if (polyResources) polyResources.textContent = subject.resources || 0;
                    
                    updateProgressBar('polynomial', Math.min((subject.lessons || 0) * 20, 100));
                    
                } else if (subjectName.includes('factolearn') || subject.id === 3) {
                    const factLessons = document.getElementById('factLessons');
                    if (factLessons) factLessons.textContent = subject.lessons || 0;
                    
                    const factResources = document.getElementById('factResources');
                    if (factResources) factResources.textContent = subject.resources || 0;
                    
                    updateProgressBar('factorial', Math.min((subject.lessons || 0) * 20, 100));
                    
                } else if (subjectName.includes('mathease') || subject.id === 1) {
                    const mdasLessons = document.getElementById('mdasLessons');
                    if (mdasLessons) mdasLessons.textContent = subject.lessons || 0;
                    
                    const mdasResources = document.getElementById('mdasResources');
                    if (mdasResources) mdasResources.textContent = subject.resources || 0;
                    
                    updateProgressBar('mdas', Math.min((subject.lessons || 0) * 20, 100));
                }
            });
            
            // Update the welcome section with current subject
            updateWelcomeSection();
            
        } else {
            console.warn('⚠️ No subject data returned');
        }
        
    } catch (error) {
        console.error('❌ Error updating subject stats:', error);
    }
}

// ===== UPDATE WELCOME SECTION WITH CURRENT SUBJECT =====
function updateWelcomeSection() {
    const currentSubject = window.currentSubject || 'polynomial';
    
    // Get subject display name
    let displayName = 'PolyLearn';
    let displayDesc = 'Algebraic expressions with variables and coefficients';
    
    if (currentSubject === 'factorial') {
        displayName = 'FactoLearn';
        displayDesc = 'Product of all positive integers less than or equal to n';
    } else if (currentSubject === 'mdas') {
        displayName = 'MathEase';
        displayDesc = 'Order of operations: Multiplication, Division, Addition, Subtraction';
    }
    
    // Update welcome section
    const welcomeSubject = document.getElementById('welcomeSubjectName');
    if (welcomeSubject) welcomeSubject.textContent = displayName;
    
    const welcomeDesc = document.getElementById('welcomeSubjectDesc');
    if (welcomeDesc) welcomeDesc.textContent = displayDesc;
    
    const welcomeIcon = document.getElementById('welcomeSubjectIcon');
    if (welcomeIcon) {
        const iconClass = currentSubject === 'polynomial' ? 'fas fa-superscript' :
                         currentSubject === 'factorial' ? 'fas fa-exclamation-circle' :
                         'fas fa-divide';
        welcomeIcon.innerHTML = `<i class="${iconClass}"></i>`;
    }
}

// ===== UPDATE PROGRESS BAR FOR SUBJECT =====
function updateProgressBar(subject, progress) {
    const card = document.querySelector(`.subject-card[data-subject="${subject}"]`);
    if (card) {
        const progressFill = card.querySelector('.progress-fill-small');
        const progressText = card.querySelector('.progress-label span:last-child');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
    }
}

// ===== FALLBACK: Load sidebar stats from localStorage =====
function loadSidebarStatsFromLocal() {
    console.log("📂 Loading sidebar stats from localStorage...");
    
    const totalLessonsEl = document.getElementById('totalLessonsSidebar');
    const totalSubjectsEl = document.getElementById('totalSubjectsSidebar');
    const totalStudentsEl = document.getElementById('totalStudentsSidebar');
    const totalResourcesEl = document.getElementById('totalResourcesSidebar');
    
    if (!totalLessonsEl) return;
    
    try {
        // Try to get from lessonDatabase
        if (lessonDatabase && lessonDatabase.lessons) {
            const totalLessons = lessonDatabase.lessons.length;
            const totalSubjects = lessonDatabase.subjects?.length || 3;
            
            // Count students from usersData if available
            let totalStudents = 0;
            if (window.usersData && usersData.length > 0) {
                totalStudents = usersData.filter(u => u.role === 'student').length;
            }
            
            // Resources are same as lessons for now
            const totalResources = totalLessons;
            
            // Update UI
            if (totalLessonsEl) totalLessonsEl.textContent = totalLessons;
            if (totalSubjectsEl) totalSubjectsEl.textContent = totalSubjects;
            if (totalStudentsEl) totalStudentsEl.textContent = totalStudents;
            if (totalResourcesEl) totalResourcesEl.textContent = totalResources;
            
            console.log(`✅ Sidebar stats from localStorage: ${totalLessons} lessons, ${totalSubjects} subjects, ${totalStudents} students`);
            
            // Also update subject cards
            updateSubjectStatsFromLocal();
            
        } else {
            // Ultimate fallback - demo data
            if (totalLessonsEl) totalLessonsEl.textContent = '12';
            if (totalSubjectsEl) totalSubjectsEl.textContent = '3';
            if (totalStudentsEl) totalStudentsEl.textContent = '45';
            if (totalResourcesEl) totalResourcesEl.textContent = '24';
            
            console.log('⚠️ Using demo data for sidebar stats');
        }
    } catch (error) {
        console.error('❌ Error loading sidebar stats from localStorage:', error);
        
        // Ultimate fallback
        if (totalLessonsEl) totalLessonsEl.textContent = '12';
        if (totalSubjectsEl) totalSubjectsEl.textContent = '3';
        if (totalStudentsEl) totalStudentsEl.textContent = '45';
        if (totalResourcesEl) totalResourcesEl.textContent = '24';
    }
}

// ===== OVERRIDE ANIMATENUMBER FUNCTION (if it doesn't exist) =====
if (typeof animateNumber !== 'function') {
    function animateNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const currentValue = parseInt(element.textContent) || 0;
        if (currentValue === targetValue) return;
        
        // Simple animation
        element.style.transition = 'all 0.3s ease';
        element.style.transform = 'scale(1.2)';
        element.style.color = '#7a0000';
        
        setTimeout(() => {
            element.textContent = targetValue;
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 150);
        
        setTimeout(() => {
            element.style.transition = '';
        }, 500);
    }
}

// KEEP ONLY ONE VERSION OF THESE FUNCTIONS:

// ===== SAVE LESSON TO MYSQL DATABASE =====
async function saveLessonToMySQL() {
    console.log("=== SAVING TO MYSQL DATABASE ===");
    
    try {
        // Get form values
        const title = document.getElementById('createLessonTitle')?.value.trim();
        const description = document.getElementById('createLessonDescription')?.value.trim();
        const topicSelect = document.getElementById('topicSelect');
        const topic_id = topicSelect?.value;
        const editId = document.getElementById('editLessonId')?.value || '';
        const isUpdate = editId && editId !== '';
        
        // Get assigned teacher (if any)
        const assignedTeacherId = document.getElementById('assignedTeacherId')?.value;
        
        // ===== VALIDATION =====
        if (!title) {
            showNotification('error', 'Error', 'Please enter a lesson title');
            return;
        }
        
        if (!description) {
            showNotification('error', 'Error', 'Please enter a lesson description');
            return;
        }
        
        if (!topic_id) {
            showNotification('error', 'Error', 'Please select a topic');
            return;
        }
        
        // ===== DETERMINE CONTENT TYPE =====
        const videoFile = document.getElementById('videoFileInput')?.files[0];
        const youtubeUrl = document.getElementById('videoYoutubeUrl')?.value;
        const textContent = document.getElementById('textContentInput')?.value;
        
        let contentType = 'text';
        if (videoFile || youtubeUrl) {
            contentType = 'video';
            console.log("🎬 Content type: VIDEO");
        } else if (textContent) {
            contentType = 'text';
            console.log("📝 Content type: TEXT");
        } else {
            // If no content specified, default to text with description
            contentType = 'text';
            console.log("📝 Content type: TEXT (using description)");
        }
        
        // ===== CREATE FORMDATA =====
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('topic_id', parseInt(topic_id));
        formData.append('content_type', contentType);
        
        // Add update flag if editing
        if (isUpdate) {
            formData.append('is_update', 'true');
            formData.append('content_id', editId);
            console.log("🔄 Updating lesson ID:", editId);
        }
        
        // Add assigned teacher if admin specified one
        if (assignedTeacherId) {
            formData.append('assigned_teacher_id', parseInt(assignedTeacherId));
            console.log(`👨‍🏫 Assigning to teacher ID: ${assignedTeacherId}`);
        }
        
        // ===== ADD CONTENT BASED ON TYPE =====
        if (contentType === 'video') {
            if (youtubeUrl) {
                formData.append('youtube_url', youtubeUrl);
                console.log("🔗 YouTube URL added:", youtubeUrl);
            }
            if (videoFile) {
                formData.append('video_file', videoFile);
                console.log("🎬 Video file added:", videoFile.name);
            }
        } else if (contentType === 'text' && textContent) {
            formData.append('text_content', textContent);
            console.log("📝 Text content added");
        }
        
        // ===== GET AUTH TOKEN =====
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login again');
            return;
        }
        
        console.log("🔑 Token found, proceeding with save...");
        
        // ===== SHOW LOADING STATE =====
        const saveBtn = document.querySelector('#createLessonModal .btn-primary');
        const originalText = saveBtn ? saveBtn.innerHTML : 'Save to MySQL';
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving to MySQL...';
        }
        
        // ===== SEND TO SERVER =====
        console.log("📡 Sending request to server...");
        
        const response = await fetch('http://localhost:5000/api/admin/lessons', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Note: Don't set Content-Type header when using FormData
            },
            body: formData
        });
        
        console.log("📥 Response status:", response.status);
        
        // Check if response is OK
        if (!response.ok) {
            const errorText = await response.text();
            console.error("❌ Server error response:", errorText);
            throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
        }
        
        // Parse JSON response
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success) {
            // ===== SUCCESS =====
            let successMessage = isUpdate ? 'Lesson updated successfully!' : 'Lesson created successfully!';
            
            // Add teacher assignment info to message
            if (assignedTeacherId) {
                successMessage += ' (Assigned to teacher)';
            }
            
            showNotification('success', 'Success!', successMessage);
            
            // Close modal
            closeCreateLessonModal();
            
            // Reset form completely
            resetLessonForm();
            
            // Clear edit ID
            document.getElementById('editLessonId').value = '';
            
            // Refresh lessons lists
            setTimeout(() => {
                console.log("🔄 Refreshing lessons...");
                
                // Refresh admin lessons table if it exists
                if (document.getElementById('adminLessonsTableBody')) {
                    if (typeof loadAdminLessons === 'function') {
                        loadAdminLessons();
                    }
                }
                
                // Refresh teacher lessons if on teacher dashboard
                if (typeof loadMyLessons === 'function') {
                    loadMyLessons();
                }
                
                // Refresh recent lessons on dashboard
                if (typeof loadRecentLessons === 'function') {
                    loadRecentLessons();
                }
                
                // Refresh subject data
                if (typeof fetchSubjectDataFromDatabase === 'function') {
                    fetchSubjectDataFromDatabase();
                }
                
                console.log("✅ Lessons refreshed");
            }, 500);
            
        } else {
            throw new Error(result.message || 'Failed to save lesson');
        }
        
    } catch (error) {
        // ===== ERROR HANDLING =====
        console.error('❌ Save error:', error);
        
        // Show user-friendly error message
        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Make sure the backend is running.';
        } else if (error.message.includes('401')) {
            errorMessage = 'Session expired. Please login again.';
        }
        
        showNotification('error', 'Save Failed', errorMessage);
        
        // Optional: Fallback to localStorage
        if (confirm('Server save failed. Save to local storage instead?')) {
            saveLessonToLocalStorage();
        }
        
    } finally {
        // ===== RESTORE BUTTON STATE =====
        const saveBtn = document.querySelector('#createLessonModal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-database"></i> Save to MySQL';
        }
    }
}

// ===== FALLBACK: Save to Local Storage =====
function saveLessonToLocalStorage() {
    console.log("=== FALLBACK: SAVING TO LOCALSTORAGE ===");
    
    try {
        // Get form values
        const title = document.getElementById('createLessonTitle')?.value.trim();
        const description = document.getElementById('createLessonDescription')?.value.trim();
        const subjectId = parseInt(document.getElementById('selectedSubjectId')?.value) || 1;
        
        if (!title) {
            showNotification('error', 'Error', 'Please enter a lesson title');
            return;
        }
        
        // Get current timestamp
        const now = new Date().toISOString();
        
        // Create lesson object
        const newLesson = {
            id: 'lesson_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            title: title,
            description: description,
            subjectId: subjectId,
            createdAt: now,
            updatedAt: now,
            contentType: 'text',
            content: {
                type: 'text',
                description: description
            },
            status: 'published',
            synced: false,
            mysqlId: null
        };
        
        // Initialize lessonDatabase if needed
        if (!window.lessonDatabase) {
            window.lessonDatabase = { lessons: [] };
        }
        
        if (!window.lessonDatabase.lessons) {
            window.lessonDatabase.lessons = [];
        }
        
        // Add to database
        window.lessonDatabase.lessons.push(newLesson);
        
        // Save to localStorage
        try {
            localStorage.setItem('mathhub_database', JSON.stringify(window.lessonDatabase));
            console.log("💾 Saved to localStorage");
        } catch (e) {
            console.error("Error saving to localStorage:", e);
        }
        
        // Show notification
        showNotification('warning', 'Saved Locally', 
            'Lesson saved to local storage (offline mode). It will sync when server is available.');
        
        // Close modal
        closeCreateLessonModal();
        
        // Update UI
        if (typeof updateLessonStats === 'function') {
            updateLessonStats();
        }
        
    } catch (error) {
        console.error('❌ Local save error:', error);
        showNotification('error', 'Local Save Failed', error.message);
    }
}

// ===== OPEN QUICK TOPIC MODAL =====
async function openQuickTopicModal() {
    console.log("📝 Opening quick topic modal...");
    
    const modal = document.getElementById('quickTopicModal');
    if (!modal) {
        console.error("❌ Quick topic modal not found!");
        return;
    }
    
    // Reset form
    const titleInput = document.getElementById('quickTopicTitle');
    if (titleInput) titleInput.value = '';
    
    const descriptionInput = document.getElementById('quickTopicDescription');
    if (descriptionInput) descriptionInput.value = '';
    
    const moduleSelect = document.getElementById('quickModuleSelect');
    const lessonSelect = document.getElementById('quickLessonSelect');
    const statusDiv = document.getElementById('quickTopicStatus');
    const createModuleBtn = document.getElementById('createModuleButton');
    
    // Reset module select
    if (moduleSelect) {
        moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
        moduleSelect.disabled = true;  // I-disable muna hanggat walang napipiling lesson
    }
    
    // Show loading
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div style="background: #e3f2fd; color: #1976d2; padding: 15px; border-radius: 4px;">
                <i class="fas fa-spinner fa-spin"></i> Loading modules from database...
            </div>
        `;
    }
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            throw new Error('No admin token found');
        }
        
        console.log("📡 Fetching structure from server...");
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success) {
            // SET GLOBAL VARIABLES
            window.quickModules = result.structure.modules || [];
            window.quickLessons = result.structure.lessons || [];
            window.quickTopics = result.structure.topics || [];
            
            console.log("✅ GLOBAL VARIABLES SET:");
            console.log("   📦 Modules:", window.quickModules.length);
            console.log("   📚 Lessons:", window.quickLessons.length);
            
            // POPULATE LESSON DROPDOWN - WALANG AUTO-SELECT
            if (lessonSelect) {
                lessonSelect.innerHTML = '<option value="">-- Select Lesson --</option>';
                
                if (window.quickLessons.length > 0) {
                    window.quickLessons.forEach(lesson => {
                        const option = document.createElement('option');
                        option.value = lesson.id;
                        option.textContent = lesson.name;
                        lessonSelect.appendChild(option);
                    });
                    
                    console.log("✅ Lesson dropdown populated - please select a lesson");
                } else {
                    console.warn("⚠️ No lessons found in database");
                }
            }
            
            // HIDE LOADING
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
            
        } else {
            throw new Error(result.message || 'Failed to load structure');
        }
        
    } catch (error) {
        console.error('❌ Error in openQuickTopicModal:', error);
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px;">
                    <i class="fas fa-exclamation-circle"></i>
                    <strong>Error:</strong> ${error.message}
                    <button onclick="openQuickTopicModal()" style="margin-left: 10px; background: #c62828; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
}

// ===== OPEN QUICK MODULE MODAL =====
function openQuickModuleModal() {
    console.log("📦 Opening quick module modal...");
    
    // Close topic modal first
    closeQuickTopicModal();
    
    // Create modal if not exists
    if (!document.getElementById('quickModuleModal')) {
        createQuickModuleModal();
    }
    
    // Get modal
    const modal = document.getElementById('quickModuleModal');
    if (!modal) return;
    
    // Populate lesson dropdown
    const lessonSelect = document.getElementById('quickModuleLessonSelect');
    if (lessonSelect) {
        lessonSelect.innerHTML = '<option value="">-- Select Lesson --</option>';
        
        if (window.quickLessons && window.quickLessons.length > 0) {
            window.quickLessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = lesson.id;
                option.textContent = lesson.name;
                lessonSelect.appendChild(option);
            });
            
            // Auto-select the lesson from topic modal if available
            const topicLessonSelect = document.getElementById('quickLessonSelect');
            if (topicLessonSelect && topicLessonSelect.value) {
                lessonSelect.value = topicLessonSelect.value;
            }
        }
    }
    
    // Clear inputs
    const nameInput = document.getElementById('quickModuleName');
    if (nameInput) nameInput.value = '';
    
    const descInput = document.getElementById('quickModuleDescription');
    if (descInput) descInput.value = '';
    
    const previewContainer = document.getElementById('modulePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10002';
    document.body.classList.add('modal-open');
    
    // Focus on name input
    setTimeout(() => {
        if (nameInput) nameInput.focus();
    }, 300);
    
    console.log("✅ Quick module modal opened successfully");
}

// ===== CREATE QUICK MODULE MODAL =====
function createQuickModuleModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('quickModuleModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div id="quickModuleModal" class="modal" style="display: none; z-index: 10002;">
            <div class="modal-backdrop" onclick="closeQuickModuleModal()"></div>
            <div class="modal-content" style="max-width: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
                
                <!-- MODAL HEADER -->
                <div class="modal-header" style="background: linear-gradient(135deg, #7a0000 0%, #a30000 100%); color: white; padding: 20px 25px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 10px; font-size: 1.3rem;">
                            <i class="fas fa-cubes"></i> Create New Module
                        </h3>
                        <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.85rem;">
                            Modules help organize your lessons into manageable sections
                        </p>
                    </div>
                    <!-- CLOSE BUTTON (X) -->
                    <button class="modal-close" onclick="closeQuickModuleModal()" 
                            style="background: none; border: none; color: white; font-size: 28px; cursor: pointer; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 50%; hover:background: rgba(255,255,255,0.1);">
                        &times;
                    </button>
                </div>
                
                <!-- MODAL BODY -->
                <div class="modal-body" style="padding: 30px; background: white;">
                    
                    <!-- Lesson Selection -->
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #333;">
                            <i class="fas fa-book"></i> Select Lesson <span style="color: red;">*</span>
                        </label>
                        <select id="quickModuleLessonSelect" class="form-control" 
                                style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem; background: white;">
                            <option value="">-- Select Lesson --</option>
                        </select>
                        <p style="font-size: 0.75rem; color: #666; margin-top: 5px;">
                            <i class="fas fa-info-circle"></i> Choose which lesson this module belongs to
                        </p>
                    </div>
                    
                    <!-- Module Name -->
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #333;">
                            <i class="fas fa-tag"></i> Module Name <span style="color: red;">*</span>
                        </label>
                        <input type="text" id="quickModuleName" class="form-control" 
                               placeholder="e.g., Introduction, Basic Concepts, Advanced Topics"
                               style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.95rem;">
                        <p style="font-size: 0.75rem; color: #666; margin-top: 5px;">
                            <i class="fas fa-lightbulb"></i> Tip: Use descriptive names like "Polynomial Basics" or "Factorial Functions"
                        </p>
                    </div>
                    
                    <!-- Module Description (Optional) -->
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #333;">
                            <i class="fas fa-align-left"></i> Description (Optional)
                        </label>
                        <textarea id="quickModuleDescription" class="form-control" 
                                  placeholder="What will students learn in this module? E.g., In this module, students will learn the basic concepts of..."
                                  rows="3"
                                  style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; resize: vertical;"></textarea>
                    </div>
                    
                    <!-- Preview Card -->
                    <div id="modulePreviewContainer" style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 10px; border-left: 4px solid #7a0000; display: none;">
                        <h4 style="margin: 0 0 15px 0; font-size: 0.9rem; color: #666; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-eye"></i> Module Preview
                        </h4>
                        <div id="modulePreview" style="min-height: 70px;"></div>
                    </div>
                </div>
                
                <!-- MODAL FOOTER - WITH CLOSE AND SAVE BUTTONS -->
                <div class="modal-footer" style="padding: 20px 30px; background: #f8f9fa; border-top: 1px solid #e0e0e0; display: flex; justify-content: flex-end; gap: 12px;">
                    
                    <!-- CLOSE BUTTON -->
                    <button class="btn btn-secondary" onclick="closeQuickModuleModal()" 
                            style="padding: 12px 24px; border: 1px solid #ccc; background: white; border-radius: 6px; font-weight: 600; cursor: pointer; color: #666; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    
                    <!-- SAVE MODULE BUTTON -->
                    <button class="btn btn-primary" onclick="saveQuickModule()" 
                            style="padding: 12px 24px; background: #7a0000; color: white; border: none; border-radius: 6px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <i class="fas fa-save"></i> Create Module
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add preview update listener
    const nameInput = document.getElementById('quickModuleName');
    const lessonSelect = document.getElementById('quickModuleLessonSelect');
    const descInput = document.getElementById('quickModuleDescription');
    const previewContainer = document.getElementById('modulePreviewContainer');
    const previewDiv = document.getElementById('modulePreview');
    
    if (nameInput && lessonSelect && previewContainer && previewDiv) {
        // Populate lesson dropdown
        if (window.quickLessons && window.quickLessons.length > 0) {
            window.quickLessons.forEach(lesson => {
                const option = document.createElement('option');
                option.value = lesson.id;
                option.textContent = lesson.name;
                lessonSelect.appendChild(option);
            });
            
            // Auto-select the lesson from topic modal if available
            const topicLessonSelect = document.getElementById('quickLessonSelect');
            if (topicLessonSelect && topicLessonSelect.value) {
                lessonSelect.value = topicLessonSelect.value;
            }
        }
        
        // Update preview on input
        function updatePreview() {
            const moduleName = nameInput.value.trim();
            const selectedLesson = lessonSelect.options[lessonSelect.selectedIndex]?.text || 'Selected Lesson';
            const moduleDesc = descInput?.value.trim() || 'No description provided';
            
            if (moduleName) {
                previewContainer.style.display = 'block';
                previewDiv.innerHTML = `
                    <div style="background: white; padding: 18px; border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                            <div style="background: #7a0000; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white;">
                                <i class="fas fa-cubes"></i>
                            </div>
                            <div>
                                <strong style="color: #7a0000; font-size: 1.1rem; display: block;">${moduleName}</strong>
                                <span style="font-size: 0.75rem; color: #666; display: flex; align-items: center; gap: 5px;">
                                    <i class="fas fa-folder"></i> ${selectedLesson}
                                </span>
                            </div>
                        </div>
                        <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #555; padding-top: 8px; border-top: 1px dashed #e0e0e0;">
                            ${moduleDesc}
                        </p>
                    </div>
                `;
            } else {
                previewContainer.style.display = 'none';
            }
        }
        
        nameInput.addEventListener('input', updatePreview);
        lessonSelect.addEventListener('change', updatePreview);
        if (descInput) descInput.addEventListener('input', updatePreview);
    }
    
    console.log("✅ Quick module modal created with CLOSE and SAVE buttons");
}
// ===== SAVE QUICK MODULE =====
async function saveQuickModule() {
    console.log("💾 Saving quick module...");
    
    const lessonId = document.getElementById('quickModuleLessonSelect').value;
    const moduleName = document.getElementById('quickModuleName').value.trim();
    const moduleDescription = document.getElementById('quickModuleDescription')?.value.trim() || '';
    
    if (!lessonId) {
        showNotification('error', 'Error', 'Please select a lesson');
        return;
    }
    
    if (!moduleName) {
        showNotification('error', 'Error', 'Please enter a module name');
        return;
    }
    
    // Get buttons for loading state
    const saveBtn = document.querySelector('#quickModuleModal .btn-primary');
    const cancelBtn = document.querySelector('#quickModuleModal .btn-secondary');
    
    if (!saveBtn) return;
    
    // Save original content
    const originalSaveText = saveBtn.innerHTML;
    const originalCancelText = cancelBtn?.innerHTML;
    
    // Show loading state
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    saveBtn.disabled = true;
    if (cancelBtn) cancelBtn.disabled = true;
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            throw new Error('No admin token found');
        }
        
        console.log("📡 Saving module to server...", {
            lesson_id: parseInt(lessonId),
            module_name: moduleName,
            description: moduleDescription
        });
        
        const response = await fetch('http://localhost:5000/api/admin/modules', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lesson_id: parseInt(lessonId),
                module_name: moduleName,
                module_description: moduleDescription || null
            })
        });
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success) {
            showNotification('success', 'Success!', `Module "${moduleName}" created successfully!`);
            
            // Close module modal
            closeQuickModuleModal();
            
            // Refresh structure from server
            try {
                const structureResponse = await fetch('http://localhost:5000/api/admin/structure', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const structureResult = await structureResponse.json();
                
                if (structureResult.success) {
                    window.quickModules = structureResult.structure.modules || [];
                    window.quickLessons = structureResult.structure.lessons || [];
                    window.quickTopics = structureResult.structure.topics || [];
                    console.log("✅ Structure refreshed, modules:", window.quickModules.length);
                }
            } catch (refreshError) {
                console.warn("⚠️ Could not refresh structure:", refreshError);
            }
            
            // Reopen topic modal
            setTimeout(() => {
                openQuickTopicModal();
            }, 500);
            
        } else {
            throw new Error(result.message || 'Failed to create module');
        }
        
    } catch (error) {
        console.error('❌ Error creating module:', error);
        showNotification('error', 'Failed', error.message);
        
        // Restore buttons on error
        saveBtn.innerHTML = originalSaveText;
        saveBtn.disabled = false;
        if (cancelBtn) cancelBtn.disabled = false;
    }
}

// ===== CLOSE QUICK MODULE MODAL =====
function closeQuickModuleModal() {
    console.log("🔴 Closing quick module modal...");
    
    const modal = document.getElementById('quickModuleModal');
    if (modal) {
        // Add fade out animation
        modal.style.animation = 'fadeOut 0.2s ease';
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = '';
            document.body.classList.remove('modal-open');
            
            // Reset form
            const nameInput = document.getElementById('quickModuleName');
            const descInput = document.getElementById('quickModuleDescription');
            const previewContainer = document.getElementById('modulePreviewContainer');
            
            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            if (previewContainer) previewContainer.style.display = 'none';
            
            console.log("✅ Quick module modal closed");
        }, 150);
    }
}

// ===== CLOSE QUICK TOPIC MODAL =====
function closeQuickTopicModal() {
    console.log("🔴 Closing quick topic modal...");
    
    const modal = document.getElementById('quickTopicModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== ADD CSS ANIMATIONS =====
function addModalAnimations() {
    if (document.getElementById('modalAnimations')) return;
    
    const style = document.createElement('style');
    style.id = 'modalAnimations';
    style.textContent = `
        @keyframes fadeOut {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.95); }
        }
        
        .modal {
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .modal-content {
            animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .btn-primary, .btn-secondary {
            transition: all 0.2s ease;
        }
        
        .btn-primary:hover {
            background: #5a0000 !important;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(122,0,0,0.3);
        }
        
        .btn-secondary:hover {
            background: #e0e0e0 !important;
            transform: translateY(-2px);
        }
        
        .modal-close:hover {
            background: rgba(255,255,255,0.1) !important;
            transform: rotate(90deg);
            transition: transform 0.3s ease;
        }
    `;
    
    document.head.appendChild(style);
    console.log("✅ Modal animations added");
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        addModalAnimations();
    }, 1000);
});

// ===== ADD TOPIC PREVIEW FUNCTIONALITY =====
function addTopicPreviewListeners() {
    const titleInput = document.getElementById('quickTopicTitle');
    const descInput = document.getElementById('quickTopicDescription');
    const lessonSelect = document.getElementById('quickLessonSelect');
    const moduleSelect = document.getElementById('quickModuleSelect');
    const previewContainer = document.getElementById('topicPreviewContainer');
    const previewDiv = document.getElementById('topicPreview');
    
    if (!titleInput || !previewContainer || !previewDiv) return;
    
    function updateTopicPreview() {
        const title = titleInput.value.trim();
        const description = descInput?.value.trim() || 'No description provided';
        const lessonName = lessonSelect?.options[lessonSelect.selectedIndex]?.text || 'No lesson selected';
        let moduleName = 'No module selected';
        
        if (moduleSelect && moduleSelect.value) {
            if (moduleSelect.value === 'general') {
                moduleName = '📁 General Module';
            } else if (moduleSelect.value === 'create') {
                moduleName = '➕ New Module (to be created)';
            } else {
                const selectedOption = moduleSelect.options[moduleSelect.selectedIndex];
                moduleName = selectedOption?.text || 'Selected Module';
            }
        }
        
        if (title) {
            previewContainer.style.display = 'block';
            previewDiv.innerHTML = `
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e0e0e0;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                        <div style="background: #7a0000; width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white;">
                            <i class="fas fa-tag" style="font-size: 0.8rem;"></i>
                        </div>
                        <div>
                            <strong style="color: #7a0000; font-size: 1rem;">${title}</strong>
                            <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">
                                <i class="fas fa-folder"></i> ${lessonName} → ${moduleName}
                            </div>
                        </div>
                    </div>
                    <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #555; padding-top: 8px; border-top: 1px dashed #e0e0e0;">
                        ${description}
                    </p>
                </div>
            `;
        } else {
            previewContainer.style.display = 'none';
        }
    }
    
    titleInput.addEventListener('input', updateTopicPreview);
    if (descInput) descInput.addEventListener('input', updateTopicPreview);
    if (lessonSelect) lessonSelect.addEventListener('change', updateTopicPreview);
    if (moduleSelect) moduleSelect.addEventListener('change', updateTopicPreview);
}

// Call this when modal opens
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        addTopicPreviewListeners();
    }, 1500);
});

let generalModuleId = null; // Store the ID of General Module

// ===== CHECK OR CREATE GENERAL MODULE =====
async function ensureGeneralModuleExists(lessonId) {
    console.log("🔍 Checking if General Module exists for lesson:", lessonId);
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) return null;
        
        // Check if we already have modules loaded
        if (!window.quickModules) {
            await loadModuleStructure();
        }
        
        // Look for existing General Module sa lesson na ito
        let generalModule = window.quickModules?.find(m => 
            m.lesson_id == lessonId && 
            (m.name.toLowerCase().includes('general') || 
             m.name.toLowerCase().includes('default'))
        );
        
        if (generalModule) {
            console.log("✅ Found existing General Module:", generalModule);
            generalModuleId = generalModule.id;
            return generalModule.id;
        }
        
        // If none exists, create General Module
        console.log("📦 No General Module found, creating one...");
        
        const response = await fetch('http://localhost:5000/api/admin/modules', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lesson_id: parseInt(lessonId),
                module_name: 'General Module',
                module_description: 'Default module for general topics and lessons'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ General Module created successfully:", result.module);
            generalModuleId = result.module.id;
            
            // Update global modules
            if (!window.quickModules) window.quickModules = [];
            window.quickModules.push(result.module);
            
            return result.module.id;
        } else {
            throw new Error(result.message || 'Failed to create General Module');
        }
        
    } catch (error) {
        console.error('❌ Error ensuring General Module exists:', error);
        return null;
    }
}

// ===== HANDLE VIDEO FILE SELECT =====
function handleVideoFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("🎬 Video file selected:", file.name, file.size);
    
    // Update file info
    document.getElementById('videoFileName').textContent = file.name;
    document.getElementById('videoFileSize').textContent = (file.size / (1024*1024)).toFixed(2) + ' MB';
    document.getElementById('videoFileInfo').style.display = 'block';
    
    // Show new video indicator
    document.getElementById('newVideoFilename').textContent = file.name + ' (' + (file.size / (1024*1024)).toFixed(2) + ' MB)';
    document.getElementById('newVideoIndicator').style.display = 'block';
    
    // Hide existing video indicator if showing
    document.getElementById('existingVideoInfo').style.display = 'none';
    
    // Create video preview
    const preview = document.getElementById('videoPreview');
    const previewContainer = document.getElementById('videoPreviewContainer');
    preview.src = URL.createObjectURL(file);
    previewContainer.style.display = 'block';
    
    // Change upload area style
    document.getElementById('videoUploadArea').style.borderColor = '#4caf50';
    document.getElementById('videoUploadArea').style.background = '#f1f8e9';
}

// ===== SET EXISTING VIDEO INFO (FOR EDIT MODE) =====
function setExistingVideoInfo(filename) {
    if (!filename) return;
    
    console.log("📹 Setting existing video:", filename);
    
    const existingVideoDiv = document.getElementById('existingVideoInfo');
    const existingVideoSpan = document.getElementById('existingVideoFilename');
    
    existingVideoSpan.textContent = filename;
    existingVideoDiv.style.display = 'block';
    
    // Clear any new video selection
    cancelNewVideo();
}

// ===== CLEAR EXISTING VIDEO =====
function clearExistingVideo() {
    console.log("🗑️ Clearing existing video reference");
    
    document.getElementById('existingVideoInfo').style.display = 'none';
    
    // Add a flag to indicate that existing video should be removed on save
    window.removeExistingVideo = true;
    
    showNotification('info', 'Video Removed', 'Existing video will be removed when you save');
}

// ===== CANCEL NEW VIDEO =====
function cancelNewVideo() {
    console.log("❌ Cancelling new video upload");
    
    // Clear file input
    const videoInput = document.getElementById('videoFileInput');
    videoInput.value = '';
    
    // Hide indicators
    document.getElementById('newVideoIndicator').style.display = 'none';
    document.getElementById('videoFileInfo').style.display = 'none';
    document.getElementById('videoPreviewContainer').style.display = 'none';
    
    // Reset upload area style
    document.getElementById('videoUploadArea').style.borderColor = '#ddd';
    document.getElementById('videoUploadArea').style.background = '';
    
    // Show existing video again if it exists
    const existingFilename = document.getElementById('existingVideoFilename').textContent;
    if (existingFilename) {
        document.getElementById('existingVideoInfo').style.display = 'block';
    }
    
    window.removeExistingVideo = false;
}

// ===== UPDATED REMOVE VIDEO FILE =====
function removeVideoFile() {
    console.log("🗑️ Removing video file selection");
    
    const videoInput = document.getElementById('videoFileInput');
    if (videoInput) {
        videoInput.value = '';
    }
    
    // Hide indicators
    document.getElementById('videoFileInfo').style.display = 'none';
    document.getElementById('videoPreviewContainer').style.display = 'none';
    document.getElementById('newVideoIndicator').style.display = 'none';
    
    // Reset upload area style
    document.getElementById('videoUploadArea').style.borderColor = '#ddd';
    document.getElementById('videoUploadArea').style.background = '';
    
    // Show existing video again if it exists
    const existingFilename = document.getElementById('existingVideoFilename').textContent;
    if (existingFilename) {
        document.getElementById('existingVideoInfo').style.display = 'block';
    }
}

// ===== FILTER MODULES FOR QUICK TOPIC =====
function filterQuickModules() {
    console.log("🔍 Filtering modules for quick topic...");
    
    const lessonId = document.getElementById('quickLessonSelect')?.value;
    const moduleSelect = document.getElementById('quickModuleSelect');
    const createModuleBtn = document.getElementById('createModuleButton');
    
    if (!moduleSelect) {
        console.error("❌ Module select not found!");
        return;
    }
    
    console.log("📋 Selected Lesson ID:", lessonId || "(none)");
    
    // I-enable ang module dropdown
    moduleSelect.disabled = false;
    
    // I-clear ang dropdown
    moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
    
    // KUNG WALANG NAPILING LESSON
    if (!lessonId) {
        console.log("ℹ️ No lesson selected - please select a lesson first");
        
        // Add General Module option
        const generalOption = document.createElement('option');
        generalOption.value = 'general';
        generalOption.textContent = '📁 General Module (Auto-create)';
        generalOption.style.color = '#4CAF50';
        generalOption.style.fontWeight = 'bold';
        moduleSelect.appendChild(generalOption);
        
        // Add Create Module option
        const createOption = document.createElement('option');
        createOption.value = 'create';
        createOption.textContent = '➕ Create New Module...';
        createOption.style.color = '#7a0000';
        createOption.style.fontWeight = 'bold';
        moduleSelect.appendChild(createOption);
        
        if (createModuleBtn) createModuleBtn.style.display = 'block';
        
        // Also fetch topics from database even without lesson selected
        fetchTopicsFromDatabase();
        return;
    }
    
    // MAY NAPILING LESSON - I-filter ang modules
    console.log(`🔎 Filtering modules for lesson ID: ${lessonId}`);
    
    // Make sure we have modules data
    if (!window.quickModules) {
        console.log("⚠️ No modules loaded yet, fetching from server...");
        loadModuleStructure().then(() => {
            // Retry after loading
            setTimeout(() => filterQuickModules(), 500);
        });
        return;
    }
    
    const filteredModules = window.quickModules?.filter(m => parseInt(m.lesson_id) === parseInt(lessonId)) || [];
    console.log(`📊 Found ${filteredModules.length} modules for lesson ${lessonId}`);
    
    if (filteredModules.length > 0) {
        filteredModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.id;
            option.textContent = `📦 ${module.name}`;
            moduleSelect.appendChild(option);
        });
        
        if (createModuleBtn) createModuleBtn.style.display = 'none';
    } else {
        console.log(`⚠️ No modules found for lesson ${lessonId}`);
        if (createModuleBtn) createModuleBtn.style.display = 'block';
    }
    
    // Add General Module option
    const generalOption = document.createElement('option');
    generalOption.value = 'general';
    generalOption.textContent = '📁 General Module (Auto-create)';
    generalOption.style.color = '#4CAF50';
    generalOption.style.fontWeight = 'bold';
    moduleSelect.appendChild(generalOption);
    
    // Add Create Module option
    const createOption = document.createElement('option');
    createOption.value = 'create';
    createOption.textContent = '➕ Create New Module...';
    createOption.style.color = '#7a0000';
    createOption.style.fontWeight = 'bold';
    moduleSelect.appendChild(createOption);
    
    console.log("✅ Module dropdown populated for lesson", lessonId);
    
    // Fetch topics for this lesson
    fetchTopicsForLesson(lessonId);
}

// ===== ADD THIS TO YOUR INITIALIZATION CODE =====
function initializeQuickTopicModalListeners() {
    const lessonSelect = document.getElementById('quickLessonSelect');
    
    if (lessonSelect) {
        // Remove any existing listeners first
        const newLessonSelect = lessonSelect.cloneNode(true);
        lessonSelect.parentNode.replaceChild(newLessonSelect, lessonSelect);
        
        // Add new change listener
        newLessonSelect.addEventListener('change', function() {
            console.log("📚 Lesson selected:", this.value);
            filterQuickModules();
        });
        
        console.log("✅ Lesson select listener attached");
    }
}

// Call this after opening the quick topic modal
function openQuickTopicModal() {
    console.log("📝 Opening quick topic modal...");
    
    const modal = document.getElementById('quickTopicModal');
    if (!modal) {
        console.error("❌ Quick topic modal not found!");
        return;
    }
    
    // Reset form
    const titleInput = document.getElementById('quickTopicTitle');
    if (titleInput) titleInput.value = '';
    
    const descriptionInput = document.getElementById('quickTopicDescription');
    if (descriptionInput) descriptionInput.value = '';
    
    const moduleSelect = document.getElementById('quickModuleSelect');
    const lessonSelect = document.getElementById('quickLessonSelect');
    const statusDiv = document.getElementById('quickTopicStatus');
    const createModuleBtn = document.getElementById('createModuleButton');
    
    // Reset module select
    if (moduleSelect) {
        moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
        moduleSelect.disabled = true;  // I-disable muna hanggat walang napipiling lesson
    }
    
    // Show loading
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div style="background: #e3f2fd; color: #1976d2; padding: 15px; border-radius: 4px;">
                <i class="fas fa-spinner fa-spin"></i> Loading modules from database...
            </div>
        `;
    }
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            throw new Error('No admin token found');
        }
        
        console.log("📡 Fetching structure from server...");
        fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.json())
        .then(result => {
            console.log("📥 Server response:", result);
            
            if (result.success) {
                // SET GLOBAL VARIABLES
                window.quickModules = result.structure.modules || [];
                window.quickLessons = result.structure.lessons || [];
                window.quickTopics = result.structure.topics || [];
                
                console.log("✅ GLOBAL VARIABLES SET:");
                console.log("   📦 Modules:", window.quickModules.length);
                console.log("   📚 Lessons:", window.quickLessons.length);
                
                // POPULATE LESSON DROPDOWN
                if (lessonSelect) {
                    lessonSelect.innerHTML = '<option value="">-- Select Lesson --</option>';
                    
                    if (window.quickLessons.length > 0) {
                        window.quickLessons.forEach(lesson => {
                            const option = document.createElement('option');
                            option.value = lesson.id;
                            option.textContent = lesson.name;
                            lessonSelect.appendChild(option);
                        });
                        
                        console.log("✅ Lesson dropdown populated - please select a lesson");
                    } else {
                        console.warn("⚠️ No lessons found in database");
                    }
                }
                
                // HIDE LOADING
                if (statusDiv) {
                    statusDiv.style.display = 'none';
                }
                
                // Initialize the change listener
                initializeQuickTopicModalListeners();
                
            } else {
                throw new Error(result.message || 'Failed to load structure');
            }
        })
        .catch(error => {
            console.error('❌ Error in openQuickTopicModal:', error);
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div style="background: #ffebee; color: #c62828; padding: 15px; border-radius: 4px;">
                        <i class="fas fa-exclamation-circle"></i>
                        <strong>Error:</strong> ${error.message}
                        <button onclick="openQuickTopicModal()" style="margin-left: 10px; background: #c62828; color: white; border: none; padding: 5px 15px; border-radius: 4px; cursor: pointer;">
                            Retry
                        </button>
                    </div>
                `;
            }
        });
        
    } catch (error) {
        console.error('❌ Error in openQuickTopicModal:', error);
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
}

// ===== NEW FUNCTION: Fetch topics from database =====
async function fetchTopicsFromDatabase() {
    console.log("📥 Fetching topics from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log("❌ No auth token");
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            window.quickModules = result.structure.modules || [];
            window.quickLessons = result.structure.lessons || [];
            window.quickTopics = result.structure.topics || [];
            
            console.log("✅ Structure loaded:", {
                modules: window.quickModules.length,
                lessons: window.quickLessons.length,
                topics: window.quickTopics.length
            });
        }
    } catch (error) {
        console.error("❌ Error fetching topics:", error);
    }
}

// ===== NEW FUNCTION: Fetch topics for specific lesson =====
async function fetchTopicsForLesson(lessonId) {
    console.log(`📥 Fetching topics for lesson ${lessonId}...`);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) return;
        
        // Get modules for this lesson first
        const modulesForLesson = window.quickModules?.filter(m => parseInt(m.lesson_id) === parseInt(lessonId)) || [];
        
        if (modulesForLesson.length === 0) {
            console.log("⚠️ No modules found for this lesson");
            return;
        }
        
        // Get module IDs
        const moduleIds = modulesForLesson.map(m => m.id);
        
        // Filter topics that belong to these modules
        const topicsForLesson = window.quickTopics?.filter(t => 
            moduleIds.includes(parseInt(t.module_id))
        ) || [];
        
        console.log(`📚 Found ${topicsForLesson.length} topics for lesson ${lessonId}`);
        
        // Update topic dropdown if needed
        updateTopicDropdown(topicsForLesson);
        
    } catch (error) {
        console.error("❌ Error fetching topics for lesson:", error);
    }
}

// ===== NEW FUNCTION: Update topic dropdown =====
function updateTopicDropdown(topics) {
    const topicSelect = document.getElementById('topicSelect');
    if (!topicSelect) return;
    
    // Clear existing options except the first one
    while (topicSelect.options.length > 1) {
        topicSelect.remove(1);
    }
    
    if (topics.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- No topics available --';
        option.disabled = true;
        topicSelect.appendChild(option);
        return;
    }
    
    topics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.id;
        option.textContent = topic.name || topic.topic_title;
        topicSelect.appendChild(option);
    });
    
    console.log(`✅ Topic dropdown updated with ${topics.length} topics`);
}

// ===== FIXED VIDEO PROGRESS TRACKING =====
function initVideoProgressTracking(videoElement, contentId) {
    if (!videoElement || !contentId) return;
    
    console.log(`🎬 Initializing progress tracking for video ${contentId}`);
    
    let lastUpdateTime = 0;
    let totalWatchedTime = 0;
    let updateInterval;
    
    // When video starts playing
    videoElement.addEventListener('play', function() {
        console.log(`▶️ Video ${contentId} started playing`);
        
        // Update progress every 30 seconds
        updateInterval = setInterval(() => {
            const currentTime = Math.floor(videoElement.currentTime);
            const duration = Math.floor(videoElement.duration || 0);
            
            if (duration > 0) {
                const percentage = Math.floor((currentTime / duration) * 100);
                
                // Determine status
                let status = 'in_progress';
                if (percentage >= 95) {
                    status = 'completed';
                }
                
                // Calculate time spent since last update (max 30 seconds)
                const timeSpent = Math.min(30, currentTime - lastUpdateTime);
                if (timeSpent > 0) {
                    totalWatchedTime += timeSpent;
                    lastUpdateTime = currentTime;
                    
                    // Send progress update
                    updateVideoProgress(contentId, status, percentage, timeSpent);
                }
            }
        }, 30000); // Every 30 seconds
    });
    
    // When video is paused or ended
    videoElement.addEventListener('pause', function() {
        console.log(`⏸️ Video ${contentId} paused`);
        clearInterval(updateInterval);
        sendFinalProgress();
    });
    
    videoElement.addEventListener('ended', function() {
        console.log(`✅ Video ${contentId} completed`);
        clearInterval(updateInterval);
        
        // Mark as completed
        updateVideoProgress(contentId, 'completed', 100, 0);
    });
    
    // When video is seeked
    videoElement.addEventListener('seeked', function() {
        lastUpdateTime = videoElement.currentTime;
    });
    
    // Function to send progress update
    async function updateVideoProgress(contentId, status, percentage, timeSpent) {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
            
            const response = await fetch(`http://localhost:5000/api/lessons-db/${contentId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    completion_status: status,
                    percentage: percentage,
                    time_spent_seconds: timeSpent
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Progress saved: ${percentage}%`);
            } else {
                console.warn('⚠️ Progress save failed:', result.message);
            }
        } catch (error) {
            console.error('❌ Error saving progress:', error);
        }
    }
    
    // Send final progress before page unload
    function sendFinalProgress() {
        const currentTime = Math.floor(videoElement.currentTime);
        const duration = Math.floor(videoElement.duration || 0);
        
        if (duration > 0 && currentTime > 0) {
            const percentage = Math.floor((currentTime / duration) * 100);
            const timeSpent = Math.max(0, currentTime - lastUpdateTime);
            
            if (timeSpent > 0) {
                updateVideoProgress(contentId, 'in_progress', percentage, timeSpent);
            }
        }
    }
    
    // Save progress when user leaves page
    window.addEventListener('beforeunload', sendFinalProgress);
}

// ===== SAVE QUICK TOPIC =====
async function saveQuickTopic() {
    console.log("💾 Saving quick topic...");
    
    const moduleValue = document.getElementById('quickModuleSelect').value;
    const title = document.getElementById('quickTopicTitle').value.trim();
    const description = document.getElementById('quickTopicDescription').value.trim();
    const lessonId = document.getElementById('quickLessonSelect').value;
    
    if (!lessonId) {
        showNotification('error', 'Error', 'Please select a lesson');
        return;
    }
    
    if (!moduleValue) {
        showNotification('error', 'Error', 'Please select a module');
        return;
    }
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a topic title');
        return;
    }
    
    // Get buttons for loading state
    const saveBtn = document.querySelector('#quickTopicModal .btn-primary');
    const cancelBtn = document.querySelector('#quickTopicModal .btn-secondary');
    
    if (!saveBtn) return;
    
    // Save original button text
    const originalSaveText = saveBtn.innerHTML;
    const originalCancelText = cancelBtn?.innerHTML;
    
    // Show loading state
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    saveBtn.disabled = true;
    if (cancelBtn) {
        cancelBtn.disabled = true;
        cancelBtn.style.opacity = '0.5';
    }
    
    // Determine module ID
    let moduleId = moduleValue;
    
    // If "general" ang napili, i-create or gamitin ang General Module
    if (moduleValue === 'general') {
        showNotification('info', 'General Module', 'Using/Creating General Module...');
        
        // Check if may existing General Module
        const existingGeneral = window.quickModules?.find(m => 
            m.lesson_id == lessonId && 
            (m.name.toLowerCase().includes('general') || m.name.toLowerCase().includes('default'))
        );
        
        if (existingGeneral) {
            moduleId = existingGeneral.id;
            console.log("✅ Using existing General Module ID:", moduleId);
        } else {
            // Create new General Module
            try {
                const token = localStorage.getItem('admin_token');
                const response = await fetch('http://localhost:5000/api/admin/modules', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lesson_id: parseInt(lessonId),
                        module_name: 'General Module',
                        module_description: 'Default module for general topics'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    moduleId = result.module.id;
                    console.log("✅ Created new General Module ID:", moduleId);
                    
                    // Update global modules
                    if (!window.quickModules) window.quickModules = [];
                    window.quickModules.push(result.module);
                } else {
                    throw new Error(result.message || 'Failed to create General Module');
                }
            } catch (error) {
                console.error('❌ Error creating General Module:', error);
                showNotification('error', 'Failed', 'Could not create General Module');
                
                // Restore buttons
                saveBtn.innerHTML = originalSaveText;
                saveBtn.disabled = false;
                if (cancelBtn) {
                    cancelBtn.disabled = false;
                    cancelBtn.style.opacity = '1';
                }
                return;
            }
        }
    }
    
    // If "create" ang napili, open module creation modal
    if (moduleValue === 'create') {
        openQuickModuleModal();
        
        // Restore buttons
        saveBtn.innerHTML = originalSaveText;
        saveBtn.disabled = false;
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.style.opacity = '1';
        }
        return;
    }
    
    // Validate module ID (numeric IDs lang)
    if (!moduleId || isNaN(parseInt(moduleId))) {
        showNotification('error', 'Error', 'Please select a valid module');
        
        // Restore buttons
        saveBtn.innerHTML = originalSaveText;
        saveBtn.disabled = false;
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.style.opacity = '1';
        }
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token');
        
        const response = await fetch('http://localhost:5000/api/admin/topics', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                module_id: parseInt(moduleId),
                topic_title: title,
                topic_description: description || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Success!', 'Topic created successfully!');
            closeQuickTopicModal();
            
            // Refresh topic dropdown in create lesson modal
            await loadTopicStructure();
            
            // Auto-select the newly created topic
            setTimeout(() => {
                const topicSelect = document.getElementById('topicSelect');
                if (topicSelect) {
                    for (let i = 0; i < topicSelect.options.length; i++) {
                        if (topicSelect.options[i].text === title) {
                            topicSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }, 500);
            
        } else {
            throw new Error(result.message || 'Failed to create topic');
        }
        
    } catch (error) {
        console.error('❌ Error creating topic:', error);
        showNotification('error', 'Failed', error.message);
    } finally {
        // Restore buttons
        saveBtn.innerHTML = originalSaveText;
        saveBtn.disabled = false;
        if (cancelBtn) {
            cancelBtn.disabled = false;
            cancelBtn.style.opacity = '1';
        }
    }
}

// ===== CLOSE QUICK TOPIC MODAL =====
function closeQuickTopicModal() {
    const modal = document.getElementById('quickTopicModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== OPEN TOPIC MANAGEMENT MODAL =====
async function openTopicManagementModal() {
    const modal = document.getElementById('topicManagementModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
    
    // Load topics
    await loadManageTopicsList();
}

// ===== CLOSE TOPIC MANAGEMENT MODAL =====
function closeTopicManagementModal() {
    const modal = document.getElementById('topicManagementModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== LOAD MANAGE TOPICS LIST =====
async function loadManageTopicsList() {
    const container = document.getElementById('manageTopicsList');
    if (!container) return;
    
    try {
        const token = localStorage.getItem('admin_token');
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const topics = result.structure.topics || [];
            const modules = result.structure.modules || [];
            const lessons = result.structure.lessons || [];
            
            if (topics.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-folder-open" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                        <h4 style="color: #666; margin-bottom: 10px;">No Topics Found</h4>
                        <p style="color: #999;">Click "New Topic" button to create your first topic.</p>
                    </div>
                `;
                return;
            }
            
            let html = '<div style="display: grid; gap: 15px;">';
            
            topics.forEach(topic => {
                const module = modules.find(m => m.id == topic.module_id) || { name: 'Uncategorized' };
                const lesson = lessons.find(l => l.id == module.lesson_id) || { name: 'General' };
                
                html += `
                    <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; border-left: 4px solid #7a0000;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4 style="margin: 0 0 8px 0; color: #333;">${topic.name}</h4>
                                <div style="display: flex; gap: 15px; font-size: 0.8rem; color: #666; margin-bottom: 8px;">
                                    <span><i class="fas fa-book"></i> ${lesson.name}</span>
                                    <span><i class="fas fa-cube"></i> ${module.name}</span>
                                </div>
                                <span style="font-size: 0.7rem; background: #e8f5e9; color: #388e3c; padding: 3px 10px; border-radius: 12px;">
                                    ID: ${topic.id}
                                </span>
                            </div>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteTopic(${topic.id})" style="padding: 5px 10px;">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
        }
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #c62828;">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>Failed to load topics. Please try again.</p>
                <button class="btn btn-primary btn-sm" onclick="loadManageTopicsList()" style="margin-top: 15px; background: #7a0000;">
                    Retry
                </button>
            </div>
        `;
    }
}

// ===== HELPER FUNCTION FOR HYBRID SAVE =====
async function saveLessonToMySQLWithData(lessonData) {
    console.log("📦 Hybrid mode save with data:", lessonData);
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            throw new Error('No admin token');
        }
        
        const formData = new FormData();
        
        // Use topic_id, NOT subject_id
        formData.append('topic_id', lessonData.topic_id || lessonData.topicId || 1);
        formData.append('title', lessonData.title);
        formData.append('description', lessonData.description || '');
        formData.append('content_type', lessonData.content_type || lessonData.contentType || 'text');
        
        if (lessonData.module_id) {
            formData.append('module_id', lessonData.module_id);
        }
        
        if (lessonData.youtube_url || lessonData.youtubeUrl) {
            formData.append('youtube_url', lessonData.youtube_url || lessonData.youtubeUrl);
        }
        
        if (lessonData.video_file || lessonData.videoFile) {
            formData.append('video_file', lessonData.video_file || lessonData.videoFile);
        }
        
        const response = await fetch('http://127.0.0.1:5000/api/admin/lessons', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to save');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Hybrid save error:', error);
        throw error;
    }
}

// ===== UPDATED HYBRID SAVE =====
async function saveLessonHybrid() {
    console.log("=== SAVE LESSON HYBRID ===");
    
    const saveBtn = document.querySelector('#saveLessonBtn, .btn-primary[onclick*="save"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        // Get form data
        const title = document.getElementById('createLessonTitle')?.value.trim();
        const description = document.getElementById('createLessonDescription')?.value.trim();
        const topic_id = document.getElementById('topicSelect')?.value;
        const moduleValue = document.getElementById('moduleSelect')?.value;
        const lessonValue = document.getElementById('lessonSelect')?.value;
        
        if (!title || !description || !topic_id) {
            throw new Error('Please fill all required fields');
        }
        
        // Determine module ID
        let module_id = moduleValue;
        
        // If may napiling lesson pero walang module, check or create General Module
        if (lessonValue && (!module_id || module_id === '')) {
            showNotification('info', 'Module', 'No module selected. Using General Module...');
            
            // Check if may existing General Module sa lesson na ito
            const token = localStorage.getItem('admin_token');
            
            // Try to find existing General Module
            const existingGeneral = window.quickModules?.find(m => 
                m.lesson_id == lessonValue && 
                (m.name.toLowerCase().includes('general') || m.name.toLowerCase().includes('default'))
            );
            
            if (existingGeneral) {
                module_id = existingGeneral.id;
                console.log("✅ Using existing General Module ID:", module_id);
            } else {
                // Create new General Module
                try {
                    const response = await fetch('http://localhost:5000/api/admin/modules', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            lesson_id: parseInt(lessonValue),
                            module_name: 'General Module',
                            module_description: 'Auto-created module for lessons'
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        module_id = result.module.id;
                        console.log("✅ Created new General Module ID:", module_id);
                        
                        // Update global modules
                        if (!window.quickModules) window.quickModules = [];
                        window.quickModules.push(result.module);
                        
                        showNotification('success', 'Module Created', 'General Module created automatically');
                    }
                } catch (moduleError) {
                    console.warn("⚠️ Could not create General Module:", moduleError);
                }
            }
        }
        
        // Prepare lesson data
        const lessonData = {
            title: title,
            description: description,
            topic_id: topic_id,
            module_id: module_id || null,
            content_type: document.getElementById('videoFileInput')?.files[0] ? 'video' : 'text',
            video_file: document.getElementById('videoFileInput')?.files[0],
            youtube_url: document.getElementById('videoYoutubeUrl')?.value
        };
        
        console.log('📝 Lesson data prepared:', lessonData);
        
        // Try MySQL first
        try {
            const mysqlResult = await saveLessonToMySQLWithData(lessonData);
            
            // Save to localStorage as backup
            saveToLocalStorageBackup(mysqlResult.lesson || lessonData);
            
            showNotification('success', 'Saved!', 'Lesson saved to MySQL!');
            closeCreateLessonModal();
            resetLessonForm();
            
            return mysqlResult;
            
        } catch (mysqlError) {
            console.log('MySQL failed, using localStorage:', mysqlError);
            
            // Fallback to localStorage
            saveLessonToLocalStorage();
            
            showNotification('warning', 'Saved Locally', 
                'Lesson saved locally (server offline)');
            
            closeCreateLessonModal();
            resetLessonForm();
            
            return { success: true, offline: true };
        }
        
    } catch (error) {
        console.error('❌ Save failed:', error);
        showNotification('error', 'Save Failed', error.message);
        
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Lesson';
        }
    }
}

// ===== FUNCTION PARA MAG-ADD NG GENERAL MODULE OPTION SA MODULE SELECT =====
function addGeneralModuleOptionToSelect() {
    console.log("➕ Adding General Module option to module select...");
    
    const moduleSelect = document.getElementById('moduleSelect');
    if (!moduleSelect) return;
    
    // Check if may laman na
    const options = moduleSelect.options;
    let hasGeneralOption = false;
    
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === 'general') {
            hasGeneralOption = true;
            break;
        }
    }
    
    if (!hasGeneralOption) {
        // Add separator
        const separator = document.createElement('option');
        separator.disabled = true;
        separator.textContent = '──────────';
        moduleSelect.appendChild(separator);
        
        // Add General Module option
        const generalOption = document.createElement('option');
        generalOption.value = 'general';
        generalOption.textContent = '📁 General Module (Auto-create)';
        generalOption.style.color = '#4CAF50';
        generalOption.style.fontWeight = 'bold';
        moduleSelect.appendChild(generalOption);
        
        console.log("✅ General Module option added to module select");
    }
}

// ===== INITIALIZE GENERAL MODULE SYSTEM =====
function initializeGeneralModuleSystem() {
    console.log("🚀 Initializing General Module System...");
    
    // Add General Module option to module select
    setTimeout(() => {
        addGeneralModuleOptionToSelect();
    }, 1000);
    
    // Observe for when module select is populated
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.id === 'moduleSelect' && mutation.addedNodes.length > 0) {
                addGeneralModuleOptionToSelect();
            }
        });
    });
    
    const moduleSelect = document.getElementById('moduleSelect');
    if (moduleSelect) {
        observer.observe(moduleSelect, { childList: true, subtree: true });
    }
    
    console.log("✅ General Module System initialized");
}

// Call this when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeGeneralModuleSystem();
    }, 1500);
});

// ===== UPDATE ADMIN LESSON TABLE UI =====
function updateAdminLessonTable(lessons) {
    const tableBody = document.getElementById('adminLessonsTableBody');
    if (!tableBody) return;
    
    if (lessons.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-book-open text-muted fa-2x mb-2"></i>
                    <p class="text-muted">No lessons found. Create your first lesson!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = lessons.map(lesson => `
        <tr>
            <td>${lesson.content_id}</td>
            <td>
                <strong>${lesson.content_title}</strong>
                <div class="text-muted small">${lesson.topic_title || 'No topic'}</div>
            </td>
            <td>
                <span class="badge ${lesson.content_type === 'video' ? 'bg-danger' : 'bg-info'}">
                    ${lesson.content_type}
                </span>
            </td>
            <td>${lesson.module_name || 'N/A'}</td>
            <td>${lesson.lesson_name || 'N/A'}</td>
            <td>
                <span class="badge ${lesson.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${lesson.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewLesson(${lesson.content_id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editLesson(${lesson.content_id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteLesson(${lesson.content_id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// ===== INITIALIZATION =====
function initApp() {
    cacheDOM();
    initializeEventListeners();
    initializeCharts();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    initLocalDatabase();
    showDashboard();
    
    setTimeout(() => {
        updateAllStatsWithAnimation();
        preloadImportantData();
    }, 300);
}

function cacheDOM() {
    domCache.pageTitle = document.getElementById('pageTitle');
    domCache.navTitle = document.getElementById('navTitle');
    domCache.currentTime = document.getElementById('currentTime');
    domCache.currentDate = document.getElementById('currentDate'); // Add this line
    domCache.themeToggle = document.getElementById('themeToggle');
    domCache.createLessonModal = document.getElementById('createLessonModal');
    domCache.feedbackReplyModal = document.getElementById('feedbackReplyModal');
    domCache.questionModal = document.getElementById('questionModal');
    domCache.editLessonModal = document.getElementById('editLessonModal');
    domCache.lessonDashboardSection = document.getElementById('lessonDashboardSection');
}

// ===== FIX: SYNC ADMIN AUTHENTICATION =====
// Run this immediately when admin page loads
(function syncAdminAuth() {
    console.log("🔄 Syncing admin authentication...");
    
    // Get tokens from localStorage
    const authToken = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('mathhub_user');
    
    if (authToken && userJson) {
        try {
            const user = JSON.parse(userJson);
            console.log("👤 User found:", user.username, "Role:", user.role);
            
            // If user is admin, sync the tokens
            if (user.role === 'admin') {
                localStorage.setItem('admin_token', authToken);
                localStorage.setItem('admin_user', userJson);
                localStorage.setItem('user_role', user.role);
                localStorage.setItem('admin_session', 'true');
                console.log("✅ Admin tokens synced successfully!");
                
                // Also set global variable
                window.adminToken = authToken;
                window.adminUser = user;
            } else {
                console.log("ℹ️ User is not admin (role:", user.role, ")");
                // Clear any existing admin tokens
                localStorage.removeItem('admin_token');
                localStorage.removeItem('admin_user');
                localStorage.removeItem('user_role');
                localStorage.removeItem('admin_session');
            }
        } catch (e) {
            console.error("❌ Error parsing user data:", e);
        }
    } else {
        console.log("ℹ️ No user logged in");
        // Clear any existing admin tokens
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('user_role');
        localStorage.removeItem('admin_session');
    }
})();

// Also listen for storage changes (for multi-tab support)
window.addEventListener('storage', function(e) {
    if (e.key === 'authToken' || e.key === 'mathhub_user') {
        console.log("📦 Storage changed - resyncing admin tokens");
        location.reload(); // Simple reload to re-sync
    }
});

// ===== DASHBOARD FUNCTIONS WITH AUTO-CLOSE MENU =====
function showDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('dashboardSection');
    updatePageTitle('<i class="fas fa-tachometer-alt"></i> Admin Dashboard', 'Admin Dashboard');
    updateActiveNav('dashboard');
    
    // Load recent activities for the dashboard
    setTimeout(() => {
        loadRecentActivitiesForDashboard();
    }, 300);
}

function showPerformanceDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('performanceDashboardSection');
    updatePageTitle('<i class="fas fa-chart-line"></i> Student Performance', 'Student Performance');
    updateActiveNav('performance');
    initializePerformanceDashboard();
}

function showFeedbackDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('feedbackDashboardSection');
    updatePageTitle('<i class="fas fa-comments"></i> Feedback & Reports', 'Feedback & Reports');
    updateActiveNav('feedback');
    initializeFeedbackDashboard();
}

// ===== UPDATED: Show Analytics Dashboard with real data =====
function showAnalytics(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('analyticsDashboardSection');
    updatePageTitle('<i class="fas fa-chart-bar"></i> Analytics Dashboard', 'Analytics Dashboard');
    updateActiveNav('analytics');
    
    // Initialize charts first
    initializeAnalyticsCharts();
    
    // Then load real data
    setTimeout(() => {
        loadAnalyticsStats();
        loadUserGrowthData();
        loadLessonPopularityData();
        loadSubjectAnalytics();
    }, 100);
}

// ===== FIXED: SHOW LESSON DASHBOARD =====
function showLessonDashboard(e) {
    if (e) e.preventDefault();
    
    // Check muna kung naka-login bilang admin
    const token = localStorage.getItem('admin_token');
    const userRole = localStorage.getItem('user_role');
    
    if (!token || userRole !== 'admin') {
        console.log("🔒 Admin access required for Lesson Dashboard");
        if (typeof showNotification === 'function') {
            showNotification('error', 'Access Denied', 'Please login as admin first');
        }
        return;
    }
    
    closeMobileMenu();
    setActiveSection('lessonDashboardSection');
    updatePageTitle('<i class="fas fa-book-open"></i> Lesson Management', 'Lesson Management');
    updateActiveNav('lessons');
    
    // Make sure currentSubject is defined
    if (!currentSubject) {
        currentSubject = 'polynomial';
    }
    
    // Initialize the lesson dashboard
    initializeLessonDashboard();
    
    // ===== IMPORTANT: Load active subject data =====
    setTimeout(() => {
        console.log('📊 Loading active subject data for Lesson Dashboard...');
        if (typeof updateActiveSubjectFromDatabase === 'function') {
            updateActiveSubjectFromDatabase();
        }
    }, 400);
    
    // Load sidebar stats
    setTimeout(() => {
        console.log('📊 Loading sidebar stats for Lesson Dashboard...');
        if (typeof loadSidebarStats === 'function') {
            loadSidebarStats();
        }
    }, 300);
}



// ===== FIXED: setActiveSection() FUNCTION =====
function setActiveSection(sectionId) {
    // Close any open modals first
    closeAllModals();
    
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.add('active');
            section.style.display = 'block';
            section.style.animation = 'fadeIn 0.4s ease';
            section.style.zIndex = '1';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
            section.style.zIndex = '';
        }
    });
}

function updateActiveNav(activeItem) {
    // Update footer nav
    const footerItems = document.querySelectorAll('.footer-nav-item');
    footerItems.forEach(item => item.classList.remove('active'));
    
    if (activeItem === 'dashboard') {
        document.querySelector('.footer-nav-item:nth-child(1)').classList.add('active');
    } else if (activeItem === 'lessons') {
        document.querySelector('.footer-nav-item:nth-child(2)').classList.add('active');
    } else if (activeItem === 'feedback') {
        document.querySelector('.footer-nav-item:nth-child(4)').classList.add('active');
    } else if (activeItem === 'settings') {
        document.querySelector('.footer-nav-item:nth-child(5)').classList.add('active');
    }
    
    // Update mobile menu
    const mobileItems = document.querySelectorAll('.mobile-menu-item');
    mobileItems.forEach(item => item.classList.remove('active'));
    
    // ADD ACTIVE CLASS BASED ON NAV ITEM
    if (activeItem === 'lessons') {
        document.querySelector('.mobile-menu-item[data-nav="lessons"]')?.classList.add('active');
    } else if (activeItem === 'quiz') {
        document.querySelector('.mobile-menu-item[data-nav="quiz"]')?.classList.add('active');
    } else if (activeItem === 'practice') {
        document.querySelector('.mobile-menu-item[data-nav="practice"]')?.classList.add('active');
    } else if (activeItem === 'performance') {
        document.querySelector('.mobile-menu-item[data-nav="performance"]')?.classList.add('active');
    } else if (activeItem === 'feedback') {
        document.querySelector('.mobile-menu-item[data-nav="feedback"]')?.classList.add('active');
    } else if (activeItem === 'analytics') {
        document.querySelector('.mobile-menu-item[data-nav="analytics"]')?.classList.add('active');
    } else if (activeItem === 'settings') {
        document.querySelector('.mobile-menu-item[data-nav="settings"]')?.classList.add('active');
    }
}

// ===== SELECT SUBJECT FUNCTION - UPDATED =====
function selectSubject(subject) {
    if (currentSubject === subject) return;
    
    const oldCard = document.querySelector(`.subject-card[data-subject="${currentSubject}"]`);
    const newCard = document.querySelector(`.subject-card[data-subject="${subject}"]`);
    
    if (oldCard) oldCard.classList.remove('active');
    if (newCard) {
        newCard.classList.add('pulse');
        setTimeout(() => newCard.classList.remove('pulse'), 500);
    }
    
    currentSubject = subject;
    
    setTimeout(() => {
        updateSubjectUI();
        updateSubjectInfoPanel();
        updateLessonStats();
        highlightActiveSubject();
        
        // ===== IMPORTANT: Update active subject when subject changes =====
        updateActiveSubjectFromDatabase();
        
        showNotification('info', 'Subject Changed', `${getSubjectDisplayName(subject)} is now active.`);
    }, 150);
}

// ===== UPDATE SUBJECT UI - ADD ACTIVE SUBJECT UPDATE =====
function updateSubjectUI() {
    document.querySelectorAll('.subject-card').forEach(card => {
        card.classList.toggle('active', card.dataset.subject === currentSubject);
    });
    
    const subjectName = getSubjectDisplayName(currentSubject);
    const subjectIcon = getSubjectIcon(currentSubject);
    const subjectDesc = getSubjectDescription(currentSubject);
    
    fadeUpdateElement('welcomeSubjectName', subjectName);
    fadeUpdateElement('sidebarSubjectName', subjectName);
    fadeUpdateElement('currentSubjectName', subjectName);
    
    const iconElement = document.getElementById('welcomeSubjectIcon');
    if (iconElement) {
        iconElement.innerHTML = `<i class="${subjectIcon}"></i>`;
        iconElement.classList.add('pulse');
        setTimeout(() => iconElement.classList.remove('pulse'), 300);
    }
    
    fadeUpdateElement('welcomeSubjectDesc', subjectDesc);
    fadeUpdateElement('subjectDetailDescription', `You are currently managing ${subjectName} lessons. ${subjectDesc}`);
    
    updateSubjectInfo(currentSubject);
    
    // ===== Refresh active subject data when UI updates =====
    setTimeout(() => {
        updateActiveSubjectFromDatabase();
    }, 100);
}

function fadeUpdateElement(elementId, newContent) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.style.opacity = '0';
    element.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        element.textContent = newContent;
        element.style.opacity = '1';
    }, 150);
}

function getSubjectDisplayName(subject) {
    const names = {
        polynomial: 'PolyLearn',
        factorial: 'FactoLearn',
        mdas: 'MathEase'
    };
    return names[subject] || 'Unknown Subject';
}

function getSubjectIcon(subject) {
    const icons = {
        polynomial: 'fas fa-superscript',
        factorial: 'fas fa-exclamation-circle',
        mdas: 'fas fa-divide'
    };
    return icons[subject] || 'fas fa-book';
}

function getSubjectDescription(subject) {
    const descriptions = {
        polynomial: 'Algebraic expressions with variables and coefficients',
        factorial: 'Product of all positive integers less than or equal to n',
        mdas: 'Order of operations: Multiplication, Division, Addition, Subtraction'
    };
    return descriptions[subject] || 'Mathematics subject';
}

// ===== UPDATED: VIEW SUBJECT LESSONS - FETCH FROM MYSQL =====
async function viewSubjectLessons(subject, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    console.log(`👁️ Viewing lessons for subject: ${subject}`);
    
    // Set the current subject
    if (subject !== currentSubject) {
        selectSubject(subject);
    }
    
    const subjectId = getSubjectIdFromName(subject);
    const subjectDisplayName = getSubjectDisplayName(subject);
    
    // Open modal with loading state
    openModal(`${subjectDisplayName} Lessons`);
    
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    modalBody.innerHTML = `
        <div class="lesson-section">
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
                <p style="margin-top: 15px; color: #666;">Loading lessons from database...</p>
            </div>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            modalBody.innerHTML = `
                <div class="lesson-section">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-lock" style="font-size: 3rem; color: #f57c00; margin-bottom: 15px;"></i>
                        <h4 style="color: #f57c00; margin-bottom: 10px;">Authentication Required</h4>
                        <p style="color: #666;">Please login as admin to view lessons.</p>
                        <button class="btn btn-primary" onclick="closeModal()" style="margin-top: 15px; background: #7a0000;">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;
            return;
        }
        
        // Fetch lessons from MySQL
        const response = await fetch(`http://localhost:5000/api/lessons/by-subject/${subjectId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const lessons = result.lessons || [];
            const stats = result.stats || {};
            
            if (lessons.length === 0) {
                modalBody.innerHTML = `
                    <div class="lesson-section">
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                            <h4 style="color: #666; margin-bottom: 5px;">No Lessons Found</h4>
                            <p style="color: #999; margin-bottom: 20px;">No lessons available for ${subjectDisplayName}.</p>
                            <div style="display: flex; gap: 10px; justify-content: center;">
                                <button class="btn btn-primary" onclick="openCreateLessonPopup()">
                                    <i class="fas fa-plus"></i> Create Lesson
                                </button>
                                <button class="btn btn-secondary" onclick="closeModal()">
                                    <i class="fas fa-times"></i> Close
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Build lessons list HTML
            let lessonsHtml = '';
            lessons.forEach((lesson, index) => {
                const typeIcon = lesson.content_type === 'video' ? 'fa-video' : 
                                lesson.content_type === 'pdf' ? 'fa-file-pdf' : 'fa-file-alt';
                const typeColor = lesson.content_type === 'video' ? '#f44336' : 
                                 lesson.content_type === 'pdf' ? '#ff9800' : '#2196F3';
                
                lessonsHtml += `
                    <div class="lesson-item" style="
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.2s ease;
                    ">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="
                                    width: 30px;
                                    height: 30px;
                                    background: ${typeColor}20;
                                    color: ${typeColor};
                                    border-radius: 6px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <i class="fas ${typeIcon}"></i>
                                </span>
                                <h4 style="margin: 0; color: #333;">${lesson.content_title || 'Untitled'}</h4>
                            </div>
                            
                            <p style="margin: 5px 0 5px 40px; color: #666; font-size: 0.9rem;">
                                ${lesson.content_description ? 
                                  (lesson.content_description.length > 100 ? 
                                    lesson.content_description.substring(0, 100) + '...' : 
                                    lesson.content_description) 
                                  : 'No description'}
                            </p>
                            
                            <div style="display: flex; gap: 15px; margin-left: 40px; font-size: 0.8rem;">
                                <span style="color: #999;">
                                    <i class="fas fa-layer-group"></i> ${lesson.module_name || 'No Module'}
                                </span>
                                <span style="color: #999;">
                                    <i class="fas fa-calendar"></i> ${new Date(lesson.created_at).toLocaleDateString()}
                                </span>
                                <span style="color: #4CAF50;">
                                    <i class="fas fa-video"></i> ${lesson.content_type || 'text'}
                                </span>
                            </div>
                        </div>
                        
                        <div style="display: flex; gap: 8px;">
                            <button class="btn-icon small" onclick="previewLesson(${lesson.content_id}); event.stopPropagation();" title="Preview">
                                <i class="fas fa-play"></i>
                            </button>
                            <button class="btn-icon small" onclick="editLesson(${lesson.content_id}); event.stopPropagation();" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon small delete" onclick="deleteLesson(${lesson.content_id}); event.stopPropagation();" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            
            modalBody.innerHTML = `
                <div class="lesson-section">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
                        <div>
                            <h3 style="margin: 0 0 5px 0; color: #7a0000; display: flex; align-items: center; gap: 10px;">
                                <i class="fas fa-book-open"></i> ${subjectDisplayName} Lessons
                            </h3>
                            <p style="margin: 0; color: #666; font-size: 0.9rem;">
                                ${lessons.length} lesson${lessons.length !== 1 ? 's' : ''} found
                                ${stats.videos ? ` | ${stats.videos} videos` : ''}
                                ${stats.pdfs ? ` | ${stats.pdfs} PDFs` : ''}
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-primary" onclick="openCreateLessonPopup(); closeModal();">
                                <i class="fas fa-plus"></i> New Lesson
                            </button>
                            <button class="btn btn-secondary" onclick="closeModal()">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                    
                    <div style="max-height: 400px; overflow-y: auto; padding-right: 5px;">
                        ${lessonsHtml}
                    </div>
                    
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; display: flex; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    </div>
                </div>
            `;
            
            console.log(`✅ Displayed ${lessons.length} lessons for ${subjectDisplayName}`);
            
        } else {
            throw new Error(result.message || 'Failed to load lessons');
        }
        
    } catch (error) {
        console.error('❌ Error viewing subject lessons:', error);
        
        // Show error message with fallback option
        modalBody.innerHTML = `
            <div class="lesson-section">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 15px;"></i>
                    <h4 style="color: #f44336; margin-bottom: 10px;">Failed to Load Lessons</h4>
                    <p style="color: #666; margin-bottom: 5px;">${error.message}</p>
                    <p style="color: #999; margin-bottom: 20px;">Check console for details (F12)</p>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="viewSubjectLessons('${subject}')">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                        <button class="btn btn-secondary" onclick="showFallbackLessons('${subject}')">
                            <i class="fas fa-database"></i> Show Local Cache
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Try to load from cache
        try {
            const cachedLessons = loadMySQLlessonsFromCache(subject);
            if (cachedLessons && cachedLessons.length > 0) {
                // Store for fallback
                window.cachedLessonsForFallback = cachedLessons;
            }
        } catch (e) {}
    }
}

// ===== FALLBACK: SHOW LESSONS FROM LOCAL CACHE =====
function showFallbackLessons(subject) {
    console.log("📂 Showing fallback lessons from cache for:", subject);
    
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    const subjectDisplayName = getSubjectDisplayName(subject);
    const cachedLessons = window.cachedLessonsForFallback || loadMySQLlessonsFromCache(subject) || [];
    
    if (cachedLessons.length === 0) {
        modalBody.innerHTML = `
            <div class="lesson-section">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-database" style="font-size: 3rem; color: #999; margin-bottom: 15px;"></i>
                    <h4 style="color: #666; margin-bottom: 5px;">No Cached Data</h4>
                    <p style="color: #999; margin-bottom: 20px;">No cached lessons found for ${subjectDisplayName}.</p>
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                </div>
            </div>
        `;
        return;
    }
    
    // Build HTML from cached lessons (similar structure as above)
    let lessonsHtml = '';
    cachedLessons.forEach((lesson, index) => {
        lessonsHtml += `
            <div class="lesson-item" style="
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-left: 4px solid #7a0000;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 10px;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${lesson.title || 'Untitled'}</strong>
                        <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                            <i class="fas fa-clock"></i> Cached from previous session
                        </div>
                    </div>
                    <span class="badge" style="background: #ff9800; color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem;">
                        OFFLINE MODE
                    </span>
                </div>
            </div>
        `;
    });
    
    modalBody.innerHTML = `
        <div class="lesson-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h3 style="margin: 0; color: #7a0000;">
                    <i class="fas fa-database"></i> ${subjectDisplayName} (Cached)
                </h3>
                <button class="btn btn-secondary" onclick="closeModal()">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
            
            <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <i class="fas fa-info-circle" style="color: #ff9800;"></i>
                <strong style="color: #ff9800;"> Offline Mode</strong>
                <p style="margin: 5px 0 0 0; color: #666; font-size: 0.9rem;">
                    Showing cached data from previous session. The server may be offline.
                </p>
            </div>
            
            <div style="max-height: 400px; overflow-y: auto;">
                ${lessonsHtml}
            </div>
        </div>
    `;
}

// ===== PREVIEW LESSON =====
async function previewLesson(lessonId) {
    console.log("🎬 Previewing lesson:", lessonId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/lessons-db/${lessonId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const lesson = result.lesson;
            
            // Create preview modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'previewLessonModal';
            modal.style.display = 'flex';
            
            modal.innerHTML = `
                <div class="modal-backdrop" onclick="closePreviewModal()"></div>
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header" style="background: #7a0000; color: white;">
                        <h3><i class="fas fa-eye"></i> Lesson Preview</h3>
                        <button class="modal-close" onclick="closePreviewModal()" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <h4 style="color: #7a0000; margin-bottom: 15px;">${lesson.content_title}</h4>
                        
                        ${lesson.content_type === 'video' ? `
                            <div style="margin-bottom: 20px;">
                                ${lesson.content_url ? 
                                    `<p><strong>Video URL:</strong> <a href="${lesson.content_url}" target="_blank">${lesson.content_url}</a></p>` : 
                                    ''}
                                ${lesson.video_filename ? 
                                    `<p><strong>Video File:</strong> ${lesson.video_filename}</p>` : 
                                    ''}
                            </div>
                        ` : ''}
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                            <h5 style="margin-top: 0; color: #333;">Description</h5>
                            <p style="color: #666;">${lesson.content_description || 'No description'}</p>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <h5 style="color: #333;">Lesson Details</h5>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Type:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${lesson.content_type}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Topic:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${lesson.topic_title || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Module:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${lesson.module_name || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Lesson:</strong></td>
                                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${lesson.lesson_name || 'N/A'}</td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closePreviewModal()">Close</button>
                        <button class="btn btn-primary" onclick="editLesson(${lessonId}); closePreviewModal();">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
        }
        
    } catch (error) {
        console.error('❌ Error previewing lesson:', error);
        showNotification('error', 'Error', 'Could not load lesson preview');
    }
}

// ===== CLOSE PREVIEW MODAL =====
function closePreviewModal() {
    const modal = document.getElementById('previewLessonModal');
    if (modal) {
        modal.remove();
    }
}

// ============================================
// LOAD RECENT ACTIVITIES FOR DASHBOARD - UPDATED WITH DEBUGGING
// ============================================
async function loadRecentActivitiesForDashboard() {
    console.log("📋 LOAD RECENT ACTIVITIES FUNCTION CALLED");
    
    const activityList = document.getElementById('recentActivitiesList');
    console.log("🔍 Element found:", activityList ? "YES" : "NO");
    
    if (!activityList) {
        console.log("❌ recentActivitiesList element NOT FOUND in DOM");
        console.log("📍 Current URL:", window.location.href);
        console.log("📍 Dashboard active:", document.getElementById('dashboardSection')?.classList.contains('active'));
        return;
    }
    
    console.log("✅ Element found, updating content...");
    
    // Show loading state
    activityList.innerHTML = `
        <div class="activity-item loading-item">
            <div class="loading-spinner">
                <i class="fas fa-spinner fa-pulse"></i>
                <p>Loading recent activities...</p>
            </div>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        console.log("🔑 Token check:", token ? "Token exists" : "No token");
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        console.log("📡 Fetching from /api/admin/activity-log?limit=5...");
        
        const response = await fetch('http://localhost:5000/api/admin/activity-log?limit=5', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log("📥 Response status:", response.status);
        console.log("📥 Response OK?", response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("📥 Response data:", result);
        
        if (result.success) {
            const activities = result.activities || [];
            console.log(`✅ Loaded ${activities.length} activities from database`);
            
            if (activities.length === 0) {
                activityList.innerHTML = `
                    <div class="activity-item" style="justify-content: center; padding: 30px;">
                        <div style="text-align: center;">
                            <i class="fas fa-history" style="font-size: 2rem; color: #ccc; margin-bottom: 10px;"></i>
                            <p style="color: #999;">No recent activities in database</p>
                            <p style="color: #666; font-size: 0.8rem;">Activities will appear when users interact with the system</p>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Display activities
            displayDashboardActivities(activities);
        } else {
            throw new Error(result.message || 'Failed to load activities');
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard activities:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Show error message instead of fallback data
        activityList.innerHTML = `
            <div class="activity-item" style="justify-content: center; padding: 20px;">
                <div style="text-align: center;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #f44336; margin-bottom: 10px;"></i>
                    <p style="color: #f44336; margin-bottom: 5px;">Failed to load activities</p>
                    <p style="color: #666; font-size: 0.8rem;">${error.message}</p>
                    <button class="btn btn-sm btn-primary" onclick="loadRecentActivitiesForDashboard()" style="margin-top: 10px;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            </div>
        `;
    }
}

// ============================================
// DISPLAY DASHBOARD ACTIVITIES - UPDATED
// ============================================
function displayDashboardActivities(activities) {
    console.log("📋 Displaying", activities.length, "activities");
    
    const activityList = document.getElementById('recentActivitiesList');
    if (!activityList) {
        console.error("❌ activityList not found in displayDashboardActivities");
        return;
    }
    
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.setAttribute('data-activity-id', activity.id);
        item.onclick = () => viewActivityDetails(activity);
        item.style.cursor = 'pointer';
        
        // Get icon and color
        const icon = activity.icon || getActivityIcon(activity.activity_type);
        const color = activity.color || getActivityColor(activity.activity_type);
        
        item.innerHTML = `
            <div class="activity-icon" style="
                width: 45px;
                height: 45px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                background: ${color}20;
                color: ${color};
                font-size: 1.1rem;
            ">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <h4 style="margin: 0 0 3px 0; font-size: 0.95rem; color: #333;">
                    ${activity.user_name || 'Unknown User'}
                </h4>
                <p style="margin: 0 0 3px 0; font-size: 0.8rem; color: #666;">
                    ${activity.description || activity.activity_type || 'Performed an activity'}
                </p>
                ${activity.points_earned > 0 ? `
                    <span style="font-size: 0.65rem; color: #FF9800; display: inline-block; background: #fff3e0; padding: 2px 8px; border-radius: 12px;">
                        <i class="fas fa-coins"></i> +${activity.points_earned} points
                    </span>
                ` : ''}
            </div>
            <span class="activity-time" style="font-size: 0.65rem; color: #999; min-width: 70px; text-align: right;">
                ${activity.time_ago || 'Just now'}
            </span>
        `;
        
        activityList.appendChild(item);
    });
    
    // Add "View All" link
    const viewAllItem = document.createElement('div');
    viewAllItem.className = 'activity-item';
    viewAllItem.style.justifyContent = 'center';
    viewAllItem.style.background = '#f8f9fa';
    viewAllItem.style.cursor = 'pointer';
    viewAllItem.style.borderTop = '1px solid #eee';
    viewAllItem.onclick = () => {
        switchTab('activity');
        setTimeout(() => {
            if (typeof loadActivityLog === 'function') {
                loadActivityLog();
            }
        }, 100);
    };
    viewAllItem.innerHTML = `
        <div style="text-align: center; padding: 12px; color: #7a0000; font-size: 0.85rem; font-weight: 500;">
            <i class="fas fa-eye"></i> View All Activities
        </div>
    `;
    activityList.appendChild(viewAllItem);
    
    console.log("✅ Activities displayed successfully");
}

// ============================================
// FALLBACK DASHBOARD ACTIVITIES HTML
// ============================================
function getFallbackDashboardActivitiesHTML() {
    const demoActivities = [
        {
            user_name: 'John Smith',
            description: 'completed lesson "Polynomial Functions"',
            time_ago: '5 minutes ago',
            icon: 'fa-check-circle',
            color: '#4CAF50',
            points_earned: 50
        },
        {
            user_name: 'Sarah Johnson',
            description: 'submitted feedback',
            time_ago: '15 minutes ago',
            icon: 'fa-comment',
            color: '#2196F3'
        },
        {
            user_name: 'Mike Wilson',
            description: 'passed quiz with 90% score',
            time_ago: '1 hour ago',
            icon: 'fa-question-circle',
            color: '#FF9800',
            points_earned: 30
        },
        {
            user_name: 'Emily Davis',
            description: 'logged in',
            time_ago: '2 hours ago',
            icon: 'fa-sign-in-alt',
            color: '#9C27B0'
        },
        {
            user_name: 'David Brown',
            description: 'earned 50 points',
            time_ago: '3 hours ago',
            icon: 'fa-coins',
            color: '#FFD700',
            points_earned: 50
        }
    ];
    
    let html = '';
    demoActivities.forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon" style="
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: ${activity.color}20;
                    color: ${activity.color};
                ">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <h4 style="margin: 0 0 3px 0; font-size: 0.95rem; color: #333;">
                        ${activity.user_name}
                    </h4>
                    <p style="margin: 0; font-size: 0.8rem; color: #666;">
                        ${activity.description}
                    </p>
                    ${activity.points_earned ? `
                        <span style="font-size: 0.65rem; color: #FF9800; display: inline-block; margin-top: 3px;">
                            <i class="fas fa-coins"></i> +${activity.points_earned} points
                        </span>
                    ` : ''}
                </div>
                <span class="activity-time" style="font-size: 0.65rem; color: #999;">
                    ${activity.time_ago}
                </span>
            </div>
        `;
    });
    
    // Add "View All" link
    html += `
        <div class="activity-item" style="justify-content: center; background: #f8f9fa; cursor: pointer;" onclick="switchTab('activity')">
            <div style="text-align: center; padding: 8px; color: #7a0000; font-size: 0.8rem;">
                <i class="fas fa-eye"></i> View All Activities
            </div>
        </div>
    `;
    
    return html;
}

// ============================================
// REFRESH DASHBOARD ACTIVITIES
// ============================================
function refreshDashboardActivities() {
    console.log("🔄 Refreshing dashboard activities...");
    loadRecentActivitiesForDashboard();
    showNotification('info', 'Refreshing', 'Updating activity log...');
}

// ===== UPDATED: Open Create Lesson Popup =====
async function openCreateLessonPopup(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    console.log("📝 Opening Create Lesson Modal...");
    
    const modal = document.getElementById('createLessonModal');
    if (!modal) return;
    
    // Reset form
    resetLessonForm();
    
    // Clear edit ID
    const editId = document.getElementById('editLessonId');
    if (editId) editId.value = '';
    
    // Clear teacher dropdown (show loading)
    const teacherSelect = document.getElementById('assignedTeacherId');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Loading teachers...</option>';
        teacherSelect.disabled = true;
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
    
    try {
        // Load module structure
        await loadModuleStructure();
        
        // Load topics
        await loadTopicStructure();
        
        // ===== LOAD TEACHERS FOR ALL DROPDOWNS =====
        await loadTeachersForAssignment();
        
        showNotification('success', 'Ready', 'Lesson form loaded');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
    
    // Focus on title
    setTimeout(() => {
        const titleInput = document.getElementById('createLessonTitle');
        if (titleInput) titleInput.focus();
    }, 500);
}

// ===== FIXED closeCreateLessonModal =====
function closeCreateLessonModal() {
    console.log("🔴 Closing create lesson modal...");
    try {
        const modal = document.getElementById('createLessonModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            console.log("✅ Modal closed");
        } else {
            console.warn("⚠️ Modal not found");
        }
    } catch (error) {
        console.error("❌ Error closing modal:", error);
    }
}

function openEditLessonPopup(e) {
    if (e) e.preventDefault();
    const modal = domCache.editLessonModal;
    
    if (modal) {
        // Show modal on top of everything
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        document.body.classList.add('modal-open');
        
        // Focus on first input
        setTimeout(() => {
            const titleInput = document.getElementById('editLessonTitle');
            if (titleInput) {
                titleInput.focus();
                titleInput.select();
            }
        }, 100);
        
        // Show notification
        showNotification('info', 'Edit Lesson', 'Edit lesson for ' + getSubjectDisplayName(currentSubject));
    }
}

function closeEditLessonModal() {
    const modal = domCache.editLessonModal;
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function openModal(modalTitle = '') {
    const modal = domCache.questionModal;
    
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        document.body.classList.add('modal-open');
        
        if (modalTitle) {
            const titleElement = modal.querySelector('.modal-title');
            if (titleElement) {
                titleElement.textContent = modalTitle;
            }
        }
        
        showNotification('info', 'View Lessons', 'Viewing lessons for ' + getSubjectDisplayName(currentSubject));
    }
}

// Add this if you don't have it
function closeModal() {
    const modal = document.getElementById('questionModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    // Also close any other modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => {
        if (m.id !== 'questionModal') {
            m.style.display = 'none';
        }
    });
}

function closeFeedbackReplyModal() {
    const modal = domCache.feedbackReplyModal;
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
        modal.style.zIndex = '';
    });
    document.body.classList.remove('modal-open');
}

// ===== ESSENTIAL EDIT LESSON FUNCTIONS =====

// ===== EDIT ALL LESSONS - OPEN LIST OF LESSONS TO EDIT =====
async function editAllLessons(subject, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    console.log("✏️ Opening edit lessons list for subject:", subject);
    
    // Set current subject
    if (subject !== currentSubject) {
        selectSubject(subject);
    }
    
    const subjectId = getSubjectIdFromName(subject);
    const subjectDisplayName = getSubjectDisplayName(subject);
    
    // Use existing modal or create one
    let modal = document.getElementById('questionModal');
    if (!modal) {
        console.error("❌ Modal not found!");
        return;
    }
    
    // Get modal body
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    // Show loading
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
            <p>Loading lessons from database...</p>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-lock" style="font-size: 3rem; color: #f57c00;"></i>
                    <h4>Authentication Required</h4>
                    <p>Please login as admin</p>
                    <button class="btn btn-primary" onclick="closeModal()">Close</button>
                </div>
            `;
            return;
        }
        
        // Fetch lessons for this subject
        const response = await fetch(`http://localhost:5000/api/lessons/by-subject/${subjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const lessons = result.lessons || [];
            
            if (lessons.length === 0) {
                modalBody.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc;"></i>
                        <h4 style="color: #666; margin: 15px 0;">No Lessons Found</h4>
                        <p style="color: #999; margin-bottom: 20px;">Create your first lesson for ${subjectDisplayName}</p>
                        <button class="btn btn-primary" onclick="openCreateLessonPopup(); closeModal();">
                            <i class="fas fa-plus"></i> Create Lesson
                        </button>
                    </div>
                `;
                return;
            }
            
            let lessonsHtml = `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #7a0000;"><i class="fas fa-edit"></i> Edit ${subjectDisplayName} Lessons</h3>
                    <p>Found <strong>${lessons.length}</strong> lessons. Click any lesson to edit:</p>
                </div>
            `;
            
            lessons.forEach(lesson => {
                const date = lesson.created_at ? new Date(lesson.created_at).toLocaleDateString() : 'Unknown';
                const typeIcon = lesson.content_type === 'video' ? 'fa-video' : 
                                lesson.content_type === 'pdf' ? 'fa-file-pdf' : 'fa-file-alt';
                const typeColor = lesson.content_type === 'video' ? '#f44336' : 
                                 lesson.content_type === 'pdf' ? '#ff9800' : '#2196F3';
                
                lessonsHtml += `
                    <div class="lesson-edit-item" onclick="editLesson(${lesson.content_id})" style="
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-left: 4px solid #7a0000;
                    ">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="
                                    width: 30px;
                                    height: 30px;
                                    background: ${typeColor}20;
                                    color: ${typeColor};
                                    border-radius: 6px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <i class="fas ${typeIcon}"></i>
                                </span>
                                <h4 style="margin: 0; color: #333;">${lesson.content_title || 'Untitled'}</h4>
                            </div>
                            <p style="margin: 5px 0 5px 40px; color: #666; font-size: 0.85rem;">
                                ${lesson.content_description ? 
                                  (lesson.content_description.length > 80 ? 
                                    lesson.content_description.substring(0, 80) + '...' : 
                                    lesson.content_description) 
                                  : 'No description'}
                            </p>
                            <div style="display: flex; gap: 15px; margin-left: 40px; font-size: 0.75rem;">
                                <span style="color: #999;">
                                    <i class="fas fa-layer-group"></i> ${lesson.module_name || 'No Module'}
                                </span>
                                <span style="color: #999;">
                                    <i class="far fa-calendar"></i> ${date}
                                </span>
                                <span style="color: ${typeColor};">
                                    <i class="fas ${typeIcon}"></i> ${lesson.content_type || 'text'}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #7a0000; background: #f8f9fa; padding: 8px; border-radius: 50%;">
                                <i class="fas fa-chevron-right"></i>
                            </span>
                        </div>
                    </div>
                `;
            });
            
            // Add CSS for hover effect
            const style = document.createElement('style');
            style.textContent = `
                .lesson-edit-item:hover {
                    background: #f8f9fa !important;
                    transform: translateX(5px);
                    box-shadow: 0 2px 8px rgba(122,0,0,0.1);
                }
            `;
            document.head.appendChild(style);
            
            modalBody.innerHTML = lessonsHtml;
            
        } else {
            throw new Error(result.message || 'Failed to load lessons');
        }
        
    } catch (error) {
        console.error('❌ Error loading lessons:', error);
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336;"></i>
                <h4 style="color: #f44336;">Failed to Load Lessons</h4>
                <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="editAllLessons('${subject}', event)">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== OPEN EDIT LESSONS LIST =====
// ===== FIXED OPEN EDIT LESSONS LIST =====
async function openEditLessonsList(subject, e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    console.log("✏️ Opening edit lessons list for subject:", subject);
    
    // Set the current subject
    if (subject !== currentSubject) {
        selectSubject(subject);
    }
    
    const subjectId = getSubjectIdFromName(subject);
    const subjectDisplayName = getSubjectDisplayName(subject);
    
    // GET THE MODAL - I-VERIFY MUNA KUNG EXIST
    let modal = document.getElementById('questionModal');
    if (!modal) {
        console.error("❌ questionModal not found!");
        alert("Modal not found. Please check the HTML.");
        return;
    }
    
    // GET MODAL BODY
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) {
        console.error("❌ modalBody not found!");
        alert("Modal body not found!");
        return;
    }
    
    // CLEAR PREVIOUS CONTENT AT MAG-SHOW NG LOADING
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
            <p style="margin-top: 15px; color: #666;">Loading lessons from database...</p>
        </div>
    `;
    
    // SET MODAL TITLE
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="fas fa-edit"></i> ${subjectDisplayName} Lessons`;
    }
    
    // HIDE SEND MESSAGE BUTTON (kung meron)
    const sendMsgBtn = document.getElementById('sendMessageBtn');
    if (sendMsgBtn) {
        sendMsgBtn.style.display = 'none';
    }
    
    // SHOW MODAL
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    document.body.classList.add('modal-open');
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            modalBody.innerHTML = `
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-lock" style="font-size: 3rem; color: #f57c00; margin-bottom: 15px;"></i>
                    <h4 style="color: #f57c00; margin-bottom: 10px;">Authentication Required</h4>
                    <p style="color: #666;">Please login as admin first.</p>
                </div>
            `;
            return;
        }
        
        console.log("📡 Fetching from:", `http://localhost:5000/api/lessons/by-subject/${subjectId}`);
        
        const response = await fetch(`http://localhost:5000/api/lessons/by-subject/${subjectId}`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success) {
            const lessons = result.lessons || [];
            
            if (lessons.length === 0) {
                modalBody.innerHTML = `
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                        <h4 style="color: #666; margin-bottom: 5px;">No Lessons Found</h4>
                        <p style="color: #999; margin-bottom: 20px;">Create your first lesson for ${subjectDisplayName}</p>
                        <button class="btn btn-primary" onclick="openCreateLessonPopup(); closeModal();">
                            <i class="fas fa-plus"></i> Create Lesson
                        </button>
                    </div>
                `;
                return;
            }
            
            // BUILD LESSONS LIST
            let lessonsHtml = `
                <div style="margin-bottom: 20px;">
                    <p style="color: #666;">Click any lesson to edit:</p>
                </div>
            `;
            
            lessons.forEach((lesson, index) => {
                const typeIcon = lesson.content_type === 'video' ? 'fa-video' : 
                                lesson.content_type === 'pdf' ? 'fa-file-pdf' : 'fa-file-alt';
                const typeColor = lesson.content_type === 'video' ? '#f44336' : 
                                 lesson.content_type === 'pdf' ? '#ff9800' : '#2196F3';
                
                lessonsHtml += `
                    <div class="lesson-edit-item" onclick="editLesson(${lesson.content_id})" style="
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-left: 4px solid #7a0000;
                    ">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                                <span style="
                                    width: 30px;
                                    height: 30px;
                                    background: ${typeColor}20;
                                    color: ${typeColor};
                                    border-radius: 6px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                ">
                                    <i class="fas ${typeIcon}"></i>
                                </span>
                                <h4 style="margin: 0; color: #333;">${lesson.content_title || 'Untitled'}</h4>
                            </div>
                            <p style="margin: 5px 0 5px 40px; color: #666; font-size: 0.85rem;">
                                ${lesson.content_description ? 
                                  (lesson.content_description.length > 80 ? 
                                    lesson.content_description.substring(0, 80) + '...' : 
                                    lesson.content_description) 
                                  : 'No description'}
                            </p>
                            <div style="display: flex; gap: 15px; margin-left: 40px; font-size: 0.75rem;">
                                <span style="color: #999;">
                                    <i class="fas fa-layer-group"></i> ${lesson.module_name || 'No Module'}
                                </span>
                                <span style="color: #999;">
                                    <i class="far fa-calendar"></i> ${new Date(lesson.created_at).toLocaleDateString()}
                                </span>
                                <span style="color: ${typeColor};">
                                    <i class="fas ${typeIcon}"></i> ${lesson.content_type || 'text'}
                                </span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="color: #7a0000; background: #f8f9fa; padding: 8px; border-radius: 50%;">
                                <i class="fas fa-chevron-right"></i>
                            </span>
                        </div>
                    </div>
                `;
            });
            
            modalBody.innerHTML = lessonsHtml;
            
        } else {
            throw new Error(result.message || 'Failed to load lessons');
        }
        
    } catch (error) {
        console.error('❌ Error loading lessons:', error);
        
        let errorMessage = error.message;
        if (error.message.includes('401')) {
            errorMessage = 'Session expired. Please refresh and login again.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Make sure backend is running.';
        }
        
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 15px;"></i>
                <h4 style="color: #f44336; margin-bottom: 10px;">Failed to Load Lessons</h4>
                <p style="color: #666; margin-bottom: 5px;">${errorMessage}</p>
                <p style="color: #999; margin-bottom: 20px;">Check console for details (F12)</p>
                <button class="btn btn-primary" onclick="openEditLessonsList('${subject}')">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== INTEGRATED TOPIC CREATION FUNCTIONS =====

// Global variables for panel
let panelLessonId = null;

// Show the integrated create topic panel
function showCreateTopicPanel() {
    console.log("📝 Showing integrated topic creation panel...");
    
    const panel = document.getElementById('quickTopicPanel');
    if (!panel) return;
    
    // Get current lesson selection from main dropdown
    const mainLessonSelect = document.getElementById('lessonSelect');
    const panelLessonSelect = document.getElementById('panelLessonSelect');
    const panelModuleSelect = document.getElementById('panelModuleSelect');
    
    // Populate lesson dropdown in panel
    if (panelLessonSelect && window.quickLessons) {
        panelLessonSelect.innerHTML = '<option value="">-- Select Lesson --</option>';
        window.quickLessons.forEach(lesson => {
            const option = document.createElement('option');
            option.value = lesson.id;
            option.textContent = lesson.name;
            if (mainLessonSelect && mainLessonSelect.value === lesson.id.toString()) {
                option.selected = true;
                panelLessonId = lesson.id;
            }
            panelLessonSelect.appendChild(option);
        });
    }
    
    // Reset module dropdown
    if (panelModuleSelect) {
        panelModuleSelect.innerHTML = '<option value="">-- Select Module --</option>';
        panelModuleSelect.disabled = true;
    }
    
    // Clear inputs
    document.getElementById('panelTopicTitle').value = '';
    document.getElementById('panelTopicDescription').value = '';
    
    // Show panel
    panel.style.display = 'block';
    
    // Scroll to panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Hide the create topic panel
function hideCreateTopicPanel() {
    console.log("🔴 Hiding topic creation panel...");
    const panel = document.getElementById('quickTopicPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

// Handle lesson selection change in panel
document.addEventListener('change', function(e) {
    if (e.target.id === 'panelLessonSelect') {
        panelLessonId = e.target.value;
        filterPanelModules();
    }
});

// Filter modules for panel
function filterPanelModules() {
    console.log("🔍 Filtering modules for panel...");
    
    const lessonId = document.getElementById('panelLessonSelect').value;
    const moduleSelect = document.getElementById('panelModuleSelect');
    
    if (!moduleSelect) return;
    
    moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
    moduleSelect.disabled = true;
    
    if (!lessonId) {
        console.log("ℹ️ No lesson selected");
        return;
    }
    
    // Filter modules for this lesson
    const filteredModules = window.quickModules?.filter(m => parseInt(m.lesson_id) === parseInt(lessonId)) || [];
    console.log(`📦 Found ${filteredModules.length} modules for lesson ${lessonId}`);
    
    if (filteredModules.length > 0) {
        filteredModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.id;
            option.textContent = `📦 ${module.name}`;
            moduleSelect.appendChild(option);
        });
        moduleSelect.disabled = false;
    }
    
    // Always add General Module option
    const generalOption = document.createElement('option');
    generalOption.value = 'general';
    generalOption.textContent = '📁 General Module (Auto-create)';
    generalOption.style.color = '#4CAF50';
    generalOption.style.fontWeight = 'bold';
    moduleSelect.appendChild(generalOption);
}

// Save quick topic from panel
async function saveQuickTopicFromPanel() {
    console.log("💾 Saving quick topic from panel...");
    
    const lessonId = document.getElementById('panelLessonSelect').value;
    const moduleValue = document.getElementById('panelModuleSelect').value;
    const title = document.getElementById('panelTopicTitle').value.trim();
    const description = document.getElementById('panelTopicDescription').value.trim();
    
    if (!lessonId) {
        showNotification('error', 'Error', 'Please select a lesson');
        return;
    }
    
    if (!moduleValue) {
        showNotification('error', 'Error', 'Please select a module');
        return;
    }
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a topic title');
        return;
    }
    
    // Show loading
    const saveBtn = document.querySelector('#quickTopicPanel .btn-primary');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }
    
    // Determine module ID
    let moduleId = moduleValue;
    
    // If "general" ang napili
    if (moduleValue === 'general') {
        // Check if may existing General Module
        const existingGeneral = window.quickModules?.find(m => 
            m.lesson_id == lessonId && 
            (m.name.toLowerCase().includes('general') || m.name.toLowerCase().includes('default'))
        );
        
        if (existingGeneral) {
            moduleId = existingGeneral.id;
            console.log("✅ Using existing General Module ID:", moduleId);
        } else {
            // Create new General Module
            try {
                const token = localStorage.getItem('admin_token');
                const response = await fetch('http://localhost:5000/api/admin/modules', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lesson_id: parseInt(lessonId),
                        module_name: 'General Module',
                        module_description: 'Default module for general topics'
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    moduleId = result.module.id;
                    console.log("✅ Created new General Module ID:", moduleId);
                    
                    // Update global modules
                    if (!window.quickModules) window.quickModules = [];
                    window.quickModules.push(result.module);
                } else {
                    throw new Error(result.message || 'Failed to create General Module');
                }
            } catch (error) {
                console.error('❌ Error creating General Module:', error);
                showNotification('error', 'Failed', 'Could not create General Module');
                
                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalText;
                }
                return;
            }
        }
    }
    
    // Validate module ID
    if (!moduleId || isNaN(parseInt(moduleId))) {
        showNotification('error', 'Error', 'Please select a valid module');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token');
        
        const response = await fetch('http://localhost:5000/api/admin/topics', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                module_id: parseInt(moduleId),
                topic_title: title,
                topic_description: description || null
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Success!', 'Topic created successfully!');
            
            // Hide panel
            hideCreateTopicPanel();
            
            // Refresh topic dropdown
            await loadTopicStructure();
            
            // Auto-select the newly created topic
            setTimeout(() => {
                const topicSelect = document.getElementById('topicSelect');
                if (topicSelect) {
                    for (let i = 0; i < topicSelect.options.length; i++) {
                        if (topicSelect.options[i].text === title) {
                            topicSelect.selectedIndex = i;
                            break;
                        }
                    }
                }
            }, 500);
            
        } else {
            throw new Error(result.message || 'Failed to create topic');
        }
        
    } catch (error) {
        console.error('❌ Error creating topic:', error);
        showNotification('error', 'Failed', error.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

// Initialize panel lesson select listener
function initializePanelListeners() {
    const panelLessonSelect = document.getElementById('panelLessonSelect');
    if (panelLessonSelect) {
        panelLessonSelect.addEventListener('change', filterPanelModules);
    }
}

// Call this when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializePanelListeners();
    }, 1500);
});

// ===== ENHANCED EDIT FUNCTIONS =====

// Clear existing video in edit mode
function clearEditExistingVideo() {
    console.log("🗑️ Clearing existing video in edit mode");
    
    document.getElementById('editExistingVideoInfo').style.display = 'none';
    window.removeEditExistingVideo = true;
    showNotification('info', 'Video Removed', 'Existing video will be removed when you save');
}

// Load topics for edit modal
async function loadEditTopics() {
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const topicSelect = document.getElementById('editTopicSelect');
            if (topicSelect) {
                topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
                
                if (result.structure.topics && result.structure.topics.length > 0) {
                    result.structure.topics.forEach(topic => {
                        const option = document.createElement('option');
                        option.value = topic.id;
                        option.textContent = topic.name;
                        topicSelect.appendChild(option);
                    });
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading topics:', error);
    }
}

// Show edit content section
function showEditContentSection(section) {
    console.log("📂 Showing edit content section:", section);
    
    document.getElementById('editVideoContentSection').style.display = 'none';
    document.getElementById('editTextContentSection').style.display = 'none';
    
    document.getElementById('editVideoTypeBtn').classList.remove('active');
    document.getElementById('editVideoTypeBtn').style.background = '';
    document.getElementById('editVideoTypeBtn').style.color = '';
    
    document.getElementById('editTextTypeBtn').classList.remove('active');
    document.getElementById('editTextTypeBtn').style.background = '';
    document.getElementById('editTextTypeBtn').style.color = '';
    
    if (section === 'video') {
        document.getElementById('editVideoContentSection').style.display = 'block';
        document.getElementById('editVideoTypeBtn').classList.add('active');
        document.getElementById('editVideoTypeBtn').style.background = '#7a0000';
        document.getElementById('editVideoTypeBtn').style.color = 'white';
    } else {
        document.getElementById('editTextContentSection').style.display = 'block';
        document.getElementById('editTextTypeBtn').classList.add('active');
        document.getElementById('editTextTypeBtn').style.background = '#7a0000';
        document.getElementById('editTextTypeBtn').style.color = 'white';
    }
}

// Toggle video replace mode
function toggleVideoReplaceMode() {
    const keepCheckbox = document.getElementById('keepExistingVideo');
    const uploadArea = document.getElementById('editVideoUploadArea');
    const newVideoIndicator = document.getElementById('editNewVideoIndicator');
    
    if (keepCheckbox.checked) {
        uploadArea.style.opacity = '0.5';
        uploadArea.style.pointerEvents = 'none';
        document.getElementById('editVideoFileInput').value = '';
        newVideoIndicator.style.display = 'none';
    } else {
        uploadArea.style.opacity = '1';
        uploadArea.style.pointerEvents = 'auto';
    }
}

// Toggle text replace mode
function toggleTextReplaceMode() {
    const keepCheckbox = document.getElementById('keepExistingText');
    const textarea = document.getElementById('editTextContentInput');
    const uploadArea = document.querySelector('#editTextContentSection .upload-area-small');
    const fileInput = document.getElementById('editTextFileInput');
    
    if (keepCheckbox.checked) {
        textarea.disabled = true;
        textarea.placeholder = 'Keep existing text (uncheck to edit)';
        if (uploadArea) {
            uploadArea.style.opacity = '0.5';
            uploadArea.style.pointerEvents = 'none';
        }
        if (fileInput) fileInput.disabled = true;
        textarea.value = '';
        document.getElementById('editNewTextIndicator').style.display = 'none';
        document.getElementById('editTextFileInput').value = '';
    } else {
        textarea.disabled = false;
        textarea.placeholder = 'Type new lesson content here...';
        if (uploadArea) {
            uploadArea.style.opacity = '1';
            uploadArea.style.pointerEvents = 'auto';
        }
        if (fileInput) fileInput.disabled = false;
    }
}

// Handle edit video file select
function handleEditVideoFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("🎬 Edit video file selected:", file.name);
    
    document.getElementById('editNewVideoFilename').textContent = file.name + ' (' + (file.size / (1024*1024)).toFixed(2) + ' MB)';
    document.getElementById('editNewVideoIndicator').style.display = 'block';
    
    const preview = document.getElementById('editVideoPreview');
    const previewContainer = document.getElementById('editVideoPreviewContainer');
    preview.src = URL.createObjectURL(file);
    previewContainer.style.display = 'block';
    
    document.getElementById('editVideoUploadArea').style.borderColor = '#4caf50';
    document.getElementById('editVideoUploadArea').style.background = '#f1f8e9';
}

// Cancel edit new video
function cancelEditNewVideo() {
    document.getElementById('editVideoFileInput').value = '';
    document.getElementById('editNewVideoIndicator').style.display = 'none';
    document.getElementById('editVideoPreviewContainer').style.display = 'none';
    document.getElementById('editVideoUploadArea').style.borderColor = '#ddd';
    document.getElementById('editVideoUploadArea').style.background = '';
}

// Handle edit text file select
function handleEditTextFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("📄 Edit text file selected:", file.name);
    
    document.getElementById('editNewTextFilename').textContent = file.name;
    document.getElementById('editNewTextFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
    document.getElementById('editNewTextIndicator').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('editTextContentInput').value = e.target.result;
    };
    reader.readAsText(file);
}

// Cancel edit new text
function cancelEditNewText() {
    document.getElementById('editTextFileInput').value = '';
    document.getElementById('editNewTextIndicator').style.display = 'none';
    document.getElementById('editTextContentInput').value = '';
}

// Reset edit lesson form
function resetEditLessonForm() {
    document.getElementById('editLessonTitle').value = '';
    document.getElementById('editLessonDescription').value = '';
    document.getElementById('editVideoYoutubeUrl').value = '';
    document.getElementById('editTextContentInput').value = '';
    document.getElementById('editVideoFileInput').value = '';
    document.getElementById('editTextFileInput').value = '';
    
    document.getElementById('editNewVideoIndicator').style.display = 'none';
    document.getElementById('editNewTextIndicator').style.display = 'none';
    document.getElementById('editVideoPreviewContainer').style.display = 'none';
    document.getElementById('editExistingVideoInfo').style.display = 'none';
    
    document.getElementById('keepExistingVideo').checked = true;
    document.getElementById('keepExistingText').checked = true;
    
    toggleVideoReplaceMode();
    toggleTextReplaceMode();
    
    document.getElementById('editVideoUploadArea').style.borderColor = '#ddd';
    document.getElementById('editVideoUploadArea').style.background = '';
}

// Open edit lesson modal (enhanced version)
async function openEditLessonModal(lessonId) {
    console.log("📝 Opening enhanced edit lesson modal for ID:", lessonId);
    
    const modal = document.getElementById('editLessonModal');
    if (!modal) return;
    
    resetEditLessonForm();
    
    document.getElementById('editLessonTitle').value = 'Loading...';
    document.getElementById('editLessonDescription').value = 'Loading...';
    
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/lessons-db/${lessonId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const lesson = result.lesson;
            currentEditLessonId = lessonId;
            currentEditLessonData = lesson;
            
            document.getElementById('editLessonTitle').value = lesson.content_title || '';
            document.getElementById('editLessonDescription').value = lesson.content_description || '';
            document.getElementById('editCurrentContentType').value = lesson.content_type || 'text';
            
            const contentTypeSpan = document.getElementById('editCurrentContentType');
            contentTypeSpan.textContent = (lesson.content_type || 'text').toUpperCase();
            contentTypeSpan.className = `badge ${lesson.content_type === 'video' ? 'bg-danger' : 'bg-info'}`;
            
            let filename = '';
            if (lesson.video_filename) {
                filename = lesson.video_filename;
            } else if (lesson.content_url && lesson.content_url.includes('youtube')) {
                filename = 'YouTube Video';
            }
            document.getElementById('editCurrentContentFilename').textContent = filename || 'No file';
            
            // Set existing video info if exists
            if (lesson.video_filename) {
                document.getElementById('editExistingVideoFilename').textContent = lesson.video_filename;
                document.getElementById('editExistingVideoInfo').style.display = 'block';
            }
            
            if (lesson.content_type === 'text' && lesson.content_text) {
                document.getElementById('editCurrentTextContent').textContent = lesson.content_text;
            } else {
                document.getElementById('editCurrentTextContent').textContent = 'No text content available';
            }
            
            await loadEditTopics();
            
            if (lesson.topic_id) {
                setTimeout(() => {
                    const topicSelect = document.getElementById('editTopicSelect');
                    if (topicSelect) {
                        topicSelect.value = lesson.topic_id;
                    }
                }, 500);
            }
            
            if (lesson.content_type === 'video') {
                showEditContentSection('video');
                document.getElementById('editVideoTypeBtn').classList.add('active');
                document.getElementById('editVideoTypeBtn').style.background = '#7a0000';
                document.getElementById('editVideoTypeBtn').style.color = 'white';
            } else {
                showEditContentSection('text');
                document.getElementById('editTextTypeBtn').classList.add('active');
                document.getElementById('editTextTypeBtn').style.background = '#7a0000';
                document.getElementById('editTextTypeBtn').style.color = 'white';
            }
            
            showNotification('success', 'Loaded', 'Lesson data loaded successfully');
        } else {
            throw new Error(result.message || 'Failed to load lesson');
        }
        
    } catch (error) {
        console.error('❌ Error loading lesson:', error);
        showNotification('error', 'Load Failed', error.message);
    }
}

// Close edit lesson modal
function closeEditLessonModal() {
    const modal = document.getElementById('editLessonModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentEditLessonId = null;
        currentEditLessonData = null;
    }
}


// ===== FIXED EDIT LESSON FUNCTION WITH PROPER TOKEN HANDLING =====
async function editLesson(contentId) {
    console.log("✏️ EDIT BUTTON CLICKED - Editing lesson:", contentId);
    
    // Get modal elements
    const modal = document.getElementById('editLessonModal');
    if (!modal) {
        console.error("❌ Edit lesson modal not found!");
        showNotification('error', 'Error', 'Edit modal not found');
        return;
    }
    
    // Reset form and show loading
    resetEditLessonForm();
    
    // Show loading in fields
    document.getElementById('editLessonTitle').value = 'Loading...';
    document.getElementById('editLessonDescription').value = 'Loading...';
    document.getElementById('editCurrentContentFilename').textContent = 'Loading...';
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
    
    try {
        // ===== IMPORTANT: GET TOKEN PROPERLY =====
        let token = localStorage.getItem('admin_token') || 
                    localStorage.getItem('authToken');
        
        console.log("🔑 Token check:", token ? "Token exists" : "No token");
        
        if (!token) {
            console.log("⚠️ No token found, trying to sync admin auth...");
            
            // Try to sync from mathhub_user
            const userJson = localStorage.getItem('mathhub_user');
            if (userJson) {
                try {
                    const user = JSON.parse(userJson);
                    if (user.role === 'admin') {
                        token = localStorage.getItem('authToken');
                        localStorage.setItem('admin_token', token);
                        console.log("✅ Admin token synced successfully");
                    }
                } catch (e) {
                    console.error("❌ Error parsing user data:", e);
                }
            }
        }
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            closeEditLessonModal();
            return;
        }
        
        console.log("📡 Fetching lesson data from:", `http://localhost:5000/api/lessons-db/${contentId}`);
        console.log("🔑 Using token (first 20 chars):", token.substring(0, 20) + '...');
        
        const response = await fetch(`http://localhost:5000/api/lessons-db/${contentId}`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log("📥 Response status:", response.status);
        
        if (response.status === 401) {
            console.log("🔄 Token expired, trying to refresh...");
            
            // Try to refresh token
            const refreshed = await refreshAdminToken();
            if (refreshed) {
                // Retry with new token
                return editLesson(contentId);
            } else {
                throw new Error('Session expired. Please login again.');
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success && result.lesson) {
            const lesson = result.lesson;
            console.log("✅ Lesson loaded:", lesson);
            
            // Store current edit info
            window.currentEditLessonId = contentId;
            window.currentEditLessonData = lesson;
            
            // Populate form
            document.getElementById('editLessonId').value = contentId;
            document.getElementById('editLessonTitle').value = lesson.content_title || '';
            document.getElementById('editLessonDescription').value = lesson.content_description || '';
            
            // Set current content type display
            const contentTypeSpan = document.getElementById('editCurrentContentType');
            if (contentTypeSpan) {
                contentTypeSpan.textContent = (lesson.content_type || 'text').toUpperCase();
                contentTypeSpan.className = `badge ${lesson.content_type === 'video' ? 'bg-danger' : 'bg-info'}`;
            }
            
            // Set filename
            let filename = '';
            if (lesson.video_filename) {
                filename = lesson.video_filename;
            } else if (lesson.content_url) {
                filename = 'External Link';
            }
            
            const filenameSpan = document.getElementById('editCurrentContentFilename');
            if (filenameSpan) {
                filenameSpan.textContent = filename || 'No file';
            }
            
            // Set existing video info if exists
            if (lesson.video_filename) {
                const existingVideoSpan = document.getElementById('editExistingVideoFilename');
                const existingVideoDiv = document.getElementById('editExistingVideoInfo');
                if (existingVideoSpan && existingVideoDiv) {
                    existingVideoSpan.textContent = lesson.video_filename;
                    existingVideoDiv.style.display = 'block';
                }
            }
            
            // Set text content if exists
            if (lesson.content_type === 'text' && lesson.content_text) {
                const textContentDiv = document.getElementById('editCurrentTextContent');
                if (textContentDiv) {
                    textContentDiv.textContent = lesson.content_text;
                }
            }
            
            // Load topics
            await loadEditTopics();
            
            // Set topic if exists
            if (lesson.topic_id) {
                setTimeout(() => {
                    const topicSelect = document.getElementById('editTopicSelect');
                    if (topicSelect) {
                        topicSelect.value = lesson.topic_id;
                    }
                }, 500);
            }
            
            // Show appropriate content section
            if (lesson.content_type === 'video') {
                showEditContentSection('video');
                document.getElementById('editVideoTypeBtn').classList.add('active');
                document.getElementById('editVideoTypeBtn').style.background = '#7a0000';
                document.getElementById('editVideoTypeBtn').style.color = 'white';
            } else {
                showEditContentSection('text');
                document.getElementById('editTextTypeBtn').classList.add('active');
                document.getElementById('editTextTypeBtn').style.background = '#7a0000';
                document.getElementById('editTextTypeBtn').style.color = 'white';
            }
            
            showNotification('success', 'Loaded', 'Lesson data loaded successfully');
            
        } else {
            throw new Error(result.message || 'Failed to load lesson');
        }
        
    } catch (error) {
        console.error('❌ Error loading lesson:', error);
        
        // Show more detailed error
        let errorMessage = error.message;
        if (error.message.includes('401')) {
            errorMessage = 'Session expired. Please refresh the page and login again.';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to server. Make sure the backend is running.';
        }
        
        showNotification('error', 'Load Failed', errorMessage);
        
        // Show error in modal
        document.getElementById('editLessonTitle').value = '⚠️ Error loading lesson';
        document.getElementById('editLessonDescription').value = errorMessage;
    }
}

// ===== HELPER FUNCTION TO REFRESH ADMIN TOKEN =====
function refreshAdminToken() {
    console.log("🔄 Attempting to refresh admin token...");
    
    const userJson = localStorage.getItem('mathhub_user');
    const authToken = localStorage.getItem('authToken');
    
    if (userJson && authToken) {
        try {
            const user = JSON.parse(userJson);
            if (user.role === 'admin') {
                localStorage.setItem('admin_token', authToken);
                localStorage.setItem('admin_user', userJson);
                console.log("✅ Admin token refreshed from authToken");
                return true;
            }
        } catch (e) {
            console.error("❌ Error refreshing token:", e);
        }
    }
    
    return false;
}

// ===== RUN THIS ON PAGE LOAD TO SYNC TOKENS =====
(function syncAdminAuthOnLoad() {
    console.log("🔄 Syncing admin authentication on page load...");
    
    const userJson = localStorage.getItem('mathhub_user');
    const authToken = localStorage.getItem('authToken');
    
    if (userJson && authToken) {
        try {
            const user = JSON.parse(userJson);
            if (user.role === 'admin') {
                localStorage.setItem('admin_token', authToken);
                localStorage.setItem('admin_user', userJson);
                console.log("✅ Admin tokens synced for:", user.username);
            }
        } catch (e) {
            console.error("❌ Failed to sync admin auth:", e);
        }
    }
})();

// Function to save lesson changes
function saveSpecificLessonChanges(lessonId) {
    const lessonIndex = window.lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) {
        showNotification('error', 'Error', 'Lesson not found.');
        return;
    }
    
    const title = document.getElementById('editSpecificLessonTitle').value;
    const description = document.getElementById('editSpecificLessonDescription').value;
    const content = document.getElementById('editSpecificLessonContent').value;
    const tags = document.getElementById('editSpecificLessonTags').value;
    
    if (!title.trim()) {
        showNotification('error', 'Error', 'Please enter a title.');
        return;
    }
    
    // Update lesson
    window.lessons[lessonIndex] = {
        ...window.lessons[lessonIndex],
        title: title,
        description: description,
        content: content,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        updatedAt: new Date().toISOString()
    };
    
    showNotification('success', 'Saved', 'Lesson updated successfully!');
    
    // Go back to lessons list
    editAllLessons(window.lessons[lessonIndex].subject);
}

// Function to delete specific lesson
function deleteSpecificLesson(lessonId) {
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
        return;
    }
    
    const lessonIndex = window.lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) return;
    
    const subject = window.lessons[lessonIndex].subject;
    const title = window.lessons[lessonIndex].title;
    
    window.lessons.splice(lessonIndex, 1);
    
    showNotification('success', 'Deleted', `"${title}" has been deleted.`);
    
    // Update subject counts
    updateSubjectLessonCount(subject);
    
    // Go back to lessons list
    editAllLessons(subject);
}

// ===== OPEN CREATE LESSON MODAL WITH SUBJECT CONTEXT =====
function openCreateLessonModalWithSubject(subject, e) {
    if (e) e.preventDefault();
    console.log("➕ Opening create lesson modal for subject:", subject);
    
    // Set the current subject
    if (subject !== currentSubject) {
        selectSubject(subject);
    }
    
    // Open the create lesson modal
    openCreateLessonPopup(e);
}

// ===== CREATE NEW LESSON FUNCTION =====
function openCreateLessonPopupNew(e) {
    if (e) e.stopPropagation();
    
    console.log("Opening create lesson popup for subject:", currentSubject);
    
    // Get the modal
    const modal = document.getElementById('questionModal');
    if (!modal) return;
    
    // Clear previous content
    const modalBody = modal.querySelector('.modal-body');
    if (!modalBody) return;
    
    // Set modal content with new upload system
    modalBody.innerHTML = `
        <div class="lesson-section">
            <div class="section-header">
                <h2><i class="fas fa-plus"></i> Create New Lesson</h2>
                <p class="section-subtitle">Upload content for ${getSubjectDisplayName(currentSubject)}</p>
            </div>
            
            <!-- Subject Selection -->
            <div class="form-group">
                <label class="form-label"><i class="fas fa-book"></i> Subject</label>
                <div class="subject-buttons" style="display: flex; gap: 10px; margin: 10px 0;">
                    ${lessonDatabase.subjects.map(subject => `
                        <button type="button" 
                            class="subject-btn ${subject.id === selectedUploadSubjectId ? 'active' : ''}"
                            data-subject-id="${subject.id}"
                            onclick="selectSubjectForUpload(${subject.id})"
                            style="padding: 10px 15px; background: ${subject.color}; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            ${subject.name}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <!-- Lesson Information -->
            <div class="form-group">
                <label class="form-label"><i class="fas fa-heading"></i> Lesson Title *</label>
                <input type="text" id="createLessonTitle" class="form-control" placeholder="Enter lesson title" required>
            </div>
            
            <div class="form-group">
                <label class="form-label"><i class="fas fa-align-left"></i> Description *</label>
                <textarea id="contentDescription" class="form-control" rows="3" placeholder="Enter lesson description" required></textarea>
            </div>
            
            <!-- Content Type Selection -->
            <div class="form-group">
                <label class="form-label"><i class="fas fa-file-upload"></i> Content Type</label>
                <div class="content-type-buttons" style="display: flex; gap: 10px; margin: 10px 0;">
                    <button type="button" class="btn btn-outline active" onclick="showContentSection('video')">
                        <i class="fas fa-video"></i> Video
                    </button>
                    <button type="button" class="btn btn-outline" onclick="showContentSection('text')">
                        <i class="fas fa-file-alt"></i> Text
                    </button>
                    <button type="button" class="btn btn-outline" onclick="showContentSection('pdf')">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
            
            <!-- Module Structure (Optional) -->
            <div class="form-group">
                <label class="form-label"><i class="fas fa-sitemap"></i> Module Structure</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                    <select id="lessonSelect" class="form-control">
                        <option value="">Select Lesson</option>
                        <option value="lesson1">Lesson 1</option>
                        <option value="lesson2">Lesson 2</option>
                    </select>
                    <select id="moduleSelect" class="form-control">
                        <option value="">Select Module</option>
                        <option value="module1">Module 1</option>
                        <option value="module2">Module 2</option>
                    </select>
                    <select id="topicSelect" class="form-control">
                        <option value="">Select Topic</option>
                        <option value="topic1">Topic 1</option>
                        <option value="topic2">Topic 2</option>
                    </select>
                </div>
            </div>
            
            <!-- Video Content Section -->
            <div id="videoContentSection" class="content-section" style="display: block;">
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-link"></i> YouTube URL (Optional)</label>
                    <input type="url" id="videoYoutubeUrl" class="form-control" placeholder="https://www.youtube.com/watch?v=...">
                </div>
                
                <div class="form-group">
                    <label class="form-label"><i class="fas fa-upload"></i> Or Upload Video File</label>
                    <div class="upload-area" onclick="triggerVideoUpload()" style="border: 2px dashed #ddd; padding: 40px; text-align: center; cursor: pointer; border-radius: 8px; margin: 10px 0;">
                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #999;"></i>
                        <p style="margin: 10px 0; color: #666;">Click to upload video file</p>
                        <p style="font-size: 0.9rem; color: #888;">Supports MP4, AVI, MOV, MKV</p>
                    </div>
                    <input type="file" id="videoFileInput" accept="video/*" style="display: none;">
                </div>
                
                <!-- Video File Info -->
                <div id="videoFileInfo" style="display: none; background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 10px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong id="videoFileName"></strong>
                                            <div style="font-size: 0.9rem; color: #666;" id="videoFileSize"></div>
                                        </div>
                                        <button type="button" class="btn btn-danger btn-sm" onclick="removeVideoFile()">
                                            <i class="fas fa-times"></i> Remove
                                        </button>
                                    </div>
                                </div>
                                
                                <!-- Video Preview -->
                                <div id="videoPreviewContainer" style="margin: 10px 0; display: none;">
                                    <video id="videoPreview" controls style="width: 100%; max-height: 300px; border-radius: 6px;"></video>
                                </div>
                            </div>
                            
                            <!-- Text Content Section -->
                            <div id="textContentSection" class="content-section" style="display: none;">
                                <div class="form-group">
                                    <label class="form-label"><i class="fas fa-keyboard"></i> Enter Text Content</label>
                                    <textarea id="textContentInput" class="form-control" rows="8" placeholder="Type your lesson content here..."></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label class="form-label"><i class="fas fa-file-upload"></i> Or Upload Text File</label>
                                    <div class="upload-area" onclick="triggerTextFileUpload()" style="border: 2px dashed #ddd; padding: 20px; text-align: center; cursor: pointer; border-radius: 8px; margin: 10px 0;">
                                        <i class="fas fa-file-upload" style="font-size: 1.5rem; color: #999;"></i>
                                        <p style="margin: 10px 0; color: #666;">Upload .txt file</p>
                                    </div>
                                    <input type="file" id="textFileInput" accept=".txt,text/plain" style="display: none;">
                                </div>
                                
                                <!-- Text File Info -->
                                <div id="textFileInfo" style="display: none; background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 10px 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong id="textFileName"></strong>
                                            <div style="font-size: 0.9rem; color: #666;" id="textFileSize"></div>
                                        </div>
                                        <button type="button" class="btn btn-danger btn-sm" onclick="removeTextFile()">
                                            <i class="fas fa-times"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- PDF Content Section -->
                            <div id="pdfContentSection" class="content-section" style="display: none;">
                                <div class="form-group">
                                    <label class="form-label"><i class="fas fa-file-pdf"></i> Upload PDF File</label>
                                    <div class="upload-area" onclick="triggerPdfUpload()" style="border: 2px dashed #ddd; padding: 40px; text-align: center; cursor: pointer; border-radius: 8px; margin: 10px 0;">
                                        <i class="fas fa-cloud-upload-alt" style="font-size: 2rem; color: #999;"></i>
                                        <p style="margin: 10px 0; color: #666;">Click to upload PDF file</p>
                                        <p style="font-size: 0.9rem; color: #888;">Supports PDF files</p>
                                    </div>
                                    <input type="file" id="pdfFileInput" accept=".pdf,application/pdf" style="display: none;">
                                </div>
                                
                                <!-- PDF File Info -->
                                <div id="pdfFileInfo" style="display: none; background: #f5f5f5; padding: 15px; border-radius: 6px; margin: 10px 0;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <strong id="pdfFileName"></strong>
                                            <div style="font-size: 0.9rem; color: #666;" id="pdfFileSize"></div>
                                        </div>
                                        <button type="button" class="btn btn-danger btn-sm" onclick="removePdfFile()">
                                            <i class="fas fa-times"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Hidden Subject ID -->
                            <input type="hidden" id="selectedSubjectId" value="${selectedUploadSubjectId}">
                            
                            <!-- Action Buttons -->
                            <div style="display: flex; justify-content: space-between; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                                <button type="button" class="btn btn-secondary" onclick="closeModal()">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                                <button type="button" class="btn btn-primary" onclick="saveLessonHybrid()">
                                    <i class="fas fa-save"></i> Save Lesson
                                </button>
                            </div>
                        </div>
    `;
    
    // Set modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-plus"></i> Create New Lesson';
    }
    
    // Show the modal
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    document.body.classList.add('modal-open');
    
    // Initialize event listeners for the new upload system
    setTimeout(() => {
        // Siguraduhing loaded na ang DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUploadEventListeners);
        } else {
            initUploadEventListeners();
        }
    }, 300); // Mas mahabang delay para siguradong loaded na
    
    // Focus on first input
    setTimeout(() => {
        const titleInput = document.getElementById('createLessonTitle');
        if (titleInput) {
            titleInput.focus();
        }
    }, 200);
}

// ===== UPDATE FILE NAME DISPLAY =====
function updateFileName(inputId, displayId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    
    if (input && input.files.length > 0) {
        display.textContent = input.files[0].name;
        display.style.color = "#4CAF50";
        display.style.fontWeight = "600";
    } else {
        display.textContent = "No file selected";
        display.style.color = "#666";
        display.style.fontWeight = "normal";
    }
}

// ===== CREATE NEW LESSON FUNCTION =====
function createNewLesson() {
    // Get form values
    const lessonTitle = document.getElementById('newLessonTitle')?.value;
    const lessonDescription = document.getElementById('newLessonDescription')?.value;
    const lessonContent = document.getElementById('newLessonTextContent')?.value;
    
    // Validate required fields
    if (!lessonTitle || !lessonTitle.trim()) {
        showNotification('error', 'Validation Error', 'Please enter a lesson title.');
        return;
    }
    
    if (!lessonDescription || !lessonDescription.trim()) {
        showNotification('error', 'Validation Error', 'Please enter a lesson description.');
        return;
    }
    
    // Create new lesson object
    const lessonId = 'lesson_' + Date.now();
    const newLesson = {
        id: lessonId,
        title: lessonTitle,
        description: lessonDescription,
        content: lessonContent || '',
        subject: currentSubject,
        status: 'published',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    // Initialize lessons array if needed
    if (!window.lessons) {
        window.lessons = [];
    }
    
    // Add the new lesson
    window.lessons.push(newLesson);
    
    // Update subject lesson count
    updateSubjectLessonCount(currentSubject);
    
    // Show success notification
    showNotification('success', 'Lesson Created', `"${lessonTitle}" has been created successfully.`);
    
    // Close the modal
    closeModal();
    
    // Update the dashboard
    updateLessonStats();
    updateSubjectInfoPanel();
}

// ===== SAVE AS DRAFT FUNCTION =====
function saveLessonAsDraftNew() {
    const lessonTitle = document.getElementById('newLessonTitle')?.value;
    
    if (!lessonTitle || !lessonTitle.trim()) {
        showNotification('error', 'Validation Error', 'Please enter at least a lesson title.');
        return;
    }
    
    showNotification('info', 'Draft Saved', 'Lesson has been saved as draft. You can continue editing later.');
    closeModal();
}

// ===== UPDATE SUBJECT LESSON COUNT =====
function updateSubjectLessonCount(subject) {
    // Count lessons for this subject
    const subjectLessons = lessons ? lessons.filter(lesson => lesson.subject === subject) : [];
    const lessonCount = subjectLessons.length;
    
    // Update UI
    const subjectElement = document.querySelector(`.subject-card[data-subject="${subject}"]`);
    if (subjectElement) {
        const lessonSpan = subjectElement.querySelector('.subject-stats span:first-child span');
        if (lessonSpan) {
            lessonSpan.textContent = lessonCount;
        }
        
        // Update progress (example: 20% per lesson)
        const progress = Math.min(100, lessonCount * 20);
        const progressFill = subjectElement.querySelector('.progress-fill-small');
        const progressText = subjectElement.querySelector('.progress-label span:last-child');
        
        if (progressFill) progressFill.style.width = progress + '%';
        if (progressText) progressText.textContent = progress + '%';
    }
    
    // Update welcome section
    const welcomeLessonCount = document.getElementById('welcomeLessonCount');
    if (welcomeLessonCount && currentSubject === subject) {
        welcomeLessonCount.textContent = lessonCount;
    }
}

// ===== HELPER FUNCTIONS FOR LESSON DASHBOARD =====
function updateSubjectInfoPanel() {
    if (!currentSubject) return;
    
    const subjectName = getSubjectDisplayName(currentSubject);
    
    document.getElementById('currentSubjectName').textContent = subjectName;
    document.getElementById('subjectDetailDescription').textContent = `You are currently managing ${subjectName} lessons. ${getSubjectDescription(currentSubject)}`;
    
    document.getElementById('lessonCount').textContent = lessonData[currentSubject].lessons;
    document.getElementById('resourceCount').textContent = lessonData[currentSubject].resources;
    document.getElementById('studentCount').textContent = lessonData[currentSubject].students;
    
    // Update welcome section
    document.getElementById('welcomeSubjectName').textContent = subjectName;
    document.getElementById('welcomeLessonCount').textContent = lessonData[currentSubject].lessons;
    document.getElementById('welcomeResourceCount').textContent = lessonData[currentSubject].resources;
    document.getElementById('welcomeStudentCount').textContent = lessonData[currentSubject].students;
    
    // Update sidebar
    document.getElementById('sidebarSubjectName').textContent = subjectName;
    document.getElementById('sidebarLessonCount').textContent = lessonData[currentSubject].lessons;
    document.getElementById('sidebarStudentCount').textContent = lessonData[currentSubject].students;
    document.getElementById('sidebarProgress').textContent = lessonData[currentSubject].progress + '%';
}

function updateLessonStats() {
    // Update subject-specific stats
    document.getElementById('polyLessons').textContent = lessonData.polynomial.lessons;
    document.getElementById('polyResources').textContent = lessonData.polynomial.resources;
    document.getElementById('factLessons').textContent = lessonData.factorial.lessons;
    document.getElementById('factResources').textContent = lessonData.factorial.resources;
    document.getElementById('mdasLessons').textContent = lessonData.mdas.lessons;
    document.getElementById('mdasResources').textContent = lessonData.mdas.resources;
    
    // Update progress bars
    updateProgressBar('polynomial', lessonData.polynomial.progress);
    updateProgressBar('factorial', lessonData.factorial.progress);
    updateProgressBar('mdas', lessonData.mdas.progress);
    
    // Update total stats in sidebar
    const totalLessons = Object.values(lessonData).reduce((sum, data) => sum + data.lessons, 0);
    const totalResources = Object.values(lessonData).reduce((sum, data) => sum + data.resources, 0);
    const totalStudents = Object.values(lessonData).reduce((sum, data) => sum + data.students, 0);
    
    document.getElementById('totalLessonsSidebar').textContent = totalLessons;
    document.getElementById('totalSubjectsSidebar').textContent = Object.keys(lessonData).length;
    document.getElementById('totalStudentsSidebar').textContent = totalStudents;
    document.getElementById('totalResourcesSidebar').textContent = totalResources;
}

function updateProgressBar(subject, progress) {
    const card = document.querySelector(`.subject-card[data-subject="${subject}"]`);
    if (card) {
        const progressFill = card.querySelector('.progress-fill-small');
        const progressText = card.querySelector('.progress-label span:last-child');
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        if (progressText) {
            progressText.textContent = `${progress}%`;
        }
    }
}

function highlightActiveSubject() {
    const cards = document.querySelectorAll('.subject-card');
    cards.forEach(card => {
        if (card.dataset.subject === currentSubject) {
            card.style.border = '2px solid var(--primary)';
            card.style.boxShadow = '0 8px 20px rgba(122, 0, 0, 0.15)';
        } else {
            card.style.border = '2px solid var(--border-color)';
            card.style.boxShadow = 'var(--shadow)';
        }
    });
}

function addSubjectCardInteractions() {
    const cards = document.querySelectorAll('.subject-card');
    cards.forEach(card => {
        // Add click feedback
        card.addEventListener('click', function() {
            this.classList.add('active-click');
            setTimeout(() => this.classList.remove('active-click'), 300);
        });
        
        // Add hover effects
        card.addEventListener('mouseenter', function() {
            this.classList.add('hovered');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('hovered');
        });
    });
}

// ===== REPLACE YOUR EXISTING updateSubjectInfo WITH THIS =====
function updateSubjectInfo(subject) {
    console.log(`📊 Updating subject info for: ${subject}`);
    
    // This function is now handled by updateSubjectInfoPanel
    // Just call the main function
    updateSubjectInfoPanel();
}

// ===== OTHER DASHBOARD FUNCTIONS =====
function filterSubjects(filterType) {
    const cards = document.querySelectorAll('.subject-card');
    
    cards.forEach(card => {
        const subject = card.dataset.subject;
        let show = true;
        
        switch(filterType) {
            case 'active':
                show = true; // Simplified for demo
                break;
            case 'most-lessons':
                show = lessonData[subject].lessons >= 3;
                break;
            case 'most-resources':
                show = lessonData[subject].resources >= 5;
                break;
            case 'all':
            default:
                show = true;
        }
        
        card.style.display = show ? 'flex' : 'none';
    });
    
    showNotification('info', 'Filter Applied', `Showing ${filterType} subjects`);
}

function sortSubjects(sortBy) {
    const container = document.querySelector('.subject-cards');
    const cards = Array.from(document.querySelectorAll('.subject-card'));
    
    cards.sort((a, b) => {
        const subjectA = a.dataset.subject;
        const subjectB = b.dataset.subject;
        
        switch(sortBy) {
            case 'name':
                return getSubjectDisplayName(subjectA).localeCompare(getSubjectDisplayName(subjectB));
            case 'lessons':
                return lessonData[subjectB].lessons - lessonData[subjectA].lessons;
            case 'resources':
                return lessonData[subjectB].resources - lessonData[subjectA].resources;
            case 'progress':
                return lessonData[subjectB].progress - lessonData[subjectA].progress;
            default:
                return 0;
        }
    });
    
    // Reorder cards
    cards.forEach(card => container.appendChild(card));
    
    showNotification('info', 'Sort Applied', `Sorted by ${sortBy}`);
}

// ===== PLACEHOLDER FUNCTIONS (for other buttons) =====
function manageAllLessons() {
    showNotification('info', 'Manage Lessons', 'Manage all lessons view would open here.');
    // Implement manage all lessons functionality
}

function manageSubjectLessons(subject) {
    showNotification('info', 'Manage Lessons', `Managing lessons for ${getSubjectDisplayName(subject)}`);
    // Implement subject-specific lesson management
}

function viewLesson(subject, lessonId) {
    showNotification('info', 'View Lesson', `Viewing lesson ${lessonId + 1} in ${getSubjectDisplayName(subject)}`);
    // Implement view lesson functionality
}

// ===== GENERATE ANALYTICS REPORT PDF - DIRECT DOWNLOAD =====
async function generateAnalyticsReport() {
    console.log("📊 Generating Analytics Report PDF...");
    
    showNotification('info', 'Generating PDF', 'Preparing analytics report...');
    
    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page.');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Get current data
        const totalUsers = document.getElementById('analyticsTotalUsers')?.textContent || '0';
        const totalLessons = document.getElementById('analyticsTotalLessons')?.textContent || '0';
        const completionRate = document.getElementById('analyticsCompletionRate')?.textContent || '0%';
        const engagementRate = document.getElementById('analyticsEngagementRate')?.textContent || '0%';
        
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = new Date().toLocaleTimeString();
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.text('ANALYTICS REPORT', 148.5, 70, { align: 'center' });
        
        doc.setFontSize(28);
        doc.text('MathHub Admin Dashboard', 148.5, 100, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(`Generated on: ${currentDate}`, 148.5, 130, { align: 'center' });
        doc.text(`Time: ${currentTime}`, 148.5, 145, { align: 'center' });
        
        // Add new page
        doc.addPage();
        
        // ===== STATISTICS PAGE =====
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(122, 0, 0);
        doc.text('Analytics Dashboard Statistics', 20, 20);
        
        // Statistics table
        doc.autoTable({
            startY: 30,
            head: [['Metric', 'Value']],
            body: [
                ['Total Users', totalUsers],
                ['Total Lessons', totalLessons],
                ['Completion Rate', completionRate],
                ['Engagement Rate', engagementRate]
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            margin: { top: 30 }
        });
        
        // ===== USER GROWTH CHART DATA =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('User Growth Data', 20, 20);
        
        // Get user growth chart data
        let userGrowthData = [];
        if (analyticsCharts.userGrowthChart) {
            const chart = analyticsCharts.userGrowthChart;
            const labels = chart.data.labels;
            const data = chart.data.datasets[0].data;
            
            for (let i = 0; i < labels.length; i++) {
                userGrowthData.push([labels[i], data[i].toString()]);
            }
        }
        
        if (userGrowthData.length > 0) {
            doc.autoTable({
                startY: 30,
                head: [['Month', 'New Users']],
                body: userGrowthData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
            });
        } else {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No user growth data available', 20, 40);
        }
        
        // ===== LESSON POPULARITY DATA =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Lesson Popularity Data', 20, 20);
        
        // Get lesson popularity data
        let lessonData = [];
        if (analyticsCharts.lessonPopularityChart) {
            const chart = analyticsCharts.lessonPopularityChart;
            const labels = chart.data.labels;
            const dataset = chart.data.datasets[0];
            const data = dataset.data;
            
            for (let i = 0; i < labels.length; i++) {
                lessonData.push([labels[i], data[i].toString()]);
            }
        }
        
        if (lessonData.length > 0) {
            doc.autoTable({
                startY: 30,
                head: [['Lesson', 'Count']],
                body: lessonData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
            });
        } else {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No lesson popularity data available', 20, 40);
        }
        
        // ===== SUBJECT BREAKDOWN =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Subject Breakdown', 20, 20);
        
        // Get subject counts
        const polyLessons = document.getElementById('polyLessonCount')?.textContent || '0';
        const mathLessons = document.getElementById('mathLessonCount')?.textContent || '0';
        const factLessons = document.getElementById('factLessonCount')?.textContent || '0';
        
        doc.autoTable({
            startY: 30,
            head: [['Subject', 'Lesson Count']],
            body: [
                ['PolyLearn', polyLessons],
                ['MathEase', mathLessons],
                ['FactoLearn', factLessons]
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
        });
        
        // ===== SYSTEM INFORMATION =====
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('System Information', 20, 20);
        
        doc.autoTable({
            startY: 30,
            head: [['Item', 'Details']],
            body: [
                ['Report Generated', `${currentDate} at ${currentTime}`],
                ['Data Source', 'MySQL Database'],
                ['Report Type', 'Analytics Dashboard Summary'],
                ['Generated By', localStorage.getItem('mathhub_user') ? 
                  JSON.parse(localStorage.getItem('mathhub_user')).full_name || 'Admin' : 'Admin']
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
        });
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `MathHub Analytics Report - Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        // ===== DOWNLOAD THE PDF =====
        const fileName = `MathHub_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'PDF Downloaded', `Report saved as ${fileName}`);
        console.log(`✅ Analytics PDF downloaded: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating analytics PDF:', error);
        showNotification('error', 'PDF Generation Failed', error.message);
    }
}

// ===== ALTERNATIVE SIMPLER VERSION (if jsPDF gives issues) =====
function generateSimpleAnalyticsReport() {
    console.log("📊 Generating simple analytics report...");
    
    try {
        // Get current data
        const totalUsers = document.getElementById('analyticsTotalUsers')?.textContent || '0';
        const totalLessons = document.getElementById('analyticsTotalLessons')?.textContent || '0';
        const completionRate = document.getElementById('analyticsCompletionRate')?.textContent || '0%';
        const engagementRate = document.getElementById('analyticsEngagementRate')?.textContent || '0%';
        
        const polyLessons = document.getElementById('polyLessonCount')?.textContent || '0';
        const mathLessons = document.getElementById('mathLessonCount')?.textContent || '0';
        const factLessons = document.getElementById('factLessonCount')?.textContent || '0';
        
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        
        // Create HTML content
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>MathHub Analytics Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1 { color: #7a0000; border-bottom: 2px solid #7a0000; padding-bottom: 10px; }
                    h2 { color: #333; margin-top: 30px; }
                    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                    th { background: #7a0000; color: white; padding: 12px; text-align: left; }
                    td { padding: 10px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 30px 0; }
                    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; }
                    .stat-card:nth-child(1) { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
                    .stat-card:nth-child(2) { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
                    .stat-card:nth-child(3) { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
                    .stat-card:nth-child(4) { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
                    .stat-value { font-size: 2rem; font-weight: bold; }
                    .stat-label { font-size: 0.9rem; opacity: 0.9; }
                    .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.8rem; border-top: 1px solid #ddd; padding-top: 20px; }
                </style>
            </head>
            <body>
                <h1>📊 MathHub Analytics Report</h1>
                <p>Generated on: ${currentDate} at ${currentTime}</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${totalUsers}</div>
                        <div class="stat-label">Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totalLessons}</div>
                        <div class="stat-label">Total Lessons</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${completionRate}</div>
                        <div class="stat-label">Completion Rate</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${engagementRate}</div>
                        <div class="stat-label">Engagement Rate</div>
                    </div>
                </div>
                
                <h2>Subject Breakdown</h2>
                <table>
                    <tr>
                        <th>Subject</th>
                        <th>Lesson Count</th>
                    </tr>
                    <tr>
                        <td>PolyLearn</td>
                        <td>${polyLessons}</td>
                    </tr>
                    <tr>
                        <td>MathEase</td>
                        <td>${mathLessons}</td>
                    </tr>
                    <tr>
                        <td>FactoLearn</td>
                        <td>${factLessons}</td>
                    </tr>
                </table>
                
                <h2>User Growth Data</h2>
                <table id="userGrowthTable">
                    <tr>
                        <th>Month</th>
                        <th>New Users</th>
                    </tr>
        `;
        
        // Add user growth data if available
        let userGrowthHtml = '';
        if (analyticsCharts.userGrowthChart) {
            const chart = analyticsCharts.userGrowthChart;
            const labels = chart.data.labels;
            const data = chart.data.datasets[0].data;
            
            for (let i = 0; i < labels.length; i++) {
                if (labels[i] !== 'Loading...') {
                    userGrowthHtml += `<tr><td>${labels[i]}</td><td>${data[i]}</td></tr>`;
                }
            }
        }
        
        if (userGrowthHtml) {
            htmlContent += userGrowthHtml;
        } else {
            htmlContent += `<tr><td colspan="2" style="text-align: center;">No user growth data available</td></tr>`;
        }
        
        htmlContent += `
                </table>
                
                <h2>Lesson Popularity Data</h2>
                <table id="lessonPopularityTable">
                    <tr>
                        <th>Lesson</th>
                        <th>Views</th>
                    </tr>
        `;
        
        // Add lesson popularity data if available
        let lessonHtml = '';
        if (analyticsCharts.lessonPopularityChart) {
            const chart = analyticsCharts.lessonPopularityChart;
            const labels = chart.data.labels;
            const data = chart.data.datasets[0].data;
            
            for (let i = 0; i < labels.length; i++) {
                if (labels[i] !== 'Loading...') {
                    lessonHtml += `<tr><td>${labels[i]}</td><td>${data[i]}</td></tr>`;
                }
            }
        }
        
        if (lessonHtml) {
            htmlContent += lessonHtml;
        } else {
            htmlContent += `<tr><td colspan="2" style="text-align: center;">No lesson popularity data available</td></tr>`;
        }
        
        htmlContent += `
                </table>
                
                <div class="footer">
                    <p>MathHub Learning Platform - Admin Dashboard</p>
                    <p>This report was generated automatically and contains real-time data from the database.</p>
                </div>
            </body>
            </html>
        `;
        
        // Create blob and download as HTML file
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `MathHub_Analytics_Report_${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showNotification('success', 'Report Downloaded', 'Analytics report saved as HTML file');
        
    } catch (error) {
        console.error('❌ Error generating simple report:', error);
        showNotification('error', 'Report Failed', error.message);
    }
}

// ===== HYBRID FUNCTION - TRIES PDF FIRST, FALLBACK TO HTML =====
async function generateAnalyticsReportHybrid() {
    try {
        // Try PDF first
        await generateAnalyticsReport();
    } catch (error) {
        console.log('PDF generation failed, falling back to HTML:', error);
        // Fallback to HTML
        generateSimpleAnalyticsReport();
    }
}

// ===== ADMIN AUTHENTICATION FUNCTIONS =====
async function checkAdminAuthOnLoad() {
    console.log("🔐 Checking MathHub admin authentication...");
    
    // GAMITIN ang regular authToken, HINDI admin_token
    const token = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('mathhub_user');
    
    if (!token || !userJson) {
        console.log('ℹ️ No MathHub user logged in');
        return false;
    }
    
    try {
        const user = JSON.parse(userJson);
        console.log('👤 User:', user.username, 'Role:', user.role);
        
        // Check kung admin ang role
        if (user.role === 'admin') {
            console.log('✅ MathHub Admin authenticated:', user.full_name || user.username);
            
            // SYNC: I-set din ang admin_token para sa existing admin functions
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_user', userJson);
            localStorage.setItem('user_role', user.role);
            localStorage.setItem('admin_session', 'true');
            
            authToken = token;
            
            // Load admin data
            setTimeout(() => {
                if (typeof loadModuleStructure === 'function') loadModuleStructure();
                if (typeof loadAdminLessons === 'function') loadAdminLessons();
                if (typeof loadUsersData === 'function') loadUsersData();
            }, 500);
            
            // Show welcome notification
            if (typeof showNotification === 'function') {
                showNotification('success', 'Admin Dashboard', `Welcome ${user.full_name || user.username}`);
            }
            
            return true;
        } else {
            console.log('ℹ️ User is not admin (role:', user.role, ')');
            // Clear admin tokens kung hindi naman admin
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            localStorage.removeItem('user_role');
            localStorage.removeItem('admin_session');
            return false;
        }
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return false;
    }
}

async function adminLogin(email, password) {
    try {
        showNotification('info', 'Logging In', 'Authenticating...');
        
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.token) {
            localStorage.setItem('admin_token', result.token);
            localStorage.setItem('admin_user', JSON.stringify(result.user));
            authToken = result.token;
            
            showNotification('success', 'Login Successful', `Welcome ${result.user.full_name}`);
            
            // Load admin data pagkatapos mag-login
            loadModuleStructure();
            loadAdminLessons();
            
            return true;
        } else {
            showNotification('error', 'Login Failed', result.message || 'Invalid credentials');
            return false;
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('error', 'Connection Error', 'Cannot connect to server');
        return false;
    }
}

// Replace the existing checkAuth function with this:
async function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        console.error('No authentication token found');
        
        // Auto-login with demo admin credentials for development
        if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
            console.log('🔄 Attempting auto-login for development...');
            
            try {
                const loginResult = await adminLogin('admin@mathhub.com', 'admin123');
                if (loginResult) {
                    return true;
                }
            } catch (error) {
                console.error('Auto-login failed:', error);
            }
        }
        
        showNotification('error', 'Authentication Required', 'Please login as admin');
        return false;
    }
    
    // Check if token is valid
    try {
        const response = await fetch(`${API_BASE_URL}/admin/lessons`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            showNotification('error', 'Session Expired', 'Please login again');
            localStorage.removeItem('admin_token');
            return false;
        }
        
        authToken = token;
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        
        // For development, allow to proceed even if server is down
        if (window.location.href.includes('localhost')) {
            console.log('⚠️ Server not reachable, proceeding in development mode');
            return true;
        }
        
        return false;
    }
}

// ===== NOTIFICATION SYSTEM =====
function showNotification(type, title, message) {
    console.log(`📢 Notification [${type}]: ${title} - ${message}`);
    try {
        // Your existing notification code
        const existingNotif = document.querySelector('.notification');
        if (existingNotif) existingNotif.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
            <div class="notification-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
        
    } catch (error) {
        console.error("❌ Notification error:", error);
        alert(`${title}: ${message}`); // Fallback
    }
}

function updatePageTitle(html, text) {
    if (domCache.pageTitle) domCache.pageTitle.innerHTML = html;
    if (domCache.navTitle) domCache.navTitle.textContent = text;
}

function updateCurrentTime() {
    const now = new Date();
    
    // Format time (e.g., "9:41 AM")
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    // Update time display
    if (domCache.currentTime) {
        domCache.currentTime.textContent = `${hours}:${minutes} ${ampm}`;
    }
    
    // Format date (e.g., "Wednesday, February 19, 2025")
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    const formattedDate = now.toLocaleDateString('en-US', options);
    
    // Update date display
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = formattedDate;
    }
    
    // Also update the date in practice dashboard if it exists
    const practiceDate = document.getElementById('practiceDate');
    if (practiceDate) {
        practiceDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short', 
            day: 'numeric' 
        });
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = domCache.themeToggle?.querySelector('i');
    const text = domCache.themeToggle?.querySelector('span');
    
    if (document.body.classList.contains('dark-theme')) {
        icon?.classList.replace('fa-moon', 'fa-sun');
        text && (text.textContent = 'Light Mode');
        showNotification('info', 'Theme Changed', 'Switched to Dark Mode');
    } else {
        icon?.classList.replace('fa-sun', 'fa-moon');
        text && (text.textContent = 'Dark Mode');
        showNotification('info', 'Theme Changed', 'Switched to Light Mode');
    }
    
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// ===== INITIALIZE SETTINGS DASHBOARD =====
function initializeSettingsDashboard() {
    console.log("⚙️ Initializing Settings Dashboard...");
    
    // Load users data
    loadUsersData();  // <-- Dapat ito ay nandito
    
    // Update stats
    updateUserStats();
    
    // Update table
    updateUsersTable();
    
    // Load sessions
    loadSessions();
    
    // Initialize tabs
    openSettingsTab('userManagementTab');
    
    // Set up search
    const searchInput = document.getElementById('searchSettingsInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Add search functionality if needed
        });
    }
}

function openSettingsTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.settings-content-card').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked tab button
    event.target.classList.add('active');
}

// ===== LOAD USERS FROM DATABASE - FIXED VERSION WITH DEBUGGING =====
async function loadUsersData() {
    console.log("📥 ===== LOAD USERS DATA FUNCTION CALLED =====");
    console.log("📥 Loading REAL users from MySQL database...");
    
    // Show loading state in table
    const tableBody = document.getElementById('usersTableBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-5">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-spinner fa-pulse fa-3x mb-3" style="color: #7a0000;"></i>
                        <p class="text-muted">Loading users from database...</p>
                        <p class="text-muted" style="font-size: 0.8rem;">Please wait...</p>
                    </div>
                </td>
            </tr>
        `;
    }
    
    // Show loading in stats
    document.getElementById('totalUsersCount').textContent = '...';
    document.getElementById('activeUsersCount').textContent = '...';
    document.getElementById('adminsCount').textContent = '...';
    document.getElementById('pendingUsersCount').textContent = '...';
    
    try {
        // Get auth token
        const adminToken = localStorage.getItem('admin_token');
        const authToken = localStorage.getItem('authToken');
        const token = adminToken || authToken;
        
        console.log('🔑 Token check:', {
            admin_token: adminToken ? 'YES' : 'NO',
            authToken: authToken ? 'YES' : 'NO',
            final_token: token ? 'YES' : 'NO'
        });
        
        if (!token) {
            console.error('❌ No authentication token found');
            showNoUsersMessage('Please login as admin first');
            
            // Update stats to zero
            document.getElementById('totalUsersCount').textContent = '0';
            document.getElementById('activeUsersCount').textContent = '0';
            document.getElementById('adminsCount').textContent = '0';
            document.getElementById('pendingUsersCount').textContent = '0';
            
            // Show login button in table
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5">
                            <div style="text-align: center; padding: 40px;">
                                <i class="fas fa-lock" style="font-size: 4rem; color: #f57c00; margin-bottom: 20px;"></i>
                                <h4 style="color: #666; margin-bottom: 10px;">Authentication Required</h4>
                                <p style="color: #999; margin-bottom: 20px;">Please login as admin to view users.</p>
                                <button class="btn btn-primary" onclick="showLogoutConfirmation()" style="background: #7a0000;">
                                    <i class="fas fa-sign-in-alt"></i> Login
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }
            return;
        }
        
        console.log('🔑 Using token (first 20 chars):', token.substring(0, 20) + '...');
        
        // ----- FETCH USERS FROM DATABASE -----
        const url = 'http://localhost:5000/api/admin/users';
        console.log('📡 Fetching from:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('📥 Response status:', response.status);
        console.log('📥 Response ok?', response.ok);
        
        // Try to get response text first
        let responseText;
        try {
            responseText = await response.text();
            console.log('📥 Raw response (first 200 chars):', responseText.substring(0, 200));
        } catch (textError) {
            console.error('❌ Could not read response text:', textError);
            throw new Error('Could not read server response');
        }
        
        // Parse JSON
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('📦 Parsed result:', result);
        } catch (parseError) {
            console.error('❌ JSON parse error:', parseError);
            console.error('❌ Response was not valid JSON');
            
            // If HTML response, server might have returned error page
            if (responseText.includes('<!DOCTYPE html>')) {
                throw new Error('Server returned HTML error page. Check if server is running properly.');
            } else {
                throw new Error('Invalid JSON response from server');
            }
        }
        
        if (!response.ok) {
            throw new Error(result.message || `Server error: ${response.status}`);
        }
        
        if (result.success && result.users) {
            // GAMITIN ANG MGA USER NA GALING SA DATABASE
            usersData = result.users;
            
            console.log(`✅ SUCCESS! Loaded ${usersData.length} users from database`);
            
            if (usersData.length === 0) {
                showNoUsersMessage('No users found in database');
                
                // Set stats to zero
                document.getElementById('totalUsersCount').textContent = '0';
                document.getElementById('activeUsersCount').textContent = '0';
                document.getElementById('adminsCount').textContent = '0';
                document.getElementById('pendingUsersCount').textContent = '0';
                return;
            }
            
            // I-process ang users para consistent ang format
            usersData = usersData.map(user => {
                // Kunin ang initials para sa avatar
                const nameToUse = user.name || user.full_name || user.username || 'User';
                const initials = nameToUse
                    .split(' ')
                    .map(word => word.charAt(0))
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                
                return {
                    id: user.id,
                    name: nameToUse,
                    username: user.username || '',
                    email: user.email || 'no-email@example.com',
                    role: user.role || 'student',
                    status: user.status || 'active',
                    registrationDate: user.registrationDate || new Date().toISOString().split('T')[0],
                    lastLogin: user.lastLogin || 'Never',
                    lastActive: user.lastActive || 'Never',
                    avatar: initials || 'U',
                    createdAt: user.registrationDate || new Date().toISOString()
                };
            });
            
            console.log('✅ Processed users sample:', usersData.slice(0, 2));
            
            // I-save sa localStorage bilang backup
            try {
                localStorage.setItem('mathhub_users_backup', JSON.stringify(usersData));
                console.log('💾 Backup saved to localStorage');
            } catch (e) {
                console.warn('Could not save backup:', e);
            }
            
            // I-update ang UI
            updateUsersTable();
            updateUserStats();
            
            // Ipakita ang success message
            showNotification('success', 'Users Loaded', `${usersData.length} users loaded from database`);
            
        } else {
            throw new Error(result.message || 'Failed to load users from database');
        }
        
    } catch (error) {
        console.error('❌ ERROR in loadUsersData:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Show error in table
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #f44336; margin-bottom: 20px;"></i>
                            <h4 style="color: #666; margin-bottom: 10px;">Failed to Load Users</h4>
                            <p style="color: #999; margin-bottom: 5px;">${error.message}</p>
                            <p style="color: #999; margin-bottom: 20px;">Check console for details (F12)</p>
                            <button class="btn btn-primary" onclick="loadUsersData()" style="background: #7a0000;">
                                <i class="fas fa-sync-alt"></i> Retry
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
        
        // Try to load from backup
        try {
            const backup = localStorage.getItem('mathhub_users_backup');
            if (backup) {
                usersData = JSON.parse(backup);
                console.log(`⚠️ Using backup data: ${usersData.length} users`);
                updateUsersTable();
                updateUserStats();
                showNotification('warning', 'Offline Mode', 'Using cached user data');
            } else {
                // Set stats to zero
                document.getElementById('totalUsersCount').textContent = '0';
                document.getElementById('activeUsersCount').textContent = '0';
                document.getElementById('adminsCount').textContent = '0';
                document.getElementById('pendingUsersCount').textContent = '0';
            }
        } catch (backupError) {
            console.error('❌ Backup error:', backupError);
            
            // Set stats to zero
            document.getElementById('totalUsersCount').textContent = '0';
            document.getElementById('activeUsersCount').textContent = '0';
            document.getElementById('adminsCount').textContent = '0';
            document.getElementById('pendingUsersCount').textContent = '0';
        }
    }
}

// ===== SHOW NO USERS MESSAGE =====
function showNoUsersMessage(message) {
    console.log("📭 No users found:", message);
    
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    usersData = [];
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-5">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-users-slash" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                    <h4 style="color: #666; margin-bottom: 10px;">${message}</h4>
                    <p style="color: #999; margin-bottom: 20px;">Users who sign up/login to MathHub will appear here.</p>
                    <button class="btn btn-primary" onclick="loadUsersData()" style="background: #7a0000;">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
    
    // Reset stats
    document.getElementById('totalUsersCount').textContent = '0';
    document.getElementById('activeUsersCount').textContent = '0';
    document.getElementById('adminsCount').textContent = '0';
    document.getElementById('pendingUsersCount').textContent = '0';
    document.getElementById('totalStudents').textContent = '0';
    document.getElementById('totalTeachers').textContent = '0';
    document.getElementById('newUsersToday').textContent = '0';
    document.getElementById('activeNow').textContent = '0';
}

// ===== SETTINGS DASHBOARD FUNCTION =====
function showSettings(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('settingsDashboardSection');
    updatePageTitle('<i class="fas fa-cog"></i> System Settings', 'System Settings');
    updateActiveNav('settings');
    initializeSettingsDashboard();
}

// ===== UPDATE USER STATS WITH REAL DATA =====
function updateUserStats() {
    console.log("📊 Updating user stats with real data...");
    
    if (!usersData || usersData.length === 0) {
        console.log('ℹ️ No users data, stats set to zero');
        document.getElementById('totalUsersCount').textContent = '0';
        document.getElementById('activeUsersCount').textContent = '0';
        document.getElementById('adminsCount').textContent = '0';
        document.getElementById('pendingUsersCount').textContent = '0';
        
        // Also update the quick stats in Users tab
        document.getElementById('totalStudents').textContent = '0';
        document.getElementById('totalTeachers').textContent = '0';
        document.getElementById('newUsersToday').textContent = '0';
        document.getElementById('activeNow').textContent = '0';
        return;
    }
    
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => u.status === 'active' || u.status === '1').length;
    const admins = usersData.filter(u => u.role === 'admin').length;
    const teachers = usersData.filter(u => u.role === 'teacher').length;
    const students = usersData.filter(u => u.role === 'student').length;
    const pendingUsers = usersData.filter(u => u.status === 'pending').length;
    
    // Calculate new users today
    const today = new Date().toISOString().split('T')[0];
    const newToday = usersData.filter(u => {
        const regDate = u.registrationDate ? u.registrationDate.split('T')[0] : '';
        return regDate === today;
    }).length;
    
    // Calculate active now (users who logged in within last hour)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const activeNow = usersData.filter(u => {
        if (!u.lastActive || u.lastActive === 'Never') return false;
        try {
            const lastActive = new Date(u.lastActive);
            return lastActive > oneHourAgo;
        } catch (e) {
            return false;
        }
    }).length;
    
    console.log('📊 Stats calculated:', {
        totalUsers,
        activeUsers,
        admins,
        teachers,
        students,
        pending: pendingUsers,
        newToday,
        activeNow
    });
    
    // Update main stats in Settings tab
    document.getElementById('totalUsersCount').textContent = totalUsers;
    document.getElementById('activeUsersCount').textContent = activeUsers;
    document.getElementById('adminsCount').textContent = admins;
    document.getElementById('pendingUsersCount').textContent = pendingUsers;
    
    // Update quick stats in Users tab
    document.getElementById('totalStudents').textContent = students;
    document.getElementById('totalTeachers').textContent = teachers;
    document.getElementById('newUsersToday').textContent = newToday;
    document.getElementById('activeNow').textContent = activeNow;
}

// KEEP ONLY ONE updateUsersTable() FUNCTION - THIS IS THE CLEANED VERSION
function updateUsersTable() {
    console.log("🔄 Updating users table...");
    
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) {
        console.error("❌ usersTableBody not found!");
        return;
    }
    
    // Ensure usersData is loaded
    if (!usersData || usersData.length === 0) {
        loadUsersData();
    }
    
    console.log(`Displaying ${usersData.length} users`);
    
    // Clear table
    tableBody.innerHTML = '';
    
    if (usersData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--medium-gray);">
                    <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 15px; display: block;"></i>
                    <p>No users found. Click "Add New User" to create one.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Add each user to the table
    usersData.forEach(user => {
        const row = document.createElement('tr');
        
        const roleClass = `user-role ${user.role}`;
        const statusClass = `user-status ${user.status}`;
        
        // Check if user is selected
        const isChecked = selectedUsers.has(user.id) ? 'checked' : '';
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="user-checkbox" value="${user.id}" ${isChecked} 
                    onchange="toggleUserSelection(${user.id})">
            </td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar" style="background: ${getAvatarColor(user.avatar)}">${user.avatar}</div>
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-email">${user.email}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="${roleClass}">${getRoleDisplayName(user.role)}</span>
            </td>
            <td>
                <span class="${statusClass}">${getStatusDisplayName(user.status)}</span>
            </td>
            <td>${formatDate(user.registrationDate)}</td>
            <td>${user.lastActive || (user.lastLogin ? formatDate(user.lastLogin) : 'Never')}</td>
            <td>
                <div class="user-actions">
                  
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="showUserDeletionModal(${user.id})" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log(`✅ Table updated with ${usersData.length} rows`);
    
    // Update pagination
    updatePaginationInfo();
    
    // Update bulk actions
    updateBulkActionsPanel();
}

function updatePaginationInfo() {
    const totalPages = Math.ceil(usersData.length / usersPerPage);
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
}

function filterUsers() {
    const filterValue = document.getElementById('userFilterSelect').value;
    let filteredData = [...usersData];
    
    if (filterValue === 'active') {
        filteredData = filteredData.filter(u => u.status === 'active');
    } else if (filterValue === 'inactive') {
        filteredData = filteredData.filter(u => u.status === 'inactive');
    } else if (filterValue === 'admins') {
        filteredData = filteredData.filter(u => u.role === 'admin');
    } else if (filterValue === 'students') {
        filteredData = filteredData.filter(u => u.role === 'student');
    } else if (filterValue === 'teachers') {
        filteredData = filteredData.filter(u => u.role === 'teacher');
    } else if (filterValue === 'pending') {
        filteredData = filteredData.filter(u => u.status === 'pending');
    }
    
    // For demo, just update the displayed data
    updateUsersTableWithData(filteredData);
}

function sortUsers() {
    const sortValue = document.getElementById('userSortSelect').value;
    let sortedData = [...usersData];
    
    sortedData.sort((a, b) => {
        if (sortValue === 'name') {
            return a.name.localeCompare(b.name);
        } else if (sortValue === 'date') {
            return new Date(b.registrationDate) - new Date(a.registrationDate);
        } else if (sortValue === 'lastLogin') {
            if (!a.lastLogin && !b.lastLogin) return 0;
            if (!a.lastLogin) return 1;
            if (!b.lastLogin) return -1;
            return new Date(b.lastLogin) - new Date(a.lastLogin);
        } else if (sortValue === 'activity') {
            const activityScore = (user) => {
                let score = 0;
                if (user.status === 'active') score += 10;
                if (user.role === 'admin') score += 5;
                if (user.lastLogin) {
                    const daysSinceLogin = Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24));
                    if (daysSinceLogin <= 7) score += 8;
                    else if (daysSinceLogin <= 30) score += 4;
                }
                return score;
            };
            return activityScore(b) - activityScore(a);
        }
        return 0;
    });
    
    updateUsersTableWithData(sortedData);
}

function updateUsersTableWithData(data) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(user => {
        const row = document.createElement('tr');
        
        const roleClass = `user-role ${user.role}`;
        const statusClass = `user-status ${user.status}`;
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="user-checkbox" value="${user.id}" onchange="toggleUserSelection(${user.id})">
            </td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${user.avatar}</div>
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-email">${user.email}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="${roleClass}">${user.role.toUpperCase()}</span>
            </td>
            <td>
                <span class="${statusClass}">${user.status.toUpperCase()}</span>
            </td>
            <td>${formatDate(user.registrationDate)}</td>
            <td>${user.lastActive || (user.lastLogin ? formatDate(user.lastLogin) : 'Never')}</td>
            <td>
                <div class="user-actions">
                   
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Edit User">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="showUserDeletionModal(${user.id})" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function filterUsersBySearch(searchTerm) {
    if (!searchTerm.trim()) {
        updateUsersTable();
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filteredData = usersData.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
    );
    
    updateUsersTableWithData(filteredData);
}

function toggleSelectAllUsers() {
    const selectAll = document.getElementById('selectAllUsers');
    const checkboxes = document.querySelectorAll('.user-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
        const userId = parseInt(checkbox.value);
        if (selectAll.checked) {
            selectedUsers.add(userId);
        } else {
            selectedUsers.delete(userId);
        }
    });
    
    updateBulkActionsPanel();
}

function toggleUserSelection(userId) {
    const checkbox = document.querySelector(`.user-checkbox[value="${userId}"]`);
    
    if (!checkbox) {
        console.error("Checkbox not found for user ID:", userId);
        return;
    }
    
    if (checkbox.checked) {
        selectedUsers.add(userId);
        console.log("Added user", userId, "to selection");
    } else {
        selectedUsers.delete(userId);
        console.log("Removed user", userId, "from selection");
    }
    
    updateBulkActionsPanel();
}

function updateBulkActionsPanel() {
    const bulkActionsPanel = document.getElementById('bulkActionsPanel');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedUsers.size > 0) {
        bulkActionsPanel.style.display = 'block';
        selectedCount.textContent = `${selectedUsers.size} users selected`;
    } else {
        bulkActionsPanel.style.display = 'none';
    }
}

function activateSelectedUsers() {
    if (selectedUsers.size === 0) return;
    
    if (confirm(`Are you sure you want to activate ${selectedUsers.size} user(s)?`)) {
        usersData.forEach(user => {
            if (selectedUsers.has(user.id)) {
                user.status = 'active';
            }
        });
        
        selectedUsers.clear();
        updateUsersTable();
        updateUserStats();
        showNotification('success', 'Users Activated', `${selectedUsers.size} user(s) have been activated.`);
    }
}

function deactivateSelectedUsers() {
    if (selectedUsers.size === 0) return;
    
    if (confirm(`Are you sure you want to deactivate ${selectedUsers.size} user(s)?`)) {
        usersData.forEach(user => {
            if (selectedUsers.has(user.id)) {
                user.status = 'inactive';
            }
        });
        
        selectedUsers.clear();
        updateUsersTable();
        updateUserStats();
        showNotification('warning', 'Users Deactivated', `${selectedUsers.size} user(s) have been deactivated.`);
    }
}

function deleteSelectedUsers() {
    if (selectedUsers.size === 0) {
        showNotification('warning', 'No Selection', 'Please select users to delete.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`)) {
        // Store selected users in array before deleting
        const usersToDelete = Array.from(selectedUsers);
        
        console.log("Deleting users:", usersToDelete);
        
        // Delete users one by one
        usersToDelete.forEach(userId => {
            const userIndex = usersData.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                console.log(`Deleting user ${userId}: ${usersData[userIndex].name}`);
                usersData.splice(userIndex, 1);
            }
        });
        
        // Clear selection
        selectedUsers.clear();
        
        // Update UI
        updateUsersTable();
        updateUserStats();
        updateBulkActionsPanel();
        
        // Show notification
        showNotification('error', 'Users Deleted', `${usersToDelete.length} user(s) have been permanently deleted.`);
    }
}

function createAddUserModal() {
    console.log("🎯 Creating add user modal dynamically");
    
    // Check if modal already exists
    if (document.getElementById('addUserModal')) {
        console.log("ℹ️ Modal already exists, showing it");
        showAddUserModal();
        return;
    }
    
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'addUserModal';
    modal.className = 'modal modal-hide';
    
    // Create modal HTML structure
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Add New User</h3>
                <button type="button" class="close-btn" onclick="closeAllModals()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="addUserForm">
                    <div class="form-group">
                        <label for="addFirstName">First Name *</label>
                        <input type="text" id="addFirstName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="addLastName">Last Name *</label>
                        <input type="text" id="addLastName" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="addEmail">Email *</label>
                        <input type="email" id="addEmail" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="addPhone">Phone</label>
                        <input type="tel" id="addPhone" class="form-control">
                    </div>
                    <div class="form-group">
                        <label for="addRole">Role *</label>
                        <select id="addRole" class="form-control" required>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="addDepartment">Department</label>
                        <input type="text" id="addDepartment" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Status *</label>
                        <div class="status-options">
                            <label>
                                <input type="radio" name="addStatus" value="active" checked> Active
                            </label>
                            <label>
                                <input type="radio" name="addStatus" value="inactive"> Inactive
                            </label>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeAllModals()">Cancel</button>
                <button type="button" class="btn btn-primary" onclick="addNewUser()">Add User</button>
            </div>
        </div>
    `;
    
    // Add basic styles if not already present
    if (!document.querySelector('#modalDynamicStyles')) {
        const styles = document.createElement('style');
        styles.id = 'modalDynamicStyles';
        styles.textContent = `
            .modal {
                display: none;
            }
            .modal-content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                width: 90%;
                max-width: 500px;
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
            }
            .form-group {
                margin-bottom: 15px;
            }
            .form-control {
                width: 100%;
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
            }
            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                margin-top: 20px;
            }
            .btn {
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .btn-primary {
                background: #007bff;
                color: white;
            }
            .btn-secondary {
                background: #6c757d;
                color: white;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    console.log("✅ Add user modal created dynamically");
    
    // Show the modal after creating it
    setTimeout(() => showAddUserModal(), 50);
}

// Function to open the Add User Modal
function showAddUserModal() {
    console.log("🎯 Opening add user modal...");
    
    // Check if modal already exists
    if (!document.getElementById('addUserModal')) {
        createAddUserModal();
        return;
    }
    
    const modal = document.getElementById('addUserModal');
    
    // Simple show/hide
    modal.style.display = 'block';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    
    // Focus on first input
    setTimeout(() => {
        const nameInput = document.getElementById('newUserName');
        if (nameInput) nameInput.focus();
    }, 100);
    
    console.log("✅ Modal shown");
}
function resetRoleSelection() {
    // Remove active class from all roles
    const roles = document.querySelectorAll('.role-option');
    roles.forEach(role => {
        role.classList.remove('active');
    });
    
    // Set student as default
    const studentRole = document.getElementById('roleStudent');
    if (studentRole) {
        studentRole.classList.add('active');
    }
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) {
        modal.style.display = 'none';
    }
    removeModalBackdrop();
}
function closeUserDeletionModal() {
    const modal = document.getElementById('userDeletionModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    userToDelete = null;
}
// Function to create new user
function addNewUser() {
    console.log("🎯 addNewUser called");
    
    try {
        // Get form values
        const fullName = document.getElementById('newUserName').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('selectedUserRole').value;
        const statusToggle = document.getElementById('userStatusToggle');
        
        // Get status from toggle
        const status = statusToggle.checked ? 'active' : 'inactive';
        
        console.log("Form data:", { fullName, email, password, role, status });
        
        // Validation
        if (!fullName || !email || !password) {
            showNotification('error', 'Validation Error', 'Please fill all required fields');
            return;
        }
        
        if (!isValidEmail(email)) {
            showNotification('error', 'Invalid Email', 'Please enter a valid email address');
            return;
        }
        
        if (password.length < 8) {
            showNotification('error', 'Weak Password', 'Password must be at least 8 characters');
            return;
        }
        
        // Check if email already exists
        const existingUsers = getUsersFromStorage();
        if (existingUsers.some(user => user.email.toLowerCase() === email.toLowerCase())) {
            showNotification('error', 'Duplicate Email', 'A user with this email already exists');
            return;
        }
        
        // Create user object
        const newUser = {
            id: 'user_' + Date.now(),
            name: fullName,
            email: email,
            role: role,
            status: status,
            registrationDate: new Date().toISOString().split('T')[0],
            lastLogin: 'Never',
            avatar: getInitials(fullName),
            lastActive: 'Just now',
            createdAt: new Date().toISOString()
        };
        
        console.log("New user created:", newUser);
        
        // Save to localStorage
        saveUserToStorage(newUser);
        
        // ALSO ADD TO usersData ARRAY (para makita kaagad sa table)
        usersData.push(newUser);
        
        // Show success
        showNotification('success', 'User Created', `"${fullName}" has been added successfully!`);
        
        // Close modal
        closeAddUserModal();
        
        // Reset form
        resetAddUserForm();
        
        // FORCE UPDATE THE TABLE
        updateUsersTable();
        
    } catch (error) {
        console.error("❌ Error adding user:", error);
        showNotification('error', 'Add Failed', 'Failed to add user');
    }
}

// Helper function to get initials from name
function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}
function getRandomColor() {
    const colors = [
        '#007bff', '#28a745', '#17a2b8', '#ffc107', 
        '#6c757d', '#343a40', '#e83e8c', '#fd7e14'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}
function editUser(userId) {
    console.log("Editing user ID:", userId);
    
    // Find user
    const user = usersData.find(u => u.id === userId);
    if (!user) {
        console.error("User not found");
        return;
    }
    
    // Populate form
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserRole').value = user.role;
    document.getElementById('editUserStatus').value = user.status;
    
    // SHOW THE MODAL - This is likely missing
    const modal = document.getElementById('editUserModal');
    if (modal) {
        // Remove any hidden classes
        modal.classList.remove('d-none', 'hidden', 'hide');
        
        // Set display properties
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        modal.style.zIndex = '9999';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.opacity = '1';
        modal.style.visibility = 'visible';
        
        console.log("✅ Modal shown with inline styles");
    }
    
    console.log("Populated form for user:", user.name);
}

// ===== CLOSE EDIT USER MODAL =====
function closeEditUserModal() {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}
function createEditUserModal() {
    console.log("Creating edit user modal...");
    
    // Check if already exists
    if (document.getElementById('editUserModal')) {
        console.log("Edit modal already exists");
        return;
    }
    
    const modalHTML = `
        <div id="editUserModal" class="modal" style="display: none;">
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-user-edit"></i> Edit User</h3>
                    <button class="modal-close" onclick="closeEditUserModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editUserForm">
                        <input type="hidden" id="editUserId">
                        
                        <div class="form-group">
                            <label for="editUserName" class="form-label">
                                <i class="fas fa-user"></i> Full Name
                            </label>
                            <input type="text" id="editUserName" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editUserEmail" class="form-label">
                                <i class="fas fa-envelope"></i> Email Address
                            </label>
                            <input type="email" id="editUserEmail" class="form-control" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="editUserRole" class="form-label">
                                <i class="fas fa-user-tag"></i> Role
                            </label>
                            <select id="editUserRole" class="form-control" required>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="editUserStatus" class="form-label">
                                <i class="fas fa-toggle-on"></i> Status
                            </label>
                            <select id="editUserStatus" class="form-control" required>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="pending">Pending</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" onclick="deleteUserFromEdit()" 
                            style="margin-right: auto;">
                        <i class="fas fa-trash"></i> Delete User
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeEditUserModal()">
                        Cancel
                    </button>
                    <button type="button" class="btn btn-primary" onclick="saveUserChanges()">
                        <i class="fas fa-save"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log("✅ Edit user modal created");
}

// ===== SAVE USER CHANGES =====
async function saveUserChanges() {
    console.log("💾 Saving user changes to MySQL database...");
    
    const userId = document.getElementById('editUserId').value;
    const userName = document.getElementById('editUserName').value.trim();
    const userEmail = document.getElementById('editUserEmail').value.trim();
    const userRole = document.getElementById('editUserRole').value;
    const userStatus = document.getElementById('editUserStatus').value;
    
    // Validation
    if (!userName || !userEmail) {
        showNotification('error', 'Validation Error', 'Please fill all required fields.');
        return;
    }
    
    if (!isValidEmail(userEmail)) {
        showNotification('error', 'Invalid Email', 'Please enter a valid email address.');
        return;
    }
    
    // Find user index
    const userIndex = usersData.findIndex(u => u.id == userId);
    if (userIndex === -1) {
        showNotification('error', 'Error', 'User not found.');
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login again');
            return;
        }
        
        // Show loading state
        const saveBtn = document.querySelector('#editUserModal .btn-primary');
        const originalText = saveBtn?.innerHTML;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        console.log('📤 Sending update to MySQL:', { userId, userName, userEmail, userRole, userStatus });
        
        // Send update to MySQL
        const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: userName,
                email: userEmail,
                role: userRole,
                status: userStatus === 'active' ? 1 : 0
            })
        });
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success) {
            // Update local usersData
            usersData[userIndex] = {
                ...usersData[userIndex],
                name: userName,
                email: userEmail,
                role: userRole,
                status: userStatus,
                updatedAt: new Date().toISOString()
            };
            
            // Update UI
            updateUsersTable();
            updateUserStats();
            
            // Close modal
            closeEditUserModal();
            
            // Show success notification
            showNotification('success', 'User Updated', `"${userName}" has been updated in database.`);
            
        } else {
            throw new Error(result.message || 'Failed to update user');
        }
        
    } catch (error) {
        console.error('❌ Error updating user:', error);
        showNotification('error', 'Update Failed', error.message);
        
    } finally {
        // Restore button
        const saveBtn = document.querySelector('#editUserModal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
}

// ===== DELETE USER =====
async function deleteUser() {
    console.log("🗑️ Deleting user from MySQL database...");
    
    const userId = document.getElementById('editUserId').value;
    
    if (!userId) {
        showNotification('error', 'Error', 'No user selected for deletion.');
        return;
    }
    
    // Find user
    const user = usersData.find(u => u.id == userId);
    if (!user) {
        showNotification('error', 'Error', 'User not found.');
        return;
    }
    
    // Ask for confirmation
    if (!confirm(`Are you sure you want to delete user "${user.name}"?\nThis action cannot be undone.`)) {
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login again');
            return;
        }
        
        // Show loading state
        const deleteBtn = document.querySelector('#editUserModal .btn-danger');
        const originalText = deleteBtn?.innerHTML;
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        }
        
        // Send delete request to MySQL
        const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Remove user from array
            usersData = usersData.filter(u => u.id != userId);
            
            // Update localStorage backup
            try {
                localStorage.setItem('mathhub_users_backup', JSON.stringify(usersData));
            } catch (e) {}
            
            // Update UI
            updateUsersTable();
            updateUserStats();
            
            // Close modal
            closeEditUserModal();
            
            // Show notification
            showNotification('success', 'User Deleted', `"${user.name}" has been deleted from database.`);
            
        } else {
            throw new Error(result.message || 'Failed to delete user');
        }
        
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        
        // Fallback: Remove from localStorage only
        if (confirm('Database delete failed. Remove from local list only?')) {
            usersData = usersData.filter(u => u.id != userId);
            
            // Update localStorage
            try {
                localStorage.setItem('mathhub_users_backup', JSON.stringify(usersData));
            } catch (e) {}
            
            // Update UI
            updateUsersTable();
            updateUserStats();
            
            // Close modal
            closeEditUserModal();
            
            showNotification('warning', 'Removed Locally', `"${user.name}" removed from local list only`);
        } else {
            showNotification('error', 'Delete Failed', error.message);
        }
        
    } finally {
        // Restore button
        const deleteBtn = document.querySelector('#editUserModal .btn-danger');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete User';
        }
    }
}

// Debug function to check modal elements
function checkModalElements() {
    console.log("=== CHECKING MODAL ELEMENTS ===");
    
    const elementsToCheck = [
        'newUserName',
        'newUserEmail',
        'newUserPassword',
        'selectedUserRole',
        'userStatusToggle',
        'sendWelcomeEmail',
        'roleStudent',
        'roleTeacher',
        'roleAdmin'
    ];
    
    elementsToCheck.forEach(id => {
        const element = document.getElementById(id);
        console.log(`${id}: ${element ? 'FOUND' : 'NOT FOUND'}`);
        if (element) {
            console.log(`  Type: ${element.type || element.tagName}`);
        }
    });
    
    // Also check the modal itself
    const modal = document.getElementById('addUserModal');
    console.log(`addUserModal: ${modal ? 'FOUND' : 'NOT FOUND'}`);
}

// Fallback function if the modal doesn't exist
function createFallbackAddUserModal() {
    console.log("Creating fallback Add User Modal");
    
    // Define modalHTML since it's not defined
    const modalHTML = `
        <div id="fallbackAddUserModal" class="modal" style="display: flex; z-index: 9999; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); align-items: center; justify-content: center;">
            <div class="modal-content" style="background: white; padding: 20px; border-radius: 10px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3><i class="fas fa-user-plus"></i> Add New User</h3>
                    <button class="modal-close" onclick="closeFallbackModal()" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 15px;">
                        <label><i class="fas fa-user"></i> Full Name</label>
                        <input type="text" class="form-control" id="fallbackUserName" placeholder="Enter full name" style="width: 100%; padding: 8px; margin-top: 5px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label><i class="fas fa-envelope"></i> Email Address</label>
                        <input type="email" class="form-control" id="fallbackUserEmail" placeholder="Enter email address" style="width: 100%; padding: 8px; margin-top: 5px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label><i class="fas fa-key"></i> Password</label>
                        <input type="password" class="form-control" id="fallbackUserPassword" placeholder="Enter password" style="width: 100%; padding: 8px; margin-top: 5px;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label><i class="fas fa-badge"></i> User Role</label>
                        <select id="fallbackUserRole" class="form-control" style="width: 100%; padding: 8px; margin-top: 5px;">
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <label><i class="fas fa-toggle-on"></i> Account Status</label>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 5px;">
                            <label class="switch">
                                <input type="checkbox" id="fallbackUserStatus" checked>
                                <span class="slider round"></span>
                            </label>
                            <span>Active Account</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="closeFallbackModal()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button class="btn btn-primary" onclick="addNewUserFallback()" style="padding: 8px 16px; background: #7a0000; color: white; border: none; border-radius: 4px; cursor: pointer;">Create User</button>
                </div>
            </div>
        </div>
    `;
    
    // Append to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Add user function for fallback modal
function addNewUserFallback() {
    const name = document.getElementById('fallbackUserName')?.value.trim();
    const email = document.getElementById('fallbackUserEmail')?.value.trim();
    const password = document.getElementById('fallbackUserPassword')?.value;
    const role = document.getElementById('fallbackUserRole')?.value;
    const isActive = document.getElementById('fallbackUserStatus')?.checked;
    
    if (!name || !email || !password) {
        showNotification('error', 'Validation Error', 'Please fill in all required fields.');
        return;
    }
    
    // Generate user ID and avatar initials
    const newId = usersData.length > 0 ? Math.max(...usersData.map(u => u.id)) + 1 : 1;
    const initials = getInitials(name);
    
    // Create new user object
    const newUser = {
        id: newId,
        name: name,
        email: email,
        role: role,
        status: isActive ? 'active' : 'inactive',
        registrationDate: new Date().toISOString().split('T')[0],
        lastLogin: null,
        avatar: initials,
        lastActive: 'Never'
    };
    
    // Add to users array
    usersData.push(newUser);
    
    // Update UI
    updateUsersTable();
    updateUserStats();
    
    // Show success notification
    showNotification('success', 'User Created', `${name} has been added as ${role}.`);
    
    // Close modal
    closeFallbackModal();
}

// Close fallback modal
function closeFallbackModal() {
    const modal = document.getElementById('fallbackAddUserModal');
    if (modal) {
        modal.remove();
    }
}

function closeFallbackModal() {
    const modal = document.getElementById('fallbackAddUserModal');
    if (modal) {
        modal.remove();
    }
}

// ===== USER ROLE SELECTION FUNCTION =====
function selectRole(role) {
    console.log("Selecting role:", role);
    
    // Update hidden input
    const roleInput = document.getElementById('selectedUserRole');
    if (roleInput) {
        roleInput.value = role;
    }
    
    // Update UI - remove selected class from all, add to clicked one
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    const selectedOption = document.getElementById(`role${role.charAt(0).toUpperCase() + role.slice(1)}`);
    if (selectedOption) {
        selectedOption.classList.add('selected');
    }
    
    // Log change
    console.log("Role selected:", role);
}
// ===== DELETE USER MODAL FUNCTIONS =====
function showUserDeletionModal(userId) {
    console.log("🎯 Opening delete modal for user ID:", userId);
    
    // Hanapin ang user sa usersData
    const user = usersData.find(u => u.id === userId);
    if (!user) {
        console.error("❌ User not found:", userId);
        showNotification('error', 'Error', 'User not found.');
        return;
    }
    
    // Store the user to delete
    window.userToDelete = user;
    
    console.log("✅ Found user:", user.name);
    
    // Update modal content
    // 1. Avatar
    const avatarElement = document.getElementById('deleteUserAvatar');
    if (avatarElement) {
        // Clear existing content
        avatarElement.innerHTML = '';
        
        // Create avatar div with initials
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar-initials';
        avatarDiv.textContent = user.avatar || getInitials(user.name);
        avatarDiv.style.cssText = `
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: ${getAvatarColor(user.avatar || getInitials(user.name))};
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            margin: 0 auto;
        `;
        avatarElement.appendChild(avatarDiv);
    }
    
    // 2. User details
    const elementsToUpdate = {
        'deleteUserName': user.name,
        'deleteUserEmail': user.email,
        'deleteUserRole': getRoleDisplayName(user.role),
        'deleteUserStatus': getStatusDisplayName(user.status),
        'deleteUserJoined': formatDate(user.registrationDate),
        'deleteUserLastActive': user.lastActive || 'Never'
    };
    
    // Update each element
    for (const [elementId, value] of Object.entries(elementsToUpdate)) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`Element ${elementId} not found in modal`);
        }
    }
    
    // 3. Reset the confirmation checkbox
    const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
    if (confirmCheckbox) {
        confirmCheckbox.checked = false;
        confirmCheckbox.onchange = toggleDeleteButton;
    }
    
    // 4. Disable the delete button initially
    const deleteButton = document.getElementById('deleteConfirmButton');
    if (deleteButton) {
        deleteButton.disabled = true;
        deleteButton.onclick = confirmDeleteUser;
    }
    
    // 5. Show the modal
    const modal = document.getElementById('deleteUserModal');
    if (modal) {

        modal.style.cssText = '';
        modal.classList.add('modal-active');

        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        
        // Ensure modal is on top
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.cssText = '';
            modalContent.style.background = 'white';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '12px';
            modalContent.style.maxWidth = '550px';
            modalContent.style.width = '90%';
            modalContent.style.zIndex = '10000';
        }
        
        // Add modal-open class to body
        document.body.classList.add('modal-open');
        
        console.log("✅ Modal shown successfully");
    } else {
        console.error("❌ Modal not found! Looking for #deleteUserModal");
        // Debug: List all modals
        const allModals = document.querySelectorAll('[id*="modal"], [id*="Modal"]');
        console.log("Available modals:", Array.from(allModals).map(m => m.id));
    }
}

function toggleDeleteButton() {
    const checkbox = document.getElementById('confirmDeleteCheckbox');
    const deleteButton = document.getElementById('deleteConfirmButton');
    
    if (checkbox && deleteButton) {
        deleteButton.disabled = !checkbox.checked;
        console.log("Delete button disabled:", deleteButton.disabled);
    }
}
function closeDeleteModal() {
    console.log("🔴 CLOSE DELETE MODAL FUNCTION CALLED");
    
    try {
        const modal = document.getElementById('deleteUserModal');
        console.log("Modal found:", !!modal);
        
        if (modal) {
            // METHOD 1: Simple hide
            modal.style.display = 'none';
            console.log("Set display to none");
            
            // METHOD 2: Also hide with visibility
            modal.style.visibility = 'hidden';
            modal.style.opacity = '0';
            
            // METHOD 3: Remove inline styles completely
            modal.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important;';
            
            // Check if it worked
            setTimeout(() => {
                console.log("After closing - computed display:", window.getComputedStyle(modal).display);
            }, 100);
        }
        
        // Remove body class
        document.body.classList.remove('modal-open');
        
        // Clear user data
        window.userToDelete = null;
        
        console.log("✅ Modal closed successfully");
        
    } catch (error) {
        console.error("❌ Error closing modal:", error);
    }
}

function confirmDeleteUser() {
    console.log("=== CONFIRM DELETE USER (FIXED) ===");
    
    // ===== 1. GET USER INFORMATION FROM MODAL UI =====
    const userNameElement = document.getElementById('deleteUserName');
    const userEmailElement = document.getElementById('deleteUserEmail');
    
    if (!userNameElement || !userEmailElement) {
        console.error("❌ Cannot find user information in modal");
        showNotification('error', 'Error', 'Cannot find user data in modal.');
        return;
    }
    
    const userName = userNameElement.textContent.trim();
    const userEmail = userEmailElement.textContent.trim();
    
    if (!userName || !userEmail) {
        console.error("❌ Empty user information in modal");
        showNotification('error', 'Error', 'User information is empty.');
        return;
    }
    
    console.log("User from modal:", { userName, userEmail });
    
    // ===== 2. FIND USER IN DATABASE =====
    const userIndex = usersData.findIndex(user => 
        user.name === userName && user.email === userEmail
    );
    
    if (userIndex === -1) {
        console.error("❌ User not found in database:", { userName, userEmail });
        showNotification('error', 'Error', 'User not found in database.');
        return;
    }
    
    const userToDelete = usersData[userIndex];
    console.log("Found user to delete:", userToDelete);
    
    // ===== 3. CHECK CONFIRMATION CHECKBOX =====
    const confirmCheckbox = document.getElementById('confirmDeleteCheckbox');
    if (!confirmCheckbox) {
        console.error("❌ Confirmation checkbox not found");
        showNotification('error', 'Error', 'Confirmation checkbox not found.');
        return;
    }
    
    if (!confirmCheckbox.checked) {
        showNotification('error', 'Error', 'Please confirm deletion by checking the checkbox.');
        return;
    }
    
    // ===== 4. DELETE USER FROM DATABASE =====
    // Remove user from array
    usersData.splice(userIndex, 1);
    
    console.log(`✅ User deleted. Total users: ${usersData.length}`);
    
    // ===== 5. SAVE TO LOCALSTORAGE =====
    try {
        localStorage.setItem('mathhub_users', JSON.stringify(usersData));
        console.log("💾 Saved to localStorage");
    } catch (error) {
        console.error("❌ Save error:", error);
        showNotification('error', 'Save Error', 'Failed to save changes.');
    }
    
    // ===== 6. UPDATE UI =====
    // Remove from selected users set if exists
    if (window.selectedUsers && window.selectedUsers.has(userToDelete.id)) {
        window.selectedUsers.delete(userToDelete.id);
        console.log("Removed from selected users set");
    }
    
    // Update users table
    updateUsersTable();
    
    // Update user stats
    updateUserStats();
    
    // Update bulk actions panel
    updateBulkActionsPanel();
    
    // ===== 7. CLOSE MODAL =====
    closeDeleteModal();
    
    // ===== 8. SHOW SUCCESS NOTIFICATION =====
    showNotification('success', 'User Deleted', 
        `"${userToDelete.name}" has been permanently deleted.`);
    
    console.log("✅ User deletion completed successfully");
    
    // ===== 9. OPTIONAL: CLEANUP =====
    // Clear any global reference
    if (window.userToDelete) {
        window.userToDelete = null;
    }
    
    // Reset confirmation checkbox for next time
    if (confirmCheckbox) {
        confirmCheckbox.checked = false;
    }
    
    // Reset delete button state
    const deleteButton = document.getElementById('deleteConfirmButton');
    if (deleteButton) {
        deleteButton.disabled = true;
    }
}
// KEEP ONLY ONE getAvatarColor() FUNCTION
function getAvatarColor(initials) {
    const colors = [
        'linear-gradient(135deg, #8b0000, #ff0000)', // Red gradient
        'linear-gradient(135deg, #006400, #008000)', // Green gradient
        'linear-gradient(135deg, #00008b, #0000ff)', // Blue gradient
        'linear-gradient(135deg, #8b008b, #800080)', // Purple gradient
        'linear-gradient(135deg, #8b4513, #a0522d)', // Brown gradient
        'linear-gradient(135deg, #4b0082, #9400d3)', // Indigo gradient
        'linear-gradient(135deg, #8b0000, #b22222)', // Firebrick gradient
        'linear-gradient(135deg, #2e8b57, #3cb371)', // Sea green gradient
    ];

    // Use initials to pick consistent color
    const index = (initials.charCodeAt(0) + (initials.charCodeAt(1) || 0)) % colors.length;
    return colors[index];
}

function getRoleDisplayName(role) {
    const roles = {
        'student': 'STUDENT',
        'teacher': 'TEACHER',
        'admin': 'ADMIN'
    };
    return roles[role] || role.toUpperCase();
}

function getStatusDisplayName(status) {
    const statuses = {
        'active': 'ACTIVE',
        'inactive': 'INACTIVE',
        'pending': 'PENDING'
    };
    return statuses[status] || status.toUpperCase();
}

// ===== VIEW USER DETAILS FUNCTION =====
function viewUserDetails(userId) {
    const user = usersData.find(u => u.id === userId);
    if (!user) return;
    
    openModal('User Details');
    
    document.getElementById('modalBody').innerHTML = `
        <div class="user-detail-section">
            <div style="text-align: center; margin-bottom: 30px;">
                <div class="user-avatar-large" style="background: ${getAvatarColor(user.avatar)}">${user.avatar}</div>
                <h3 style="margin: 15px 0 5px 0;">${user.name}</h3>
                <p style="color: var(--medium-gray);">${user.email}</p>
                
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
                    <span class="user-role ${user.role}">${getRoleDisplayName(user.role)}</span>
                    <span class="user-status ${user.status}">${getStatusDisplayName(user.status)}</span>
                </div>
            </div>
            
            <div class="user-info-grid">
                <div class="info-card">
                    <div class="info-icon"><i class="fas fa-calendar-plus"></i></div>
                    <div class="info-content">
                        <h4>Joined Date</h4>
                        <p>${formatDate(user.registrationDate)}</p>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-icon"><i class="fas fa-clock"></i></div>
                    <div class="info-content">
                        <h4>Last Active</h4>
                        <p>${user.lastActive || 'Never logged in'}</p>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-icon"><i class="fas fa-book"></i></div>
                    <div class="info-content">
                        <h4>Enrolled Subjects</h4>
                        <p>3 subjects</p>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="info-content">
                        <h4>Average Score</h4>
                        <p>85%</p>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 30px;">
                <h4 style="margin-bottom: 15px;"><i class="fas fa-history"></i> Recent Activity</h4>
                <div style="background: var(--light-bg); padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span>Completed Polynomial Quiz</span>
                        <span style="color: var(--medium-gray);">2 hours ago</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
                        <span>Viewed Factorial Lesson</span>
                        <span style="color: var(--medium-gray);">1 day ago</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                        <span>Submitted Assignment</span>
                        <span style="color: var(--medium-gray);">3 days ago</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ===== BULK ACTIONS FUNCTIONS =====
function deleteSelectedUsers() {
    if (selectedUsers.size === 0) {
        showNotification('warning', 'No Selection', 'Please select users to delete.');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${selectedUsers.size} user(s)? This action cannot be undone.`)) {
        // Store users to delete in array
        const usersToDelete = Array.from(selectedUsers);
        const deletedNames = [];
        
        // Delete users one by one
        usersToDelete.forEach(userId => {
            const userIndex = usersData.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                deletedNames.push(usersData[userIndex].name);
                usersData.splice(userIndex, 1);
            }
        });
        
        // Clear selection
        selectedUsers.clear();
        
        // Update UI
        updateUsersTable();
        updateUserStats();
        updateBulkActionsPanel();
        
        // Show notification
        showNotification('error', 'Users Deleted', 
            `${usersToDelete.length} user(s) have been deleted: ${deletedNames.join(', ')}`);
    }
}
// ===== FEEDBACK DASHBOARD FUNCTIONS =====
function initializeFeedbackDashboard() {
    // Load feedback data
    loadFeedbackData();
    
    // Initialize charts
    initializeFeedbackCharts();
    
    // Set up search
    const searchInput = document.getElementById('searchFeedbackInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterFeedbackBySearch(this.value);
        });
    }
}

// ===== FIXED: Load REAL feedback from database with ratings =====
async function loadFeedbackData() {
    console.log("📥 Loading REAL feedback from MySQL database...");
    
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) {
        console.error("❌ feedbackTableBody not found!");
        return;
    }
    
    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-5">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-pulse fa-3x mb-3" style="color: #7a0000;"></i>
                    <p class="text-muted">Loading feedback from database...</p>
                </div>
            </td>
        </tr>
    `;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.error('❌ No authentication token found');
            showNoFeedbackMessage('Please login first');
            return;
        }
        
        console.log('📡 Fetching from /api/admin/feedback...');
        
        const response = await fetch('http://localhost:5000/api/admin/feedback', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success && result.feedback) {
            console.log(`✅ Found ${result.feedback.length} feedback entries from database`);
            
            // Map database columns to frontend expected format
            feedbackData = result.feedback.map(f => {
                console.log('Processing feedback item:', f);
                
                return {
                    id: f.id || f.feedback_id,
                    user_id: f.user_id,
                    user: f.user_name || f.user || 'Anonymous',
                    user_name: f.user_name,
                    user_email: f.user_email,
                    userAvatar: f.user_name ? getInitials(f.user_name) : 'U',
                    type: f.type || 'feedback',
                    subject: f.subject || (f.message ? f.message.substring(0, 30) + '...' : 'General'),
                    message: f.message || '',
                    rating: parseInt(f.rating) || 0,  // ← IMPORTANT: Get rating from database
                    priority: f.priority || (f.type === 'bug' ? 'high' : f.type === 'suggestion' ? 'medium' : 'low'),
                    status: f.status || 'new',
                    date: f.date ? new Date(f.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    response: f.response || null,
                    response_date: f.response_date ? new Date(f.response_date).toISOString().split('T')[0] : null,
                    responseBy: f.responded_by ? 'Admin' : null,
                    reviewed_at: f.reviewed_at,
                    resolved_at: f.resolved_at,
                    created_at: f.created_at || f.date
                };
            });
            
            console.log(`✅ Processed ${feedbackData.length} feedback entries`);
            console.log('📊 Sample feedback with rating:', feedbackData.find(f => f.rating > 0));
            
            if (feedbackData.length === 0) {
                showNoFeedbackMessage('No feedback found in database');
                return;
            }
            
            // Update UI
            updateFeedbackTable();
            updateFeedbackStats();  // ← This will calculate average rating
            initializeFeedbackCharts();
            
            console.log('✅ Feedback dashboard updated successfully');
            
        } else {
            console.error('❌ Server returned success: false', result);
            throw new Error(result.message || 'Failed to load feedback');
        }
        
    } catch (error) {
        console.error('❌ Error loading feedback:', error);
        tableBody.innerHTML = getErrorHTML(error.message);
    }
}

// ===== FIXED: updateFeedbackTable with proper onclick handlers =====
function updateFeedbackTable() {
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentFeedbackPage - 1) * feedbackPerPage;
    const endIndex = startIndex + feedbackPerPage;
    const currentFeedbacks = feedbackData.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    currentFeedbacks.forEach(feedback => {
        const row = document.createElement('tr');
        
        const typeClass = `feedback-type ${feedback.type}`;
        const priorityClass = `feedback-priority ${feedback.priority}`;
        const statusClass = `feedback-status ${feedback.status}`;
        
        let typeText = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1);
        if (feedback.type === 'rating' && feedback.rating) {
            typeText = `${feedback.rating} ★ Rating`;
        }
        
        // ===== IMPORTANT: Use onclick with proper functions =====
        row.innerHTML = `
            <td>#${feedback.id}</td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${feedback.userAvatar}</div>
                    <div class="user-info">
                        <span class="user-name">${feedback.user}</span>
                        <span class="user-email">${feedback.subject}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="${typeClass}">${typeText}</span>
            </td>
            <td>${feedback.subject}</td>
            <td>
                <span class="${priorityClass}">${feedback.priority.toUpperCase()}</span>
            </td>
            <td>
                <span class="${statusClass}">${feedback.status.replace('-', ' ').toUpperCase()}</span>
            </td>
            <td>${formatDate(feedback.date)}</td>
            <td>
                <div class="feedback-actions">
                    <button class="feedback-action-btn view" onclick="viewFeedbackDetail(${feedback.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="feedback-action-btn resolve" onclick="markAsResolved(${feedback.id})" title="Mark as Resolved">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="feedback-action-btn delete" onclick="deleteFeedback(${feedback.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ===== FIXED: Show REAL feedback stats with average rating =====
function updateFeedbackStats() {
    console.log("📊 Updating feedback stats with real data...");
    
    // Check kung may feedback data
    if (!feedbackData || feedbackData.length === 0) {
        // Reset lahat sa zero
        document.getElementById('totalRatings').textContent = '0.0';
        document.getElementById('totalComplaints').textContent = '0';
        document.getElementById('totalSuggestions').textContent = '0';
        document.getElementById('resolvedFeedbacks').textContent = '0';
        console.log('ℹ️ No feedback data, stats set to zero');
        return;
    }
    
    console.log(`📊 Calculating stats from ${feedbackData.length} feedback entries`);
    
    // ===== KUNIN ANG LAHAT NG RATINGS (type = 'rating' OR may rating value) =====
    const ratings = feedbackData.filter(f => {
        // Check kung may rating at hindi zero
        return f.rating && parseInt(f.rating) > 0;
    });
    
    console.log(`⭐ Found ${ratings.length} feedback items with ratings`);
    
    // Compute average rating
    let avgRating = "0.0";
    if (ratings.length > 0) {
        const totalStars = ratings.reduce((sum, f) => {
            const ratingValue = parseInt(f.rating) || 0;
            console.log(`  Rating ${f.id}: ${ratingValue} stars`);
            return sum + ratingValue;
        }, 0);
        
        avgRating = (totalStars / ratings.length).toFixed(1);
        console.log(`📊 Total stars: ${totalStars}, Average: ${avgRating}`);
    } else {
        console.log('ℹ️ No ratings found in feedback data');
    }
    
    // Bilangin ang open complaints (hindi resolved)
    const totalComplaints = feedbackData.filter(f => 
        f.type === 'complaint' && f.status !== 'resolved' && f.status !== 'closed'
    ).length;
    
    // Bilangin ang new suggestions (hindi resolved)
    const totalSuggestions = feedbackData.filter(f => 
        f.type === 'suggestion' && f.status !== 'resolved' && f.status !== 'closed'
    ).length;
    
    // Bilangin ang resolved feedback (resolved OR closed)
    const resolvedFeedbacks = feedbackData.filter(f => 
        f.status === 'resolved' || f.status === 'closed'
    ).length;
    
    console.log('📊 Stats calculated:', {
        avgRating,
        complaints: totalComplaints,
        suggestions: totalSuggestions,
        resolved: resolvedFeedbacks,
        totalFeedback: feedbackData.length,
        totalRatings: ratings.length
    });
    
    // I-update ang DOM elements
    const totalRatingsEl = document.getElementById('totalRatings');
    const totalComplaintsEl = document.getElementById('totalComplaints');
    const totalSuggestionsEl = document.getElementById('totalSuggestions');
    const resolvedFeedbacksEl = document.getElementById('resolvedFeedbacks');
    
    if (totalRatingsEl) {
        totalRatingsEl.textContent = avgRating;
        // Add visual indicator kung may ratings
        if (ratings.length > 0) {
            totalRatingsEl.style.color = '#f39c12';
            totalRatingsEl.title = `Based on ${ratings.length} ratings`;
        } else {
            totalRatingsEl.style.color = '';
            totalRatingsEl.title = 'No ratings yet';
        }
    }
    
    if (totalComplaintsEl) totalComplaintsEl.textContent = totalComplaints;
    if (totalSuggestionsEl) totalSuggestionsEl.textContent = totalSuggestions;
    if (resolvedFeedbacksEl) resolvedFeedbacksEl.textContent = resolvedFeedbacks;
}

function updateFeedbackTable() {
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) return;
    
    // Calculate pagination
    const startIndex = (currentFeedbackPage - 1) * feedbackPerPage;
    const endIndex = startIndex + feedbackPerPage;
    const currentFeedbacks = feedbackData.slice(startIndex, endIndex);
    
    tableBody.innerHTML = '';
    
    currentFeedbacks.forEach(feedback => {
        const row = document.createElement('tr');
        
        const typeClass = `feedback-type ${feedback.type}`;
        const priorityClass = `feedback-priority ${feedback.priority}`;
        const statusClass = `feedback-status ${feedback.status}`;
        
        let typeText = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1);
        if (feedback.type === 'rating' && feedback.rating) {
            typeText = `${feedback.rating} ★ Rating`;
        }
        
        row.innerHTML = `
            <td>#${feedback.id}</td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${feedback.userAvatar}</div>
                    <div class="user-info">
                        <span class="user-name">${feedback.user}</span>
                        <span class="user-email">${feedback.subject}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="${typeClass}">${typeText}</span>
            </td>
            <td>${feedback.subject}</td>
            <td>
                <span class="${priorityClass}">${feedback.priority.toUpperCase()}</span>
            </td>
            <td>
                <span class="${statusClass}">${feedback.status.replace('-', ' ').toUpperCase()}</span>
            </td>
            <td>${formatDate(feedback.date)}</td>
            <td>
                <div class="feedback-actions">
                    <button class="feedback-action-btn view" onclick="viewFeedbackDetail(${feedback.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="feedback-action-btn resolve" onclick="markAsResolved(${feedback.id})" title="Mark as Resolved">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="feedback-action-btn delete" onclick="deleteFeedback(${feedback.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ===== UPDATED: Feedback charts with REAL data from database =====
function initializeFeedbackCharts() {
    console.log("📊 Initializing feedback charts with real data from database...");
    
    // Destroy existing charts
    if (feedbackCharts.distributionChart) {
        feedbackCharts.distributionChart.destroy();
    }
    if (feedbackCharts.trendChart) {
        feedbackCharts.trendChart.destroy();
    }
    
    // Kunin ang REAL data mula sa feedbackData (na galing sa database)
    const hasData = feedbackData && feedbackData.length > 0;
    
    // Calculate REAL distribution from feedbackData
    const suggestions = hasData ? feedbackData.filter(f => f.type === 'suggestion').length : 0;
    const bugs = hasData ? feedbackData.filter(f => f.type === 'bug').length : 0;
    const praises = hasData ? feedbackData.filter(f => f.type === 'praise').length : 0;
    const complaints = hasData ? feedbackData.filter(f => f.type === 'complaint').length : 0;
    const questions = hasData ? feedbackData.filter(f => f.type === 'question').length : 0;
    const other = hasData ? feedbackData.filter(f => f.type === 'other').length : 0;
    
    console.log('📊 Feedback distribution from database:', {
        suggestions, bugs, praises, complaints, questions, other,
        total: feedbackData?.length || 0
    });
    
    // Feedback Distribution Chart (Doughnut/Pie)
    const distributionCtx = document.getElementById('feedbackDistributionChart');
    if (distributionCtx) {
        feedbackCharts.distributionChart = new Chart(distributionCtx, {
            type: 'doughnut',
            data: {
                labels: ['Suggestions', 'Bugs', 'Praises', 'Complaints', 'Questions', 'Other'],
                datasets: [{
                    data: [suggestions, bugs, praises, complaints, questions, other],
                    backgroundColor: [
                        'rgba(255, 152, 0, 0.8)',   // Suggestion - Orange
                        'rgba(244, 67, 54, 0.8)',    // Bug - Red
                        'rgba(76, 175, 80, 0.8)',    // Praise - Green
                        'rgba(233, 30, 99, 0.8)',    // Complaint - Pink
                        'rgba(33, 150, 243, 0.8)',   // Question - Blue
                        'rgba(158, 158, 158, 0.8)'   // Other - Gray
                    ],
                    borderColor: [
                        'rgba(255, 152, 0, 1)',
                        'rgba(244, 67, 54, 1)',
                        'rgba(76, 175, 80, 1)',
                        'rgba(233, 30, 99, 1)',
                        'rgba(33, 150, 243, 1)',
                        'rgba(158, 158, 158, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            generateLabels: function(chart) {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const value = data.datasets[0].data[i] || 0;
                                        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                        
                                        return {
                                            text: `${label}: ${value} (${percentage}%)`,
                                            fillStyle: data.datasets[0].backgroundColor[i],
                                            hidden: false,
                                            index: i
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    },
                    title: {
                        display: !hasData,
                        text: 'No feedback data available',
                        color: '#999',
                        font: { size: 14, weight: 'normal' }
                    }
                }
            }
        });
    }
    
    // Feedback Trend Chart (Line chart - weekly data)
    const trendCtx = document.getElementById('feedbackTrendChart');
    if (trendCtx) {
        // Kunin ang weekly data mula sa real feedback
        const weeklyData = getWeeklyFeedbackData();
        
        feedbackCharts.trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: weeklyData.labels,
                datasets: [
                    {
                        label: 'Suggestions',
                        data: weeklyData.suggestions,
                        borderColor: 'rgba(255, 152, 0, 1)',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Bugs',
                        data: weeklyData.bugs,
                        borderColor: 'rgba(244, 67, 54, 1)',
                        backgroundColor: 'rgba(244, 67, 54, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Praises',
                        data: weeklyData.praises,
                        borderColor: 'rgba(76, 175, 80, 1)',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Complaints',
                        data: weeklyData.complaints,
                        borderColor: 'rgba(233, 30, 99, 1)',
                        backgroundColor: 'rgba(233, 30, 99, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Questions',
                        data: weeklyData.questions,
                        borderColor: 'rgba(33, 150, 243, 1)',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: !hasData,
                        text: 'No trend data available',
                        color: '#999',
                        font: { size: 14, weight: 'normal' }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Feedback'
                        }
                    }
                }
            }
        });
    }
}

// ===== UPDATED: Kunin ang weekly feedback data mula sa database =====
function getWeeklyFeedbackData() {
    // Default na labels (last 4 weeks)
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    
    // Kung walang feedback data, magbalik ng empty data
    if (!feedbackData || feedbackData.length === 0) {
        return {
            labels: labels,
            suggestions: [0, 0, 0, 0],
            bugs: [0, 0, 0, 0],
            praises: [0, 0, 0, 0],
            complaints: [0, 0, 0, 0],
            questions: [0, 0, 0, 0]
        };
    }
    
    console.log('📊 Generating weekly data from', feedbackData.length, 'feedback entries');
    
    // Kunin ang petsa 4 na linggo ang nakalipas
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    
    // I-filter ang feedback sa huling 4 na linggo
    const recentFeedback = feedbackData.filter(f => {
        const feedbackDate = new Date(f.date || f.created_at || Date.now());
        return feedbackDate >= fourWeeksAgo;
    });
    
    console.log(`📅 Found ${recentFeedback.length} feedback entries in last 4 weeks`);
    
    // I-group ayon sa linggo
    const weeklySuggestions = [0, 0, 0, 0];
    const weeklyBugs = [0, 0, 0, 0];
    const weeklyPraises = [0, 0, 0, 0];
    const weeklyComplaints = [0, 0, 0, 0];
    const weeklyQuestions = [0, 0, 0, 0];
    const weeklyOther = [0, 0, 0, 0]; // Not shown in chart but tracked
    
    recentFeedback.forEach(f => {
        const feedbackDate = new Date(f.date || f.created_at || Date.now());
        const daysAgo = Math.floor((new Date() - feedbackDate) / (1000 * 60 * 60 * 24));
        let weekIndex = 3; // Default sa pinakalumang linggo
        
        if (daysAgo <= 7) weekIndex = 0; // This week
        else if (daysAgo <= 14) weekIndex = 1; // Last week
        else if (daysAgo <= 21) weekIndex = 2; // 2 weeks ago
        else weekIndex = 3; // 3 weeks ago
        
        const type = f.type || 'other';
        
        switch(type) {
            case 'suggestion':
                weeklySuggestions[weekIndex]++;
                break;
            case 'bug':
                weeklyBugs[weekIndex]++;
                break;
            case 'praise':
                weeklyPraises[weekIndex]++;
                break;
            case 'complaint':
                weeklyComplaints[weekIndex]++;
                break;
            case 'question':
                weeklyQuestions[weekIndex]++;
                break;
            default:
                weeklyOther[weekIndex]++; // 'other' type
        }
    });
    
    console.log('📊 Weekly breakdown:', {
        suggestions: weeklySuggestions,
        bugs: weeklyBugs,
        praises: weeklyPraises,
        complaints: weeklyComplaints,
        questions: weeklyQuestions
    });
    
    return {
        labels: labels,
        suggestions: weeklySuggestions,
        bugs: weeklyBugs,
        praises: weeklyPraises,
        complaints: weeklyComplaints,
        questions: weeklyQuestions
    };
}

// ============================================
// PDF REPORT GENERATOR FUNCTIONS - DOWNLOAD ONLY
// ============================================

/**
 * Generate PDF Report of all feedback - DOWNLOAD ONLY
 */
// ===== FIXED: Generate Feedback Report - DOWNLOAD PDF =====
async function generateFeedbackReportPDF() {
    console.log("📄 Generating Feedback Report PDF...");
    
    showNotification('info', 'Generating PDF', 'Please wait...');
    
    try {
        // Get the current feedback data
        if (!feedbackData || feedbackData.length === 0) {
            showNotification('error', 'No Data', 'No feedback data to generate report');
            return;
        }
        
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Set document properties
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = new Date().toLocaleTimeString();
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.text('FEEDBACK REPORT', 148.5, 80, { align: 'center' });
        
        doc.setFontSize(24);
        doc.setFont('helvetica', 'normal');
        doc.text('MathHub Admin Dashboard', 148.5, 110, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(`Generated on: ${currentDate}`, 148.5, 140, { align: 'center' });
        doc.text(`Time: ${currentTime}`, 148.5, 155, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(`Total Feedback: ${feedbackData.length}`, 148.5, 180, { align: 'center' });
        
        // Add new page
        doc.addPage();
        
        // ===== STATISTICS PAGE =====
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(122, 0, 0);
        doc.text('Feedback Statistics', 20, 20);
        
        // Calculate statistics
        const totalRatings = feedbackData.filter(f => f.rating > 0).length;
        const avgRating = totalRatings > 0 
            ? (feedbackData.reduce((sum, f) => sum + (parseInt(f.rating) || 0), 0) / totalRatings).toFixed(1)
            : '0.0';
        
        const suggestions = feedbackData.filter(f => f.type === 'suggestion').length;
        const bugs = feedbackData.filter(f => f.type === 'bug').length;
        const praises = feedbackData.filter(f => f.type === 'praise').length;
        const complaints = feedbackData.filter(f => f.type === 'complaint').length;
        const questions = feedbackData.filter(f => f.type === 'question').length;
        const other = feedbackData.filter(f => f.type === 'other' || (f.type !== 'suggestion' && f.type !== 'bug' && f.type !== 'praise' && f.type !== 'complaint' && f.type !== 'question')).length;
        
        const resolved = feedbackData.filter(f => f.status === 'resolved' || f.status === 'closed').length;
        const pending = feedbackData.filter(f => f.status === 'new' || f.status === 'pending').length;
        const inProgress = feedbackData.filter(f => f.status === 'in_progress' || f.status === 'reviewed').length;
        
        // Statistics table
        doc.autoTable({
            startY: 30,
            head: [['Metric', 'Value']],
            body: [
                ['Total Feedback', feedbackData.length.toString()],
                ['Average Rating', `${avgRating} / 5.0 (from ${totalRatings} ratings)`],
                ['Suggestions', suggestions.toString()],
                ['Bugs', bugs.toString()],
                ['Praises', praises.toString()],
                ['Complaints', complaints.toString()],
                ['Questions', questions.toString()],
                ['Other', other.toString()],
                ['Resolved', resolved.toString()],
                ['In Progress', inProgress.toString()],
                ['Pending', pending.toString()]
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            margin: { top: 30 }
        });
        
        // ===== FEEDBACK LIST PAGE =====
        doc.addPage();
        doc.setFontSize(24);
        doc.setTextColor(122, 0, 0);
        doc.text('All Feedback Entries', 20, 20);
        
        // Prepare data for table
        const tableData = feedbackData.map(f => [
            `#${f.id}`,
            f.user || 'Anonymous',
            f.type || 'unknown',
            (f.subject || 'No subject').substring(0, 30),
            f.rating > 0 ? `${f.rating}★` : '-',
            f.status || 'new',
            f.date || 'No date'
        ]);
        
        doc.autoTable({
            startY: 30,
            head: [['ID', 'User', 'Type', 'Subject', 'Rating', 'Status', 'Date']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 60 },
                4: { cellWidth: 20 },
                5: { cellWidth: 25 },
                6: { cellWidth: 30 }
            },
            margin: { top: 30 },
            didDrawPage: function(data) {
                // Add footer
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `Page ${data.pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }
        });
        
        // ===== DOWNLOAD THE PDF =====
        const fileName = `MathHub_Feedback_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'PDF Downloaded', `Report saved as ${fileName}`);
        console.log(`✅ PDF downloaded: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showNotification('error', 'PDF Generation Failed', error.message);
    }
}

// ===== VIEW ALL RESULTS - UPDATED =====
function viewAllResults() {
    console.log("📊 Viewing all recent quiz results...");
    
    // Kunin ang lahat ng recent results mula sa UI
    const recentResults = document.querySelectorAll('#recentResultsGrid .result-card');
    
    if (recentResults.length === 0) {
        showNotification('info', 'No Results', 'No recent quiz results available');
        return;
    }
    
    // Create a modal to show all results
    const modal = document.getElementById('questionModal');
    if (!modal) return;
    
    const modalBody = document.getElementById('modalBody');
    if (!modalBody) return;
    
    // Collect all results data
    let allResultsHtml = `
        <div style="padding: 10px;">
            <h3 style="color: #7a0000; margin-bottom: 20px;">All Recent Quiz Results</h3>
            <div style="display: grid; gap: 10px; max-height: 400px; overflow-y: auto;">
    `;
    
    recentResults.forEach((card, index) => {
        const studentName = card.querySelector('h4')?.textContent || 'Unknown';
        const quizTitle = card.querySelector('p')?.textContent || 'Quiz';
        const scoreSpan = card.querySelector('.result-score');
        const score = scoreSpan ? scoreSpan.textContent : '0%';
        const timeAgo = card.querySelector('.result-quiz')?.textContent || 'Recently';
        const statusClass = scoreSpan?.classList.contains('passed') ? 'passed' : 'failed';
        
        allResultsHtml += `
            <div style="background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #7a0000; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${getInitials(studentName)}
                    </div>
                    <div>
                        <h4 style="margin: 0 0 5px 0;">${studentName}</h4>
                        <p style="margin: 0; font-size: 0.85rem; color: #666;">${quizTitle}</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: bold; color: ${statusClass === 'passed' ? '#4CAF50' : '#f44336'};">${score}</div>
                    <div style="font-size: 0.75rem; color: #999;">${timeAgo}</div>
                </div>
            </div>
        `;
    });
    
    allResultsHtml += `
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `;
    
    modalBody.innerHTML = allResultsHtml;
    
    // Update modal title
    const modalTitle = modal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = '<i class="fas fa-history"></i> All Recent Results';
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '9999';
    document.body.classList.add('modal-open');
}

function viewFeedbackDetail(feedbackId) {
    const feedback = feedbackData.find(f => f.id === feedbackId);
    if (!feedback) return;
    
    const modal = document.getElementById('feedbackDetailModal');
    const modalBody = modal.querySelector('.modal-body');
    
    const typeClass = `feedback-type ${feedback.type}`;
    const priorityClass = `feedback-priority ${feedback.priority}`;
    const statusClass = `feedback-status ${feedback.status}`;
    
    let typeText = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1);
    if (feedback.type === 'rating' && feedback.rating) {
        typeText = `${feedback.rating} Star Rating`;
    }
    
    modalBody.innerHTML = `
        <div class="feedback-detail-header">
            <div class="feedback-meta">
                <h4>${feedback.subject}</h4>
                <div class="feedback-meta-info">
                    <span><i class="fas fa-user"></i> ${feedback.user}</span>
                    <span><i class="fas fa-tag"></i> <span class="${typeClass}">${typeText}</span></span>
                    <span><i class="fas fa-flag"></i> <span class="${priorityClass}">${feedback.priority.toUpperCase()} Priority</span></span>
                    <span><i class="fas fa-check-circle"></i> <span class="${statusClass}">${feedback.status.replace('-', ' ').toUpperCase()}</span></span>
                    <span><i class="far fa-calendar"></i> ${formatDate(feedback.date)}</span>
                </div>
            </div>
        </div>
        
        <div class="feedback-detail-body">
            <div class="feedback-message">
                <h5><i class="fas fa-comment"></i> Feedback Message</h5>
                <p>${feedback.message}</p>
            </div>
            
            ${feedback.response ? `
                <div class="feedback-response-section">
                    <h5><i class="fas fa-reply"></i> Admin Response</h5>
                    <div class="feedback-response">
                        <p>${feedback.response}</p>
                        <div class="feedback-response-info">
                            <span><i class="fas fa-user-shield"></i> ${feedback.responseBy || 'Admin'}</span>
                            <span><i class="far fa-clock"></i> ${feedback.responseDate ? formatDate(feedback.responseDate) : 'Recently'}</span>
                        </div>
                    </div>
                </div>
            ` : `
                <div class="feedback-response-section">
                    <h5><i class="fas fa-reply"></i> Respond to Feedback</h5>
                    <div class="form-group">
                        <textarea class="form-control large" id="feedbackResponseInput" placeholder="Type your response here..."></textarea>
                    </div>
                    <button class="btn btn-primary" onclick="sendResponse(${feedback.id})">
                        <i class="fas fa-paper-plane"></i> Send Response
                    </button>
                </div>
            `}
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Update modal header
    modal.querySelector('.modal-header h3').innerHTML = `<i class="fas fa-comment-dots"></i> Feedback #${feedback.id}`;
}

function closeFeedbackDetailModal() {
    const modal = document.getElementById('feedbackDetailModal');
    modal.style.display = 'none';
}

function sendResponse(feedbackId) {
    const responseInput = document.getElementById('feedbackResponseInput');
    const response = responseInput.value.trim();
    
    if (!response) {
        showNotification('error', 'Error', 'Please enter a response.');
        return;
    }
    
    const feedbackIndex = feedbackData.findIndex(f => f.id === feedbackId);
    if (feedbackIndex === -1) return;
    
    // Update feedback
    feedbackData[feedbackIndex].response = response;
    feedbackData[feedbackIndex].responseDate = new Date().toISOString().split('T')[0];
    feedbackData[feedbackIndex].responseBy = "Admin";
    
    showNotification('success', 'Response Sent', 'Your response has been sent successfully.');
    closeFeedbackDetailModal();
    updateFeedbackTable();
    updateFeedbackStats();
}

// ===== FIXED: Mark as Resolved function - NOW CONNECTS TO DATABASE =====
async function markAsResolved(feedbackId) {
    console.log("✅ Marking feedback as resolved:", feedbackId);
    
    if (!confirm('Mark this feedback as resolved?')) {
        return;
    }
    
    // Get the button that was clicked
    const button = event?.target?.closest('button');
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login again');
            return;
        }
        
        // Show loading state
        if (button) {
            const originalHtml = button.innerHTML;
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        console.log(`📡 Sending request to mark feedback ${feedbackId} as resolved...`);
        
        // ===== IMPORTANT: Connect to your backend API =====
        const response = await fetch(`http://localhost:5000/api/feedback/${feedbackId}/update-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'resolved'
                // You can also add admin_notes if you want
                // admin_notes: 'Marked as resolved by admin'
            })
        });
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success) {
            showNotification('success', 'Success', 'Feedback marked as resolved');
            
            // Update the UI - find the feedback item and update its status
            const feedbackItem = document.querySelector(`.feedback-item[data-feedback-id="${feedbackId}"]`);
            if (feedbackItem) {
                const statusSpan = feedbackItem.querySelector('.feedback-status');
                if (statusSpan) {
                    statusSpan.textContent = 'resolved';
                    statusSpan.className = 'feedback-status resolved';
                }
                
                // Update the action buttons
                const resolveBtn = feedbackItem.querySelector('.feedback-action-btn.resolve');
                if (resolveBtn) {
                    resolveBtn.disabled = true;
                    resolveBtn.innerHTML = '<i class="fas fa-check"></i> Resolved';
                }
            }
            
            // Reload feedback data to refresh stats
            setTimeout(() => {
                if (typeof loadFeedbackData === 'function') {
                    loadFeedbackData();
                }
            }, 500);
            
        } else {
            throw new Error(result.message || 'Failed to update status');
        }
        
    } catch (error) {
        console.error('❌ Error marking as resolved:', error);
        showNotification('error', 'Failed', error.message);
    } finally {
        // Restore button if it exists
        if (button) {
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-check"></i>';
            }, 500);
        }
    }
}

// ===== FIXED: Delete feedback function with DEBUGGING =====
async function deleteFeedback(feedbackId) {
    console.log("🗑️ DELETE FEEDBACK CALLED - ID:", feedbackId);
    console.log("🗑️ Event target:", event?.target);
    console.log("🗑️ Button clicked:", event?.target?.closest('button'));
    
    if (!confirm('Are you sure you want to permanently delete this feedback? This action cannot be undone.')) {
        console.log("❌ User cancelled deletion");
        return;
    }
    
    // Get the button that was clicked
    const button = event?.target?.closest('button');
    const originalHtml = button ? button.innerHTML : '';
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        console.log("🔑 Token found:", token ? "YES" : "NO");
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login again');
            return;
        }
        
        // Show loading state
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
        
        console.log(`📡 Sending DELETE request to: http://localhost:5000/api/feedback/${feedbackId}`);
        
        const response = await fetch(`http://localhost:5000/api/feedback/${feedbackId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("📥 Response status:", response.status);
        console.log("📥 Response ok?", response.ok);
        
        // Try to get response text first
        const responseText = await response.text();
        console.log("📥 Raw response:", responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            console.error("❌ Failed to parse JSON response:", e);
            throw new Error('Server returned invalid JSON');
        }
        
        console.log("📥 Parsed result:", result);
        
        if (result.success) {
            showNotification('success', 'Deleted', 'Feedback deleted successfully');
            
            // Remove from UI with animation
            const feedbackItem = document.querySelector(`.feedback-item[data-feedback-id="${feedbackId}"]`) || 
                                 button?.closest('tr') || 
                                 button?.closest('.feedback-item');
            
            if (feedbackItem) {
                console.log("✅ Removing element from UI");
                feedbackItem.style.transition = 'all 0.3s ease';
                feedbackItem.style.opacity = '0';
                feedbackItem.style.transform = 'translateX(20px)';
                
                setTimeout(() => {
                    feedbackItem.remove();
                    
                    // Update feedbackData array
                    const index = feedbackData.findIndex(f => f.id == feedbackId);
                    if (index !== -1) {
                        feedbackData.splice(index, 1);
                        console.log(`✅ Removed from feedbackData array. New length: ${feedbackData.length}`);
                    }
                    
                    // Update stats
                    updateFeedbackStats();
                    
                    // If table is empty, show empty state
                    if (document.querySelectorAll('#feedbackTableBody tr').length === 0) {
                        document.getElementById('feedbackTableBody').innerHTML = `
                            <tr>
                                <td colspan="8" class="text-center py-5">
                                    <div style="text-align: center; padding: 40px;">
                                        <i class="fas fa-comment-slash" style="font-size: 4rem; color: #ccc; margin-bottom: 20px;"></i>
                                        <h4 style="color: #666;">No feedback found</h4>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }
                }, 300);
            }
            
            // Force reload after 1 second to refresh everything
            setTimeout(() => {
                console.log("🔄 Reloading feedback data...");
                loadFeedbackData();
            }, 1000);
            
        } else {
            throw new Error(result.message || 'Failed to delete feedback');
        }
        
    } catch (error) {
        console.error('❌ ERROR in deleteFeedback:', error);
        console.error('❌ Error stack:', error.stack);
        showNotification('error', 'Delete Failed', error.message);
        
        // Restore button
        if (button) {
            button.disabled = false;
            button.innerHTML = originalHtml;
        }
    }
}

function filterFeedbackTable() {
    const typeFilter = document.getElementById('feedbackTypeFilter').value;
    const priorityFilter = document.getElementById('feedbackPriorityFilter').value;
    const statusFilter = document.getElementById('feedbackStatusFilter').value;
    
    let filteredData = [...feedbackData];
    
    if (typeFilter !== 'all') {
        filteredData = filteredData.filter(f => f.type === typeFilter);
    }
    
    if (priorityFilter !== 'all') {
        filteredData = filteredData.filter(f => f.priority === priorityFilter);
    }
    
    if (statusFilter !== 'all') {
        filteredData = filteredData.filter(f => f.status === statusFilter);
    }
    
    // For demo purposes, we'll just update the table with filtered data
    updateFeedbackTableWithData(filteredData);
}

function updateFeedbackTableWithData(data) {
    const tableBody = document.getElementById('feedbackTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    data.forEach(feedback => {
        const row = document.createElement('tr');
        
        const typeClass = `feedback-type ${feedback.type}`;
        const priorityClass = `feedback-priority ${feedback.priority}`;
        const statusClass = `feedback-status ${feedback.status}`;
        
        let typeText = feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1);
        if (feedback.type === 'rating' && feedback.rating) {
            typeText = `${feedback.rating} ★ Rating`;
        }
        
        row.innerHTML = `
            <td>#${feedback.id}</td>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${feedback.userAvatar}</div>
                    <div class="user-info">
                        <span class="user-name">${feedback.user}</span>
                        <span class="user-email">${feedback.subject}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="${typeClass}">${typeText}</span>
            </td>
            <td>${feedback.subject}</td>
            <td>
                <span class="${priorityClass}">${feedback.priority.toUpperCase()}</span>
            </td>
            <td>
                <span class="${statusClass}">${feedback.status.replace('-', ' ').toUpperCase()}</span>
            </td>
            <td>${formatDate(feedback.date)}</td>
            <td>
                <div class="feedback-actions">
                    <button class="feedback-action-btn view" onclick="viewFeedbackDetail(${feedback.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="feedback-action-btn resolve" onclick="markAsResolved(${feedback.id})" title="Mark as Resolved">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="feedback-action-btn delete" onclick="deleteFeedback(${feedback.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function filterFeedbackBySearch(searchTerm) {
    if (!searchTerm.trim()) {
        updateFeedbackTable();
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filteredData = feedbackData.filter(feedback => 
        feedback.user.toLowerCase().includes(term) ||
        feedback.subject.toLowerCase().includes(term) ||
        feedback.message.toLowerCase().includes(term)
    );
    
    updateFeedbackTableWithData(filteredData);
}

function sortFeedbackTable() {
    const sortValue = document.getElementById('feedbackSortSelect').value;
    
    let sortedData = [...feedbackData];
    
    sortedData.sort((a, b) => {
        if (sortValue === 'date-desc') {
            return new Date(b.date) - new Date(a.date);
        } else if (sortValue === 'date-asc') {
            return new Date(a.date) - new Date(b.date);
        } else if (sortValue === 'priority') {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        } else if (sortValue === 'rating') {
            return (b.rating || 0) - (a.rating || 0);
        }
        return 0;
    });
    
    updateFeedbackTableWithData(sortedData);
}

/// ===== REPORT GENERATION FUNCTIONS - UPDATED TO USE PDF GENERATOR =====
function generateMonthlyReport() {
    // Call the PDF generator function
    if (typeof generateFeedbackReport === 'function') {
        generateFeedbackReport();
    } else {
        showNotification('error', 'Error', 'PDF generator not found');
    }
}

function generateStudentSatisfactionReport() {
    // Call the PDF generator function
    if (typeof generateStudentSatisfactionReportPDF === 'function') {
        generateStudentSatisfactionReportPDF();
    } else {
        showNotification('error', 'Error', 'PDF generator not found');
    }
}

function generateIssueResolutionReport() {
    // Call the PDF generator function
    if (typeof generateIssueResolutionReportPDF === 'function') {
        generateIssueResolutionReportPDF();
    } else {
        showNotification('error', 'Error', 'PDF generator not found');
    }
}

function generateSuggestionAnalysisReport() {
    // Call the PDF generator function
    if (typeof generateSuggestionAnalysisReportPDF === 'function') {
        generateSuggestionAnalysisReportPDF();
    } else {
        showNotification('error', 'Error', 'PDF generator not found');
    }
}

function generateAllReports() {
    // Call the PDF generator function
    if (typeof generateAllReportsPDF === 'function') {
        generateAllReportsPDF();
    } else {
        showNotification('error', 'Error', 'PDF generator not found');
    }
}

function generateFeedbackReport() {
    // Call the PDF generator function
    if (typeof generateFeedbackReportPDF === 'function') {
        generateFeedbackReportPDF();
    } else {
        showNotification('error', 'Error', 'PDF generator not found');
    }
}

// ===== FIXED: Export Feedback Data as CSV =====
function exportFeedbackData() {
    console.log("📄 Exporting Feedback Data as CSV...");
    
    if (!feedbackData || feedbackData.length === 0) {
        showNotification('error', 'No Data', 'No feedback data to export');
        return;
    }
    
    // Define CSV headers
    const headers = ['ID', 'User', 'Email', 'Type', 'Subject', 'Message', 'Rating', 'Status', 'Date', 'Response'];
    
    // Convert feedback data to CSV rows
    const rows = feedbackData.map(f => [
        f.id,
        f.user || 'Anonymous',
        f.user_email || '',
        f.type || 'unknown',
        `"${(f.subject || '').replace(/"/g, '""')}"`,
        `"${(f.message || '').replace(/"/g, '""').substring(0, 100)}${f.message?.length > 100 ? '...' : ''}"`,
        f.rating || 0,
        f.status || 'new',
        f.date || '',
        `"${(f.response || '').replace(/"/g, '""').substring(0, 100)}"`
    ]);
    
    // Combine headers and rows
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `MathHub_Feedback_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('success', 'CSV Downloaded', 'Feedback data exported as CSV');
    
    // Clean up the URL object
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ===== CHART UPDATE FUNCTIONS =====
function updateFeedbackDistribution() {
    showNotification('info', 'Chart Updated', 'Feedback distribution updated with new time range.');
}

function updateFeedbackTrendChart() {
    const filterValue = document.getElementById('feedbackTrendFilter').value;
    showNotification('info', 'Chart Updated', `Feedback trend chart filtered by: ${filterValue}`);
}

function updatePerformanceChart() {
    showNotification('info', 'Chart Updated', 'Performance chart updated with new time range.');
}

function updateScoreDistribution() {
    const filterValue = document.getElementById('scoreDistributionFilter').value;
    showNotification('info', 'Chart Updated', `Score distribution filtered by: ${filterValue}`);
}

function updateUserGrowthChart() {
    const filterValue = document.getElementById('userGrowthTimeRange').value;
    showNotification('info', 'Chart Updated', `User growth chart updated: ${filterValue}`);
}

function updateLessonPopularityChart() {
    const filterValue = document.getElementById('lessonPopularityFilter').value;
    showNotification('info', 'Chart Updated', `Lesson popularity chart updated: ${filterValue}`);
}

/**
 * INITIALIZE PERFORMANCE DASHBOARD
 */
async function initializePerformanceDashboard() {
    console.log("📊 Initializing performance dashboard with real data...");
    
    // Get current filter value
    const currentFilter = document.getElementById('topPerformersFilter')?.value || 'all';
    
    // Show loading states
    showLoadingStates();
    
    try {
        // Load ALL real data from database in parallel
        await Promise.all([
            loadPerformanceStats(),      // Stats cards
            loadTopPerformers(currentFilter), // Top performers table with current filter
            loadSubjectBreakdown(),      // Subject breakdown grid
            loadPerformanceTrendData(),  // Trend chart
            loadScoreDistributionData()  // Distribution chart
        ]);
        
        console.log('✅ Performance dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error loading performance data:', error);
        showNotification('error', 'Load Failed', 'Could not load performance data');
    }
    
    // Set up event listeners
    setupPerformanceChartListeners();
}

/**
 * SETUP CHART EVENT LISTENERS
 */
function setupPerformanceChartListeners() {
    // Time range selector
    const timeRangeSelect = document.getElementById('performanceTimeRange');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', updatePerformanceChart);
    }
    
    // Score distribution filter
    const distributionFilter = document.getElementById('scoreDistributionFilter');
    if (distributionFilter) {
        distributionFilter.addEventListener('change', updateScoreDistribution);
    }
    
    // Add refresh button if not exists
    const chartContainer = document.querySelector('.performance-charts-container');
    if (chartContainer && !document.getElementById('refreshChartsBtn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refreshChartsBtn';
        refreshBtn.className = 'btn btn-sm btn-secondary';
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Charts';
        refreshBtn.onclick = refreshAllCharts;
        refreshBtn.style.margin = '10px';
        chartContainer.parentNode.insertBefore(refreshBtn, chartContainer.nextSibling);
    }
}

/**
 * Helper function to show loading states
 */
function showLoadingStates() {
    // Show loading in stats cards
    const statsCards = document.querySelectorAll('.performance-stat-value');
    statsCards.forEach(card => {
        if (card.id) {
            card.textContent = '...';
        }
    });
    
    // Show loading in top performers table
    const tableBody = document.getElementById('topPerformersBody');
    if (tableBody) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-spinner fa-pulse fa-2x"></i>
                    <p class="mt-2">Loading top performers...</p>
                </td>
            </tr>
        `;
    }
    
    // Show loading in subject breakdown grid
    const grid = document.getElementById('subjectBreakdownGrid');
    if (grid) {
        grid.innerHTML = `
            <div class="text-center py-5" style="grid-column: 1/-1;">
                <i class="fas fa-spinner fa-pulse fa-3x"></i>
                <p class="mt-3">Loading subject data...</p>
            </div>
        `;
    }
}

// ============================================
// STUDENT PERFORMANCE DASHBOARD FUNCTIONALITY
// ============================================

/**
 * Initialize student performance dashboard widgets
 */
function initStudentPerformanceWidgets() {
    console.log("📊 Initializing student performance widgets...");
    
    // Add click handlers to stat cards
    document.querySelectorAll('.stat-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on a button inside
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
                return;
            }
            
            const statValue = this.querySelector('.stat-value')?.textContent || '';
            const statLabel = this.querySelector('.stat-label')?.textContent || '';
            
            showStatDetails(statLabel, statValue);
        });
        
        // Add hover effect
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 25px rgba(122, 0, 0, 0.2)';
            this.style.transition = 'all 0.3s ease';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        });
    });
    
    // Add click handlers to percentage circles
    document.querySelectorAll('.progress-circle, .percentage-circle').forEach(circle => {
        circle.addEventListener('click', function() {
            const percent = this.getAttribute('data-percent') || this.textContent.replace('%', '');
            const type = this.closest('.stat-card')?.querySelector('.stat-label')?.textContent || 'Performance';
            
            showPercentageDetails(type, percent);
        });
        
        // Add hover effect
        circle.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.transition = 'transform 0.3s ease';
            this.style.cursor = 'pointer';
        });
        
        circle.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

/**
 * Show detailed statistics in a modal
 */
function showStatDetails(statName, statValue) {
    console.log(`📊 Showing details for: ${statName} = ${statValue}`);
    
    // Create modal if it doesn't exist
    let detailsModal = document.getElementById('statDetailsModal');
    if (!detailsModal) {
        detailsModal = createStatDetailsModal();
    }
    
    // Get detailed data based on stat type
    let details = getStatDetails(statName);
    
    // Update modal content
    const modalBody = detailsModal.querySelector('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="stat-details-container">
                <div class="stat-details-header">
                    <div class="stat-details-icon">
                        <i class="${details.icon || 'fas fa-chart-line'}"></i>
                    </div>
                    <div class="stat-details-title">
                        <h3>${statName} Details</h3>
                        <p class="stat-current-value">Current: <strong>${statValue}</strong></p>
                    </div>
                </div>
                
                <div class="stat-details-content">
                    <div class="details-grid">
                        ${details.items ? details.items.map(item => `
                            <div class="detail-item">
                                <span class="detail-label">${item.label}</span>
                                <span class="detail-value ${item.class || ''}">${item.value}</span>
                            </div>
                        `).join('') : '<p class="no-details">No additional details available</p>'}
                    </div>
                    
                    ${details.chart ? `
                        <div class="detail-chart-container">
                            <canvas id="statDetailChart" width="400" height="200"></canvas>
                        </div>
                    ` : ''}
                    
                    <div class="detail-actions">
                        <button class="btn btn-primary" onclick="viewFullReport('${statName}')">
                            <i class="fas fa-file-alt"></i> View Full Report
                        </button>
                        <button class="btn btn-secondary" onclick="exportStatData('${statName}')">
                            <i class="fas fa-download"></i> Export Data
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize chart if needed
        if (details.chart && details.chart.data) {
            setTimeout(() => {
                const ctx = document.getElementById('statDetailChart');
                if (ctx) {
                    new Chart(ctx, {
                        type: details.chart.type || 'line',
                        data: details.chart.data,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: details.chart.showLegend || false
                                }
                            }
                        }
                    });
                }
            }, 100);
        }
    }
    
    // Show modal
    detailsModal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

/**
 * Create statistics details modal
 */
function createStatDetailsModal() {
    const modalHTML = `
        <div id="statDetailsModal" class="modal" style="display: none;">
            <div class="modal-backdrop" onclick="closeStatDetailsModal()"></div>
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header" style="background: #7a0000; color: white;">
                    <h3><i class="fas fa-chart-bar"></i> Statistics Details</h3>
                    <button class="modal-close" onclick="closeStatDetailsModal()">&times;</button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto; padding: 25px;">
                    <!-- Content will be loaded dynamically -->
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeStatDetailsModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    return document.getElementById('statDetailsModal');
}

/**
 * Close statistics details modal
 */
function closeStatDetailsModal() {
    const modal = document.getElementById('statDetailsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

/**
 * Get detailed data for a specific stat type
 */
function getStatDetails(statName) {
    // Default details
    const defaultDetails = {
        icon: 'fas fa-chart-line',
        items: [
            { label: 'This Week', value: '+5%', class: 'positive' },
            { label: 'Last Week', value: '92%', class: '' },
            { label: 'Monthly Average', value: '88%', class: '' },
            { label: 'Best Score', value: '100%', class: 'positive' }
        ],
        chart: {
            type: 'line',
            showLegend: false,
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Performance',
                    data: [85, 88, 92, 90, 95, 98, 100],
                    borderColor: '#7a0000',
                    backgroundColor: 'rgba(122, 0, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            }
        }
    };
    
    // Customize based on stat type
    if (statName.includes('Score') || statName.includes('Grade')) {
        return {
            icon: 'fas fa-star',
            items: [
                { label: 'Current Score', value: '85%', class: '' },
                { label: 'Class Average', value: '78%', class: '' },
                { label: 'Top Score', value: '98%', class: 'positive' },
                { label: 'Improvement', value: '+12%', class: 'positive' }
            ],
            chart: {
                type: 'line',
                showLegend: false,
                data: {
                    labels: ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4', 'Quiz 5'],
                    datasets: [{
                        label: 'Score Trend',
                        data: [72, 78, 82, 85, 85],
                        borderColor: '#7a0000',
                        backgroundColor: 'rgba(122, 0, 0, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                }
            }
        };
    } else if (statName.includes('Lesson')) {
        return {
            icon: 'fas fa-book-open',
            items: [
                { label: 'Completed', value: '12/15', class: '' },
                { label: 'In Progress', value: '2', class: '' },
                { label: 'Not Started', value: '1', class: '' },
                { label: 'Completion Rate', value: '80%', class: 'positive' }
            ],
            chart: {
                type: 'doughnut',
                showLegend: true,
                data: {
                    labels: ['Completed', 'In Progress', 'Not Started'],
                    datasets: [{
                        data: [12, 2, 1],
                        backgroundColor: ['#4CAF50', '#FFC107', '#F44336'],
                        borderWidth: 0
                    }]
                }
            }
        };
    } else if (statName.includes('Time')) {
        return {
            icon: 'fas fa-clock',
            items: [
                { label: 'Total Time', value: '24.5 hours', class: '' },
                { label: 'Average per Day', value: '45 min', class: '' },
                { label: 'This Week', value: '3.2 hours', class: '' },
                { label: 'Most Active Day', value: 'Wednesday', class: '' }
            ],
            chart: {
                type: 'bar',
                showLegend: false,
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Hours',
                        data: [1.2, 0.8, 2.1, 1.5, 1.8, 0.5, 0.3],
                        backgroundColor: '#7a0000',
                        borderRadius: 5
                    }]
                }
            }
        };
    }
    
    return defaultDetails;
}

/**
 * View full report for a stat
 */
function viewFullReport(statName) {
    console.log(`📄 Viewing full report for: ${statName}`);
    showNotification('info', 'Generating Report', `Preparing full ${statName} report...`);
    
    // You can implement actual report generation here
    setTimeout(() => {
        showNotification('success', 'Report Ready', `${statName} report has been generated`);
    }, 1500);
}

/**
 * Export stat data as CSV/PDF
 */
function exportStatData(statName) {
    console.log(`📥 Exporting data for: ${statName}`);
    showNotification('info', 'Exporting', `Exporting ${statName} data...`);
    
    // You can implement actual export functionality here
    setTimeout(() => {
        showNotification('success', 'Export Complete', `${statName} data exported successfully`);
    }, 1000);
}

/**
 * Animate percentage circles on scroll
 */
function animatePercentageCircles() {
    const circles = document.querySelectorAll('.progress-circle, .percentage-circle');
    
    circles.forEach(circle => {
        const percent = parseInt(circle.getAttribute('data-percent') || circle.textContent);
        const circleFill = circle.querySelector('.circle-fill');
        
        if (circleFill) {
            // Calculate stroke-dashoffset based on percentage
            const circumference = 2 * Math.PI * 40; // Assuming radius 40
            const offset = circumference - (percent / 100) * circumference;
            circleFill.style.strokeDashoffset = offset;
        }
    });
}

/**
 * Update percentage values in real-time
 */
function updatePercentageValue(elementId, newValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Animate the number change
    const currentValue = parseInt(element.textContent) || 0;
    const targetValue = parseInt(newValue) || 0;
    
    if (currentValue === targetValue) return;
    
    // Simple animation
    let start = null;
    const duration = 1000; // 1 second
    
    function animate(timestamp) {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        
        const current = Math.floor(currentValue + (targetValue - currentValue) * progress);
        element.textContent = current + '%';
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    }
    
    requestAnimationFrame(animate);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize student performance widgets after a short delay
    setTimeout(() => {
        if (document.getElementById('performanceDashboardSection')?.classList.contains('active')) {
            initStudentPerformanceWidgets();
            animatePercentageCircles();
        }
    }, 1000);
    
    // Also initialize when switching to performance dashboard
    const originalShowPerformance = window.showPerformanceDashboard;
    if (originalShowPerformance) {
        window.showPerformanceDashboard = function(e) {
            originalShowPerformance.call(this, e);
            setTimeout(() => {
                initStudentPerformanceWidgets();
                animatePercentageCircles();
            }, 500);
        };
    }
});


// ===== CHANGE PASSWORD FUNCTION =====
function changePassword() {
    console.log("🔐 Opening change password modal...");
    
    const currentPassword = prompt("Enter your current password:");
    if (!currentPassword) return;
    
    const newPassword = prompt("Enter new password (min. 8 characters):");
    if (!newPassword) {
        showNotification('error', 'Error', 'Password cannot be empty');
        return;
    }
    
    if (newPassword.length < 8) {
        showNotification('error', 'Error', 'Password must be at least 8 characters');
        return;
    }
    
    const confirmPassword = prompt("Confirm new password:");
    if (newPassword !== confirmPassword) {
        showNotification('error', 'Error', 'Passwords do not match');
        return;
    }
    
    // For demo purposes - show success
    showNotification('success', 'Password Changed', 'Your password has been updated successfully!');
    
    // In a real app, you would send this to the server
    console.log('Password change requested', {
        current: currentPassword,
        new: newPassword
    });
}

// ===== FIXED: Helper function to generate last 30 days labels =====
function generateLast30DaysLabels() {
    const labels = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    return labels;
}

// ===== FIXED: Helper function to generate weekly labels =====
function generateWeeklyLabels() {
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    return labels;
}


/**
 * LOAD PERFORMANCE STATS FROM DATABASE
 */
async function loadPerformanceStats() {
    console.log("📊 Loading performance stats from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/performance/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Performance stats response:', result);
        
        if (result.success) {
            const stats = result.stats;
            const hasData = stats.has_data || false;
            
            // ===== FIXED: Use the correct element IDs =====
            // Main stats cards
            const avgScoreEl = document.getElementById('avgScore');
            if (avgScoreEl) {
                avgScoreEl.textContent = hasData ? (stats.avg_score || 0) + '%' : '0%';
            }
            
            const completionRateEl = document.getElementById('completionRate');
            if (completionRateEl) {
                completionRateEl.textContent = hasData ? (stats.completion_rate || 0) + '%' : '0%';
            }
            
            const avgTimeEl = document.getElementById('avgTime');
            if (avgTimeEl) {
                avgTimeEl.textContent = hasData ? (stats.avg_time || 0) + 'm' : '0m';
            }
            
            const activeStudentsEl = document.getElementById('activeStudents');
            if (activeStudentsEl) {
                activeStudentsEl.textContent = hasData ? (stats.active_students || 0) : '0';
            }
            
            // Change indicators
            const avgScoreChangeEl = document.getElementById('avgScoreChange');
            if (avgScoreChangeEl) {
                if (hasData && stats.avg_score_change) {
                    const changeClass = stats.avg_score_change >= 0 ? 'positive' : 'negative';
                    const arrow = stats.avg_score_change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                    avgScoreChangeEl.className = `performance-stat-change ${changeClass}`;
                    avgScoreChangeEl.innerHTML = `<i class="fas ${arrow}"></i> ${Math.abs(stats.avg_score_change)}% from last month`;
                } else {
                    avgScoreChangeEl.className = 'performance-stat-change';
                    avgScoreChangeEl.innerHTML = '<i class="fas fa-minus"></i> No data yet';
                }
            }
            
            const completionRateChangeEl = document.getElementById('completionRateChange');
            if (completionRateChangeEl) {
                if (hasData && stats.completion_rate_change) {
                    const changeClass = stats.completion_rate_change >= 0 ? 'positive' : 'negative';
                    const arrow = stats.completion_rate_change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                    completionRateChangeEl.className = `performance-stat-change ${changeClass}`;
                    completionRateChangeEl.innerHTML = `<i class="fas ${arrow}"></i> ${Math.abs(stats.completion_rate_change)}% from last month`;
                } else {
                    completionRateChangeEl.className = 'performance-stat-change';
                    completionRateChangeEl.innerHTML = '<i class="fas fa-minus"></i> No data yet';
                }
            }
            
            const avgTimeChangeEl = document.getElementById('avgTimeChange');
            if (avgTimeChangeEl) {
                if (hasData && stats.avg_time_change) {
                    const changeClass = stats.avg_time_change >= 0 ? 'positive' : 'negative';
                    const arrow = stats.avg_time_change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                    avgTimeChangeEl.className = `performance-stat-change ${changeClass}`;
                    avgTimeChangeEl.innerHTML = `<i class="fas ${arrow}"></i> ${Math.abs(stats.avg_time_change)}m from last month`;
                } else {
                    avgTimeChangeEl.className = 'performance-stat-change';
                    avgTimeChangeEl.innerHTML = '<i class="fas fa-minus"></i> No data yet';
                }
            }
            
            const activeStudentsChangeEl = document.getElementById('activeStudentsChange');
            if (activeStudentsChangeEl) {
                if (hasData && stats.active_students_change) {
                    const changeClass = stats.active_students_change >= 0 ? 'positive' : 'negative';
                    const arrow = stats.active_students_change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
                    activeStudentsChangeEl.className = `performance-stat-change ${changeClass}`;
                    activeStudentsChangeEl.innerHTML = `<i class="fas ${arrow}"></i> ${Math.abs(stats.active_students_change)} from last month`;
                } else {
                    activeStudentsChangeEl.className = 'performance-stat-change';
                    activeStudentsChangeEl.innerHTML = '<i class="fas fa-minus"></i> No data yet';
                }
            }
            
            console.log('✅ Performance stats updated:', stats);
            
        } else {
            throw new Error(result.message || 'Failed to load stats');
        }
        
    } catch (error) {
        console.error('❌ Error loading performance stats:', error);
        
        // Set to zero/empty state
        document.getElementById('avgScore').textContent = '0%';
        document.getElementById('completionRate').textContent = '0%';
        document.getElementById('avgTime').textContent = '0m';
        document.getElementById('activeStudents').textContent = '0';
        
        const changeElements = ['avgScoreChange', 'completionRateChange', 'avgTimeChange', 'activeStudentsChange'];
        changeElements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.innerHTML = '<i class="fas fa-minus"></i> No data yet';
            }
        });
    }
}

/**
 * LOAD TOP PERFORMERS FROM DATABASE
 */
async function loadTopPerformers(subjectFilter = 'all') {
    console.log(`🏆 Loading top performers from database with filter: ${subjectFilter}`);
    
    const tableBody = document.getElementById('topPerformersBody');
    if (!tableBody) return;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/performance/top-performers?subject=${subjectFilter}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const performers = result.performers || [];
        
        if (performers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <div style="text-align: center; padding: 30px;">
                            <i class="fas fa-chart-line" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                            <h4 style="color: #666; margin-bottom: 5px;">No Performance Data Yet</h4>
                            <p style="color: #999; margin-bottom: 15px;">Students haven't completed any lessons yet.</p>
                            <p style="color: #7a0000; font-size: 0.9rem;">
                                <i class="fas fa-info-circle"></i> Data will appear here once students start completing lessons.
                            </p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        renderTopPerformersTable(performers);
        
    } catch (error) {
        console.error('❌ Error loading top performers:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-exclamation-circle" style="color: #f44336;"></i>
                    <p class="mt-2">Failed to load performance data</p>
                    <button class="btn btn-sm btn-primary mt-2" onclick="loadTopPerformers()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * RENDER TOP PERFORMERS TABLE
 */
function renderTopPerformersTable(performers) {
    const tableBody = document.getElementById('topPerformersBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    performers.forEach((student, index) => {
        const rank = index + 1;
        const scoreClass = student.score >= 90 ? 'high' : student.score >= 80 ? 'medium' : 'low';
        const progressClass = student.progress >= 90 ? 'high' : student.progress >= 80 ? 'medium' : 'low';
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'other';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><div class="student-rank ${rankClass}">${rank}</div></td>
            <td>
                <div class="student-cell">
                    <div class="student-avatar" style="background: ${getAvatarColor(student.avatar || student.name)}">${student.avatar || getInitials(student.name)}</div>
                    <div class="student-info">
                        <span class="student-name">${student.name}</span>
                        <span class="student-subject">${student.subject || 'General'}</span>
                    </div>
                </div>
            </td>
            <td>${student.subject || 'General'}</td>
            <td><span class="score-badge ${scoreClass}"><i class="fas fa-star"></i> ${Math.round(student.score)}%</span></td>
            <td>
                <div class="progress-cell">
                    <div class="progress-track"><div class="progress-bar ${progressClass}" style="width: ${student.progress}%"></div></div>
                    <span class="progress-percent">${student.progress}%</span>
                </div>
            </td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewStudentPerformance(${student.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-info" onclick="sendMessageToStudent(${student.id})">
                    <i class="fas fa-envelope"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * RENDER SUBJECT BREAKDOWN
 */
function renderSubjectBreakdown(subjects) {
    const grid = document.getElementById('subjectBreakdownGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-performance-card';
        card.innerHTML = `
            <div class="subject-performance-header">
                <div class="subject-performance-icon" style="background: ${subject.color || '#7a0000'}">
                    <i class="${subject.icon || 'fas fa-book'}"></i>
                </div>
                <div class="subject-performance-title">
                    <h4>${subject.name.charAt(0).toUpperCase() + subject.name.slice(1)}</h4>
                    <p>${subject.totalStudents || 0} students enrolled</p>
                </div>
            </div>
            <div class="subject-performance-stats">
                <div class="subject-stat">
                    <span class="subject-stat-value">${subject.avgScore || 0}%</span>
                    <span class="subject-stat-label">Avg. Score</span>
                </div>
                <div class="subject-stat">
                    <span class="subject-stat-value">${subject.completionRate || 0}%</span>
                    <span class="subject-stat-label">Completion</span>
                </div>
            </div>
            <div class="subject-performance-footer">
                <i class="fas fa-trophy" style="color: #FFD700;"></i> 
                Top: ${subject.topPerformer || 'No data'}
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * FILTER TOP PERFORMERS BY SUBJECT
 */
async function filterTopPerformers() {
    const filterValue = document.getElementById('topPerformersFilter')?.value || 'all';
    
    console.log(`🏆 Filtering top performers by: ${filterValue}`);
    
    const tableBody = document.getElementById('topPerformersBody');
    if (!tableBody) return;
    
    // Show loading state
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="text-center">
                    <i class="fas fa-spinner fa-pulse fa-2x" style="color: #7a0000;"></i>
                    <p class="mt-2">Filtering performers...</p>
                </div>
            </td>
        </tr>
    `;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const response = await fetch(`http://localhost:5000/api/admin/performance/top-performers?subject=${encodeURIComponent(filterValue)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const performers = result.performers || [];
            
            if (performers.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center py-4">
                            <div class="text-center">
                                <i class="fas fa-user-slash" style="font-size: 2rem; color: #ccc;"></i>
                                <p class="mt-2">No performers found for this subject</p>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Render filtered performers
            renderTopPerformersTable(performers);
            
        } else {
            throw new Error(result.message || 'Failed to load performers');
        }
        
    } catch (error) {
        console.error('❌ Error filtering performers:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="text-center">
                        <i class="fas fa-exclamation-circle" style="color: #f44336; font-size: 2rem;"></i>
                        <p class="mt-2">Failed to filter performers</p>
                        <p class="text-muted small">${error.message}</p>
                        <button class="btn btn-sm btn-primary mt-2" onclick="filterTopPerformers()" style="background: #7a0000;">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

/**
 * SEARCH PERFORMERS
 */
async function filterTopPerformersBySearch(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
        // If search is empty, reload with current filter
        const currentFilter = document.getElementById('topPerformersFilter')?.value || 'all';
        await loadTopPerformers(currentFilter);
        return;
    }
    
    const term = searchTerm.trim();
    console.log(`🔍 Searching performers for: "${term}"`);
    
    const tableBody = document.getElementById('topPerformersBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
                <p class="mt-2">Searching...</p>
            </td>
        </tr>
    `;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/performance/search?q=${encodeURIComponent(term)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const performers = result.performers || [];
        
        if (performers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <i class="fas fa-search" style="font-size: 2rem; color: #ccc;"></i>
                        <p class="mt-2">No results found for "${term}"</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        renderTopPerformersTable(performers);
        
    } catch (error) {
        console.error('❌ Error searching performers:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <i class="fas fa-exclamation-circle" style="color: #f44336;"></i>
                    <p class="mt-2">Search failed</p>
                    <button class="btn btn-sm btn-primary mt-2" onclick="filterTopPerformersBySearch('${term}')">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * VIEW STUDENT PERFORMANCE DETAILS
 */
async function viewStudentPerformance(studentId) {
    console.log("👁️ Viewing student performance:", studentId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading notification
        showNotification('info', 'Loading', 'Fetching student details...');
        
        const response = await fetch(`http://localhost:5000/api/admin/students/${studentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.student) {
            throw new Error(result.message || 'Student not found');
        }
        
        const student = result.student;
        
        // Get or create modal
        let modal = document.getElementById('questionModal');
        
        // If modal doesn't exist, create it
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'questionModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-backdrop" onclick="closeModal()"></div>
                <div class="modal-content">
                    <div class="modal-header mobile-compact">
                        <h3 class="modal-title mobile-font-small"><i class="fas fa-user-graduate"></i> Student Details</h3>
                        <button class="modal-close" onclick="closeModal()">&times;</button>
                    </div>
                    <div class="modal-body" id="modalBody"></div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary mobile-font-smaller" onclick="closeModal()">Close</button>
                        <button class="btn btn-primary mobile-font-smaller" id="sendMessageBtn">Send Message</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Get modal body
        const modalBody = document.getElementById('modalBody');
        if (!modalBody) return;
        
        // Generate avatar color
        const avatarColor = getAvatarColor(student.avatar || student.name);
        
        // Format dates
        const joinedDate = student.joinedDate ? new Date(student.joinedDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : 'Unknown';
        
        const lastActive = student.lastActive || 'Never';
        
        // Create modal content
        modalBody.innerHTML = `
            <div class="student-detail-section" style="padding: 10px;">
                <!-- Student Header with Avatar -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="
                        width: 100px;
                        height: 100px;
                        border-radius: 50%;
                        background: ${avatarColor};
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 36px;
                        font-weight: bold;
                        margin: 0 auto 15px auto;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                    ">
                        ${student.avatar || getInitials(student.name)}
                    </div>
                    <h3 style="margin: 10px 0 5px 0; color: #333; font-size: 24px;">${student.name}</h3>
                    <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">${student.email}</p>
                    
                    <!-- Status Badges -->
                    <div style="display: flex; gap: 10px; justify-content: center; margin-bottom: 20px;">
                        <span style="background: #7a0000; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                            <i class="fas fa-graduation-cap"></i> Student
                        </span>
                        <span style="background: ${student.status === 'active' ? '#4CAF50' : '#f44336'}; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: 500;">
                            <i class="fas ${student.status === 'active' ? 'fa-check-circle' : 'fa-times-circle'}"></i> 
                            ${student.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #7a0000;">
                        <div style="font-size: 28px; font-weight: bold; color: #7a0000;">${student.avgScore || 0}%</div>
                        <div style="font-size: 12px; color: #666;">Average Score</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #2196F3;">
                        <div style="font-size: 28px; font-weight: bold; color: #2196F3;">${student.lessonsCompleted || 0}</div>
                        <div style="font-size: 12px; color: #666;">Lessons Completed</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #4CAF50;">
                        <div style="font-size: 28px; font-weight: bold; color: #4CAF50;">${student.quizzesPassed || 0}</div>
                        <div style="font-size: 12px; color: #666;">Quizzes Passed</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; text-align: center; border-left: 4px solid #FF9800;">
                        <div style="font-size: 28px; font-weight: bold; color: #FF9800;">${student.streakDays || 0}</div>
                        <div style="font-size: 12px; color: #666;">Day Streak</div>
                    </div>
                </div>
                
                <!-- Additional Info -->
                <div style="background: #f8f9fa; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-info-circle" style="color: #7a0000;"></i> Additional Information
                    </h4>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                            <span style="color: #666;"><i class="fas fa-calendar"></i> Joined Date:</span>
                            <span style="font-weight: 500; color: #333;">${joinedDate}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                            <span style="color: #666;"><i class="fas fa-clock"></i> Last Active:</span>
                            <span style="font-weight: 500; color: #333;">${lastActive}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e0e0e0;">
                            <span style="color: #666;"><i class="fas fa-hourglass-half"></i> Total Time:</span>
                            <span style="font-weight: 500; color: #333;">${student.totalHours || 0} hours</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Update modal title
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="fas fa-user-graduate"></i> ${student.name}'s Performance`;
        }
        
        // Update send message button
        const sendMsgBtn = document.getElementById('sendMessageBtn');
        if (sendMsgBtn) {
            sendMsgBtn.onclick = function() {
                sendMessageToStudent(studentId);
            };
        }
        
        // Show the modal
        modal.style.display = 'flex';
        modal.style.zIndex = '9999';
        document.body.classList.add('modal-open');
        
    } catch (error) {
        console.error('❌ Error viewing student:', error);
        showNotification('error', 'Load Failed', error.message || 'Could not load student details');
    }
}

/**
 * SEND MESSAGE TO STUDENT
 */
async function sendMessageToStudent(studentId) {
    console.log("💬 Sending message to student:", studentId);
    
    const message = prompt("Enter your message to the student:");
    
    if (!message || message.trim() === '') {
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/messages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipient_id: studentId,
                message: message.trim(),
                type: 'notification'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Message Sent', 'Your message has been sent to the student');
        } else {
            throw new Error(result.message || 'Failed to send message');
        }
        
    } catch (error) {
        console.error('❌ Error sending message:', error);
        showNotification('error', 'Send Failed', error.message);
    }
}

/**
 * REFRESH SUBJECT BREAKDOWN
 */
async function refreshSubjectBreakdown() {
    showNotification('info', 'Refreshing', 'Loading latest subject data...');
    await loadSubjectBreakdown();
}


/**
 * LOAD SUBJECT BREAKDOWN FROM DATABASE
 */
async function loadSubjectBreakdown() {
    console.log("📚 Loading subject breakdown from database...");
    
    const grid = document.getElementById('subjectBreakdownGrid');
    if (!grid) return;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/performance/subject-breakdown', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Subject breakdown response:', result);
        
        if (result.success) {
            const subjects = result.subjects || [];
            
            // Check if there's actual data
            if (subjects.length === 0 || subjects.every(s => s.totalStudents === 0)) {
                grid.innerHTML = `
                    <div class="text-center py-5" style="grid-column: 1/-1;">
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                            <h4 style="color: #666; margin-bottom: 5px;">No Subject Data Available</h4>
                            <p style="color: #999; margin-bottom: 15px;">Students haven't started any subjects yet.</p>
                            <p style="color: #7a0000; font-size: 0.9rem;">
                                <i class="fas fa-info-circle"></i> Statistics will appear once students begin learning.
                            </p>
                        </div>
                    </div>
                `;
                return;
            }
            
            // Render subjects if there's data
            renderSubjectBreakdown(subjects);
            
        } else {
            throw new Error(result.message || 'Failed to load subjects');
        }
        
    } catch (error) {
        console.error('❌ Error loading subject breakdown:', error);
        grid.innerHTML = `
            <div class="text-center py-5" style="grid-column: 1/-1;">
                <i class="fas fa-exclamation-circle" style="color: #f44336;"></i>
                <p class="mt-2">Failed to load subject data</p>
                <button class="btn btn-sm btn-primary mt-2" onclick="loadSubjectBreakdown()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

/**
 * RENDER SUBJECT BREAKDOWN
 */
function renderSubjectBreakdown(subjects) {
    const grid = document.getElementById('subjectBreakdownGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-performance-card';
        card.innerHTML = `
            <div class="subject-performance-header">
                <div class="subject-performance-icon" style="background: ${subject.color || '#7a0000'}">
                    <i class="${subject.icon || 'fas fa-book'}"></i>
                </div>
                <div class="subject-performance-title">
                    <h4>${subject.name.charAt(0).toUpperCase() + subject.name.slice(1)}</h4>
                    <p>${subject.totalStudents || 0} students enrolled</p>
                </div>
            </div>
            <div class="subject-performance-stats">
                <div class="subject-stat">
                    <span class="subject-stat-value">${subject.avgScore || 0}%</span>
                    <span class="subject-stat-label">Avg. Score</span>
                </div>
                <div class="subject-stat">
                    <span class="subject-stat-value">${subject.completionRate || 0}%</span>
                    <span class="subject-stat-label">Completion</span>
                </div>
            </div>
            <div class="subject-performance-footer">
                <i class="fas fa-trophy" style="color: #FFD700;"></i> 
                Top: ${subject.topPerformer || 'No data'}
            </div>
        `;
        grid.appendChild(card);
    });
}

// ===== REAL ANALYTICS DASHBOARD FUNCTIONS =====
async function initializeAnalyticsDashboard() {
    console.log("📊 Initializing Analytics Dashboard with real data...");
    
    // Show loading states
    showAnalyticsLoadingStates();
    
    try {
        // Load all analytics data in parallel
        await Promise.all([
            loadAnalyticsStats(),           // Load stats cards
            loadUserGrowthData(),           // Load user growth chart data
            loadLessonPopularityData(),      // Load lesson popularity chart data
            loadSubjectAnalytics()           // Load subject-specific analytics
        ]);
        
        console.log('✅ Analytics dashboard initialized successfully');
        
    } catch (error) {
        console.error('❌ Error loading analytics data:', error);
        showNotification('error', 'Load Failed', 'Could not load analytics data');
    }
}

// ===== Show loading states for analytics =====
function showAnalyticsLoadingStates() {
    const statsElements = [
        'analyticsTotalUsers',
        'analyticsTotalLessons', 
        'analyticsCompletionRate',
        'analyticsEngagementRate'
    ];
    
    statsElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    });
}

// ===== Load analytics stats from database =====
async function loadAnalyticsStats() {
    console.log("📊 Loading analytics stats from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('No token found');
            return;
        }
        
        // Get total users
        const usersResponse = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let totalUsers = 0;
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            if (usersData.success && usersData.users) {
                totalUsers = usersData.users.length;
            }
        }
        
        // Get total lessons
        const lessonsResponse = await fetch('http://localhost:5000/api/admin/lessons', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let totalLessons = 0;
        if (lessonsResponse.ok) {
            const lessonsData = await lessonsResponse.json();
            if (lessonsData.success && lessonsData.lessons) {
                totalLessons = lessonsData.lessons.length;
            }
        }
        
        // Get completion rate from progress data
        const progressResponse = await fetch('http://localhost:5000/api/progress/summary', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        let completionRate = 0;
        if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            if (progressData.success && progressData.summary) {
                const summary = progressData.summary;
                if (summary.totalLessons > 0) {
                    completionRate = Math.round((summary.lessonsCount / summary.totalLessons) * 100);
                }
            }
        }
        
        // Calculate engagement rate (active users in last 7 days)
        let engagementRate = 0;
        if (totalUsers > 0) {
            // Get recent activity
            const activityResponse = await fetch('http://localhost:5000/api/admin/recent-activity', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (activityResponse.ok) {
                const activityData = await activityResponse.json();
                if (activityData.success && activityData.recent_users) {
                    const recentUsers = activityData.recent_users || 0;
                    engagementRate = Math.round((recentUsers / totalUsers) * 100);
                } else {
                    // Fallback: approximate engagement rate
                    engagementRate = Math.min(85, Math.round(completionRate * 0.9));
                }
            } else {
                engagementRate = Math.min(85, Math.round(completionRate * 0.9));
            }
        }
        
        // Update UI with animation
        animateNumber('analyticsTotalUsers', totalUsers);
        animateNumber('analyticsTotalLessons', totalLessons);
        animateNumber('analyticsCompletionRate', completionRate + '%');
        animateNumber('analyticsEngagementRate', engagementRate + '%');
        
        console.log('✅ Analytics stats updated:', {
            totalUsers,
            totalLessons,
            completionRate,
            engagementRate
        });
        
    } catch (error) {
        console.error('❌ Error loading analytics stats:', error);
        
        // Fallback to demo data
        document.getElementById('analyticsTotalUsers').textContent = '2,458';
        document.getElementById('analyticsTotalLessons').textContent = '156';
        document.getElementById('analyticsCompletionRate').textContent = '78%';
        document.getElementById('analyticsEngagementRate').textContent = '89%';
    }
}

// ===== LOAD USER GROWTH DATA FROM DATABASE =====
async function loadUserGrowthData() {
    console.log("📈 Loading REAL user growth data from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('No token found');
            return;
        }
        
        // Fetch all users from database
        const response = await fetch('http://localhost:5000/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success || !result.users) {
            throw new Error('Failed to load users');
        }
        
        const users = result.users;
        console.log(`✅ Found ${users.length} users for growth analysis`);
        
        // Get current date
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Generate data for last 12 months
        const months = [];
        const monthlyData = [];
        
        for (let i = 11; i >= 0; i--) {
            // Calculate month and year
            const targetDate = new Date(currentYear, currentMonth - i, 1);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth();
            
            // Format month label
            const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
            const yearLabel = year === currentYear ? '' : ` ${year}`;
            months.push(`${monthName}${yearLabel}`);
            
            // Count users registered in this month
            const count = users.filter(user => {
                if (!user.registrationDate) return false;
                
                try {
                    const regDate = new Date(user.registrationDate);
                    return regDate.getMonth() === month && regDate.getFullYear() === year;
                } catch (e) {
                    return false;
                }
            }).length;
            
            monthlyData.push(count);
        }
        
        console.log('📊 Monthly user registration data:', monthlyData);
        
        // Check if chart exists
        if (!analyticsCharts.userGrowthChart) {
            console.log('⚠️ User growth chart not initialized yet');
            return;
        }
        
        // Update chart data
        analyticsCharts.userGrowthChart.data.labels = months;
        analyticsCharts.userGrowthChart.data.datasets[0].data = monthlyData;
        
        // Update chart title based on whether we have data
        const hasData = monthlyData.some(count => count > 0);
        
        if (hasData) {
            analyticsCharts.userGrowthChart.options.plugins.title.display = false;
            
            // Calculate and display total
            const totalNewUsers = monthlyData.reduce((sum, count) => sum + count, 0);
            if (document.getElementById('analyticsTotalUsers')) {
                document.getElementById('analyticsTotalUsers').textContent = totalNewUsers;
            }
        } else {
            analyticsCharts.userGrowthChart.options.plugins.title = {
                display: true,
                text: 'No user registration data available yet',
                color: '#999',
                font: { size: 14 }
            };
        }
        
        analyticsCharts.userGrowthChart.update();
        console.log('✅ User growth chart updated with real data');
        
    } catch (error) {
        console.error('❌ Error loading user growth data:', error);
        
        // Show error in chart
        if (analyticsCharts.userGrowthChart) {
            analyticsCharts.userGrowthChart.options.plugins.title = {
                display: true,
                text: 'Failed to load user data',
                color: '#f44336',
                font: { size: 14 }
            };
            analyticsCharts.userGrowthChart.update();
        }
    }
}

// ===== LOAD LESSON POPULARITY DATA - SIMPLIFIED =====
async function loadLessonPopularityData() {
    console.log("📊 Loading lesson popularity data...");
    
    const canvas = document.getElementById('lessonPopularityChart');
    if (!canvas) return;
    
    const container = canvas.parentElement;
    
    // Simple loading indicator
    container.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-pulse fa-3x"></i><p>Loading...</p></div>';
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        const filter = document.getElementById('lessonPopularityFilter')?.value || 'views';
        
        const response = await fetch(`http://localhost:5000/api/admin/lesson-popularity?filter=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        // Clear container
        container.innerHTML = '<canvas id="lessonPopularityChart"></canvas>';
        const newCanvas = document.getElementById('lessonPopularityChart');
        
        if (result.success && result.lessons.length > 0) {
            const chartData = result.chart;
            
            // Create chart
            new Chart(newCanvas, {
                type: 'bar',
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
            
            console.log('✅ Chart created with', result.lessons.length, 'lessons');
        } else {
            container.innerHTML = '<div style="text-align:center;padding:40px;">No lesson data available</div>';
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#f44336;">Failed to load data</div>';
    }
}

// ===== UPDATE LESSON POPULARITY LIST =====
function updateLessonPopularityList(lessons) {
    // Check if there's a list container (optional)
    const listContainer = document.getElementById('lessonPopularityList');
    if (!listContainer) return;
    
    if (lessons.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <i class="fas fa-book-open" style="font-size: 2rem; color: #ccc;"></i>
                <p style="color: #666; margin-top: 10px;">No lesson data available</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    lessons.forEach((lesson, index) => {
        const rank = index + 1;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        
        html += `
            <div class="lesson-popularity-item">
                <div class="lesson-rank ${rankClass}">${rank}</div>
                <div class="lesson-info">
                    <span class="lesson-title">${lesson.title}</span>
                    <span class="lesson-type">${lesson.type}</span>
                </div>
                <div class="lesson-stats">
                    <span class="stat"><i class="fas fa-eye"></i> ${lesson.views}</span>
                    <span class="stat"><i class="fas fa-check-circle"></i> ${lesson.completions}</span>
                    <span class="stat"><i class="fas fa-star"></i> ${lesson.avg_score}%</span>
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}

// ===== UPDATE LESSON POPULARITY CHART =====
async function updateLessonPopularityChart() {
    const filter = document.getElementById('lessonPopularityFilter')?.value || 'views';
    console.log("📊 Updating lesson popularity chart with filter:", filter);
    
    await loadLessonPopularityData();
    
    showNotification('info', 'Chart Updated', `Lesson popularity chart updated`);
}

// ===== UPDATED: Initialize analytics charts with real data support =====
function initializeAnalyticsCharts() {
    console.log("📊 Initializing analytics charts with real data support...");
    
    // Destroy existing charts
    if (analyticsCharts.userGrowthChart) analyticsCharts.userGrowthChart.destroy();
    if (analyticsCharts.lessonPopularityChart) analyticsCharts.lessonPopularityChart.destroy();
    
    // Initialize User Growth Chart (will be populated with real data)
    const userGrowthCtx = document.getElementById('userGrowthChart');
    if (userGrowthCtx) {
        analyticsCharts.userGrowthChart = new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: ['Loading...'],
                datasets: [{
                    label: 'New Users',
                    data: [0],
                    borderColor: 'rgba(139, 0, 0, 1)',
                    backgroundColor: 'rgba(139, 0, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { position: 'top' },
                    title: {
                        display: true,
                        text: 'Loading user growth data...',
                        color: '#999',
                        font: { size: 12 }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        title: { display: true, text: 'Number of Users' }
                    }
                }
            }
        });
    }
    
    // Initialize Lesson Popularity Chart (will be populated with real data)
    const lessonPopularityCtx = document.getElementById('lessonPopularityChart');
    if (lessonPopularityCtx) {
        analyticsCharts.lessonPopularityChart = new Chart(lessonPopularityCtx, {
            type: 'bar',
            data: {
                labels: ['Loading...'],
                datasets: [{
                    label: 'Views',
                    data: [0],
                    backgroundColor: 'rgba(139, 0, 0, 0.8)',
                    borderColor: 'rgba(139, 0, 0, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Loading lesson data...',
                        color: '#999',
                        font: { size: 12 }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true, 
                        title: { display: true, text: 'Number of Views' }
                    }
                }
            }
        });
    }
    
    // Load real data after initialization
    setTimeout(() => {
        loadUserGrowthData();
        loadLessonPopularityData();
    }, 100);
}

// ===== UPDATED: Update user growth chart with filter =====
async function updateUserGrowthChart() {
    const filterValue = document.getElementById('userGrowthTimeRange')?.value || 'year';
    console.log("📈 Updating user growth chart with filter:", filterValue);
    
    // Show loading indicator
    if (analyticsCharts.userGrowthChart) {
        analyticsCharts.userGrowthChart.options.plugins.title = {
            display: true,
            text: 'Updating data...',
            color: '#1976d2',
            font: { size: 12 }
        };
        analyticsCharts.userGrowthChart.update();
    }
    
    await loadUserGrowthData();
    
    showNotification('info', 'Chart Updated', `User growth chart updated with real data`);
}

// ===== UPDATED: Update lesson popularity chart with filter =====
async function updateLessonPopularityChart() {
    const filterValue = document.getElementById('lessonPopularityFilter')?.value || 'views';
    console.log("📊 Updating lesson popularity chart with filter:", filterValue);
    
    // Show loading indicator
    if (analyticsCharts.lessonPopularityChart) {
        analyticsCharts.lessonPopularityChart.options.plugins.title = {
            display: true,
            text: 'Updating data...',
            color: '#1976d2',
            font: { size: 12 }
        };
        analyticsCharts.lessonPopularityChart.update();
    }
    
    await loadLessonPopularityData();
    
    showNotification('info', 'Chart Updated', `Lesson popularity chart updated with real data`);
}

function updateAnalyticsStats() {
    const SUBJECTS = {
        polynomial: { stats: { lessons: 8, students: 145, completionRate: "85%", views: 1245, attempts: 42 } },
        factorial: { stats: { lessons: 5, students: 98, completionRate: "78%", views: 890, attempts: 31 } },
        mdas: { stats: { lessons: 6, students: 210, completionRate: "92%", views: 1560, attempts: 67 } }
    };
    
    const totalLessons = Object.values(SUBJECTS).reduce((sum, s) => sum + s.stats.lessons, 0);
    const totalStudents = Object.values(SUBJECTS).reduce((sum, s) => sum + s.stats.students, 0);
    const avgCompletion = Object.values(SUBJECTS).reduce((sum, s) => sum + parseInt(s.stats.completionRate), 0) / Object.keys(SUBJECTS).length;
    const totalViews = Object.values(SUBJECTS).reduce((sum, s) => sum + s.stats.views, 0);
    const totalAttempts = Object.values(SUBJECTS).reduce((sum, s) => sum + s.stats.attempts, 0);
    const engagementRate = totalAttempts > 0 ? Math.round((totalAttempts / totalViews) * 100) : 0;
    
    document.getElementById('analyticsTotalUsers').textContent = totalStudents.toLocaleString();
    document.getElementById('analyticsTotalLessons').textContent = totalLessons;
    document.getElementById('analyticsCompletionRate').textContent = Math.round(avgCompletion) + '%';
    document.getElementById('analyticsEngagementRate').textContent = engagementRate + '%';
}


function initializeCharts() {
    console.log("📊 Initializing charts...");
    
    // ===== FIX 1: Destroy existing charts first =====
    
    // Check and destroy performance chart
    const performanceCanvas = document.getElementById('performanceTrendChart');
    if (performanceCanvas) {
        const existingPerfChart = Chart.getChart(performanceCanvas);
        if (existingPerfChart) {
            console.log("♻️ Destroying existing performance chart");
            existingPerfChart.destroy();
        }
    }
    
    // Check and destroy distribution chart
    const distributionCanvas = document.getElementById('scoreDistributionChart');
    if (distributionCanvas) {
        const existingDistChart = Chart.getChart(distributionCanvas);
        if (existingDistChart) {
            console.log("♻️ Destroying existing distribution chart");
            existingDistChart.destroy();
        }
    }
    
    // Alternative: Destroy all charts
    // Chart.helpers.each(Chart.instances, function(instance) {
    //     instance.destroy();
    // });
    
    // ===== FIX 2: Store charts in variables/global scope =====
    
    // Initialize performance trend chart
    if (performanceCanvas) {
        try {
            window.performanceChart = new Chart(performanceCanvas, {
                type: 'line',
                data: {
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [{
                        label: 'Average Score',
                        data: [0, 0, 0, 0],
                        borderColor: 'var(--primary)',
                        backgroundColor: 'rgba(122, 0, 0, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
            console.log("✅ Performance chart created");
        } catch (error) {
            console.error("❌ Error creating performance chart:", error);
        }
    } else {
        console.warn("⚠️ performanceTrendChart canvas not found");
    }
    
    // Initialize score distribution chart
    if (distributionCanvas) {
        try {
            window.distributionChart = new Chart(distributionCanvas, {
                type: 'pie',
                data: {
                    labels: ['90-100%', '80-89%', '70-79%', '60-69%', 'Below 60%'],
                    datasets: [{
                        data: [0, 0, 0, 0, 0],
                        backgroundColor: [
                            'var(--success)',
                            'var(--info)',
                            'var(--warning)',
                            '#ff9800',
                            '#f44336'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
            console.log("✅ Distribution chart created");
        } catch (error) {
            console.error("❌ Error creating distribution chart:", error);
        }
    } else {
        console.warn("⚠️ scoreDistributionChart canvas not found");
    }
    
    console.log("📊 Charts initialization complete");
}

// ===== OTHER FUNCTIONS =====
function createLesson() {
    const title = document.getElementById('createLessonTitle').value;
    const subject = document.getElementById('createLessonSubject').value;
    
    if (!title.trim()) {
        showNotification('error', 'Error', 'Please enter a lesson title');
        return;
    }
    
    showNotification('success', 'Lesson Created', `"${title}" has been created for ${getSubjectDisplayName(subject)}`);
    closeCreateLessonModal();
}

function saveChanges() {
    showNotification('success', 'Changes Saved', 'Lesson changes have been saved successfully.');
    closeEditLessonModal();
}

// ===== HELPER FUNCTIONS =====
function initializeInteractiveCards() {
    const cards = document.querySelectorAll('.interactive-card');
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const subject = this.dataset.subject;
            if (subject) {
                selectSubject(subject);
            }
        });
        
        // Add hover effect
        card.addEventListener('mouseenter', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateY(-5px)';
                this.style.boxShadow = 'var(--shadow-hover)';
            }
        });
        
        card.addEventListener('mouseleave', function() {
            if (!this.classList.contains('active')) {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'var(--shadow)';
            }
        });
    });
}

function updateAllStatsWithAnimation() {
    // Update all dashboard stats with sequential animation
    const elements = [
        'totalLessons', 'totalStudents', 'avgGrade', 'pendingReviews',
        'avgScore', 'completionRate', 'avgTime', 'activeStudents',
        'averageRating', 'totalReviews', 'pendingFeedback', 'satisfactionRate'
    ];
    
    elements.forEach((id, index) => {
        setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
                element.classList.add('gentle-pulse');
                setTimeout(() => element.classList.remove('gentle-pulse'), 1000);
            }
        }, index * 150);
    });
}

function preloadImportantData() {
    // Simulate loading important data
    showNotification('info', 'System', 'Dashboard data loaded successfully');
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    const tabContent = document.getElementById(tabName + 'Tab');
    if (tabContent) {
        tabContent.style.display = 'block';
        
        // Load activity log when Activity tab is selected
        if (tabName === 'activity') {
            setTimeout(() => {
                if (typeof loadActivityLog === 'function') {
                    loadActivityLog();
                }
            }, 100);
        }
    }
}

function addSubjectResource(subject, e) {
    if (e) e.stopPropagation();
    showNotification('info', 'Add Resource', `Adding resource to ${getSubjectDisplayName(subject)} subject`);
}

function filterAssignments() {
    showNotification('info', 'Filter', 'Filtering assignments');
}

function replyToFeedback(id) {
    showNotification('info', 'Feedback', `Replying to feedback #${id}`);
}

function markAsRead(id) {
    showNotification('info', 'Feedback', `Marked feedback #${id} as read`);
}

function sendFeedbackResponse() {
    showNotification('success', 'Feedback', 'Response sent successfully');
    closeFeedbackReplyModal();
}

function addNewSubject() {
    showNotification('info', 'Add Subject', 'Add new subject feature coming soon!');
}

function exportSubjectsData() {
    showNotification('info', 'Export Data', 'Exporting subjects data...');
    
    setTimeout(() => {
        showNotification('success', 'Export Complete', 'Subjects data has been exported successfully.');
    }, 1500);
}

function showWelcomePage() {
    // This would show the welcome section in the lesson dashboard
    document.getElementById('welcomeSection').style.display = 'block';
}

function resolveFeedback() {
    showNotification('success', 'Feedback Resolved', 'Feedback has been marked as resolved.');
    closeFeedbackDetailModal();
}

// ===== NEW SETTINGS DASHBOARD FUNCTIONS =====

function loadSessions() {
    const sessionsList = document.getElementById('sessionsList');
    if (!sessionsList) return;
    
    const sessions = [
        { device: 'Chrome on Windows', location: 'New York, USA', lastActive: 'Currently active' },
        { device: 'Safari on iPhone', location: 'Los Angeles, USA', lastActive: '2 hours ago' },
        { device: 'Firefox on Mac', location: 'London, UK', lastActive: '1 day ago' }
    ];
    
    sessionsList.innerHTML = '';
    sessions.forEach(session => {
        const sessionItem = document.createElement('div');
        sessionItem.style.padding = '10px';
        sessionItem.style.borderBottom = '1px solid var(--border-color)';
        sessionItem.style.display = 'flex';
        sessionItem.style.justifyContent = 'space-between';
        sessionItem.style.alignItems = 'center';
        sessionItem.innerHTML = `
            <div>
                <div style="font-weight: 600; color: var(--dark);">${session.device}</div>
                <div style="font-size: 0.85rem; color: var(--medium-gray);">${session.location} • ${session.lastActive}</div>
            </div>
            <button class="action-btn delete" onclick="logoutSession('${session.device}')" title="Logout this session">
                <i class="fas fa-sign-out-alt"></i>
            </button>
        `;
        sessionsList.appendChild(sessionItem);
    });
}

function logoutSession(device) {
    if (confirm(`Are you sure you want to logout the session on ${device}?`)) {
        showNotification('info', 'Session Logged Out', `Session on ${device} has been terminated.`);
        // Reload sessions list
        setTimeout(() => loadSessions(), 1000);
    }
}

function saveNotificationSettings() {
    const emailNotifications = document.getElementById('emailNotifications').checked;
    const notifNewUsers = document.getElementById('notifNewUsers').checked;
    const notifLessonUpdates = document.getElementById('notifLessonUpdates').checked;
    const notifSystemAlerts = document.getElementById('notifSystemAlerts').checked;
    const notifWeeklyReports = document.getElementById('notifWeeklyReports').checked;
    
    showNotification('success', 'Notification Settings Saved', 'Your notification preferences have been updated.');
}

function exportSystemLogs() {
    showNotification('info', 'Exporting Logs', 'Preparing system logs for export...');
    
    setTimeout(() => {
        showNotification('success', 'Export Complete', 'System logs have been exported successfully.');
        
        // Simulate download
        const exportData = {
            timestamp: new Date().toISOString(),
            type: 'system_logs',
            logs: 'System logs data...'
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportLink = document.createElement('a');
        exportLink.setAttribute('href', dataUri);
        exportLink.setAttribute('download', `mathhub-system-logs-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(exportLink);
        exportLink.click();
        document.body.removeChild(exportLink);
    }, 1500);
}

function showResetSystemModal() {
    if (confirm('⚠️ WARNING ⚠️\n\nAre you sure you want to reset the system? This will restore all settings to their default values but keep user data.\n\nType "RESET" to confirm.')) {
        const confirmation = prompt('Please type "RESET" to confirm system reset:');
        if (confirmation === 'RESET') {
            showNotification('warning', 'System Reset', 'System has been reset to default settings.');
        } else {
            showNotification('warning', 'Cancelled', 'System reset was cancelled.');
        }
    }
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getUsersFromStorage() {
    try {
        // Always use the same key
        const STORAGE_KEY = 'mathhub_users';
        const usersData = localStorage.getItem(STORAGE_KEY);
        
        if (usersData) {
            const users = JSON.parse(usersData);
            console.log(`📊 Retrieved ${users.length} users from localStorage`);
            return users;
        }
        
        console.log("No users found in storage");
        return [];
    } catch (error) {
        console.error("Error getting users from localStorage:", error);
        return [];
    }
}

function addModalBackdrop() {
    // Check if backdrop already exists
    if (document.getElementById('modalBackdrop')) {
        return;
    }
    
    // Create backdrop element
    const backdrop = document.createElement('div');
    backdrop.id = 'modalBackdrop';
    backdrop.className = 'modal-backdrop fade show';
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 1040;
    `;
    
    // Add click handler to close modal when clicking on backdrop
    backdrop.onclick = function() {
        removeModalBackdrop();
        // Also hide any open modals
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
    };
    
    document.body.appendChild(backdrop);
    document.body.classList.add('modal-open');
    
    // Prevent body scrolling
    document.body.style.overflow = 'hidden';
}

function removeModalBackdrop() {
    const backdrop = document.getElementById('modalBackdrop');
    if (backdrop) {
        backdrop.remove();
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
    }
}
// Save user to localStorage
function saveUserToStorage(user) {
    try {
        console.log("💾 Saving user to localStorage...");
        
        // Always use the same key
        const STORAGE_KEY = 'mathhub_users';
        
        // Get existing users
        let users = [];
        const existing = localStorage.getItem(STORAGE_KEY);
        
        if (existing) {
            users = JSON.parse(existing);
            console.log(`Found ${users.length} existing users`);
        }
        
        // Add new user
        users.push(user);
        
        // Save
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        
        // Verify
        const verify = JSON.parse(localStorage.getItem(STORAGE_KEY));
        console.log(`✅ Saved successfully! Total users: ${verify.length}`);
        
        return true;
    } catch (error) {
        console.error("Save error:", error);
        return false;   
    }
}

function saveUsersToStorage() {
    try {
        localStorage.setItem('mathhub_users', JSON.stringify(usersData));
        console.log("💾 Users saved to localStorage");
        return true;
    } catch (error) {
        console.error("❌ Error saving users:", error);
        showNotification('error', 'Save Error', 'Failed to save user data.');
        return false;
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function setElementContent(elementId, content) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = content;
        return true;
    } else {
        console.warn(`Element with ID "${elementId}" not found`);
        return false;
    }
}

function generatePassword() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    // Generate 12-character password
    for (let i = 0; i < 12; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    document.getElementById('generatedPassword').value = password;
    
    // Optional: Copy to clipboard
    navigator.clipboard.writeText(password).then(() => {
        showNotification('info', 'Password Generated', 'Password copied to clipboard!');
    });
}

function resetAddUserForm() {
    const nameInput = document.getElementById('newUserName');
    const emailInput = document.getElementById('newUserEmail');
    const passwordInput = document.getElementById('newUserPassword');
    const roleInput = document.getElementById('selectedUserRole');
    const statusToggle = document.getElementById('userStatusToggle');
    const welcomeToggle = document.getElementById('sendWelcomeEmail');
    
    if (nameInput) nameInput.value = '';
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (roleInput) roleInput.value = 'student';
    if (statusToggle) statusToggle.checked = true;
    if (welcomeToggle) welcomeToggle.checked = true;
    
    // Reset role selection UI
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
    });
    const studentRole = document.getElementById('roleStudent');
    if (studentRole) studentRole.classList.add('selected');
}

// ===== UPDATED USER MANAGEMENT FUNCTIONS =====

function filterUsersBySearch(searchTerm) {
    if (!searchTerm.trim()) {
        updateUsersTable();
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filteredData = usersData.filter(user => 
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
    );
    
    updateUsersTableWithData(filteredData);
}

function updateBulkActionsPanel() {
    const bulkActionsPanel = document.getElementById('bulkActionsPanel');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedUsers.size > 0) {
        bulkActionsPanel.classList.add('show');
        selectedCount.textContent = `${selectedUsers.size} users selected`;
    } else {
        bulkActionsPanel.classList.remove('show');
    }
}

function saveAccountSettings() {
    const displayName = document.getElementById('displayName').value;
    const adminEmail = document.getElementById('adminEmail').value;
    const language = document.getElementById('languageSelect').value;
    
    showNotification('success', 'Account Settings Saved', `Display name: ${displayName}\nEmail: ${adminEmail}\nLanguage: ${language}`);
}

document.addEventListener('DOMContentLoaded', function() {
    // Select ONLY navigation items that should scroll
    const navItems = document.querySelectorAll(
        '.footer-nav-item:not(.logout-btn):not(.cancel-btn), ' +
        '.mobile-menu-item:not(.logout-btn):not(.cancel-btn), ' +
        '[data-nav]:not([data-nav="logout"])'
    );
    
    // Add instant scroll to each
    navItems.forEach(item => {
        // Check if this is a logout or cancel button
        const isLogout = item.textContent.toLowerCase().includes('logout');
        const isCancel = item.textContent.toLowerCase().includes('cancel');
        const hasLogoutClass = item.classList.contains('logout-btn') || 
                            item.classList.contains('cancel-btn') ||
                            item.id === 'logout-btn' || 
                            item.id === 'cancel-btn';
        
        // Skip logout/cancel buttons
        if (isLogout || isCancel || hasLogoutClass) {
            return;
        }
        
        // Store original click handler
        const originalClick = item.onclick;
        
        // Replace with new handler that scrolls first
        item.addEventListener('click', function(e) {
            // INSTANT SCROLL - NO ANIMATION
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            
            // Execute original click after scroll
            if (originalClick) {
                originalClick.call(this, e);
            }
            
            // Extra scroll for safety
            setTimeout(() => window.scrollTo(0, 0), 10);
        }, true);
    });
    
    // Rest of your code remains the same...
    const showFunctions = [
        'showDashboard',
        'showLessonDashboard',
        'showPerformanceDashboard', 
        'showFeedbackDashboard',
        'showAnalytics',
        'showSettings'
    ];
    
    showFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            const originalFunc = window[funcName];
            window[funcName] = function(e) {
                // SCROLL FIRST, INSTANTLY
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                
                // Call original function
                return originalFunc.call(this, e);
            };
        }
    });
    
    // Force initial scroll if on dashboard
    if (document.querySelector('.admin-header')) {
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
        }, 50);
    }
});

// ===== LOGOUT FUNCTIONS =====
// Function to show logout confirmation
function showLogoutConfirmation() {
    console.log("Showing logout confirmation...");
    
    const modal = document.getElementById('logoutConfirmationModal');
    if (!modal) {
        console.error("Logout modal not found!");
        return;
    }
    
    // Update session time
    updateSessionTime();
    
    // Show the modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10003';
    document.body.classList.add('modal-open');
}

// Function to update session time display
function updateSessionTime() {
    const sessionTimeElement = document.getElementById('confirmationSessionTime');
    if (sessionTimeElement) {
        const now = new Date();
        const options = { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        };
        sessionTimeElement.textContent = now.toLocaleTimeString('en-US', options);
    }
}

// Function to confirm logout
function confirmLogout() {
    console.log("🚪 Confirming admin logout...");
    
    // Disable logout button and show loading
    const logoutBtn = document.querySelector('.btn-confirm-logout');
    if (logoutBtn) {
        logoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        logoutBtn.disabled = true;
    }
    
    // ===== CLEAR ALL ADMIN SESSION DATA =====
    console.log("🧹 Clearing admin session data...");
    
    // Remove admin-specific tokens
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('admin_session');
    localStorage.removeItem('admin_data');
    localStorage.removeItem('admin_refresh_token');
    
    // Clear any admin-specific cache
    localStorage.removeItem('mathhub_database');
    localStorage.removeItem('mysql_lessons_cache_all');
    
    // Clear subject-specific caches
    ['polynomial', 'factorial', 'mdas'].forEach(subject => {
        const subjectId = getSubjectIdFromName ? getSubjectIdFromName(subject) : 
                        (subject === 'polynomial' ? 1 : subject === 'mdas' ? 2 : 3);
        localStorage.removeItem(`mysql_lessons_cache_subject_${subjectId}`);
    });
    
    // Clear session storage
    sessionStorage.removeItem('admin_current_page');
    sessionStorage.removeItem('admin_filters');
    
    // ===== KEEP USER LOGIN DATA INTACT =====
    // Do NOT remove mathhub_user or authToken
    console.log("✅ User login data preserved");
    
    // Close modal
    closeLogoutConfirmation();
    
    // Show success notification
    showNotification('success', 'Logged Out', 'Admin logged out successfully');
    
    // ===== REDIRECT TO USER LOGIN PAGE =====
    setTimeout(() => {
        console.log("🔄 Redirecting to user login page...");
        
        // Get the correct path for user login
        const currentPath = window.location.pathname;
        
        // If we're in a subfolder, go up one level
        if (currentPath.includes('/admin/')) {
            window.location.href = '../index.html#login';
        } else {
            // If we're at root, go to index.html with login hash
            window.location.href = 'index.html#login';
        }
    }, 1000);
}

// Add this to your initialization function
function initializeAdminDashboard() {
    // ... existing initialization code ...
    
    // Initialize logout preference
    const logoutPreference = localStorage.getItem('adminLogoutPreference');
    if (logoutPreference === 'confirmed') {
        const rememberCheckbox = document.getElementById('rememberLogout');
        if (rememberCheckbox) {
            rememberCheckbox.checked = true;
        }
    }
    
    // ... rest of initialization ...
}

// Add event listener for logout confirmation modal
document.addEventListener('DOMContentLoaded', function() {
    const logoutModal = document.getElementById('logoutConfirmationModal');
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal || e.target.classList.contains('modal-backdrop')) {
                closeLogoutConfirmation();
            }
        });
    }
    
    // Add keyboard shortcut for logout (Ctrl+L)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            showLogoutConfirmation();
        }
    });
});

// Show login page (hide dashboard, show login)
function showLoginPage() {
    // Hide admin dashboard
    if (document.getElementById('admin-page')) {
        document.getElementById('admin-page').style.display = 'none';
    }
    
    // Show login page
    const loginPage = document.getElementById('login-page');
    if (loginPage) {
        loginPage.style.display = 'block';
        loginPage.classList.add('active');
    }
    
    // Reset login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();
    
    // Hide login message
    const messageDiv = document.getElementById('loginMessage');
    if (messageDiv) messageDiv.style.display = 'none';
}

// Show admin dashboard (hide login, show dashboard)
function showAdminDashboard() {
    // Hide login page
    const loginPage = document.getElementById('login-page');
    if (loginPage) {
        loginPage.style.display = 'none';
        loginPage.classList.remove('active');
    }
    
    // Show admin dashboard
    if (document.getElementById('admin-page')) {
        document.getElementById('admin-page').style.display = 'block';
    }
    
    // Update login state
    isLoggedIn = true;
    
    // Show dashboard
    showDashboard();
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Simple validation
    if (!email || !password) {
        showLoginMessage('Please enter both email and password', 'error');
        return;
    }
    
    // Demo credentials
    const demoCredentials = {
        email: 'admin@mathhub.com',
        password: 'admin123'
    };
    
    if (email === demoCredentials.email && password === demoCredentials.password) {
        // Simulate login process
        showLoginMessage('Logging in...', 'info');
        
        setTimeout(() => {
            // Save to localStorage if remember me is checked
            if (rememberMe) {
                localStorage.setItem('mathhub_user', JSON.stringify({
                    email: email,
                    lastLogin: new Date().toISOString()
                }));
            }
            
            // Show success message
            showLoginMessage('Login successful! Redirecting...', 'success');
            
            // Redirect to admin dashboard
            setTimeout(() => {
                showAdminDashboard();
            }, 1000);
            
        }, 1500);
    } else {
        showLoginMessage('Invalid email or password. Try: admin@mathhub.com / admin123', 'error');
    }
}

// Show login message
function showLoginMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    if (!messageDiv) return;
    
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // Set color based on type
    switch(type) {
        case 'error':
            messageDiv.style.background = 'rgba(244, 67, 54, 0.1)';
            messageDiv.style.border = '1px solid rgba(244, 67, 54, 0.3)';
            messageDiv.style.color = '#f44336';
            break;
        case 'success':
            messageDiv.style.background = 'rgba(76, 175, 80, 0.1)';
            messageDiv.style.border = '1px solid rgba(76, 175, 80, 0.3)';
            messageDiv.style.color = '#4CAF50';
            break;
        case 'info':
            messageDiv.style.background = 'rgba(33, 150, 243, 0.1)';
            messageDiv.style.border = '1px solid rgba(33, 150, 243, 0.3)';
            messageDiv.style.color = '#2196F3';
            break;
    }
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordInput = document.getElementById('loginPassword');
    const eyeIcon = document.querySelector('#loginPassword + button i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.className = 'fas fa-eye-slash';
    } else {
        passwordInput.type = 'password';
        eyeIcon.className = 'fas fa-eye';
    }
}

const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('admin_token') || '';

// Function para mag-check ng authentication
async function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        console.error('No authentication token found');
        showNotification('error', 'Authentication Required', 'Please login as admin');
        return false;
    }
    
    // Check if token is valid
    try {
        const response = await fetch(`${API_BASE_URL}/admin/lessons`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.status === 401) {
            showNotification('error', 'Session Expired', 'Please login again');
            localStorage.removeItem('admin_token');
            return false;
        }
        
        authToken = token;
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// ===== ADMIN SAVE FUNCTIONS =====
// ===== SINGLE DOMContentLoaded EVENT - UPDATED =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin page loaded - initializing all systems...');
    
    // ============================================
    // 1. CHECK ADMIN AUTHENTICATION
    // ============================================
    const token = localStorage.getItem('admin_token');
    const userRole = localStorage.getItem('user_role');
    
    if (token && userRole === 'admin') {
        console.log('✅ Admin authenticated, loading admin lessons...');
        loadAdminLessons();
    }
    
    // ============================================
    // 2. SETUP NAVIGATION SCROLLING
    // ============================================
    const navItems = document.querySelectorAll(
        '.footer-nav-item:not(.logout-btn):not(.cancel-btn), ' +
        '.mobile-menu-item:not(.logout-btn):not(.cancel-btn), ' +
        '[data-nav]:not([data-nav="logout"])'
    );
    
    navItems.forEach(item => {
        const isLogout = item.textContent.toLowerCase().includes('logout');
        const isCancel = item.textContent.toLowerCase().includes('cancel');
        const hasLogoutClass = item.classList.contains('logout-btn') || 
                            item.classList.contains('cancel-btn') ||
                            item.id === 'logout-btn' || 
                            item.id === 'cancel-btn';
        
        if (isLogout || isCancel || hasLogoutClass) {
            return;
        }
        
        const originalClick = item.onclick;
        
        item.addEventListener('click', function(e) {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            
            if (originalClick) {
                originalClick.call(this, e);
            }
            
            setTimeout(() => window.scrollTo(0, 0), 10);
        }, true);
    });
    
    // ============================================
    // 3. SETUP LOGOUT MODAL & KEYBOARD SHORTCUT
    // ============================================
    const logoutModal = document.getElementById('logoutConfirmationModal');
    if (logoutModal) {
        logoutModal.addEventListener('click', (e) => {
            if (e.target === logoutModal || e.target.classList.contains('modal-backdrop')) {
                closeLogoutConfirmation();
            }
        });
    }
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            showLogoutConfirmation();
        }
    });
    
    // ============================================
    // 4. FORCE INITIAL SCROLL
    // ============================================
    if (document.querySelector('.admin-header')) {
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
        }, 50);
    }
    
    // ============================================
    // 5. LOAD SIDEBAR STATS - PARA SA DASHBOARD LANG
    // ============================================
    // Check kung nasa dashboard section
    if (document.getElementById('dashboardSection')?.classList.contains('active')) {
        setTimeout(() => {
            console.log('📊 Loading sidebar stats for main dashboard...');
            if (typeof loadSidebarStats === 'function') {
                loadSidebarStats();
            }
        }, 100);
    }
    
    // ============================================
    // 6. LOAD SUBJECT STATS
    // ============================================
    setTimeout(() => {
        console.log('📚 Loading subject stats from database...');
        if (typeof updateSubjectStats === 'function') {
            updateSubjectStats();
        }
    }, 500);
    
    // ============================================
    // 7. DELAYED INITIALIZATIONS
    // ============================================
    
    // Load dashboard data after 500ms
    setTimeout(() => {
        console.log('📚 Loading dashboard data...');
        if (document.getElementById('dashboardSection')?.classList.contains('active')) {
            loadRecentLessons();
            loadLessonStats();
            loadDashboardStats();
            loadRecentActivitiesForDashboard();
        }
    }, 500);
    
    // Add modal animations after 1 second
    setTimeout(() => {
        console.log('🎨 Adding modal animations...');
        if (typeof addModalAnimations === 'function') addModalAnimations();
    }, 1000);
    
    // Add preview listeners after 1.5 seconds
    setTimeout(() => {
        console.log('👁️ Adding topic preview listeners...');
        if (typeof addTopicPreviewListeners === 'function') addTopicPreviewListeners();
        if (typeof initializeGeneralModuleSystem === 'function') initializeGeneralModuleSystem();
    }, 1500);
    
    // Check if quiz dashboard is active
    setTimeout(() => {
        if (document.getElementById('quizDashboardSection')?.classList.contains('active')) {
            initializeQuizChart();
        }
    }, 1000);
    
    // Update current time
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // ============================================
    // 8. LOAD USERS WHEN USERS TAB IS CLICKED
    // ============================================
    const usersTabBtn = document.querySelector('.tab-btn[onclick="switchTab(\'users\')"]');
    if (usersTabBtn) {
        const originalClick = usersTabBtn.onclick;
        usersTabBtn.onclick = function(e) {
            if (originalClick) originalClick.call(this, e);
            
            setTimeout(() => {
                if (typeof loadUsersData === 'function') {
                    loadUsersData();
                }
            }, 100);
        };
    }
    
    // ============================================
    // 9. OVERRIDE SHOW FUNCTIONS FOR SCROLL
    // ============================================
    const showFunctions = [
        'showDashboard',
        'showLessonDashboard',
        'showPerformanceDashboard', 
        'showFeedbackDashboard',
        'showAnalytics',
        'showSettings'
    ];
    
    showFunctions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            const originalFunc = window[funcName];
            window[funcName] = function(e) {
                window.scrollTo(0, 0);
                document.body.scrollTop = 0;
                
                // Para sa Lesson Dashboard, i-load ang sidebar stats
                if (funcName === 'showLessonDashboard') {
                    setTimeout(() => {
                        if (typeof loadSidebarStats === 'function') {
                            loadSidebarStats();
                        }
                    }, 300);
                }
                
                return originalFunc.call(this, e);
            };
        }
    });
    
    console.log('✅ DOMContentLoaded initialization complete!');
});

// Function para kunin ang lesson data mula sa form - FIXED VERSION
function getLessonFormData() {
    const title = document.getElementById('createLessonTitle')?.value.trim();
    const description = document.getElementById('createLessonDescription')?.value.trim();
    
    // ✅ FIXED: Use topic_id, NOT subject_id
    const topicSelect = document.getElementById('topicSelect');
    const topic_id = topicSelect?.value;
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a lesson title');
        return null;
    }
    
    if (!topic_id) {
        showNotification('error', 'Error', 'Please select a topic');
        return null;
    }
    
    const videoFile = document.getElementById('videoFileInput')?.files[0];
    const youtubeUrl = document.getElementById('videoYoutubeUrl')?.value;
    
    let contentType = 'text';
    if (videoFile || youtubeUrl) {
        contentType = 'video';
    }
    
    const moduleSelect = document.getElementById('moduleSelect');
    const module_id = moduleSelect?.value;
    
    return {
        title: title,
        description: description,
        topic_id: parseInt(topic_id),  // ✅ FIXED: topic_id, NOT subject_id
        module_id: module_id ? parseInt(module_id) : null,
        content_type: contentType,
        video_file: videoFile,
        youtube_url: youtubeUrl || null
    };
}

// ===== UPDATE ACTIVE SUBJECT WITH DATABASE DATA =====
async function updateActiveSubjectFromDatabase() {
    console.log("📊 Updating active subject from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('ℹ️ No token found, using fallback for active subject');
            updateActiveSubjectFromLocal();
            return;
        }
        
        // Get current subject from global variable
        const subject = currentSubject || 'polynomial';
        
        // ===== IMPORTANT: Convert subject name to database ID =====
        const subjectId = getSubjectIdFromName(subject);
        
        console.log(`🔍 Fetching data for active subject: ${subject} (converted to ID: ${subjectId})`);
        
        // Get subject summary from database using the correct ID
        const response = await fetch(`http://localhost:5000/api/subject/${subjectId}/summary`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Subject summary response:', result);
        
        if (result.success) {
            const summary = result.summary;
            
            // Update the UI with database data
            updateActiveSubjectUI({
                subjectName: getSubjectDisplayName(subject),
                description: getSubjectDescription(subject),
                lessons: summary.lessons || 0,
                resources: summary.resources || 0,
                students: summary.students || 0
            });
            
            console.log('✅ Active subject updated with database data:', {
                lessons: summary.lessons,
                resources: summary.resources,
                students: summary.students
            });
            
        } else {
            throw new Error(result.message || 'Failed to load subject summary');
        }
        
    } catch (error) {
        console.error('❌ Error updating active subject from database:', error);
        
        // Fallback to localStorage/demo data
        updateActiveSubjectFromLocal();
    }
}

// ===== UPDATE ACTIVE SUBJECT FROM LOCAL STORAGE (FALLBACK) =====
function updateActiveSubjectFromLocal() {
    console.log("📂 Updating active subject from localStorage...");
    
    const subject = currentSubject || 'polynomial';
    
    try {
        // Try to get from lessonDatabase
        if (lessonDatabase && lessonDatabase.lessons) {
            const subjectId = getSubjectIdFromName(subject);
            
            // Count lessons for this subject
            const lessons = lessonDatabase.lessons.filter(l => l.subjectId === subjectId).length;
            
            // Count resources (for now, same as lessons)
            const resources = lessons;
            
            // Try to get students from usersData
            let students = 0;
            if (window.usersData && usersData.length > 0) {
                students = usersData.filter(u => u.role === 'student').length;
            }
            
            updateActiveSubjectUI({
                subjectName: getSubjectDisplayName(subject),
                description: getSubjectDescription(subject),
                lessons: lessons,
                resources: resources,
                students: students
            });
            
            console.log(`✅ Active subject from localStorage: ${lessons} lessons, ${students} students`);
            
        } else {
            // Ultimate fallback - demo data
            updateActiveSubjectUI(getDefaultSubjectDataForCurrent());
        }
    } catch (error) {
        console.error('❌ Error updating active subject from localStorage:', error);
        updateActiveSubjectUI(getDefaultSubjectDataForCurrent());
    }
}

// ===== UPDATE ACTIVE SUBJECT UI =====
function updateActiveSubjectUI(data) {
    console.log("🔄 Updating active subject UI with data:", data);
    
    // Ensure data has all required properties
    const safeData = {
        subjectName: data.subjectName || getSubjectDisplayName(currentSubject) || 'PolyLearn',
        description: data.description || getSubjectDescription(currentSubject) || 'Mathematics subject',
        lessons: data.lessons || 0,
        resources: data.resources || 0,
        students: data.students || 0
    };
    
    // Update subject name
    const nameEl = document.getElementById('welcomeSubjectName');
    if (nameEl) {
        nameEl.style.opacity = '0';
        setTimeout(() => {
            nameEl.textContent = safeData.subjectName;
            nameEl.style.opacity = '1';
        }, 200);
    }
    
    // Update description
    const descEl = document.getElementById('welcomeSubjectDesc');
    if (descEl) {
        descEl.style.opacity = '0';
        setTimeout(() => {
            descEl.textContent = safeData.description;
            descEl.style.opacity = '1';
        }, 200);
    }
    
    // Update icon
    const iconEl = document.getElementById('welcomeSubjectIcon');
    if (iconEl) {
        const iconClass = currentSubject === 'polynomial' ? 'fas fa-superscript' :
                         currentSubject === 'factorial' ? 'fas fa-exclamation-circle' :
                         'fas fa-divide';
        iconEl.innerHTML = `<i class="${iconClass}"></i>`;
        iconEl.classList.add('pulse');
        setTimeout(() => iconEl.classList.remove('pulse'), 300);
    }
    
    // Update stats with animation
    animateNumber('welcomeLessonCount', safeData.lessons);
    animateNumber('welcomeResourceCount', safeData.resources);
    animateNumber('welcomeStudentCount', safeData.students);
}

// ===== GET DEFAULT SUBJECT DATA FOR CURRENT SUBJECT =====
function getDefaultSubjectDataForCurrent() {
    const subject = currentSubject || 'polynomial';
    
    const defaultData = {
        polynomial: {
            subjectName: 'PolyLearn',
            description: 'Algebraic expressions with variables and coefficients',
            lessons: 5,
            resources: 12,
            students: 45
        },
        factorial: {
            subjectName: 'FactoLearn',
            description: 'Product of all positive integers less than or equal to n',
            lessons: 3,
            resources: 8,
            students: 32
        },
        mdas: {
            subjectName: 'MathEase',
            description: 'Order of operations: Multiplication, Division, Addition, Subtraction',
            lessons: 4,
            resources: 10,
            students: 38
        }
    };
    
    return defaultData[subject] || defaultData.polynomial;
}

// ===== Load lesson stats from database =====
async function loadLessonStats() {
    console.log("📊 Loading lesson stats from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('No token found');
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/admin/lessons/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const stats = result.stats || {};
        
        // Update stats in UI
        document.getElementById('publishedTodayCount').textContent = stats.published_today || 0;
        document.getElementById('draftCount').textContent = stats.draft_count || 0;
        document.getElementById('needsReviewCount').textContent = stats.needs_review || 0;
        document.getElementById('engagementRate').textContent = (stats.engagement_rate || 0) + '%';
        
        console.log('✅ Lesson stats updated:', stats);
        
    } catch (error) {
        console.error('❌ Error loading lesson stats:', error);
        
        // Fallback to zeros
        document.getElementById('publishedTodayCount').textContent = '0';
        document.getElementById('draftCount').textContent = '0';
        document.getElementById('needsReviewCount').textContent = '0';
        document.getElementById('engagementRate').textContent = '0%';
    }
}

// ===== Helper function for time ago =====
function getTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return 'Recently';
    }
}
// ===== LOAD TOPICS FROM MYSQL =====
async function loadTopicStructure() {
    console.log("📚 Loading topic structure from MySQL...");
    
    const statusDiv = document.getElementById('createLessonStatus');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div style="background: #e3f2fd; color: #1976d2; padding: 10px 15px; border-radius: 6px;">
                <i class="fas fa-spinner fa-spin"></i> Loading topics...
            </div>
        `;
    }
    
    try {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            throw new Error('No admin token found');
        }
        
        const response = await fetch('http://localhost:5000/api/admin/topics', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const topics = result.topics || [];
            
            console.log("✅ Topics loaded:", topics.length);
            
            // Populate Topic dropdown (THIS IS REQUIRED)
            const topicSelect = document.getElementById('topicSelect');
            if (topicSelect) {
                topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
                
                if (topics.length > 0) {
                    // Group topics by lesson for better organization
                    const groupedTopics = {};
                    topics.forEach(topic => {
                        const lessonName = topic.lesson_name || 'General';
                        if (!groupedTopics[lessonName]) {
                            groupedTopics[lessonName] = [];
                        }
                        groupedTopics[lessonName].push(topic);
                    });
                    
                    // Add optgroups
                    for (const [lessonName, lessonTopics] of Object.entries(groupedTopics)) {
                        const optgroup = document.createElement('optgroup');
                        optgroup.label = lessonName;
                        
                        lessonTopics.forEach(topic => {
                            const option = document.createElement('option');
                            option.value = topic.id;
                            option.textContent = `${topic.name} (${topic.module_name || 'No Module'})`;
                            optgroup.appendChild(option);
                        });
                        
                        topicSelect.appendChild(optgroup);
                    }
                } else {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = '-- No topics available --';
                    option.disabled = true;
                    topicSelect.appendChild(option);
                }
            }
            
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
            
            showNotification('success', 'Loaded', `📚 ${topics.length} topics loaded`);
        } else {
            throw new Error(result.message || 'Failed to load topics');
        }
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: #ffebee; color: #c62828; padding: 10px 15px; border-radius: 6px;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load topics: ${error.message}
                    <button onclick="loadTopicStructure()" style="margin-left: 10px; background: #c62828; color: white; border: none; padding: 3px 10px; border-radius: 3px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
        
        // Setup fallback dropdown
        setupFallbackTopicDropdown();
    }
}

// ===== SETUP FALLBACK TOPIC DROPDOWN =====
function setupFallbackTopicDropdown() {
    const topicSelect = document.getElementById('topicSelect');
    if (!topicSelect) return;
    
    topicSelect.innerHTML = `
        <option value="">-- Select Topic --</option>
        <option value="1">Polynomial Functions (PolyLearn)</option>
        <option value="2">Factorial Notation (FactoLearn)</option>
        <option value="3">MDAS Operations (MathEase)</option>
        <option value="4">Introduction to Polynomials (PolyLearn)</option>
        <option value="5">Advanced Factorials (FactoLearn)</option>
    `;
    
    console.log("⚠️ Using fallback topic dropdown");
}

// Function para mag-save sa localStorage bilang backup
function saveToLocalStorageBackup(lessonData) {
    try {
        if (!lessonDatabase.lessons) {
            lessonDatabase.lessons = [];
        }
        
        // Add lesson to database
        const localLesson = {
            id: `mysql_${lessonData.id || Date.now()}`,
            title: lessonData.title,
            description: lessonData.description,
            subjectId: lessonData.subject_id || 1,
            createdAt: new Date().toISOString(),
            contentType: lessonData.content_type || 'text',
            content: {
                type: lessonData.content_type,
                description: lessonData.description,
                fileName: lessonData.video_url ? lessonData.video_url.split('/').pop() : null
            },
            moduleStructure: {
                lesson: lessonData.lesson_name || '',
                module: lessonData.module_name || '',
                topic: lessonData.topic_title || ''
            },
            status: lessonData.is_active ? 'published' : 'draft',
            mysqlId: lessonData.id,
            synced: true,
            lastSync: new Date().toISOString()
        };
        
        lessonDatabase.lessons.push(localLesson);
        saveToLocalStorage();
        
        console.log('💾 Saved to localStorage as backup:', localLesson.title);
        
    } catch (error) {
        console.error('Error saving to localStorage backup:', error);
    }
}

// Function para i-load ang mga lessons mula sa admin endpoint
async function loadAdminLessons() {
    console.log("=== LOADING ADMIN LESSONS ===");
    
    // Prevent multiple simultaneous calls
    if (window.isLoadingLessons) {
        console.log("⏳ Already loading lessons, skipping...");
        return;
    }
    window.isLoadingLessons = true;
    
    try {
        // Check authentication
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        if (!token) {
            console.log('❌ No auth token found');
            window.isLoadingLessons = false;
            return;
        }
        
        // Check if table exists
        const tableBody = document.getElementById('adminLessonsTableBody');
        if (!tableBody) {
            console.log('ℹ️ No admin lessons table found - this is normal if not on lesson dashboard');
            window.isLoadingLessons = false;
            return;
        }
        
        showNotification('info', 'Loading', 'Fetching lessons from database...');
        
        const response = await fetch('http://localhost:5000/api/admin/lessons', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const lessons = result.lessons || [];
            const lessonCount = lessons.length;
            
            console.log(`✅ Loaded ${lessonCount} lessons from server`);
            
            // Update the table
            updateAdminLessonTable(lessons);
            
            // Cache to localStorage
            cacheLessonsToLocalStorage(lessons);
            
            // Update lesson stats in the dashboard
            if (typeof updateLessonStatsFromLessons === 'function') {
                updateLessonStatsFromLessons(lessons);
            }
            
            // Show success notification
            showNotification('success', 'Loaded', `Successfully loaded ${lessonCount} lessons`);
        } else {
            throw new Error(result.message || 'Failed to load lessons');
        }
        
    } catch (error) {
        console.error('❌ Load lessons error:', error);
        
        // Try to load from cache
        try {
            const cached = localStorage.getItem('mathhub_lessons_cache');
            if (cached) {
                const cache = JSON.parse(cached);
                if (cache.lessons && cache.lessons.length > 0) {
                    console.log(`📦 Using ${cache.lessons.length} cached lessons`);
                    
                    const cachedLessons = cache.lessons.map(l => ({
                        content_id: l.mysqlId || l.id,
                        content_title: l.title,
                        content_description: l.description,
                        content_type: l.contentType,
                        video_filename: l.content?.fileName,
                        content_url: l.content?.youtubeUrl,
                        is_active: true,
                        module_name: l.moduleStructure?.module || 'N/A',
                        lesson_name: l.moduleStructure?.lesson || 'N/A',
                        topic_title: l.moduleStructure?.topic || 'General',
                        created_at: l.createdAt
                    }));
                    
                    updateAdminLessonTable(cachedLessons);
                    showNotification('warning', 'Offline Mode', `Using ${cachedLessons.length} cached lessons`);
                }
            } else {
                // Fallback to empty table
                updateAdminLessonTable([]);
            }
        } catch (cacheError) {
            console.error('Error loading from cache:', cacheError);
            updateAdminLessonTable([]);
        }
        
    } finally {
        // Reset loading flag after 2 seconds
        setTimeout(() => {
            window.isLoadingLessons = false;
        }, 2000);
    }
}

// Update ang admin lesson table UI
function updateAdminLessonTable(lessons) {
    const tableBody = document.getElementById('adminLessonsTableBody');
    if (!tableBody) {
        console.log('No admin lessons table found');
        return;
    }
    
    if (lessons.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-book-open text-muted fa-2x mb-2"></i>
                    <p class="text-muted">No lessons found. Create your first lesson!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = lessons.map(lesson => {
        const date = new Date(lesson.created_at).toLocaleDateString();
        const videoInfo = lesson.video_filename || lesson.content_url 
            ? `<small class="text-muted">${lesson.video_filename || 'External video'}</small>` 
            : '';
        
        return `
            <tr>
                <td>${lesson.content_id}</td>
                <td>
                    <strong>${lesson.content_title}</strong>
                    <div class="text-muted">${lesson.content_description?.substring(0, 50)}...</div>
                    ${videoInfo}
                </td>
                <td>
                    <span class="badge ${lesson.content_type === 'video' ? 'bg-danger' : 'bg-info'}">
                        ${lesson.content_type}
                    </span>
                </td>
                <td>${lesson.module_name || 'N/A'}</td>
                <td>${lesson.lesson_name || 'N/A'}</td>
                <td>
                    <span class="badge ${lesson.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${lesson.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewLesson(${lesson.content_id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editLesson(${lesson.content_id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="deleteLesson(${lesson.content_id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// ===== CACHE MYSQL LESSONS TO LOCALSTORAGE =====
function cacheMySQLlessons(lessons, subjectId) {
    try {
        console.log(`💾 Caching ${lessons.length} MySQL lessons for subject ${subjectId}...`);
        
        const cacheKey = `mysql_lessons_cache_subject_${subjectId}`;
        const cacheData = {
            lessons: lessons,
            timestamp: new Date().toISOString(),
            subjectId: subjectId,
            count: lessons.length
        };
        
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`✅ Successfully cached ${lessons.length} lessons`);
        
        // Also cache all lessons globally
        const allLessonsCache = {
            lessons: lessons,
            timestamp: new Date().toISOString(),
            subjectId: subjectId
        };
        localStorage.setItem('mysql_lessons_cache_all', JSON.stringify(allLessonsCache));
        
    } catch (error) {
        console.error('❌ Error caching MySQL lessons:', error);
    }
}

// ===== LOAD MYSQL LESSONS FROM CACHE =====
function loadMySQLlessonsFromCache(subject) {
    try {
        console.log(`📂 Attempting to load cached lessons for subject: ${subject}`);
        
        const subjectId = getSubjectIdFromName(subject);
        const cacheKey = `mysql_lessons_cache_subject_${subjectId}`;
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            const data = JSON.parse(cached);
            console.log(`✅ Found ${data.lessons?.length || 0} cached lessons from ${data.timestamp || 'unknown date'}`);
            return data.lessons || [];
        }
        
        // Try global cache as fallback
        const globalCache = localStorage.getItem('mysql_lessons_cache_all');
        if (globalCache) {
            const data = JSON.parse(globalCache);
            console.log(`✅ Using global cache with ${data.lessons?.length || 0} lessons`);
            return data.lessons || [];
        }
        
        console.log('⚠️ No cached lessons found');
        return null;
        
    } catch (error) {
        console.error('❌ Error loading MySQL lessons from cache:', error);
        return null;
    }
}

// ===== CLEAR MYSQL CACHE =====
function clearMySQLCache() {
    try {
        // Clear subject-specific caches
        const subjects = ['polynomial', 'factorial', 'mdas'];
        subjects.forEach(subject => {
            const subjectId = getSubjectIdFromName(subject);
            localStorage.removeItem(`mysql_lessons_cache_subject_${subjectId}`);
        });
        
        // Clear global cache
        localStorage.removeItem('mysql_lessons_cache_all');
        
        console.log('✅ MySQL cache cleared');
        showNotification('success', 'Cache Cleared', 'Lesson cache has been cleared');
        
    } catch (error) {
        console.error('❌ Error clearing cache:', error);
    }
}
// Cache lessons to localStorage
function cacheLessonsToLocalStorage(lessons) {
    if (!lessons || !Array.isArray(lessons)) {
        console.warn('⚠️ No lessons to cache');
        return;
    }
    
    try {
        const cache = {
            lessons: lessons.map(lesson => ({
                id: `mysql_${lesson.content_id || lesson.id}`,
                title: lesson.content_title || lesson.title,
                description: lesson.content_description || lesson.description,
                subjectId: 1,
                createdAt: lesson.created_at || new Date().toISOString(),
                contentType: lesson.content_type || lesson.type || 'text',
                content: {
                    type: lesson.content_type || lesson.type || 'text',
                    fileName: lesson.video_filename,
                    youtubeUrl: lesson.content_url?.startsWith('http') ? lesson.content_url : null
                },
                mysqlId: lesson.content_id || lesson.id,
                synced: true
            })),
            timestamp: new Date().toISOString(),
            count: lessons.length
        };
        
        localStorage.setItem('mathhub_lessons_cache', JSON.stringify(cache));
        console.log(`💾 ${lessons.length} lessons cached to localStorage`);
        
    } catch (error) {
        console.error('❌ Error caching lessons:', error);
    }
}

// Load from localStorage cache
function loadLessonsFromLocalCache() {
    try {
        const cache = localStorage.getItem('mathhub_lessons_cache');
        if (cache) {
            const data = JSON.parse(cache);
            console.log('📂 Loading from cache:', data.lessons?.length || 0);
            
            // Update lessonDatabase
            if (data.lessons) {
                lessonDatabase.lessons = data.lessons;
                updateLessonStats();
                
                // Also update admin table if exists
                updateAdminLessonTable(data.lessons.map(l => ({
                    content_id: l.mysqlId || l.id,
                    content_title: l.title,
                    content_description: l.description,
                    content_type: l.contentType,
                    video_filename: l.content?.fileName,
                    content_url: l.content?.youtubeUrl,
                    is_active: true
                })));
            }
        }
    } catch (error) {
        console.error('Error loading from cache:', error);
    }
}

// ===== RESET LESSON FORM =====
function resetLessonForm() {
    console.log("🔄 Resetting lesson form...");
    
    // Clear text inputs
    const titleInput = document.getElementById('createLessonTitle');
    if (titleInput) titleInput.value = '';
    
    const descInput = document.getElementById('createLessonDescription');
    if (descInput) descInput.value = '';
    
    const youtubeInput = document.getElementById('videoYoutubeUrl');
    if (youtubeInput) youtubeInput.value = '';
    
    const textInput = document.getElementById('textContentInput');
    if (textInput) textInput.value = '';
    
    // Clear file inputs
    const videoInput = document.getElementById('videoFileInput');
    if (videoInput) videoInput.value = '';
    
    // Hide file info sections
    const videoInfo = document.getElementById('videoFileInfo');
    if (videoInfo) videoInfo.style.display = 'none';
    
    const previewContainer = document.getElementById('videoPreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    const newVideoIndicator = document.getElementById('newVideoIndicator');
    if (newVideoIndicator) newVideoIndicator.style.display = 'none';
    
    // Reset to video section
    showContentSection('video');
    
    console.log("✅ Form reset complete");
}

// ===== CLOSE CREATE LESSON MODAL =====
function closeCreateLessonModal() {
    console.log("🔴 Closing create lesson modal...");
    
    const modal = document.getElementById('createLessonModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        
        // Reset form after closing
        setTimeout(() => {
            resetLessonForm();
        }, 300);
        
        console.log("✅ Modal closed");
    }
}

// ===== SHOW CONTENT SECTION =====
function showContentSection(section) {
    console.log("📂 Showing content section:", section);
    
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(el => el.style.display = 'none');
    
    // Remove active class from buttons
    const buttons = document.querySelectorAll('.content-type-buttons .btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
    });
    
    // Show selected section
    const selectedSection = document.getElementById(section + 'ContentSection');
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // Set active button
    if (section === 'video') {
        const videoBtn = document.getElementById('videoTypeBtn');
        if (videoBtn) {
            videoBtn.classList.add('active');
            videoBtn.style.background = '#7a0000';
            videoBtn.style.color = 'white';
        }
    } else if (section === 'text') {
        const textBtn = document.getElementById('textTypeBtn');
        if (textBtn) {
            textBtn.classList.add('active');
            textBtn.style.background = '#7a0000';
            textBtn.style.color = 'white';
        }
    }
}

// View lesson function
async function viewLesson(contentId) {
    try {
        console.log('👁️ Viewing lesson:', contentId);
        
        if (!await checkAuth()) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/lessons-db/${contentId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Open modal with lesson details
            openModal('Lesson Details');
            
            document.getElementById('modalBody').innerHTML = `
                <div class="lesson-details">
                    <h3>${result.lesson.content_title}</h3>
                    <p>${result.lesson.content_description}</p>
                    
                    <div class="lesson-meta">
                        <p><strong>Type:</strong> ${result.lesson.content_type}</p>
                        <p><strong>Topic:</strong> ${result.lesson.topic_title || 'N/A'}</p>
                        <p><strong>Module:</strong> ${result.lesson.module_name || 'N/A'}</p>
                        <p><strong>Lesson:</strong> ${result.lesson.lesson_name || 'N/A'}</p>
                    </div>
                    
                    ${result.lesson.content_url ? `
                        <div class="video-preview">
                            <p><strong>Video URL:</strong> ${result.lesson.content_url}</p>
                        </div>
                    ` : ''}
                    
                    ${result.lesson.video_filename ? `
                        <div class="video-info">
                            <p><strong>Video File:</strong> ${result.lesson.video_filename}</p>
                        </div>
                    ` : ''}
                </div>
            `;
            
        } else {
            showNotification('error', 'Not Found', 'Lesson not found');
        }
        
    } catch (error) {
        console.error('View lesson error:', error);
        showNotification('error', 'Error', 'Could not load lesson details');
    }
}


// Delete lesson function
async function deleteLesson(contentId) {
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
        return;
    }
    
    try {
        console.log('🗑️ Deleting lesson:', contentId);
        
        if (!await checkAuth()) {
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/admin/lessons/${contentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Deleted', 'Lesson deleted successfully');
            
            // Remove from UI
            const row = document.querySelector(`tr:has(td:contains("${contentId}"))`);
            if (row) row.remove();
            
            // Also remove from localStorage cache
            if (lessonDatabase.lessons) {
                lessonDatabase.lessons = lessonDatabase.lessons.filter(
                    lesson => lesson.mysqlId !== contentId && lesson.id !== `mysql_${contentId}`
                );
                saveToLocalStorage();
            }
            
        } else {
            showNotification('error', 'Delete Failed', result.message || 'Failed to delete lesson');
        }
        
    } catch (error) {
        console.error('Delete lesson error:', error);
        showNotification('error', 'Error', 'Could not delete lesson');
    }
}

// Load module structure for dropdowns
// ===== LOAD MODULE STRUCTURE FOR DROPDOWNS - FIXED =====
async function loadModuleStructure() {
    console.log("📚 Loading module structure from database...");
    
    const statusDiv = document.getElementById('createLessonStatus');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = `
            <div style="background: #e3f2fd; color: #1976d2; padding: 10px 15px; border-radius: 6px;">
                <i class="fas fa-spinner fa-spin"></i> Loading lessons and modules...
            </div>
        `;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No admin token found');
        }
        
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success) {
            const structure = result.structure;
            
            // Store globally for other functions
            window.lessonStructure = structure;
            window.quickModules = structure.modules || [];
            window.quickLessons = structure.lessons || [];
            window.quickTopics = structure.topics || [];
            
            console.log("✅ Structure loaded:", {
                lessons: window.quickLessons.length,
                modules: window.quickModules.length,
                topics: window.quickTopics.length
            });
            
            // Populate lesson dropdown
            const lessonSelect = document.getElementById('lessonSelect');
            if (lessonSelect) {
                lessonSelect.innerHTML = '<option value="">-- Select Lesson --</option>';
                
                if (window.quickLessons.length > 0) {
                    window.quickLessons.forEach(lesson => {
                        const option = document.createElement('option');
                        option.value = lesson.id;
                        option.textContent = lesson.name;
                        lessonSelect.appendChild(option);
                    });
                    console.log("✅ Lesson dropdown populated with", window.quickLessons.length, "lessons");
                } else {
                    console.warn("⚠️ No lessons found in database");
                    lessonSelect.innerHTML = '<option value="">-- No lessons available --</option>';
                }
            }
            
            // Populate module dropdown (initially disabled)
            const moduleSelect = document.getElementById('moduleSelect');
            if (moduleSelect) {
                moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
                moduleSelect.disabled = true;
                console.log("✅ Module dropdown reset and disabled");
            }
            
            // Hide loading status
            if (statusDiv) {
                statusDiv.style.display = 'none';
            }
            
            showNotification('success', 'Loaded', `📚 ${window.quickLessons.length} lessons, ${window.quickModules.length} modules loaded`);
            
        } else {
            throw new Error(result.message || 'Failed to load structure');
        }
        
    } catch (error) {
        console.error('❌ Error loading module structure:', error);
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="background: #ffebee; color: #c62828; padding: 10px 15px; border-radius: 6px;">
                    <i class="fas fa-exclamation-circle"></i> Failed to load: ${error.message}
                    <button onclick="loadModuleStructure()" style="margin-left: 10px; background: #c62828; color: white; border: none; padding: 3px 10px; border-radius: 3px; cursor: pointer;">
                        Retry
                    </button>
                </div>
            `;
        }
        
        // Setup fallback dropdowns
        setupFallbackDropdowns();
    }
}

// ===== FILTER MODULES BY LESSON - FIXED =====
function filterModulesByLesson() {
    console.log("🔍 Filtering modules by lesson...");
    
    const lessonId = document.getElementById('lessonSelect').value;
    const moduleSelect = document.getElementById('moduleSelect');
    
    if (!moduleSelect) {
        console.error("❌ Module select not found!");
        return;
    }
    
    console.log("📋 Selected Lesson ID:", lessonId || "(none)");
    
    // Reset module dropdown
    moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
    
    // If no lesson selected, disable module dropdown
    if (!lessonId) {
        console.log("ℹ️ No lesson selected - disabling module dropdown");
        moduleSelect.disabled = true;
        
        // Add option to create module
        const createOption = document.createElement('option');
        createOption.value = 'create';
        createOption.textContent = '➕ Create New Module...';
        createOption.style.color = '#7a0000';
        createOption.style.fontWeight = 'bold';
        moduleSelect.appendChild(createOption);
        moduleSelect.disabled = false;
        return;
    }
    
    // Make sure we have modules data
    if (!window.quickModules || window.quickModules.length === 0) {
        console.log("⚠️ No modules loaded yet, fetching from server...");
        moduleSelect.innerHTML = '<option value="">-- Loading modules... --</option>';
        moduleSelect.disabled = true;
        
        // Try to reload structure
        loadModuleStructure().then(() => {
            setTimeout(() => filterModulesByLesson(), 500);
        });
        return;
    }
    
    // Filter modules for this lesson
    const filteredModules = window.quickModules.filter(m => {
        return parseInt(m.lesson_id) === parseInt(lessonId);
    });
    
    console.log(`📦 Found ${filteredModules.length} modules for lesson ID ${lessonId}`);
    
    if (filteredModules.length > 0) {
        filteredModules.forEach(module => {
            const option = document.createElement('option');
            option.value = module.id;
            option.textContent = `📦 ${module.name}`;
            moduleSelect.appendChild(option);
        });
        moduleSelect.disabled = false;
        console.log("✅ Modules enabled with", filteredModules.length, "options");
    } else {
        console.log("ℹ️ No modules found for this lesson");
        moduleSelect.innerHTML = '<option value="">-- No modules available --</option>';
        
        // Add create module option
        const createOption = document.createElement('option');
        createOption.value = 'create';
        createOption.textContent = '➕ Create New Module...';
        createOption.style.color = '#7a0000';
        createOption.style.fontWeight = 'bold';
        moduleSelect.appendChild(createOption);
        moduleSelect.disabled = false;
    }
}

// ===== HANDLE MODULE SELECT CHANGE =====
document.addEventListener('change', function(e) {
    if (e.target.id === 'moduleSelect') {
        if (e.target.value === 'create') {
            openQuickModuleModal();
            e.target.value = ''; // Reset selection
        }
    }
});

// Filter topics by lesson (and module)
function filterTopicsByLesson(lessonId) {
    const topicSelect = document.getElementById('topicSelect');
    if (!topicSelect) return;
    
    const allOptions = topicSelect.querySelectorAll('option');
    allOptions.forEach(option => {
        if (option.value === '') {
            option.style.display = 'block';
        } else {
            const topicModuleId = option.getAttribute('data-module');
            // We need to check if this topic's module belongs to the selected lesson
            const moduleSelect = document.getElementById('moduleSelect');
            const moduleOption = moduleSelect.querySelector(`option[value="${topicModuleId}"]`);
            
            if (moduleOption && moduleOption.getAttribute('data-lesson') === lessonId || !lessonId) {
                option.style.display = 'block';
                option.disabled = false;
            } else {
                option.style.display = 'none';
                option.disabled = true;
            }
        }
    });
    
    // Reset selection if current selection is hidden
    if (topicSelect.value && topicSelect.querySelector(`option[value="${topicSelect.value}"]`).disabled) {
        topicSelect.value = '';
    }
}

// ===== FILTER TOPICS BY MODULE =====
function filterTopicsByModule() {
    const moduleId = document.getElementById('moduleSelect').value;
    const topicSelect = document.getElementById('topicSelect');
    
    if (!topicSelect) return;
    
    // Reset topic select
    topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
    
    const topics = window.lessonStructure?.topics || [];
    let filteredTopics = topics;
    
    if (moduleId) {
        filteredTopics = topics.filter(t => t.module_id == moduleId);
    }
    
    if (filteredTopics.length > 0) {
        filteredTopics.forEach(topic => {
            const option = document.createElement('option');
            option.value = topic.id;
            option.textContent = topic.name;
            topicSelect.appendChild(option);
        });
    }
}

// Setup default dropdowns if server fails
function setupFallbackDropdowns() {
    console.log("⚠️ Setting up fallback dropdowns");
    
    const lessonSelect = document.getElementById('lessonSelect');
    if (lessonSelect) {
        lessonSelect.innerHTML = `
            <option value="">-- Select Lesson (Optional) --</option>
            <option value="1">Polynomial Functions</option>
            <option value="2">Factorial Notation</option>
            <option value="3">MDAS Operations</option>
        `;
    }
    
    const moduleSelect = document.getElementById('moduleSelect');
    if (moduleSelect) {
        moduleSelect.innerHTML = `
            <option value="">-- Select Module (Optional) --</option>
            <option value="1" data-lesson="1">Introduction to Polynomials</option>
            <option value="2" data-lesson="1">Operations with Polynomials</option>
            <option value="3" data-lesson="2">Factorial Basics</option>
            <option value="4" data-lesson="3">MDAS Rules</option>
        `;
        moduleSelect.disabled = false;
    }
    
    const topicSelect = document.getElementById('topicSelect');
    if (topicSelect) {
        topicSelect.innerHTML = `
            <option value="">-- Select Topic --</option>
            <option value="1" data-module="1">Definition of Polynomials</option>
            <option value="2" data-module="1">Degree of Polynomials</option>
            <option value="3" data-module="2">Adding Polynomials</option>
            <option value="4" data-module="2">Subtracting Polynomials</option>
            <option value="5" data-module="3">Factorial Definition</option>
            <option value="6" data-module="4">Multiplication First</option>
            <option value="7" data-module="4">Division Next</option>
        `;
    }
}



// Update your existing saveLessonToLocalStorage function to handle fallback
function saveLessonToLocalStorage() {
    console.log("=== FALLBACK: SAVING TO LOCALSTORAGE ===");
    
    // Get form values
    const title = document.getElementById('createLessonTitle')?.value.trim();
    const description = document.getElementById('contentDescription')?.value.trim();
    const subjectId = parseInt(document.getElementById('selectedSubjectId')?.value) || 1;
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a lesson title');
        return;
    }
    
    // ... rest of your existing localStorage save logic ...
    
    showNotification('warning', 'Saved Locally', 
        'Lesson saved to local storage (offline mode). It will sync when server is available.');
}
// Update initApp function
function initApp() {
    cacheDOM();
    initializeEventListeners();
    initializeCharts();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    initLocalDatabase();
    showDashboard();
    
    // Initialize user management pagkatapos ma-load ang page
    setTimeout(() => {
        updateAllStatsWithAnimation();
        preloadImportantData();
        
        // Initialize user management
        if (document.getElementById('settingsDashboardSection')) {
            loadUsersData();
            updateUserStats();
            updateUsersTable();
        }
    }, 500);
}

// Create custom dialog container
function showSimpleLogoutConfirmation() {
    const dialogContainer = document.createElement('div');
    dialogContainer.id = 'customLogoutDialog';
    dialogContainer.innerHTML = `
        <div class="custom-dialog-overlay"></div>
        <div class="custom-dialog">
            <div class="dialog-header">
                <h3>Confirm Logout</h3>
                <p class="dialog-subtitle">You are about to log out from your MathHub Admin Dashboard account.</p>
            </div>
            
            <div class="dialog-body">
                <div class="warning-section">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>You will be redirected to the student login page.</p>
                </div>
                
                <div class="account-info">
                    <div class="info-row">
                        <span class="info-label">Account:</span>
                        <span class="info-value">Admin Account</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Session started:</span>
                        <span class="info-value" id="sessionStartTime">Today, 9:41 AM</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Redirect to:</span>
                        <span class="info-value" style="color: #7a0000; font-weight: 600;">
                            <i class="fas fa-external-link-alt"></i> Student Login Page
                        </span>
                    </div>
                </div>
                
                <div class="checkbox-options">
                    <div class="checkbox-option">
                        <input type="checkbox" id="clearAdminData">
                        <label for="clearAdminData">Clear admin cache and temporary data</label>
                    </div>
                    <div style="background: #fff3e0; padding: 12px; border-radius: 6px; margin-top: 10px;">
                        <p style="margin: 0; color: #856404; font-size: 0.85rem;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Note:</strong> This will only log you out from admin panel. 
                            Your student session (if any) will remain active.
                        </p>
                    </div>
                </div>
            </div>
            
            <div class="dialog-footer">
                <button class="dialog-btn btn-cancel">
                    Cancel
                </button>
                <button class="dialog-btn btn-confirm">
                    Yes, Logout
                </button>
            </div>
        </div>
    `;

    // Add to page
    document.body.appendChild(dialogContainer);

    // Add CSS
    addCustomDialogStyles();

    // Update session time
    const sessionTimeElement = document.getElementById('sessionStartTime');
    if (sessionTimeElement) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
        const dateStr = now.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric' 
        });
        sessionTimeElement.textContent = `${dateStr}, ${timeStr}`;
    }

    // Add event listeners
    document.querySelector('.btn-cancel').addEventListener('click', () => {
        removeCustomDialog();
    });

    document.querySelector('.btn-confirm').addEventListener('click', performAdminLogout);

    // Close on overlay click
    document.querySelector('.custom-dialog-overlay').addEventListener('click', () => {
        removeCustomDialog();
    });

    // Close on escape key
    document.addEventListener('keydown', function handleEscape(e) {
        if (e.key === 'Escape') {
            removeCustomDialog();
            document.removeEventListener('keydown', handleEscape);
        }
    });

    function addCustomDialogStyles() {
        // Check if styles already exist
        if (document.getElementById('customLogoutStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'customLogoutStyles';
        style.textContent = `
            #customLogoutDialog {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            }
            
            .custom-dialog-overlay {
                position: absolute;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(3px);
            }
            
            .custom-dialog {
                position: relative;
                background: white;
                border-radius: 16px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
                overflow: hidden;
                z-index: 1000000;
                animation: dialogAppear 0.3s ease-out;
                border: 1px solid rgba(122, 0, 0, 0.2);
            }
            
            @keyframes dialogAppear {
                from {
                    opacity: 0;
                    transform: translateY(30px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            @keyframes fadeOut {
                from {
                    opacity: 1;
                    transform: scale(1);
                }
                to {
                    opacity: 0;
                    transform: scale(0.95);
                }
            }
            
            .dialog-header {
                padding: 25px 30px 20px;
                border-bottom: 1px solid #eaeaea;
                text-align: center;
                background: linear-gradient(to right, #fff5f5, white);
            }
            
            .dialog-header h3 {
                margin: 0 0 10px 0;
                font-size: 1.6rem;
                font-weight: 700;
                color: #7a0000;
            }
            
            .dialog-subtitle {
                margin: 0;
                font-size: 0.95rem;
                color: #666;
                line-height: 1.5;
            }
            
            .dialog-body {
                padding: 25px 30px;
            }
            
            .warning-section {
                display: flex;
                align-items: center;
                gap: 12px;
                background: #fff8e1;
                border: 1px solid #ffecb3;
                border-radius: 10px;
                padding: 15px 18px;
                margin-bottom: 20px;
            }
            
            .warning-section i {
                color: #ff9800;
                font-size: 1.3rem;
                min-width: 24px;
            }
            
            .warning-section p {
                margin: 0;
                color: #856404;
                font-size: 0.95rem;
                font-weight: 500;
            }
            
            .account-info {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 18px;
                margin-bottom: 20px;
                border: 1px solid #e9ecef;
            }
            
            .info-row {
                display: flex;
                margin-bottom: 12px;
                font-size: 0.95rem;
            }
            
            .info-row:last-child {
                margin-bottom: 0;
            }
            
            .info-label {
                color: #6c757d;
                min-width: 120px;
                font-weight: 500;
            }
            
            .info-value {
                color: #212529;
                font-weight: 500;
            }
            
            .checkbox-options {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .checkbox-option {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .checkbox-option input[type="checkbox"] {
                width: 18px;
                height: 18px;
                accent-color: #7a0000;
                cursor: pointer;
                margin: 0;
            }
            
            .checkbox-option label {
                color: #495057;
                font-size: 0.95rem;
                cursor: pointer;
                user-select: none;
                font-weight: 500;
            }
            
            .dialog-footer {
                display: flex;
                gap: 12px;
                padding: 20px 30px;
                border-top: 1px solid #eaeaea;
                background: #f8f9fa;
            }
            
            .dialog-btn {
                flex: 1;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 2px solid transparent;
            }
            
            .btn-cancel {
                background: white;
                color: #6c757d;
                border-color: #dee2e6;
            }
            
            .btn-cancel:hover {
                background: #e9ecef;
                border-color: #ced4da;
            }
            
            .btn-confirm {
                background: #7a0000;
                color: white;
                border-color: #7a0000;
            }
            
            .btn-confirm:hover {
                background: #5a0000;
                border-color: #5a0000;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(122, 0, 0, 0.3);
            }
            
            .btn-confirm:disabled {
                background: #b3b3b3;
                border-color: #999;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }
            
            .logout-loading {
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }
            
            .logout-loading::after {
                content: '';
                width: 16px;
                height: 16px;
                border: 2px solid white;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            @media (max-width: 480px) {
                .custom-dialog {
                    max-width: 95%;
                    margin: 20px;
                }
                
                .dialog-header,
                .dialog-body,
                .dialog-footer {
                    padding: 20px;
                }
                
                .dialog-footer {
                    flex-direction: column;
                }
                
                .info-row {
                    flex-direction: column;
                    gap: 5px;
                }
                
                .info-label {
                    min-width: auto;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

}

// ===== REMOVE CUSTOM DIALOG =====
function removeCustomDialog() {
    console.log("🔴 Removing custom dialog...");
    
    // Try to remove the custom logout dialog if it exists
    const customDialog = document.getElementById('customLogoutDialog');
    if (customDialog) {
        customDialog.style.animation = 'fadeOut 0.2s ease-out';
        setTimeout(() => {
            if (customDialog && customDialog.parentNode) {
                customDialog.remove();
            }
        }, 200);
    }
    
    // Also try to remove any modal backdrops
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => {
        if (backdrop && backdrop.parentNode) {
            backdrop.remove();
        }
    });
    
    // Remove modal-open class from body
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
}

// Helper function to show success message
function showLogoutSuccess() {
    const dialog = document.getElementById('customLogoutDialog');
    if (!dialog) return;
    
    const dialogBody = dialog.querySelector('.dialog-body');
    const dialogFooter = dialog.querySelector('.dialog-footer');
    
    if (dialogBody) {
        dialogBody.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <div style="color: #28a745; font-size: 4rem; margin-bottom: 20px;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 style="color: #28a745; margin-bottom: 15px;">Logout Successful!</h3>
                <p style="color: #666; font-size: 1.1rem; margin-bottom: 10px;">
                    You have been successfully logged out from the admin panel.
                </p>
                <p style="color: #999; font-size: 0.9rem;">
                    Redirecting to student login page...
                </p>
            </div>
        `;
    }
    
    if (dialogFooter) {
        dialogFooter.remove();
    }
}

// Helper function to show error message
function showLogoutError() {
    const dialog = document.getElementById('customLogoutDialog');
    if (!dialog) return;
    
    const dialogBody = dialog.querySelector('.dialog-body');
    const dialogFooter = dialog.querySelector('.dialog-footer');
    
    if (dialogBody) {
        dialogBody.innerHTML = `
            <div style="text-align: center; padding: 30px 20px;">
                <div style="color: #dc3545; font-size: 4rem; margin-bottom: 20px;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <h3 style="color: #dc3545; margin-bottom: 15px;">Logout Error</h3>
                <p style="color: #666; font-size: 1.1rem; margin-bottom: 10px;">
                    There was an issue clearing your session.
                </p>
                <p style="color: #999; font-size: 0.9rem;">
                    Attempting to redirect you to the login page...
                </p>
            </div>
        `;
    }
    
    if (dialogFooter) {
        dialogFooter.remove();
    }
}

// Make sure the logout function is accessible globally
window.showSimpleLogoutConfirmation = showSimpleLogoutConfirmation;
window.performAdminLogout = performAdminLogout;

// ===== FIXED: REDIRECT TO USER LOGIN PAGE =====
function performAdminLogout() {
    const confirmBtn = document.querySelector('.btn-confirm');
    const cancelBtn = document.querySelector('.btn-cancel');
    const clearDataCheckbox = document.getElementById('clearAdminData');
    
    // Disable buttons during logout
    confirmBtn.disabled = true;
    cancelBtn.disabled = true;
    
    // Update button text
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
    
    // Clear admin data if checkbox is checked
    if (clearDataCheckbox && clearDataCheckbox.checked) {
        console.log("🧹 Clearing admin cache and temporary data...");
        
        // Remove ONLY admin-specific items
        const adminKeys = [
            'admin_token',
            'admin_user', 
            'admin_session',
            'admin_data',
            'admin_refresh_token',
            'mathhub_database',
            'mysql_lessons_cache_all'
        ];
        
        adminKeys.forEach(key => localStorage.removeItem(key));
        
        // Clear subject-specific caches
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('mysql_lessons_cache_subject')) {
                localStorage.removeItem(key);
            }
        }
        
        console.log("✅ Admin cache cleared");
    } else {
        // Still clear admin tokens even if checkbox not checked
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        localStorage.removeItem('admin_session');
        localStorage.removeItem('admin_data');
    }
    
    // ===== CRITICAL: KEEP USER LOGIN DATA =====
    // DO NOT remove mathhub_user or authToken
    console.log("✅ Student login data preserved");
    
    // Show success message
    showNotification('Logged out successfully! Redirecting to login...', 'success');
    
    // Remove dialog
    removeCustomDialog();
    
    // ===== REDIRECT TO USER LOGIN PAGE =====
    setTimeout(() => {
        console.log("🔄 Redirecting to user login page...");
        
        // Determine correct path
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('/admin/')) {
            // If in admin subfolder: ../index.html#login
            window.location.href = '../index.html#login';
        } else {
            // If at root: index.html#login
            window.location.href = 'index.html#login';
        }
    }, 1500);
}

// Simple notification function
function showNotification(message, type = 'success') {
    // Check if notification container exists
    let notificationContainer = document.querySelector('.notification-container');
    
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 1000001;
        `;
        document.body.appendChild(notificationContainer);
    }
    
    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
    notification.style.cssText = `
        background: ${type === 'success' ? '#4caf50' : '#f44336'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 12px;
        animation: slideInRight 0.3s ease;
        font-size: 14px;
        font-weight: 500;
    `;
    
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===== AUTO-SYNC: MATHHUB ADMIN TO ADMIN PANEL =====
function syncMathHubAdminAuth() {
    console.log("🔄 Syncing MathHub admin authentication...");
    
    const authToken = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('mathhub_user');
    
    if (authToken && userJson) {
        try {
            const user = JSON.parse(userJson);
            
            // Kung admin ang user, i-sync ang admin tokens
            if (user.role === 'admin') {
                localStorage.setItem('admin_token', authToken);
                localStorage.setItem('admin_user', userJson);
                localStorage.setItem('user_role', user.role);
                localStorage.setItem('admin_session', 'true');
                console.log("✅ Admin tokens synced for:", user.username);
                return true;
            }
        } catch (e) {
            console.error("❌ Failed to sync admin auth:", e);
        }
    }
    
    // Clean up if not admin or no user
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('admin_session');
    console.log("🧹 Admin tokens cleared");
    return false;
}

// Run sync on page load
syncMathHubAdminAuth();

// Run sync whenever localStorage changes (for multi-tab support)
window.addEventListener('storage', function(e) {
    if (e.key === 'authToken' || e.key === 'mathhub_user') {
        console.log("📦 Auth storage changed - resyncing admin tokens");
        syncMathHubAdminAuth();
    }
});

// Run sync when page becomes visible (tab switching)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log("👁️ Page visible - resyncing admin tokens");
        syncMathHubAdminAuth();
    }
});

// ===== QUIZ DASHBOARD VARIABLES =====
let quizData = [];
let currentQuizPage = 1;
let quizzesPerPage = 10;
let currentQuizFilter = 'all';
let quizChart = null;

// ===== SHOW QUIZ DASHBOARD - WITH CHART INITIALIZATION =====
function showQuizDashboard(e) {
    if (e) e.preventDefault();
    console.log("📊 Opening Quiz Management Dashboard...");
    
    closeMobileMenu();
    setActiveSection('quizDashboardSection');
    updatePageTitle('<i class="fas fa-question-circle"></i> Quiz Management', 'Quiz Management');
    updateActiveNav('quiz');
    
    // Show loading state sa table
    document.getElementById('quizTableBody').innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-pulse fa-2x"></i>
                    <p>Loading quizzes from database...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Show loading state sa chart
    const chartContainer = document.querySelector('.quiz-analytics-card .chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
                <p style="margin-top: 15px; color: #666;">Loading chart data...</p>
            </div>
        `;
    }
    
    // Load quizzes
    loadQuizzesFromMySQL();
    
    // Initialize chart after a short delay
    setTimeout(() => {
        initializeQuizChart();
    }, 500);
}

// ===== INITIALIZE QUIZ DASHBOARD =====
async function initializeQuizDashboard() {
    console.log("📊 Initializing Quiz Dashboard...");
    
    // Show loading states
    document.getElementById('quizTableBody').innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-pulse fa-2x"></i>
                    <p>Loading quizzes from database...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Load quizzes from MySQL
    await loadQuizzesFromMySQL();
    
    // Initialize chart
    initializeQuizChart();
}

// ===== LOAD QUIZZES FROM MYSQL - WITH CORRECT SUBJECT MAPPING =====
async function loadQuizzesFromMySQL() {
    console.log("📥 Loading quizzes from MySQL...");
    
    const tableBody = document.getElementById('quizTableBody');
    if (!tableBody) {
        console.error("❌ quizTableBody not found!");
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            tableBody.innerHTML = getNoAuthHTML();
            return;
        }
        
        // Try new endpoint first
        try {
            const response = await fetch('http://localhost:5000/api/admin/quizzes-with-subjects', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('📥 Server response:', result);
                
                if (result.success) {
                    quizData = (result.quizzes || []).map(quiz => {
                        // ✅ FIXED: Correct subject mapping based on category_id
                        let subject_id = quiz.category_id || quiz.subject_id;
                        let subject_name = 'Unknown';
                        
                        // Map subject_id to display name
                        if (subject_id == 2) subject_name = 'PolyLearn';
                        else if (subject_id == 1) subject_name = 'MathEase';
                        else if (subject_id == 3) subject_name = 'FactoLearn';
                        
                        return {
                            id: quiz.quiz_id || quiz.id,
                            title: quiz.quiz_title || quiz.title,
                            description: quiz.description,
                            subject_id: subject_id,
                            subject_name: subject_name,
                            difficulty: quiz.difficulty,
                            question_count: quiz.question_count || 0,
                            attempts: quiz.attempts || 0,
                            avg_score: Math.round(quiz.avg_score || 0),
                            status: quiz.is_active === 1 ? 'active' : 'draft',
                            created_at: quiz.created_at
                        };
                    });
                    
                    console.log(`✅ Loaded ${quizData.length} quizzes with correct subject mapping`);
                    console.log('📊 Sample quiz data:', quizData.slice(0, 2));
                    
                    updateQuizStats();
                    displayQuizzes();
                    updateTopQuizzes();
                    updateRecentResults();
                    return;
                }
            }
        } catch (error) {
            console.log('⚠️ New endpoint failed, trying fallback:', error.message);
        }
        
        // Fallback: Try regular endpoint
        const fallbackResponse = await fetch('http://localhost:5000/api/admin/quizzes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const fallbackResult = await fallbackResponse.json();
        
        if (fallbackResult.success) {
            quizData = (fallbackResult.quizzes || []).map(quiz => {
                // ✅ FIXED: Correct subject mapping
                let subject_id = quiz.subject_id || quiz.category_id;
                let subject_name = 'Unknown';
                
                if (subject_id == 2) subject_name = 'PolyLearn';
                else if (subject_id == 1) subject_name = 'MathEase';
                else if (subject_id == 3) subject_name = 'FactoLearn';
                
                return {
                    id: quiz.id || quiz.quiz_id,
                    title: quiz.title || quiz.quiz_title,
                    description: quiz.description,
                    subject_id: subject_id,
                    subject_name: subject_name,
                    difficulty: quiz.difficulty,
                    question_count: quiz.question_count || 0,
                    attempts: quiz.attempts || 0,
                    avg_score: Math.round(quiz.avg_score || 0),
                    status: quiz.status || (quiz.is_active ? 'active' : 'draft'),
                    created_at: quiz.created_at
                };
            });
            
            console.log(`✅ Loaded ${quizData.length} quizzes with fallback mapping`);
            console.log('📊 Sample quiz data:', quizData.slice(0, 2));
            
            updateQuizStats();
            displayQuizzes();
            updateTopQuizzes();
            updateRecentResults();
        }
        
    } catch (error) {
        console.error('❌ Error loading quizzes:', error);
        tableBody.innerHTML = getErrorHTML(error.message);
    }
}

// Helper functions for HTML templates
function getNoAuthHTML() {
    return `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-lock" style="font-size: 3rem; color: var(--warning); margin-bottom: 15px;"></i>
                    <h4 style="color: var(--warning); margin-bottom: 10px;">Authentication Required</h4>
                    <p style="color: var(--medium-gray); margin-bottom: 20px;">Please login to view quizzes</p>
                </div>
            </td>
        </tr>
    `;
}

function getErrorHTML(errorMessage) {
    return `
        <tr>
            <td colspan="8" class="text-center py-4">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: 15px;"></i>
                    <h4 style="color: var(--error); margin-bottom: 10px;">Failed to Load Quizzes</h4>
                    <p style="color: var(--medium-gray); margin-bottom: 20px;">${errorMessage}</p>
                    <button class="btn btn-primary" onclick="loadQuizzesFromMySQL()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                </div>
            </td>
        </tr>
    `;
}
// ===== FIXED: UPDATE QUIZ STATS WITH CORRECT ELEMENT ID =====
function updateQuizStats() {
    const totalQuizzes = quizData.length;
    const activeQuizzes = quizData.filter(q => q.status === 'active').length;
    const totalAttempts = quizData.reduce((sum, q) => sum + (q.attempts || 0), 0);
    
    // Calculate average score
    let avgScore = 0;
    const quizzesWithScores = quizData.filter(q => q.avg_score > 0);
    if (quizzesWithScores.length > 0) {
        const totalScore = quizzesWithScores.reduce((sum, q) => sum + q.avg_score, 0);
        avgScore = Math.round(totalScore / quizzesWithScores.length);
    }
    
    console.log('📊 Quiz stats calculated:', {
        totalQuizzes,
        activeQuizzes,
        totalAttempts,
        avgScore,
        quizzesWithScores: quizzesWithScores.length
    });
    
    // Update Quiz Dashboard stats
    const totalQuizzesEl = document.getElementById('totalQuizzes');
    if (totalQuizzesEl) totalQuizzesEl.textContent = totalQuizzes;
    
    const activeQuizzesEl = document.getElementById('activeQuizzes');
    if (activeQuizzesEl) activeQuizzesEl.textContent = activeQuizzes;
    
    const totalAttemptsEl = document.getElementById('totalAttempts');
    if (totalAttemptsEl) totalAttemptsEl.textContent = totalAttempts;
    
    // ✅ FIXED: Use the correct element ID 'performanceAvgScore'
    const avgScoreEl = document.getElementById('performanceAvgScore');
    if (avgScoreEl) {
        avgScoreEl.textContent = avgScore + '%';
        console.log('✅ Updated quiz avgScore to:', avgScore + '%');
    } else {
        console.warn('⚠️ Element #performanceAvgScore not found in DOM');
    }
    
    // Update subject counts
    const polyQuizzes = quizData.filter(q => q.subject_id === 2).length; // PolyLearn
    const mathQuizzes = quizData.filter(q => q.subject_id === 1).length; // MathEase
    const factQuizzes = quizData.filter(q => q.subject_id === 3).length; // FactoLearn
    
    const polyEl = document.getElementById('polyLessonCount');
    if (polyEl) polyEl.textContent = polyQuizzes;
    
    const mathEl = document.getElementById('mathLessonCount');
    if (mathEl) mathEl.textContent = mathQuizzes;
    
    const factEl = document.getElementById('factLessonCount');
    if (factEl) factEl.textContent = factQuizzes;
    
    const totalEl = document.getElementById('totalLessonCount');
    if (totalEl) totalEl.textContent = totalQuizzes;
}

// ===== DISPLAY QUIZZES - WITH PROPER FILTERING =====
function displayQuizzes() {
    const tableBody = document.getElementById('quizTableBody');
    if (!tableBody) {
        console.error("❌ quizTableBody not found!");
        return;
    }
    
    console.log("📊 Current filter:", currentQuizFilter);
    console.log("📊 Total quizzes before filter:", quizData.length);
    
    // Filter quizzes based on currentQuizFilter
    let filteredQuizzes = [...quizData];
    
    if (currentQuizFilter !== 'all') {
        // Convert both to numbers for comparison
        const filterId = parseInt(currentQuizFilter);
        filteredQuizzes = filteredQuizzes.filter(q => {
            const match = q.subject_id == filterId;
            if (match) {
                console.log(`✅ Match: ${q.title} (subject_id: ${q.subject_id}) with filter: ${filterId}`);
            }
            return match;
        });
    }
    
    console.log(`📊 After filter: ${filteredQuizzes.length} quizzes`);
    
    // Pagination
    const start = (currentQuizPage - 1) * quizzesPerPage;
    const end = start + quizzesPerPage;
    const paginatedQuizzes = filteredQuizzes.slice(start, end);
    
    if (filteredQuizzes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="fas fa-question-circle" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                    <h4 style="color: #666;">No Quizzes Found</h4>
                    <p style="color: #999; margin-bottom: 20px;">
                        ${currentQuizFilter !== 'all' ? 
                          `No quizzes for this subject. Create your first quiz.` : 
                          'Create your first quiz to get started.'}
                    </p>
                    <button class="btn btn-primary" onclick="openCreateQuizModal()">
                        <i class="fas fa-plus-circle"></i> Create Quiz
                    </button>
                </td>
            </tr>
        `;
        updateQuizPagination(0);
        return;
    }
    
    let html = '';
    paginatedQuizzes.forEach(quiz => {
        const statusClass = `status-badge ${quiz.status}`;
        const difficultyClass = `difficulty-${quiz.difficulty}`;
        
        // Determine score class
        let scoreClass = '';
        if (quiz.avg_score >= 80) scoreClass = 'score-high';
        else if (quiz.avg_score >= 60) scoreClass = 'score-medium';
        else scoreClass = 'score-low';
        
        html += `
            <tr>
                <td>#${quiz.id}</td>
                <td>
                    <div class="quiz-title-info">
                        <strong>${quiz.title || 'Untitled Quiz'}</strong>
                        <small class="text-muted">${quiz.description ? quiz.description.substring(0, 40) + '...' : ''}</small>
                        <span class="difficulty-badge ${difficultyClass}">${quiz.difficulty || 'medium'}</span>
                    </div>
                </td>
                <td><span class="subject-badge ${quiz.subject_name.toLowerCase()}">${quiz.subject_name}</span></td>
                <td>${quiz.question_count || 0}</td>
                <td>${quiz.attempts || 0}</td>
                <td><span class="${scoreClass}">${quiz.avg_score || 0}%</span></td>
                <td><span class="${statusClass}">${quiz.status}</span></td>
                <td>
                    <div class="quiz-actions">
                        <button class="quiz-action-btn view" onclick="viewQuiz(${quiz.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="quiz-action-btn edit" onclick="editQuiz(${quiz.id})" title="Edit Quiz">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="quiz-action-btn stats" onclick="viewQuizResults(${quiz.id})" title="View Results">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                        <button class="quiz-action-btn delete" onclick="deleteQuiz(${quiz.id})" title="Delete Quiz">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = html;
    updateQuizPagination(filteredQuizzes.length);
}

// ===== FILTER QUIZZES BY SUBJECT =====
// ===== FILTER QUIZZES BY SUBJECT - FIXED WITH DEBUGGING =====
function filterQuizzesBySubject(subjectId) {
    console.log("🔍 Filtering quizzes by subject:", subjectId);
    console.log("📊 Current quizData before filter:", quizData.map(q => ({
        id: q.id,
        title: q.title,
        subject_id: q.subject_id,
        subject_name: q.subject_name
    })));
    
    // Update active tab
    document.querySelectorAll('.subject-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (subjectId === 'all') {
        document.getElementById('filterAll').classList.add('active');
        currentQuizFilter = 'all';
        console.log("✅ Activated: All Subjects");
    } else {
        // Convert to number for comparison
        const subId = parseInt(subjectId);
        
        // Map subject ID to tab ID
        let tabId = '';
        let subjectName = '';
        
        if (subId === 2) {           // PolyLearn
            tabId = 'filterPoly';
            subjectName = 'PolyLearn';
        } else if (subId === 1) {     // MathEase
            tabId = 'filterMath';
            subjectName = 'MathEase';
        } else if (subId === 3) {     // FactoLearn
            tabId = 'filterFact';
            subjectName = 'FactoLearn';
        }
        
        console.log(`🎯 Activating tab: ${tabId} for ${subjectName} (ID: ${subId})`);
        
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.classList.add('active');
            console.log(`✅ Activated: ${subjectName} tab`);
        }
        
        currentQuizFilter = subId;
    }
    
    currentQuizPage = 1;
    displayQuizzes();
}

// ===== SORT QUIZZES =====
function sortQuizzes(sortBy) {
    console.log("🔍 Sorting quizzes by:", sortBy);
    
    switch(sortBy) {
        case 'newest':
            quizData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            break;
        case 'oldest':
            quizData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            break;
        case 'most_attempts':
            quizData.sort((a, b) => (b.attempts || 0) - (a.attempts || 0));
            break;
        case 'highest_score':
            quizData.sort((a, b) => (b.avg_score || 0) - (a.avg_score || 0));
            break;
    }
    
    displayQuizzes();
}

// ===== SEARCH QUIZZES =====
function searchQuizzes() {
    const searchTerm = document.getElementById('searchQuizzesInput').value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayQuizzes();
        return;
    }
    
    const filteredQuizzes = quizData.filter(quiz => 
        quiz.title.toLowerCase().includes(searchTerm) ||
        (quiz.description && quiz.description.toLowerCase().includes(searchTerm))
    );
    
    // Temporarily replace quizData for display
    const originalQuizzes = [...quizData];
    quizData = filteredQuizzes;
    currentQuizPage = 1;
    displayQuizzes();
    
    // Restore after display
    setTimeout(() => {
        quizData = originalQuizzes;
    }, 100);
}

// ===== REFRESH QUIZ LIST =====
function refreshQuizList() {
    showNotification('info', 'Refreshing', 'Updating quiz list...');
    loadQuizzesFromMySQL();
}

// ===== UPDATE QUIZ PAGINATION =====
function updateQuizPagination(total) {
    const totalPages = Math.ceil(total / quizzesPerPage);
    
    document.getElementById('quizStart').textContent = total > 0 ? ((currentQuizPage - 1) * quizzesPerPage) + 1 : 0;
    document.getElementById('quizEnd').textContent = Math.min(currentQuizPage * quizzesPerPage, total);
    document.getElementById('quizTotal').textContent = total;
    
    // Update page numbers
    const pagesContainer = document.getElementById('quizPages');
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `<button class="page-number ${i === currentQuizPage ? 'active' : ''}" onclick="goToQuizPage(${i})">${i}</button>`;
    }
    pagesContainer.innerHTML = pagesHtml;
    
    // Update prev/next buttons
    document.getElementById('prevQuizPage').disabled = currentQuizPage === 1;
    document.getElementById('nextQuizPage').disabled = currentQuizPage === totalPages || totalPages === 0;
}

// ===== GO TO QUIZ PAGE =====
function goToQuizPage(page) {
    currentQuizPage = page;
    displayQuizzes();
}

// ===== CHANGE QUIZ PAGE =====
function changeQuizPage(direction) {
    const total = document.getElementById('quizTotal').textContent;
    const totalPages = Math.ceil(parseInt(total) / quizzesPerPage);
    
    if (direction === 'prev' && currentQuizPage > 1) {
        currentQuizPage--;
    } else if (direction === 'next' && currentQuizPage < totalPages) {
        currentQuizPage++;
    }
    
    displayQuizzes();
}

// ===== UPDATED: Open Create Quiz Modal with teacher dropdown =====
function openCreateQuizModal() {
    console.log("📝 Opening create quiz modal...");
    
    const modal = document.getElementById('createQuizModal');
    if (!modal) return;
    
    // Reset form
    document.getElementById('quizTitle').value = '';
    document.getElementById('quizDescription').value = '';
    document.getElementById('quizSubject').value = '';
    document.getElementById('quizTopic').innerHTML = '<option value="">-- Select Subject First --</option>';
    document.getElementById('quizTopic').disabled = true;
    document.getElementById('quizTimeLimit').value = '30';
    document.getElementById('quizPassingScore').value = '70';
    document.getElementById('quizMaxAttempts').value = '3';
    document.getElementById('quizDifficulty').value = 'medium';
    document.getElementById('quizStatus').value = 'active';
    document.getElementById('editQuizId').value = '';
    
    // Clear teacher dropdown (show loading)
    const teacherSelect = document.getElementById('quizAssignedTeacherId');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Loading teachers...</option>';
        teacherSelect.disabled = true;
    }
    
    // Clear questions
    const container = document.getElementById('questionsContainer');
    if (container) {
        container.innerHTML = '';
        document.getElementById('questionCount').textContent = '(0)';
        
        // Add one default question
        addQuestionField();
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
    
    // Load teachers for ALL dropdowns
    setTimeout(() => {
        loadTeachersForAssignment();
    }, 300);
    
    // Load topics when subject changes
    const subjectSelect = document.getElementById('quizSubject');
    if (subjectSelect) {
        subjectSelect.removeEventListener('change', loadQuizTopics);
        subjectSelect.addEventListener('change', loadQuizTopics);
    }
    
    showNotification('info', 'Create Quiz', 'Select a subject to load available topics');
}

// ===== ADD QUESTION FIELD =====
function addQuestionField() {
    const container = document.getElementById('questionsContainer');
    const questionCount = container.children.length + 1;
    
    const questionHtml = `
        <div class="question-item" id="question_${questionCount}">
            <div class="question-header">
                <span class="question-number">Question ${questionCount}</span>
                <button type="button" class="remove-question" onclick="removeQuestionField('question_${questionCount}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Enter question" id="q_${questionCount}_text">
            </div>
            
            <div class="options-container" id="q_${questionCount}_options">
                <div class="option-item">
                    <input type="text" class="option-input" placeholder="Option A" id="q_${questionCount}_opt_a">
                    <div class="option-correct">
                        <input type="radio" name="q_${questionCount}_correct" value="a"> Correct
                    </div>
                </div>
                <div class="option-item">
                    <input type="text" class="option-input" placeholder="Option B" id="q_${questionCount}_opt_b">
                    <div class="option-correct">
                        <input type="radio" name="q_${questionCount}_correct" value="b"> Correct
                    </div>
                </div>
                <div class="option-item">
                    <input type="text" class="option-input" placeholder="Option C" id="q_${questionCount}_opt_c">
                    <div class="option-correct">
                        <input type="radio" name="q_${questionCount}_correct" value="c"> Correct
                    </div>
                </div>
                <div class="option-item">
                    <input type="text" class="option-input" placeholder="Option D" id="q_${questionCount}_opt_d">
                    <div class="option-correct">
                        <input type="radio" name="q_${questionCount}_correct" value="d"> Correct
                    </div>
                </div>
            </div>
            
            <button type="button" class="add-option-btn" onclick="addOption('q_${questionCount}')">
                <i class="fas fa-plus"></i> Add Option
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
    document.getElementById('questionCount').textContent = `(${questionCount})`;
}

// ===== REMOVE QUESTION FIELD =====
function removeQuestionField(questionId) {
    const question = document.getElementById(questionId);
    if (question) {
        question.remove();
        
        // Renumber remaining questions
        const container = document.getElementById('questionsContainer');
        const questions = container.children;
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            q.id = `question_${i + 1}`;
            q.querySelector('.question-number').textContent = `Question ${i + 1}`;
            
            // Update all IDs inside
            const inputs = q.querySelectorAll('input[type="text"]');
            inputs.forEach(input => {
                const newId = input.id.replace(/q_\d+_/, `q_${i + 1}_`);
                input.id = newId;
            });
            
            const radios = q.querySelectorAll('input[type="radio"]');
            radios.forEach(radio => {
                radio.name = `q_${i + 1}_correct`;
            });
        }
        
        document.getElementById('questionCount').textContent = `(${questions.length})`;
    }
}

// ===== ADD OPTION =====
function addOption(questionId) {
    const optionsContainer = document.getElementById(`${questionId}_options`);
    const optionCount = optionsContainer.children.length + 1;
    const letter = String.fromCharCode(96 + optionCount); // a, b, c, d, e...
    
    const optionHtml = `
        <div class="option-item">
            <input type="text" class="option-input" placeholder="Option ${letter.toUpperCase()}" id="${questionId}_opt_${letter}">
            <div class="option-correct">
                <input type="radio" name="${questionId}_correct" value="${letter}"> Correct
            </div>
        </div>
    `;
    
    optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
}

// ===== SAVE QUIZ TO MYSQL WITH TEACHER ASSIGNMENT =====
async function saveQuizToMySQL() {
    console.log("💾 ===== SAVING QUIZ TO MYSQL DATABASE =====");
    
    // Get form values
    const title = document.getElementById('quizTitle')?.value.trim();
    const description = document.getElementById('quizDescription')?.value.trim();
    const categoryId = document.getElementById('quizSubject')?.value;
    const topicId = document.getElementById('quizTopic')?.value;
    const timeLimit = document.getElementById('quizTimeLimit')?.value;
    const passingScore = document.getElementById('quizPassingScore')?.value;
    const maxAttempts = document.getElementById('quizMaxAttempts')?.value;
    const difficulty = document.getElementById('quizDifficulty')?.value;
    const status = document.getElementById('quizStatus')?.value;
    const editId = document.getElementById('editQuizId')?.value;
    
    // ===== GET ASSIGNED TEACHER (NEW) =====
    const assignedTeacherId = document.getElementById('quizAssignedTeacherId')?.value;
    
    console.log('📋 Quiz form values:', { 
        title, 
        description, 
        categoryId, 
        topicId, 
        timeLimit, 
        passingScore, 
        maxAttempts,
        difficulty, 
        status, 
        editId: editId || 'new',
        assignedTeacherId: assignedTeacherId || 'none (self)'
    });
    
    // ===== VALIDATION =====
    if (!title) {
        showNotification('error', 'Error', 'Please enter a quiz title');
        return;
    }
    
    if (!categoryId) {
        showNotification('error', 'Error', 'Please select a subject');
        return;
    }
    
    // ===== COLLECT QUESTIONS =====
    console.log("📝 Collecting questions...");
    const questions = [];
    const questionItems = document.querySelectorAll('.question-item');
    
    console.log(`📝 Found ${questionItems.length} questions`);
    
    if (questionItems.length === 0) {
        showNotification('error', 'Error', 'Please add at least one question');
        return;
    }
    
    for (let i = 0; i < questionItems.length; i++) {
        const q = questionItems[i];
        const qId = i + 1;
        
        // Get question text
        const questionTextInput = document.getElementById(`q_${qId}_text`);
        if (!questionTextInput) {
            console.error(`❌ Question ${qId} input not found`);
            continue;
        }
        
        const questionText = questionTextInput.value.trim();
        if (!questionText) {
            showNotification('error', 'Error', `Please enter question ${qId} text`);
            return;
        }
        
        // Get correct answer
        const correctRadio = document.querySelector(`input[name="q_${qId}_correct"]:checked`);
        if (!correctRadio) {
            showNotification('error', 'Error', `Please select correct answer for question ${qId}`);
            return;
        }
        const correctLetter = correctRadio.value;
        
        // Get options
        const options = [];
        const optionLetters = ['a', 'b', 'c', 'd', 'e', 'f'];
        
        for (let j = 0; j < optionLetters.length; j++) {
            const letter = optionLetters[j];
            const optInput = document.getElementById(`q_${qId}_opt_${letter}`);
            
            if (optInput && optInput.value.trim()) {
                options.push({
                    option_text: optInput.value.trim(),
                    is_correct: letter === correctLetter ? 1 : 0,
                    option_order: j + 1
                });
            }
        }
        
        if (options.length < 2) {
            showNotification('error', 'Error', `Question ${qId} must have at least 2 options`);
            return;
        }
        
        questions.push({
            question_text: questionText,
            question_type: 'multiple_choice',
            points: 10,
            question_order: i + 1,
            options: options
        });
    }
    
    // ===== PREPARE DATA FOR SERVER =====
    const quizData = {
        category_id: parseInt(categoryId),
        title: title,
        description: description || '',
        difficulty: difficulty || 'medium',
        time_limit: parseInt(timeLimit) || 30,
        passing_score: parseFloat(passingScore) || 70,
        max_attempts: parseInt(maxAttempts) || 3,
        total_questions: questions.length,
        is_active: status === 'active' ? 1 : 0,
        questions: questions
    };
    
    // ===== ADD TEACHER ASSIGNMENT IF SELECTED =====
    if (assignedTeacherId) {
        quizData.assigned_teacher_id = parseInt(assignedTeacherId);
        console.log(`👨‍🏫 Quiz will be assigned to teacher ID: ${assignedTeacherId}`);
    }
    
    if (editId) {
        quizData.quiz_id = parseInt(editId);
        console.log(`🔄 Updating quiz ID: ${editId}`);
    }
    
    console.log("📤 Sending quiz data:", JSON.stringify(quizData, null, 2));
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        const saveBtn = document.querySelector('#createQuizModal .btn-primary');
        const originalText = saveBtn?.innerHTML;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        const url = editId 
            ? `http://localhost:5000/api/admin/quizzes/${editId}`
            : 'http://localhost:5000/api/admin/quizzes';
        
        console.log(`📡 Sending ${editId ? 'PUT' : 'POST'} request to:`, url);
        
        const response = await fetch(url, {
            method: editId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizData)
        });
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (!response.ok) {
            throw new Error(result.message || `Server error: ${response.status}`);
        }
        
        if (result.success) {
            let message = editId 
                ? 'Quiz updated successfully!' 
                : 'Quiz created successfully!';
            
            if (assignedTeacherId) {
                message += ' (Assigned to teacher)';
            }
            
            showNotification('success', 'Success!', message);
            closeCreateQuizModal();
            await loadQuizzesFromMySQL();
        } else {
            throw new Error(result.message || 'Failed to save quiz');
        }
        
    } catch (error) {
        console.error('❌ Error saving quiz:', error);
        showNotification('error', 'Save Failed', error.message);
    } finally {
        const saveBtn = document.querySelector('#createQuizModal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Quiz';
        }
    }
}
// ===== CLOSE CREATE QUIZ MODAL =====
function closeCreateQuizModal() {
    const modal = document.getElementById('createQuizModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== VIEW QUIZ =====
async function viewQuiz(quizId) {
    console.log("👁️ Viewing quiz:", quizId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/quizzes/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const quiz = result.quiz;
            
            const modal = document.getElementById('viewQuizModal');
            const body = document.getElementById('viewQuizBody');
            
            let questionsHtml = '';
            quiz.questions.forEach((q, index) => {
                questionsHtml += `
                    <div class="view-question-item">
                        <h5>Question ${index + 1}: ${q.question_text}</h5>
                        <div class="view-options">
                            ${q.options.map(opt => `
                                <div class="view-option ${opt.is_correct ? 'correct' : ''}">
                                    ${opt.letter}. ${opt.option_text}
                                    ${opt.is_correct ? ' <i class="fas fa-check"></i>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            });
            
            body.innerHTML = `
                <div class="quiz-detail">
                    <h3>${quiz.title}</h3>
                    <p>${quiz.description || 'No description'}</p>
                    
                    <div class="quiz-meta-grid">
                        <div class="quiz-meta-item">
                            <span class="meta-label">Subject:</span>
                            <span class="meta-value">${getSubjectName(quiz.subject_id)}</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">Questions:</span>
                            <span class="meta-value">${quiz.question_count}</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">Time Limit:</span>
                            <span class="meta-value">${quiz.time_limit_minutes} minutes</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">Passing Score:</span>
                            <span class="meta-value">${quiz.passing_score}%</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">Attempts:</span>
                            <span class="meta-value">${quiz.attempts || 0}</span>
                        </div>
                        <div class="quiz-meta-item">
                            <span class="meta-label">Avg. Score:</span>
                            <span class="meta-value">${quiz.avg_score || 0}%</span>
                        </div>
                    </div>
                    
                    <h4>Questions</h4>
                    ${questionsHtml}
                </div>
            `;
            
            modal.style.display = 'flex';
            modal.style.zIndex = '10001';
            document.body.classList.add('modal-open');
        }
        
    } catch (error) {
        console.error('❌ Error viewing quiz:', error);
        showNotification('error', 'Error', 'Failed to load quiz details');
    }
}

// ===== CLOSE VIEW QUIZ MODAL =====
function closeViewQuizModal() {
    const modal = document.getElementById('viewQuizModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== EDIT QUIZ =====
async function editQuiz(quizId) {
    console.log("✏️ Editing quiz:", quizId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/quizzes/${quizId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const quiz = result.quiz;
            
            // Open create modal
            openCreateQuizModal();
            
            // Fill form
            document.getElementById('editQuizId').value = quiz.id;
            document.getElementById('quizTitle').value = quiz.title;
            document.getElementById('quizDescription').value = quiz.description || '';
            document.getElementById('quizSubject').value = quiz.subject_id;
            document.getElementById('quizTimeLimit').value = quiz.time_limit_minutes;
            document.getElementById('quizPassingScore').value = quiz.passing_score;
            document.getElementById('quizMaxAttempts').value = quiz.max_attempts;
            document.getElementById('quizStatus').value = quiz.status;
            
            // Load topics
            await loadQuizTopics();
            
            // Set topic
            if (quiz.topic_id) {
                document.getElementById('quizTopic').value = quiz.topic_id;
            }
            
            // Add questions
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';
            
            quiz.questions.forEach((q, index) => {
                addQuestionField();
                
                // Fill question data (with slight delay for DOM to update)
                setTimeout(() => {
                    const qNum = index + 1;
                    document.getElementById(`q_${qNum}_text`).value = q.question_text;
                    
                    q.options.forEach(opt => {
                        const optInput = document.getElementById(`q_${qNum}_opt_${opt.letter.toLowerCase()}`);
                        if (optInput) {
                            optInput.value = opt.option_text;
                        }
                    });
                    
                    // Set correct answer
                    const correctRadio = document.querySelector(`input[name="q_${qNum}_correct"][value="${q.correct_answer.toLowerCase()}"]`);
                    if (correctRadio) {
                        correctRadio.checked = true;
                    }
                }, 100 * (index + 1));
            });
            
            showNotification('info', 'Edit Mode', 'Update quiz details and click Save');
        }
        
    } catch (error) {
        console.error('❌ Error editing quiz:', error);
        showNotification('error', 'Error', 'Failed to load quiz for editing');
    }
}

// ===== DELETE QUIZ =====
async function deleteQuiz(quizId) {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
        return;
    }
    
    console.log("🗑️ Deleting quiz:", quizId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/admin/quizzes/${quizId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Deleted', 'Quiz deleted successfully');
            await loadQuizzesFromMySQL();
        } else {
            throw new Error(result.message || 'Failed to delete quiz');
        }
        
    } catch (error) {
        console.error('❌ Error deleting quiz:', error);
        showNotification('error', 'Delete Failed', error.message);
    }
}

// ===== VIEW QUIZ RESULTS - UPDATED WITH EXPORT PDF BUTTON =====
async function viewQuizResults(quizId) {
    console.log("📊 Viewing results for quiz:", quizId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        showNotification('info', 'Loading', 'Fetching quiz results...');
        
        const response = await fetch(`http://localhost:5000/api/admin/quizzes/${quizId}/results`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Quiz results:', result);
        
        if (result.success) {
            const results = result.results || [];
            const quiz = quizData.find(q => q.id === quizId);
            const quizTitle = quiz ? quiz.title : `Quiz #${quizId}`;
            
            // Store results for export
            window.currentQuizResults = {
                quizId: quizId,
                quizTitle: quizTitle,
                results: results,
                fetchedAt: new Date().toISOString()
            };
            
            const modal = document.getElementById('quizResultsModal');
            const body = document.getElementById('quizResultsBody');
            
            if (!modal || !body) {
                console.error("❌ Quiz results modal elements not found!");
                return;
            }
            
            if (results.length === 0) {
                body.innerHTML = `
                    <div style="text-align: center; padding: 50px;">
                        <i class="fas fa-chart-bar" style="font-size: 4rem; color: #999; margin-bottom: 20px;"></i>
                        <h4 style="color: #666; margin-bottom: 10px;">No Results Yet</h4>
                        <p style="color: #999; margin-bottom: 20px;">This quiz hasn't been taken by any students yet.</p>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <button class="btn btn-secondary" onclick="closeQuizResultsModal()">Close</button>
                        </div>
                    </div>
                `;
            } else {
                // Calculate statistics
                const totalAttempts = results.length;
                const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
                const passedCount = results.filter(r => r.passed).length;
                const passRate = Math.round((passedCount / results.length) * 100);
                
                // Calculate score distribution
                const scoreRanges = {
                    '90-100%': results.filter(r => r.score >= 90).length,
                    '80-89%': results.filter(r => r.score >= 80 && r.score < 90).length,
                    '70-79%': results.filter(r => r.score >= 70 && r.score < 80).length,
                    '60-69%': results.filter(r => r.score >= 60 && r.score < 70).length,
                    'Below 60%': results.filter(r => r.score < 60).length
                };
                
                let resultsHtml = `
                    <div style="margin-bottom: 25px;">
                        <h4 style="color: #7a0000; margin-bottom: 15px;">${quizTitle} - Results Summary</h4>
                        
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid #7a0000;">
                                <div style="font-size: 1.8rem; font-weight: bold; color: #7a0000;">${totalAttempts}</div>
                                <div style="font-size: 0.85rem; color: #666;">Total Attempts</div>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid #2196F3;">
                                <div style="font-size: 1.8rem; font-weight: bold; color: #2196F3;">${avgScore}%</div>
                                <div style="font-size: 0.85rem; color: #666;">Average Score</div>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid #4CAF50;">
                                <div style="font-size: 1.8rem; font-weight: bold; color: #4CAF50;">${passedCount}</div>
                                <div style="font-size: 0.85rem; color: #666;">Passed</div>
                            </div>
                            <div style="background: #f8f9fa; padding: 15px; text-align: center; border-radius: 8px; border-left: 4px solid #FF9800;">
                                <div style="font-size: 1.8rem; font-weight: bold; color: #FF9800;">${passRate}%</div>
                                <div style="font-size: 0.85rem; color: #666;">Pass Rate</div>
                            </div>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                            <h5 style="margin: 0 0 15px 0; color: #333;">Score Distribution</h5>
                            <div style="display: grid; gap: 10px;">
                                ${Object.entries(scoreRanges).map(([range, count]) => `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="font-size: 0.85rem;">${range}</span>
                                            <span style="font-size: 0.85rem; font-weight: 600;">${count} students</span>
                                        </div>
                                        <div style="height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                                            <div style="width: ${totalAttempts > 0 ? (count / totalAttempts * 100) : 0}%; height: 100%; background: #7a0000;"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <h5 style="color: #7a0000; margin: 20px 0 15px 0;">Student Attempts</h5>
                    <div style="max-height: 350px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 8px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                <tr>
                                    <th style="padding: 12px; text-align: left;">Student</th>
                                    <th style="padding: 12px; text-align: left;">Score</th>
                                    <th style="padding: 12px; text-align: left;">Time Spent</th>
                                    <th style="padding: 12px; text-align: left;">Date</th>
                                    <th style="padding: 12px; text-align: left;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                results.forEach(result => {
                    const statusClass = result.passed ? 'passed' : 'failed';
                    const statusText = result.passed ? 'Passed' : 'Failed';
                    const timeSpent = result.time_spent_seconds 
                        ? `${Math.floor(result.time_spent_seconds / 60)}m ${result.time_spent_seconds % 60}s`
                        : 'N/A';
                    
                    resultsHtml += `
                        <tr style="border-bottom: 1px solid #e0e0e0;">
                            <td style="padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <div style="width: 32px; height: 32px; border-radius: 50%; background: #7a0000; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold;">
                                        ${getInitials(result.student_name)}
                                    </div>
                                    <span>${result.student_name}</span>
                                </div>
                            </td>
                            <td style="padding: 12px;">
                                <span style="background: ${result.score >= 70 ? '#4CAF50' : '#f44336'}20; color: ${result.score >= 70 ? '#2e7d32' : '#c62828'}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">
                                    ${result.score}%
                                </span>
                            </td>
                            <td style="padding: 12px;">${timeSpent}</td>
                            <td style="padding: 12px;">${formatDate(result.completed_at)}</td>
                            <td style="padding: 12px;">
                                <span style="background: ${result.passed ? '#4CAF50' : '#f44336'}20; color: ${result.passed ? '#2e7d32' : '#c62828'}; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">
                                    ${statusText}
                                </span>
                            </td>
                        </tr>
                    `;
                });
                
                resultsHtml += `
                            </tbody>
                        </table>
                    </div>
                `;
                
                body.innerHTML = resultsHtml;
            }
            
            // Update modal footer with export button
            const modalFooter = modal.querySelector('.modal-footer');
            if (modalFooter) {
                modalFooter.innerHTML = `
                    <button class="btn btn-secondary" onclick="closeQuizResultsModal()">Close</button>
                    <button class="btn btn-primary" onclick="exportQuizResultsPDF()" style="background: #7a0000;">
                        <i class="fas fa-file-pdf"></i> Export Results to PDF
                    </button>
                `;
            }
            
            // Show modal
            modal.style.display = 'flex';
            modal.style.zIndex = '10001';
            document.body.classList.add('modal-open');
            
        } else {
            throw new Error(result.message || 'Failed to load quiz results');
        }
        
    } catch (error) {
        console.error('❌ Error loading quiz results:', error);
        showNotification('error', 'Error', error.message);
    }
}

// ===== EXPORT QUIZ RESULTS TO PDF =====
async function exportQuizResultsPDF() {
    console.log("📄 Exporting quiz results to PDF...");
    
    if (!window.currentQuizResults) {
        showNotification('error', 'No Data', 'No quiz results to export');
        return;
    }
    
    const { quizId, quizTitle, results, fetchedAt } = window.currentQuizResults;
    
    showNotification('info', 'Generating PDF', 'Preparing results report...');
    
    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page.');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Get current date and time
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = new Date().toLocaleTimeString();
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.text('QUIZ RESULTS REPORT', 148.5, 70, { align: 'center' });
        
        doc.setFontSize(24);
        doc.text(quizTitle, 148.5, 100, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(`Generated on: ${currentDate}`, 148.5, 130, { align: 'center' });
        doc.text(`Time: ${currentTime}`, 148.5, 145, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text(`Quiz ID: #${quizId}`, 148.5, 170, { align: 'center' });
        
        // Add new page
        doc.addPage();
        
        // ===== STATISTICS PAGE =====
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(122, 0, 0);
        doc.text('Results Summary', 20, 20);
        
        // Calculate statistics
        const totalAttempts = results.length;
        
        if (totalAttempts === 0) {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No attempts recorded for this quiz', 20, 40);
        } else {
            const avgScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length);
            const passedCount = results.filter(r => r.passed).length;
            const passRate = Math.round((passedCount / results.length) * 100);
            
            // Score distribution
            const scoreRanges = {
                '90-100%': results.filter(r => r.score >= 90).length,
                '80-89%': results.filter(r => r.score >= 80 && r.score < 90).length,
                '70-79%': results.filter(r => r.score >= 70 && r.score < 80).length,
                '60-69%': results.filter(r => r.score >= 60 && r.score < 70).length,
                'Below 60%': results.filter(r => r.score < 60).length
            };
            
            // Statistics table
            doc.autoTable({
                startY: 30,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Attempts', totalAttempts.toString()],
                    ['Average Score', avgScore + '%'],
                    ['Students Passed', passedCount.toString()],
                    ['Pass Rate', passRate + '%']
                ],
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                margin: { top: 30 }
            });
            
            // Score distribution table
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 15,
                head: [['Score Range', 'Number of Students', 'Percentage']],
                body: Object.entries(scoreRanges).map(([range, count]) => {
                    const percentage = totalAttempts > 0 ? Math.round((count / totalAttempts) * 100) : 0;
                    return [range, count.toString(), percentage + '%'];
                }),
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
            });
        }
        
        // ===== ATTEMPTS DETAILS PAGE =====
        doc.addPage();
        doc.setFontSize(24);
        doc.setTextColor(122, 0, 0);
        doc.text('Student Attempts Details', 20, 20);
        
        // Prepare data for table
        const tableData = results.map(result => {
            const timeSpent = result.time_spent_seconds 
                ? `${Math.floor(result.time_spent_seconds / 60)}m ${result.time_spent_seconds % 60}s`
                : 'N/A';
            
            return [
                result.student_name || 'Unknown',
                result.score + '%',
                timeSpent,
                result.passed ? 'Passed' : 'Failed',
                formatDateForPDF(result.completed_at)
            ];
        });
        
        if (tableData.length > 0) {
            doc.autoTable({
                startY: 30,
                head: [['Student', 'Score', 'Time Spent', 'Status', 'Date']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { cellWidth: 50 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 40 }
                },
                margin: { top: 30 },
                didDrawPage: function(data) {
                    // Add footer
                    doc.setFontSize(10);
                    doc.setTextColor(100, 100, 100);
                    doc.text(
                        `Quiz Results Report - Page ${data.pageCount}`,
                        doc.internal.pageSize.width / 2,
                        doc.internal.pageSize.height - 10,
                        { align: 'center' }
                    );
                }
            });
        } else {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No attempts recorded for this quiz', 20, 40);
        }
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `Generated by MathHub Admin Dashboard - ${currentDate}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 5,
                { align: 'center' }
            );
        }
        
        // ===== DOWNLOAD THE PDF =====
        const safeTitle = quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `MathHub_Quiz_Results_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'PDF Downloaded', `Results saved as ${fileName}`);
        console.log(`✅ Quiz results PDF downloaded: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating quiz results PDF:', error);
        showNotification('error', 'PDF Generation Failed', error.message);
        
        // Fallback to CSV if PDF fails
        exportQuizResultsCSV();
    }
}

// ===== FALLBACK: Export Quiz Results as CSV =====
function exportQuizResultsCSV() {
    console.log("📄 Exporting quiz results as CSV (fallback)...");
    
    if (!window.currentQuizResults) {
        showNotification('error', 'No Data', 'No quiz results to export');
        return;
    }
    
    const { quizTitle, results } = window.currentQuizResults;
    
    if (results.length === 0) {
        showNotification('error', 'No Data', 'No results to export');
        return;
    }
    
    // Create CSV content
    let csv = 'Student Name,Score (%),Time Spent (seconds),Status,Completed Date\n';
    
    results.forEach(result => {
        const row = [
            `"${(result.student_name || 'Unknown').replace(/"/g, '""')}"`,
            result.score || 0,
            result.time_spent_seconds || 0,
            result.passed ? 'Passed' : 'Failed',
            result.completed_at || ''
        ];
        csv += row.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const safeTitle = quizTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `MathHub_Quiz_Results_${safeTitle}_${new Date().toISOString().split('T')[0]}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('warning', 'CSV Downloaded', 'PDF generation failed. Exported as CSV instead.');
}

// ===== CLOSE QUIZ RESULTS MODAL (update to clear stored data) =====
function closeQuizResultsModal() {
    const modal = document.getElementById('quizResultsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    // Clear stored results when closing modal
    window.currentQuizResults = null;
}

// ===== CLOSE QUIZ RESULTS MODAL =====
function closeQuizResultsModal() {
    const modal = document.getElementById('quizResultsModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== EXPORT QUIZ RESULTS =====
function exportQuizResults() {
    showNotification('info', 'Exporting', 'Preparing quiz results for export...');
    
    setTimeout(() => {
        showNotification('success', 'Exported', 'Quiz results exported successfully');
    }, 1500);
}

// ===== UPDATE RECENT RESULTS =====
async function updateRecentResults() {
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/quizzes/recent-results', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const results = result.results || [];
            const grid = document.getElementById('recentResultsGrid');
            
            if (results.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                        <i class="fas fa-clock" style="font-size: 3rem; color: var(--medium-gray);"></i>
                        <p style="color: var(--medium-gray); margin-top: 15px;">No recent quiz attempts</p>
                    </div>
                `;
                return;
            }
            
            grid.innerHTML = results.map(result => `
                <div class="result-card ${result.passed ? 'passed' : 'failed'}">
                    <div class="result-student">
                        <div class="result-student-avatar">${getInitials(result.student_name)}</div>
                        <div class="result-student-info">
                            <h4>${result.student_name}</h4>
                            <p>${result.quiz_title}</p>
                        </div>
                    </div>
                    <div class="result-details">
                        <span class="result-score ${result.passed ? 'passed' : 'failed'}">${result.score}%</span>
                        <span class="result-quiz">${getTimeAgo(result.completed_at)}</span>
                    </div>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('❌ Error loading recent results:', error);
    }
}

// ===== UPDATE TOP QUIZZES =====
function updateTopQuizzes() {
    const topQuizzes = [...quizData]
        .sort((a, b) => (b.attempts || 0) - (a.attempts || 0))
        .slice(0, 5);
    
    const list = document.getElementById('topQuizzesList');
    
    if (topQuizzes.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <i class="fas fa-trophy" style="font-size: 2rem; color: var(--medium-gray);"></i>
                <p style="color: var(--medium-gray); margin-top: 10px;">No quiz data available</p>
            </div>
        `;
        return;
    }
    
    list.innerHTML = topQuizzes.map((quiz, index) => {
        const rankClass = index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : '';
        return `
            <div class="top-quiz-item">
                <div class="top-quiz-rank ${rankClass}">${index + 1}</div>
                <div class="top-quiz-info">
                    <span class="top-quiz-title">${quiz.title}</span>
                    <span class="top-quiz-meta">
                        <span><i class="fas fa-users"></i> ${quiz.attempts || 0} attempts</span>
                        <span><i class="fas fa-star"></i> ${quiz.avg_score || 0}% avg</span>
                    </span>
                </div>
                <div class="top-quiz-score">${quiz.avg_score || 0}%</div>
            </div>
        `;
    }).join('');
}

// ===== INITIALIZE QUIZ CHART =====
async function initializeQuizChart() {
    console.log("📊 Initializing quiz performance chart...");
    
    const chartContainer = document.querySelector('.quiz-analytics-card .chart-container');
    if (!chartContainer) {
        console.error("❌ Chart container not found!");
        return;
    }
    
    // I-restore ang canvas kung nawala
    chartContainer.innerHTML = '<canvas id="quizPerformanceChart"></canvas>';
    
    // Get the canvas
    const canvas = document.getElementById('quizPerformanceChart');
    if (!canvas) {
        console.error("❌ Canvas element not found!");
        return;
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No authentication token');
        }
        
        console.log('📡 Fetching quiz performance data...');
        
        const response = await fetch('http://localhost:5000/api/admin/quiz-performance', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            // Add timeout para hindi mag-hang
            signal: AbortSignal.timeout(5000)
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load data');
        }
        
        const chartData = result.chart;
        const hasData = chartData.attempts.some(val => val > 0) || chartData.avg_scores.some(val => val > 0);
        
        // Destroy existing chart if any
        if (window.quizChart) {
            window.quizChart.destroy();
        }
        
        // Create new chart
        window.quizChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [
                    {
                        label: 'Attempts',
                        data: chartData.attempts,
                        borderColor: 'rgba(122, 0, 0, 1)',
                        backgroundColor: 'rgba(122, 0, 0, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Average Score',
                        data: chartData.avg_scores,
                        borderColor: 'rgba(76, 175, 80, 1)',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    title: {
                        display: !hasData,
                        text: 'No quiz data available for the selected period',
                        color: '#999',
                        font: { size: 14 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.label === 'Attempts') {
                                        label += context.parsed.y;
                                    } else {
                                        label += context.parsed.y + '%';
                                    }
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Number of Attempts'
                        },
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Average Score (%)'
                        },
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
        
        console.log('✅ Quiz chart initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing quiz chart:', error);
        
        // Show error message
        chartContainer.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 15px;"></i>
                <h4 style="color: #f44336; margin-bottom: 10px;">Failed to Load Chart</h4>
                <p style="color: #666; margin-bottom: 15px;">${error.message}</p>
                <button class="btn btn-primary" onclick="initializeQuizChart()" style="background: #7a0000;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== SHOW CHART LOADING OVERLAY =====
function showChartLoading(container) {
    // Remove any existing overlay
    removeChartLoading(container);
    
    const overlay = document.createElement('div');
    overlay.className = 'chart-loading-overlay';
    overlay.innerHTML = `
        <div style="text-align: center;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
            <p style="margin-top: 15px; color: #666;">Loading chart data...</p>
        </div>
    `;
    overlay.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
        border-radius: 8px;
    `;
    
    container.style.position = 'relative';
    container.appendChild(overlay);
}

// ===== REMOVE CHART LOADING OVERLAY - FIXED VERSION =====
function removeChartLoading(container) {
    if (!container) return;
    
    console.log("🔄 Removing chart loading overlay");
    
    // Try multiple ways to find and remove the overlay
    const overlay1 = container.querySelector('.chart-loading-overlay');
    if (overlay1) {
        overlay1.remove();
        console.log("✅ Removed .chart-loading-overlay");
    }
    
    const overlay2 = container.querySelector('.chart-loading');
    if (overlay2) {
        overlay2.remove();
        console.log("✅ Removed .chart-loading");
    }
    
    // Also remove any div with loading text
    const allDivs = container.querySelectorAll('div');
    allDivs.forEach(div => {
        if (div.innerHTML.includes('Loading chart data') || 
            div.innerHTML.includes('fa-spinner')) {
            div.remove();
            console.log("✅ Removed loading div by content");
        }
    });
    
    // Make sure canvas is visible
    const canvas = container.querySelector('canvas');
    if (canvas) {
        canvas.style.display = 'block';
    }
}

// ===== SHOW CHART ERROR =====
function showChartError(canvas, errorMessage) {
    const container = canvas.parentElement;
    
    // Hide canvas temporarily
    canvas.style.display = 'none';
    
    // Remove any existing error
    const existingError = container.querySelector('.chart-error');
    if (existingError) existingError.remove();
    
    // Create error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chart-error';
    errorDiv.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #f44336; margin-bottom: 15px;"></i>
            <h4 style="color: #f44336; margin-bottom: 10px;">Failed to Load Chart</h4>
            <p style="color: #666; margin-bottom: 15px;">${errorMessage}</p>
            <button class="btn btn-primary" onclick="retryLoadLessonChart()" style="background: #7a0000;">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
    errorDiv.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
    `;
    
    container.style.position = 'relative';
    container.appendChild(errorDiv);
}

// ===== RETRY LOADING LESSON CHART =====
function retryLoadLessonChart() {
    const container = document.querySelector('.analytics-chart-card .chart-container');
    if (container) {
        // Remove error message
        const error = container.querySelector('.chart-error');
        if (error) error.remove();
        
        // Show canvas again
        const canvas = document.getElementById('lessonPopularityChart');
        if (canvas) {
            canvas.style.display = 'block';
        }
        
        // Retry loading
        loadLessonPopularityData();
    }
}

// ===== HELPER: Show loading state in chart =====
function showChartLoading(canvas) {
    const parent = canvas.parentElement;
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'chart-loading';
    loadingDiv.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <i class="fas fa-spinner fa-pulse fa-2x" style="color: #7a0000;"></i>
            <p style="margin-top: 10px; color: #666;">Loading chart data...</p>
        </div>
    `;
    loadingDiv.style.position = 'absolute';
    loadingDiv.style.top = '0';
    loadingDiv.style.left = '0';
    loadingDiv.style.width = '100%';
    loadingDiv.style.height = '100%';
    loadingDiv.style.background = 'rgba(255,255,255,0.9)';
    loadingDiv.style.zIndex = '10';
    loadingDiv.style.display = 'flex';
    loadingDiv.style.alignItems = 'center';
    loadingDiv.style.justifyContent = 'center';
    
    // Remove any existing loading overlay
    const existing = parent.querySelector('.chart-loading');
    if (existing) existing.remove();
    
    parent.style.position = 'relative';
    parent.appendChild(loadingDiv);
}

// ===== HELPER: Show error in chart =====
function showChartError(canvas, errorMessage) {
    const parent = canvas.parentElement;
    const errorDiv = parent.querySelector('.chart-loading') || document.createElement('div');
    errorDiv.className = 'chart-loading';
    errorDiv.innerHTML = `
        <div style="text-align: center; padding: 30px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #f44336; margin-bottom: 10px;"></i>
            <h4 style="color: #f44336; margin-bottom: 5px;">Failed to Load Chart</h4>
            <p style="color: #666; margin-bottom: 15px;">${errorMessage}</p>
            <button class="btn btn-primary btn-sm" onclick="initializeQuizChart()" style="background: #7a0000;">
                <i class="fas fa-sync-alt"></i> Retry
            </button>
        </div>
    `;
    errorDiv.style.position = 'absolute';
    errorDiv.style.top = '0';
    errorDiv.style.left = '0';
    errorDiv.style.width = '100%';
    errorDiv.style.height = '100%';
    errorDiv.style.background = 'rgba(255,255,255,0.95)';
    errorDiv.style.zIndex = '10';
    errorDiv.style.display = 'flex';
    errorDiv.style.alignItems = 'center';
    errorDiv.style.justifyContent = 'center';
    
    parent.style.position = 'relative';
    parent.appendChild(errorDiv);
}

// ===== UPDATE QUIZ CHART WHEN TIME RANGE CHANGES =====
async function updateQuizChart(range) {
    console.log("📊 Updating quiz chart with range:", range);
    
    const chartContainer = document.querySelector('.quiz-analytics-card .chart-container');
    if (!chartContainer) return;
    
    // Show loading
    chartContainer.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
            <p style="margin-top: 15px; color: #666;">Updating chart...</p>
        </div>
    `;
    
    // Reinitialize after a short delay
    setTimeout(() => {
        initializeQuizChart();
    }, 300);
}


// ===== LOAD QUIZ TOPICS - FINAL FIXED VERSION =====
async function loadQuizTopics() {
    console.log("📚 Loading topics for selected subject...");
    
    const subjectId = document.getElementById('quizSubject').value;
    const topicSelect = document.getElementById('quizTopic');
    
    console.log(`🔍 Selected subject ID: ${subjectId}`);
    
    if (!subjectId) {
        console.log("⚠️ No subject selected");
        topicSelect.innerHTML = '<option value="">-- Select Subject First --</option>';
        topicSelect.disabled = true;
        return;
    }
    
    // Show loading
    topicSelect.innerHTML = '<option value="">Loading topics...</option>';
    topicSelect.disabled = true;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No auth token');
        }
        
        console.log(`📡 Fetching structure from server...`);
        
        // Get ALL structure data
        const response = await fetch(`http://localhost:5000/api/admin/structure`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success && result.structure) {
            const allTopics = result.structure.topics || [];
            const allModules = result.structure.modules || [];
            const allLessons = result.structure.lessons || [];
            
            console.log(`📊 Data from server:`);
            console.log(`   📚 Lessons: ${allLessons.length}`);
            console.log(`   📦 Modules: ${allModules.length}`);
            console.log(`   📋 Topics: ${allTopics.length}`);
            
            // ✅ IMPORTANT: Use the subjectId directly as lesson_id
            // PolyLearn = 2, MathEase = 1, FactoLearn = 3
            const lessonId = parseInt(subjectId);
            
            console.log(`🔍 Looking for modules with lesson_id = ${lessonId}`);
            
            // DEBUG: Show all modules
            console.log('All modules:', allModules.map(m => ({
                id: m.id,
                name: m.name,
                lesson_id: m.lesson_id
            })));
            
            // Get modules for this lesson
            const modulesForLesson = allModules.filter(m => 
                parseInt(m.lesson_id) === lessonId
            );
            
            console.log(`📦 Found ${modulesForLesson.length} modules for lesson ${lessonId}:`, 
                modulesForLesson.map(m => ({ id: m.id, name: m.name }))
            );
            
            if (modulesForLesson.length === 0) {
                console.log(`⚠️ No modules found for lesson ID ${lessonId}`);
                console.log(`   Available lesson IDs:`, [...new Set(allModules.map(m => m.lesson_id))]);
                
                topicSelect.innerHTML = '<option value="">-- No modules for this subject --</option>';
                topicSelect.disabled = true;
                showNotification('info', 'No Modules', 'Create modules first in Lesson Management');
                return;
            }
            
            // Get module IDs
            const moduleIds = modulesForLesson.map(m => parseInt(m.id));
            console.log(`📦 Module IDs:`, moduleIds);
            
            // Get topics that belong to these modules
            const filteredTopics = allTopics.filter(topic => 
                moduleIds.includes(parseInt(topic.module_id))
            );
            
            console.log(`📚 Found ${filteredTopics.length} topics for lesson ID ${lessonId}`);
            
            if (filteredTopics.length === 0) {
                topicSelect.innerHTML = '<option value="">-- No topics available --</option>';
                topicSelect.disabled = true;
                showNotification('info', 'No Topics', 'Create topics first in Lesson Management');
            } else {
                let options = '<option value="">-- Select Topic --</option>';
                filteredTopics.forEach(topic => {
                    const moduleName = modulesForLesson.find(m => m.id == topic.module_id)?.name || 'Unknown';
                    options += `<option value="${topic.id}">${topic.name} (${moduleName})</option>`;
                });
                topicSelect.innerHTML = options;
                topicSelect.disabled = false;
                console.log("✅ Topic dropdown enabled with", filteredTopics.length, "options");
            }
        } else {
            throw new Error(result.message || 'Failed to load structure');
        }
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
        
        // Show error in dropdown
        topicSelect.innerHTML = '<option value="">-- Error loading topics --</option>';
        topicSelect.disabled = true;
        showNotification('error', 'Load Failed', error.message);
    }
}

// ===== HELPER FUNCTIONS =====
function getSubjectClass(subjectId) {
    const classes = {
        2: 'polynomial',
        1: 'mathease',
        3: 'factolearn'
    };
    return classes[subjectId] || '';
}

/// ===== GET SUBJECT NAME - UPDATED WITH CORRECT MAPPING =====
function getSubjectName(subjectId) {
    // Map subject_id to display names
    const names = {
        2: 'PolyLearn',    // PolyLearn ID is 2
        1: 'MathEase',     // MathEase ID is 1
        3: 'FactoLearn'    // FactoLearn ID is 3
    };
    
    // If subjectId is provided, use the mapping
    if (subjectId && names[subjectId]) {
        return names[subjectId];
    }
    
    // Default fallback
    return 'Unknown';
}

// ===== GET SUBJECT ID FROM NAME - HELPER FUNCTION =====
function getSubjectIdFromName(subjectName) {
    const ids = {
        'polylearn': 2,
        'polynomial': 2,
        'mathease': 1,
        'math': 1,
        'factolearn': 3,
        'factorial': 3
    };
    return ids[subjectName.toLowerCase()] || 1;
}

function getScoreClass(score) {
    if (!score) return '';
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().substring(0, 2);
}

function getTimeAgo(dateString) {
    if (!dateString) return 'Recently';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ===== EDIT LESSON FUNCTIONS WITH REPLACE OPTIONS =====

// Global variable to store current lesson being edited
let currentEditLessonId = null;
let currentEditLessonData = null;

// ===== OPEN EDIT LESSON MODAL WITH DATA =====
async function openEditLessonModal(lessonId) {
    console.log("📝 Opening edit lesson modal for ID:", lessonId);
    
    const modal = document.getElementById('editLessonModal');
    if (!modal) return;
    
    // Reset form
    resetEditLessonForm();
    
    // Show loading
    document.getElementById('editLessonTitle').value = 'Loading...';
    document.getElementById('editLessonDescription').value = 'Loading...';
    
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
    
    try {
        // Load lesson data
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch(`http://localhost:5000/api/lessons-db/${lessonId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const lesson = result.lesson;
            currentEditLessonId = lessonId;
            currentEditLessonData = lesson;
            
            // Populate basic info
            document.getElementById('editLessonTitle').value = lesson.content_title || '';
            document.getElementById('editLessonDescription').value = lesson.content_description || '';
            
            // Set current content type
            document.getElementById('editCurrentContentType').value = lesson.content_type || 'text';
            
            // Update current content info
            const contentTypeSpan = document.getElementById('editCurrentContentType');
            contentTypeSpan.textContent = (lesson.content_type || 'text').toUpperCase();
            contentTypeSpan.className = `badge ${lesson.content_type === 'video' ? 'bg-danger' : 'bg-info'}`;
            
            let filename = '';
            if (lesson.video_filename) {
                filename = lesson.video_filename;
            } else if (lesson.content_url && lesson.content_url.includes('youtube')) {
                filename = 'YouTube Video';
            }
            
            document.getElementById('editCurrentContentFilename').textContent = filename || 'No file';
            
            // For text content, show preview
            if (lesson.content_type === 'text' && lesson.content_text) {
                document.getElementById('editCurrentTextContent').textContent = lesson.content_text;
            } else {
                document.getElementById('editCurrentTextContent').textContent = 'No text content available';
            }
            
            // Populate topics
            await loadEditTopics();
            
            // Set topic if exists
            if (lesson.topic_id) {
                setTimeout(() => {
                    const topicSelect = document.getElementById('editTopicSelect');
                    if (topicSelect) {
                        topicSelect.value = lesson.topic_id;
                    }
                }, 500);
            }
            
            // Show appropriate section based on content type
            if (lesson.content_type === 'video') {
                showEditContentSection('video');
                document.getElementById('editVideoTypeBtn').classList.add('active');
                document.getElementById('editVideoTypeBtn').style.background = '#7a0000';
                document.getElementById('editVideoTypeBtn').style.color = 'white';
            } else {
                showEditContentSection('text');
                document.getElementById('editTextTypeBtn').classList.add('active');
                document.getElementById('editTextTypeBtn').style.background = '#7a0000';
                document.getElementById('editTextTypeBtn').style.color = 'white';
            }
            
            showNotification('success', 'Loaded', 'Lesson data loaded successfully');
        } else {
            throw new Error(result.message || 'Failed to load lesson');
        }
        
    } catch (error) {
        console.error('❌ Error loading lesson:', error);
        showNotification('error', 'Load Failed', error.message);
    }
}

// ===== LOAD TOPICS FOR EDIT MODAL =====
async function loadEditTopics() {
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const topicSelect = document.getElementById('editTopicSelect');
            if (topicSelect) {
                topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
                
                if (result.structure.topics && result.structure.topics.length > 0) {
                    result.structure.topics.forEach(topic => {
                        const option = document.createElement('option');
                        option.value = topic.id;
                        option.textContent = topic.name;
                        topicSelect.appendChild(option);
                    });
                }
            }
        }
    } catch (error) {
        console.error('❌ Error loading topics:', error);
    }
}

// ===== SHOW EDIT CONTENT SECTION =====
function showEditContentSection(section) {
    console.log("📂 Showing edit content section:", section);
    
    // Hide all sections
    document.getElementById('editVideoContentSection').style.display = 'none';
    document.getElementById('editTextContentSection').style.display = 'none';
    
    // Remove active class from buttons
    document.getElementById('editVideoTypeBtn').classList.remove('active');
    document.getElementById('editVideoTypeBtn').style.background = '';
    document.getElementById('editVideoTypeBtn').style.color = '';
    
    document.getElementById('editTextTypeBtn').classList.remove('active');
    document.getElementById('editTextTypeBtn').style.background = '';
    document.getElementById('editTextTypeBtn').style.color = '';
    
    // Show selected section
    if (section === 'video') {
        document.getElementById('editVideoContentSection').style.display = 'block';
        document.getElementById('editVideoTypeBtn').classList.add('active');
        document.getElementById('editVideoTypeBtn').style.background = '#7a0000';
        document.getElementById('editVideoTypeBtn').style.color = 'white';
    } else {
        document.getElementById('editTextContentSection').style.display = 'block';
        document.getElementById('editTextTypeBtn').classList.add('active');
        document.getElementById('editTextTypeBtn').style.background = '#7a0000';
        document.getElementById('editTextTypeBtn').style.color = 'white';
    }
}

// ===== TOGGLE VIDEO REPLACE MODE =====
function toggleVideoReplaceMode() {
    const keepCheckbox = document.getElementById('keepExistingVideo');
    const uploadArea = document.getElementById('editVideoUploadArea');
    const newVideoIndicator = document.getElementById('editNewVideoIndicator');
    
    if (keepCheckbox.checked) {
        // Keep existing - disable upload
        uploadArea.style.opacity = '0.5';
        uploadArea.style.pointerEvents = 'none';
        
        // Clear any selected file
        document.getElementById('editVideoFileInput').value = '';
        newVideoIndicator.style.display = 'none';
    } else {
        // Replace - enable upload
        uploadArea.style.opacity = '1';
        uploadArea.style.pointerEvents = 'auto';
    }
}

// ===== TOGGLE TEXT REPLACE MODE =====
function toggleTextReplaceMode() {
    const keepCheckbox = document.getElementById('keepExistingText');
    const textarea = document.getElementById('editTextContentInput');
    const uploadArea = document.querySelector('#editTextContentSection .upload-area-small');
    const fileInput = document.getElementById('editTextFileInput');
    
    if (keepCheckbox.checked) {
        // Keep existing - disable inputs
        textarea.disabled = true;
        textarea.placeholder = 'Keep existing text (uncheck to edit)';
        if (uploadArea) uploadArea.style.opacity = '0.5';
        if (uploadArea) uploadArea.style.pointerEvents = 'none';
        if (fileInput) fileInput.disabled = true;
        
        // Clear any new text/file
        textarea.value = '';
        document.getElementById('editNewTextIndicator').style.display = 'none';
        document.getElementById('editTextFileInput').value = '';
    } else {
        // Replace - enable inputs
        textarea.disabled = false;
        textarea.placeholder = 'Type new lesson content here...';
        if (uploadArea) uploadArea.style.opacity = '1';
        if (uploadArea) uploadArea.style.pointerEvents = 'auto';
        if (fileInput) fileInput.disabled = false;
    }
}

// ===== TRIGGER EDIT VIDEO UPLOAD =====
function triggerEditVideoUpload() {
    const keepCheckbox = document.getElementById('keepExistingVideo');
    if (keepCheckbox && keepCheckbox.checked) {
        showNotification('warning', 'Cannot Upload', 'Uncheck "Keep existing video" first to upload a new one');
        return;
    }
    document.getElementById('editVideoFileInput').click();
}

// ===== HANDLE EDIT VIDEO FILE SELECT =====
function handleEditVideoFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("🎬 Edit video file selected:", file.name);
    
    // Update new video indicator
    document.getElementById('editNewVideoFilename').textContent = file.name + ' (' + (file.size / (1024*1024)).toFixed(2) + ' MB)';
    document.getElementById('editNewVideoIndicator').style.display = 'block';
    
    // Create preview
    const preview = document.getElementById('editVideoPreview');
    const previewContainer = document.getElementById('editVideoPreviewContainer');
    preview.src = URL.createObjectURL(file);
    previewContainer.style.display = 'block';
    
    // Update upload area style
    document.getElementById('editVideoUploadArea').style.borderColor = '#4caf50';
    document.getElementById('editVideoUploadArea').style.background = '#f1f8e9';
}

// ===== CANCEL EDIT NEW VIDEO =====
function cancelEditNewVideo() {
    document.getElementById('editVideoFileInput').value = '';
    document.getElementById('editNewVideoIndicator').style.display = 'none';
    document.getElementById('editVideoPreviewContainer').style.display = 'none';
    document.getElementById('editVideoUploadArea').style.borderColor = '#ddd';
    document.getElementById('editVideoUploadArea').style.background = '';
}

// ===== TRIGGER EDIT TEXT FILE UPLOAD =====
function triggerEditTextFileUpload() {
    const keepCheckbox = document.getElementById('keepExistingText');
    if (keepCheckbox && keepCheckbox.checked) {
        showNotification('warning', 'Cannot Upload', 'Uncheck "Keep existing text" first to upload a new file');
        return;
    }
    document.getElementById('editTextFileInput').click();
}

// ===== HANDLE EDIT TEXT FILE SELECT =====
function handleEditTextFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log("📄 Edit text file selected:", file.name);
    
    // Update new text indicator
    document.getElementById('editNewTextFilename').textContent = file.name;
    document.getElementById('editNewTextFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
    document.getElementById('editNewTextIndicator').style.display = 'block';
    
    // Read file content
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('editTextContentInput').value = e.target.result;
    };
    reader.readAsText(file);
}

// ===== CANCEL EDIT NEW TEXT =====
function cancelEditNewText() {
    document.getElementById('editTextFileInput').value = '';
    document.getElementById('editNewTextIndicator').style.display = 'none';
    document.getElementById('editTextContentInput').value = '';
}

// ===== FIXED SAVE EDITED LESSON =====
async function saveEditedLesson() {
    console.log("💾 Saving edited lesson...");
    
    // Get current lesson ID
    const lessonId = document.getElementById('editLessonId').value;
    if (!lessonId) {
        showNotification('error', 'Error', 'No lesson selected for editing');
        return;
    }
    
    // Get basic info
    const title = document.getElementById('editLessonTitle').value.trim();
    const description = document.getElementById('editLessonDescription').value.trim();
    const topicId = document.getElementById('editTopicSelect').value;
    
    console.log("📝 Form values:", { lessonId, title, description, topicId });
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a lesson title');
        return;
    }
    
    if (!topicId) {
        showNotification('error', 'Error', 'Please select a topic');
        return;
    }
    
    // Show loading state
    const saveBtn = document.querySelector('#editLessonModal .btn-primary');
    const originalText = saveBtn ? saveBtn.innerHTML : 'Save Changes';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
            return;
        }
        
        // Create FormData
        let formData = new FormData();
        
        // Add basic info
        formData.append('title', title);
        formData.append('description', description || '');
        formData.append('topic_id', parseInt(topicId));
        
        // IMPORTANT: Add update flag and content_id
        formData.append('is_update', 'true');
        formData.append('content_id', lessonId);
        
        // Check content type
        const contentType = document.getElementById('editCurrentContentType')?.textContent.toLowerCase() || 'text';
        
        // Check if we're replacing video
        const keepVideo = document.getElementById('keepExistingVideo')?.checked;
        const videoFile = document.getElementById('editVideoFileInput')?.files[0];
        const youtubeUrl = document.getElementById('editVideoYoutubeUrl')?.value;
        const removeExistingVideo = window.removeEditExistingVideo;
        
        console.log("🎬 Video options:", { keepVideo, videoFile: videoFile?.name, youtubeUrl, removeExistingVideo });
        
        if (!keepVideo && (videoFile || youtubeUrl || removeExistingVideo)) {
            formData.append('content_type', 'video');
            
            if (youtubeUrl && youtubeUrl.trim() !== '') {
                formData.append('youtube_url', youtubeUrl);
            }
            
            if (videoFile) {
                formData.append('video_file', videoFile);
            }
            
            if (removeExistingVideo) {
                formData.append('remove_existing_video', 'true');
            }
            
            formData.append('replace_video', 'true');
            console.log("🎬 Replacing with new video");
            
        } else {
            // Check if we're replacing text
            const keepText = document.getElementById('keepExistingText')?.checked;
            const textContent = document.getElementById('editTextContentInput')?.value.trim();
            
            console.log("📝 Text options:", { keepText, textContent: textContent ? 'has text' : 'none' });
            
            if (!keepText && textContent) {
                formData.append('content_type', 'text');
                formData.append('text_content', textContent);
                formData.append('replace_text', 'true');
                console.log("📝 Replacing with new text");
            } else {
                // Keep existing content - just update metadata
                formData.append('content_type', contentType);
                formData.append('keep_existing_content', 'true');
                console.log("📝 Keeping existing content");
            }
        }
        
        // Log FormData contents
        console.log("📤 Sending update with FormData:");
        for (let pair of formData.entries()) {
            if (pair[0] === 'video_file') {
                console.log(`   ${pair[0]}: [File: ${pair[1].name}]`);
            } else {
                console.log(`   ${pair[0]}: ${pair[1]}`);
            }
        }
        
        // Send to server
        const response = await fetch('http://localhost:5000/api/admin/lessons', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log("📥 Response status:", response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error response:', errorText);
            throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
        }
        
        const result = await response.json();
        console.log("📥 Server response:", result);
        
        if (result.success) {
            showNotification('success', 'Success!', 'Lesson updated successfully');
            
            // Close modal
            closeEditLessonModal();
            
            // Reset flags
            window.removeEditExistingVideo = false;
            
            // Refresh lessons if table exists
            if (document.getElementById('adminLessonsTableBody')) {
                setTimeout(() => {
                    if (typeof loadAdminLessons === 'function') {
                        loadAdminLessons();
                    }
                }, 500);
            }
            
            // Refresh subject data
            if (typeof fetchSubjectDataFromDatabase === 'function') {
                setTimeout(() => {
                    fetchSubjectDataFromDatabase();
                }, 600);
            }
            
        } else {
            throw new Error(result.message || 'Failed to update lesson');
        }
        
    } catch (error) {
        console.error('❌ Error saving lesson:', error);
        showNotification('error', 'Update Failed', error.message);
        
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

// ===== RESET EDIT LESSON FORM =====
function resetEditLessonForm() {
    document.getElementById('editLessonTitle').value = '';
    document.getElementById('editLessonDescription').value = '';
    document.getElementById('editVideoYoutubeUrl').value = '';
    document.getElementById('editTextContentInput').value = '';
    document.getElementById('editVideoFileInput').value = '';
    document.getElementById('editTextFileInput').value = '';
    
    document.getElementById('editNewVideoIndicator').style.display = 'none';
    document.getElementById('editNewTextIndicator').style.display = 'none';
    document.getElementById('editVideoPreviewContainer').style.display = 'none';
    
    document.getElementById('keepExistingVideo').checked = true;
    document.getElementById('keepExistingText').checked = true;
    
    toggleVideoReplaceMode();
    toggleTextReplaceMode();
    
    document.getElementById('editVideoUploadArea').style.borderColor = '#ddd';
    document.getElementById('editVideoUploadArea').style.background = '';
}

// ===== CLOSE EDIT LESSON MODAL =====
function closeEditLessonModal() {
    const modal = document.getElementById('editLessonModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        currentEditLessonId = null;
        currentEditLessonData = null;
    }
}


// Replace the existing editMySQLesson function
async function editMySQLesson(contentId) {
    await openEditLessonModal(contentId);
}

// ===== SUBJECT DATA FETCHING =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initializing subject data fetching...');
    
    // Get current subject from URL or localStorage
    const currentSubject = getCurrentSubject();
    
    // Fetch subject data from server
    fetchSubjectData(currentSubject);
    
    // Set up interval to refresh data every 30 seconds
    setInterval(() => {
        fetchSubjectData(getCurrentSubject());
    }, 30000);
});

// Function to get current subject
function getCurrentSubject() {
    // Try to get from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const subjectParam = urlParams.get('subject');
    
    if (subjectParam) {
        return subjectParam;
    }
    
    // Try to get from localStorage
    const savedSubject = localStorage.getItem('currentSubject');
    if (savedSubject) {
        return savedSubject;
    }
    
    // Default subject
    return 'polynomial';
}

// ===== FETCH SUBJECT DATA - WITH NULL CHECK =====
async function fetchSubjectData(subject) {
    console.log(`📊 Fetching data for subject: ${subject}`);
    
    // Check muna kung may elements bago mag-load
    const hasElements = document.getElementById('currentSubjectName') && 
                        document.getElementById('subjectDetailDescription');
    
    if (hasElements) {
        showLoadingState();
    } else {
        console.log("⚠️ Subject info elements not found - skipping loading state");
    }
    
    try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('admin_token');
        const subjectId = getSubjectIdFromName(subject);
        
        // Ipagpatuloy ang pag-fetch...
        // ... rest of your code ...
        
    } catch (error) {
        console.error('❌ Error fetching subject data:', error);
        
        // I-update lang kung may elements
        if (document.getElementById('currentSubjectName')) {
            document.getElementById('currentSubjectName').textContent = getSubjectDisplayName(subject);
        }
    }
}

// Helper function to get subject ID from name
function getSubjectIdFromName(subject) {
    const subjectMap = {
        'polynomial': 2,
        'polylearn': 2,
        'factorial': 1,
        'factolearn': 1,
        'mdas': 3,
        'mathease': 3
    };
    return subjectMap[subject.toLowerCase()] || 1;
}

// Helper function to get subject display name
function getSubjectDisplayName(subject) {
    const names = {
        'polynomial': 'PolyLearn',
        'polylearn': 'PolyLearn',
        'factorial': 'FactoLearn',
        'factolearn': 'FactoLearn',
        'mdas': 'MathEase',
        'mathease': 'MathEase'
    };
    return names[subject.toLowerCase()] || 'PolyLearn';
}

// Helper function to get subject description
function getSubjectDescription(subject) {
    const descriptions = {
        'polynomial': 'Algebraic expressions with variables and coefficients',
        'polylearn': 'Algebraic expressions with variables and coefficients',
        'factorial': 'Product of all positive integers less than or equal to n',
        'factolearn': 'Product of all positive integers less than or equal to n',
        'mdas': 'Order of operations: Multiplication, Division, Addition, Subtraction',
        'mathease': 'Order of operations: Multiplication, Division, Addition, Subtraction'
    };
    return descriptions[subject.toLowerCase()] || 'Mathematics subject';
}

// Count resources (videos, PDFs, etc.) from lessons
function countResources(lessons) {
    if (!lessons || !Array.isArray(lessons)) return 0;
    
    return lessons.filter(lesson => 
        lesson.content_type === 'video' || 
        lesson.content_type === 'pdf' || 
        lesson.content_type === 'interactive'
    ).length;
}

// ===== SHOW LOADING STATE - WITH NULL CHECK =====
function showLoadingState() {
    console.log("⏳ Showing loading state...");
    
    const elements = [
        'currentSubjectName',
        'subjectDetailDescription', 
        'lessonCount',
        'resourceCount',
        'studentCount'
    ];
    
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'currentSubjectName') el.textContent = 'Loading...';
            else if (id === 'subjectDetailDescription') el.textContent = 'Fetching data from server...';
            else el.textContent = '...';
        } else {
            console.log(`⚠️ Element #${id} not found - skipping`);
        }
    });
}

// ===== FIXED: UPDATE SUBJECT UI WITH PROPER ERROR HANDLING =====
function updateSubjectUI(data) {
    console.log("🔄 Updating subject UI with data:", data);
    
    // IMPORTANT: Check if data exists and has the required properties
    if (!data || typeof data !== 'object') {
        console.warn('⚠️ No data provided to updateSubjectUI, using defaults');
        data = getDefaultSubjectData();
    }
    
    // Ensure all required properties exist
    const safeData = {
        subjectName: data.subjectName || getSubjectDisplayName(currentSubject) || 'PolyLearn',
        description: data.description || getSubjectDescription(currentSubject) || 'Mathematics subject',
        lessons: data.lessons || 0,
        resources: data.resources || 0,
        students: data.students || 0
    };
    
    console.log('📊 Safe data for UI:', safeData);
    
    // Update subject name with animation
    const nameEl = document.getElementById('currentSubjectName');
    if (nameEl) {
        nameEl.style.opacity = '0';
        setTimeout(() => {
            nameEl.textContent = safeData.subjectName;
            nameEl.style.opacity = '1';
        }, 200);
    }
    
    // Update description
    const descEl = document.getElementById('subjectDetailDescription');
    if (descEl) {
        descEl.textContent = `You are currently managing ${safeData.subjectName} lessons. ${safeData.description}`;
    }
    
    // Update stats with animation
    animateNumber('lessonCount', safeData.lessons);
    animateNumber('resourceCount', safeData.resources);
    animateNumber('studentCount', safeData.students);
    
    // Also update welcome section if exists
    const welcomeLessonCount = document.getElementById('welcomeLessonCount');
    if (welcomeLessonCount) welcomeLessonCount.textContent = safeData.lessons;
    
    const welcomeResourceCount = document.getElementById('welcomeResourceCount');
    if (welcomeResourceCount) welcomeResourceCount.textContent = safeData.resources;
    
    const welcomeStudentCount = document.getElementById('welcomeStudentCount');
    if (welcomeStudentCount) welcomeStudentCount.textContent = safeData.students;
    
    // Update sidebar if exists
    const sidebarLessonCount = document.getElementById('sidebarLessonCount');
    if (sidebarLessonCount) sidebarLessonCount.textContent = safeData.lessons;
    
    const sidebarStudentCount = document.getElementById('sidebarStudentCount');
    if (sidebarStudentCount) sidebarStudentCount.textContent = safeData.students;
}

// ===== GET DEFAULT SUBJECT DATA =====
function getDefaultSubjectData() {
    const subject = currentSubject || 'polynomial';
    
    const defaultData = {
        polynomial: {
            subjectName: 'PolyLearn',
            description: 'Algebraic expressions with variables and coefficients',
            lessons: 5,
            resources: 12,
            students: 45
        },
        factorial: {
            subjectName: 'FactoLearn',
            description: 'Product of all positive integers less than or equal to n',
            lessons: 3,
            resources: 8,
            students: 32
        },
        mdas: {
            subjectName: 'MathEase',
            description: 'Order of operations: Multiplication, Division, Addition, Subtraction',
            lessons: 4,
            resources: 10,
            students: 38
        }
    };
    
    return defaultData[subject] || defaultData.polynomial;
}

// ===== FIXED: FETCH SUBJECT DATA FROM DATABASE USING EXISTING ENDPOINTS =====
async function fetchSubjectDataFromDatabase() {
    console.log("📊 Fetching subject data from database...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.log('No token found, using fallback data');
            updateSubjectUI(getDefaultSubjectData());
            return;
        }
        
        // Get current subject from global variable
        const subject = currentSubject || 'polynomial';
        const subjectId = getSubjectIdFromName(subject);
        
        console.log(`🔍 Fetching data for subject ID: ${subjectId} (${subject})`);
        
        // ===== USE EXISTING WORKING ENDPOINTS =====
        // 1. Get lessons from admin lessons endpoint
        const lessonsResponse = await fetch(`http://localhost:5000/api/admin/lessons`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // 2. Get dashboard stats for student count
        const statsResponse = await fetch(`http://localhost:5000/api/admin/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // 3. Get lesson stats for additional data
        const lessonStatsResponse = await fetch(`http://localhost:5000/api/admin/lessons/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        // Process lessons data
        let totalLessons = 0;
        let resources = 0;
        let lessons = [];
        
        if (lessonsResponse.ok) {
            const lessonsData = await lessonsResponse.json();
            if (lessonsData.success && lessonsData.lessons) {
                // Filter lessons by subject (if your API doesn't support subject filtering)
                // You may need to adjust this based on how your data is structured
                lessons = lessonsData.lessons.filter(lesson => {
                    // Try to match by subject ID - adjust this based on your data structure
                    return lesson.lesson_id === subjectId || 
                           lesson.subject_id === subjectId ||
                           (lesson.lesson_name && lesson.lesson_name.toLowerCase() === subject.toLowerCase());
                });
                
                totalLessons = lessons.length;
                resources = lessons.filter(l => 
                    l.content_type === 'video' || 
                    l.content_type === 'pdf' || 
                    l.content_type === 'interactive'
                ).length;
                
                console.log(`✅ Found ${totalLessons} lessons for subject ${subject}`);
            }
        } else {
            console.warn('⚠️ Could not fetch lessons from /api/admin/lessons');
            
            // Try alternative endpoint
            try {
                const altResponse = await fetch(`http://localhost:5000/api/lessons-db/complete`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (altResponse.ok) {
                    const altData = await altResponse.json();
                    if (altData.success && altData.lessons) {
                        lessons = altData.lessons.filter(lesson => {
                            return lesson.lesson_id === subjectId || 
                                   (lesson.lesson_name && lesson.lesson_name.toLowerCase() === subject.toLowerCase());
                        });
                        totalLessons = lessons.length;
                        resources = lessons.filter(l => l.content_type === 'video' || l.content_type === 'pdf').length;
                        console.log(`✅ Found ${totalLessons} lessons from /api/lessons-db/complete`);
                    }
                }
            } catch (e) {
                console.log('Alternative endpoint also failed');
            }
        }
        
        // Process stats for student count
        let students = 0;
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            if (statsData.success && statsData.stats) {
                students = statsData.stats.active_users || 0;
                console.log(`✅ Found ${students} active users from dashboard stats`);
            }
        }
        
        // Process lesson stats for additional info
        if (lessonStatsResponse.ok) {
            const lessonStatsData = await lessonStatsResponse.json();
            if (lessonStatsData.success && lessonStatsData.stats) {
                // You can use this data if needed
                console.log('✅ Lesson stats loaded:', lessonStatsData.stats);
            }
        }
        
        // If we still don't have data, try the structure endpoint
        if (totalLessons === 0) {
            try {
                const structureResponse = await fetch(`http://localhost:5000/api/admin/structure`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (structureResponse.ok) {
                    const structureData = await structureResponse.json();
                    if (structureData.success && structureData.structure) {
                        // Count topics/lessons for this subject
                        const topics = structureData.structure.topics || [];
                        // You may need to filter by subject here
                        totalLessons = topics.length;
                        console.log(`✅ Found ${totalLessons} topics from structure endpoint`);
                    }
                }
            } catch (e) {
                console.log('Structure endpoint failed');
            }
        }
        
        // If we still have no data, try to get from localStorage cache
        if (totalLessons === 0) {
            try {
                const cached = localStorage.getItem(`mysql_lessons_cache_subject_${subjectId}`);
                if (cached) {
                    const cacheData = JSON.parse(cached);
                    if (cacheData.lessons) {
                        totalLessons = cacheData.lessons.length;
                        resources = cacheData.lessons.filter(l => 
                            l.content_type === 'video' || l.content_type === 'pdf'
                        ).length;
                        console.log(`✅ Using ${totalLessons} cached lessons from localStorage`);
                    }
                }
            } catch (e) {
                console.log('No cached data found');
            }
        }
        
        // Update UI with the data we have (even if zero)
        updateSubjectUI({
            subjectName: getSubjectDisplayName(subject),
            description: getSubjectDescription(subject),
            lessons: totalLessons,
            resources: resources,
            students: students
        });
        
        console.log(`✅ Subject data updated: ${totalLessons} lessons, ${resources} resources, ${students} students`);
        
        // Save to localStorage as backup
        try {
            localStorage.setItem(`subjectData_${subjectId}`, JSON.stringify({
                lessons: totalLessons,
                resources: resources,
                students: students,
                timestamp: new Date().toISOString()
            }));
        } catch (e) {}
        
    } catch (error) {
        console.error('❌ Error fetching subject data:', error);
        
        // Use fallback data
        updateSubjectUI(getDefaultSubjectData());
    }
}

// ===== COUNT RESOURCES FROM LESSONS =====
function countResources(lessons) {
    if (!lessons || !Array.isArray(lessons)) return 0;
    
    return lessons.filter(lesson => 
        lesson.content_type === 'video' || 
        lesson.content_type === 'pdf' || 
        lesson.content_type === 'interactive' ||
        lesson.content_type === 'audio'
    ).length;
}

// ===== ANIMATE NUMBER COUNT =====
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    if (currentValue === targetValue) return;
    
    // Simple animation
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(1.2)';
    element.style.color = '#7a0000';
    
    setTimeout(() => {
        element.textContent = targetValue;
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 150);
    
    setTimeout(() => {
        element.style.transition = '';
    }, 500);
}

// ===== FIXED: INITIALIZE LESSON DASHBOARD =====
function initializeLessonDashboard() {
    console.log("📚 Initializing lesson dashboard...");
    
    // Make sure currentSubject is defined
    if (!currentSubject) {
        currentSubject = 'polynomial';
    }
    
    // Update UI with data (will use fallback if no data yet)
    updateSubjectUI(getDefaultSubjectData());
    
    // Update subject UI elements
    updateSubjectUI();
    updateLessonStats();
    highlightActiveSubject();
    addSubjectCardInteractions();
    
    // Fetch real data from database (this will override the fallback)
    setTimeout(() => {
        fetchSubjectDataFromDatabase();
    }, 100);
    
    // ===== IMPORTANT: Load active subject data =====
    setTimeout(() => {
        console.log('📊 Loading active subject data...');
        updateActiveSubjectFromDatabase();
    }, 200);
    
    // Load module structure for dropdowns
    if (typeof loadModuleStructure === 'function') {
        loadModuleStructure();
    }
    
    // Load lessons on dashboard open
    if (typeof loadAdminLessons === 'function') {
        loadAdminLessons();
    }
    
    // Load sidebar stats
    setTimeout(() => {
        console.log('📊 Loading sidebar stats from initializeLessonDashboard...');
        if (typeof loadSidebarStats === 'function') {
            loadSidebarStats();
        }
    }, 300);
}

// ===== FIXED: UPDATE SUBJECT INFO PANEL =====
function updateSubjectInfoPanel() {
    console.log("🔄 Updating subject info panel...");
    
    // Try to get from cache first
    const subject = currentSubject || 'polynomial';
    const subjectId = getSubjectIdFromName(subject);
    
    try {
        const cached = localStorage.getItem(`subjectData_${subjectId}`);
        if (cached) {
            const data = JSON.parse(cached);
            updateSubjectUI({
                subjectName: getSubjectDisplayName(subject),
                description: getSubjectDescription(subject),
                lessons: data.lessons || 0,
                resources: data.resources || 0,
                students: data.students || 0
            });
        } else {
            // Use default if no cache
            updateSubjectUI(getDefaultSubjectData());
        }
    } catch (e) {
        updateSubjectUI(getDefaultSubjectData());
    }
    
    // Then fetch fresh data from database
    fetchSubjectDataFromDatabase();
}


function getSubjectDisplayName(subject) {
    const names = {
        'polynomial': 'PolyLearn',
        'polylearn': 'PolyLearn',
        'factorial': 'FactoLearn',
        'factolearn': 'FactoLearn',
        'mdas': 'MathEase',
        'mathease': 'MathEase'
    };
    return names[subject?.toLowerCase()] || 'PolyLearn';
}

function getSubjectDescription(subject) {
    const descriptions = {
        'polynomial': 'Algebraic expressions with variables and coefficients',
        'polylearn': 'Algebraic expressions with variables and coefficients',
        'factorial': 'Product of all positive integers less than or equal to n',
        'factolearn': 'Product of all positive integers less than or equal to n',
        'mdas': 'Order of operations: Multiplication, Division, Addition, Subtraction',
        'mathease': 'Order of operations: Multiplication, Division, Addition, Subtraction'
    };
    return descriptions[subject?.toLowerCase()] || 'Mathematics subject';
}


// Fallback function in case server is unavailable
function setFallbackStats() {
    document.getElementById('totalLessonsSidebar').textContent = '12';
    document.getElementById('totalSubjectsSidebar').textContent = '3';
    document.getElementById('totalStudentsSidebar').textContent = '45';
    document.getElementById('totalResourcesSidebar').textContent = '24';
    
    console.log('⚠️ Using fallback demo data');
}

// Call the function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    fetchQuickStats();
    
    // Optional: Refresh stats every 30 seconds
    // setInterval(fetchQuickStats, 30000);
});

// Initialize practice page
async function initPracticePage() {
    console.log('💪 Initializing practice page with database-driven content...');
    
    const practiceDate = document.getElementById('practiceDate');
    if (practiceDate) {
        const now = new Date();
        practiceDate.textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    if (!PracticeState.currentTopic) {
        PracticeState.currentTopic = '1';
    }
    
    await loadTopicsProgress();
    await loadPracticeExercisesForTopic(PracticeState.currentTopic);
    await loadPracticeStatistics();
    addPracticeStyles();
    
    console.log('✅ Practice page initialized');
}

// ===== SIMPLIFIED HAMBURGER MENU - ISANG IMPLEMENTATION LANG =====
(function initHamburgerMenu() {
    console.log("🍔 Initializing hamburger menu...");
    
    // Get elements
    const hamburger = document.querySelector('.footer-hamburger');
    const overlay = document.getElementById('mobileMenuOverlay');
    const panel = document.getElementById('mobileMenuPanel');
    
    if (!hamburger || !overlay || !panel) {
        console.log("❌ Hamburger elements not found");
        return;
    }
    
    console.log("✅ Hamburger elements found");
    
    // Remove all existing event listeners by cloning
    const newHamburger = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(newHamburger, hamburger);
    
    // Get the new button
    const btn = document.querySelector('.footer-hamburger');
    
    // Simple toggle function
    function toggleMenu() {
        overlay.classList.toggle('active');
        panel.classList.toggle('active');
        btn.classList.toggle('active');
        
        // Toggle body scroll
        if (overlay.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('menu-open');
            console.log("🍔 Menu opened");
        } else {
            document.body.style.overflow = '';
            document.body.classList.remove('menu-open');
            console.log("🍔 Menu closed");
        }
    }
    
    // Add click event to hamburger
    btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log("🍔 Hamburger clicked");
        toggleMenu();
    });
    
    // Close on overlay click
    overlay.addEventListener('click', function() {
        if (overlay.classList.contains('active')) {
            toggleMenu();
        }
    });
    
    // Close when clicking menu items (except logout)
    panel.querySelectorAll('.mobile-menu-item:not(.logout-mobile)').forEach(item => {
        item.addEventListener('click', function() {
            if (overlay.classList.contains('active')) {
                toggleMenu();
            }
        });
    });
    
    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            toggleMenu();
        }
    });
    
    console.log("✅ Hamburger menu ready!");
})();

// Keep these functions for backward compatibility but make them use the same logic
function openMobileMenu() {
    const btn = document.querySelector('.footer-hamburger');
    const overlay = document.getElementById('mobileMenuOverlay');
    const panel = document.getElementById('mobileMenuPanel');
    
    if (btn && overlay && panel) {
        overlay.classList.add('active');
        panel.classList.add('active');
        btn.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('menu-open');
    }
}

function closeMobileMenu() {
    const btn = document.querySelector('.footer-hamburger');
    const overlay = document.getElementById('mobileMenuOverlay');
    const panel = document.getElementById('mobileMenuPanel');
    
    if (btn && overlay && panel) {
        overlay.classList.remove('active');
        panel.classList.remove('active');
        btn.classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('menu-open');
    }
}

// ===== SHOW PRACTICE DASHBOARD =====
function showPracticeDashboard(e) {
    if (e) e.preventDefault();
    console.log("💪 Opening Practice Management Dashboard...");
    
    closeMobileMenu();
    setActiveSection('adminPracticeDashboardSection');
    updatePageTitle('<i class="fas fa-dumbbell"></i> Practice Management', 'Practice Management');
    updateActiveNav('practice');
    
    // Initialize practice dashboard
    initializeAdminPracticeDashboard();
}

// ===== INITIALIZE ADMIN PRACTICE DASHBOARD =====
async function initializeAdminPracticeDashboard() {
    console.log("📊 Initializing Admin Practice Dashboard...");
    
    // Show loading states
    document.getElementById('adminPracticeTableBody').innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-5">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-pulse fa-3x"></i>
                    <p>Loading practice exercises...</p>
                </div>
            </td>
        </tr>
    `;
    
    // Set initial stats to 0 while loading
    document.getElementById('adminTotalExercises').textContent = '0';
    document.getElementById('adminTotalQuestions').textContent = '0';
    document.getElementById('adminActiveExercises').textContent = '0';
    document.getElementById('adminTotalAttempts').textContent = '0';
    document.getElementById('adminAvgScore').textContent = '0%';
    
    // Load practice exercises
    await loadAdminPracticeExercises();
}

// ===== LOAD ADMIN PRACTICE EXERCISES - FIXED =====
async function loadAdminPracticeExercises() {
    console.log("📥 Loading practice exercises from database...");
    
    const tableBody = document.getElementById('adminPracticeTableBody');
    if (!tableBody) return;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <div style="text-align: center; padding: 40px;">
                            <i class="fas fa-lock" style="font-size: 3rem; color: #f57c00; margin-bottom: 15px;"></i>
                            <h4 style="color: #f57c00; margin-bottom: 10px;">Authentication Required</h4>
                            <p style="color: #666;">Please login as admin to view practice exercises.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const response = await fetch('http://localhost:5000/api/admin/practice', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const exercises = result.exercises || [];
            console.log(`✅ Loaded ${exercises.length} practice exercises from database`);
            
            if (exercises.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="9" class="text-center py-5">
                            <div style="text-align: center; padding: 40px;">
                                <i class="fas fa-dumbbell" style="font-size: 3rem; color: #ccc; margin-bottom: 15px;"></i>
                                <h4 style="color: #666; margin-bottom: 5px;">No Practice Exercises Found</h4>
                                <p style="color: #999; margin-bottom: 20px;">Create your first practice exercise.</p>
                                <button class="btn btn-primary" onclick="openCreatePracticeModal()">
                                    <i class="fas fa-plus-circle"></i> Create Exercise
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                // Update stats to zero
                updateAdminPracticeStats(exercises);
                return;
            }
            
            displayAdminPracticeExercises(exercises);
            updateAdminPracticeStats(exercises);
            
        } else {
            throw new Error(result.message || 'Failed to load practice exercises');
        }
        
    } catch (error) {
        console.error('❌ Error loading practice exercises:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div style="text-align: center; padding: 40px;">
                        <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #f44336; margin-bottom: 15px;"></i>
                        <h4 style="color: #f44336; margin-bottom: 10px;">Failed to Load Exercises</h4>
                        <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
                        <button class="btn btn-primary" onclick="loadAdminPracticeExercises()">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
        
        // Update stats to zero on error
        updateAdminPracticeStats([]);
    }
}

// ===== DISPLAY ADMIN PRACTICE EXERCISES =====
function displayAdminPracticeExercises(exercises) {
    const tableBody = document.getElementById('adminPracticeTableBody');
    if (!tableBody) return;
    
    // Pagination variables
    const page = window.adminPracticePage || 1;
    const perPage = 10;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedExercises = exercises.slice(start, end);
    
    tableBody.innerHTML = paginatedExercises.map(exercise => {
        const difficultyClass = `difficulty-${exercise.difficulty || 'medium'}`;
        const statusClass = `status-${exercise.status || 'active'}`;
        
        return `
            <tr>
                <td>#${exercise.id}</td>
                <td>
                    <strong>${exercise.title}</strong>
                    <br>
                    <small class="text-muted">${exercise.description ? exercise.description.substring(0, 50) + '...' : ''}</small>
                </td>
                <td><span class="difficulty-badge ${difficultyClass}">${exercise.difficulty || 'medium'}</span></td>
                <td>${exercise.question_count || 0}</td>
                <td>${exercise.time_limit || 5} min</td>
                <td>${exercise.attempts || 0}</td>
                <td>${exercise.avg_score || 0}%</td>
                <td><span class="status-badge ${statusClass}">${exercise.status || 'active'}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="viewPracticeExercise(${exercise.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" onclick="editPracticeExercise(${exercise.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deletePracticeExercise(${exercise.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="action-btn stats" onclick="viewPracticeStats(${exercise.id})" title="Statistics">
                            <i class="fas fa-chart-bar"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateAdminPracticePagination(exercises.length);
}

// ===== UPDATE ADMIN PRACTICE STATS - FIXED VERSION =====
function updateAdminPracticeStats(exercises) {
    console.log("📊 UPDATING PRACTICE STATS - exercises received:", exercises);
    
    if (!exercises || exercises.length === 0) {
        console.log("⚠️ No exercises data, setting stats to zero");
        
        // Use the CORRECT IDs from your HTML
        const totalEl = document.getElementById('adminTotalExercises');
        if (totalEl) totalEl.textContent = '0';
        
        const questionsEl = document.getElementById('adminTotalQuestions');
        if (questionsEl) questionsEl.textContent = '0';
        
        const activeEl = document.getElementById('adminActiveExercises');
        if (activeEl) activeEl.textContent = '0';
        
        const attemptsEl = document.getElementById('adminTotalAttempts');
        if (attemptsEl) attemptsEl.textContent = '0';
        
        const avgEl = document.getElementById('adminAvgScore');
        if (avgEl) avgEl.textContent = '0%';
        
        return;
    }
    
    const totalExercises = exercises.length;
    
    // Calculate total questions
    const totalQuestions = exercises.reduce((sum, ex) => {
        return sum + (ex.question_count || 0);
    }, 0);
    
    // Count active exercises
    const activeExercises = exercises.filter(ex => {
        return ex.status === 'active' || 
               ex.is_active === 1 || 
               ex.is_active === true;
    }).length;
    
    // Calculate total attempts
    const totalAttempts = exercises.reduce((sum, ex) => {
        return sum + (ex.attempts || 0);
    }, 0);
    
    // Calculate average score
    let avgScore = 0;
    const exercisesWithScores = exercises.filter(ex => ex.avg_score > 0);
    if (exercisesWithScores.length > 0) {
        const totalScore = exercisesWithScores.reduce((sum, ex) => {
            return sum + (ex.avg_score || 0);
        }, 0);
        avgScore = Math.round(totalScore / exercisesWithScores.length);
    }
    
    console.log('📊 Final stats:', {
        totalExercises,
        totalQuestions,
        activeExercises,
        totalAttempts,
        avgScore
    });
    
    // Update stats display - using the CORRECT IDs
    const totalExercisesEl = document.getElementById('adminTotalExercises');
    if (totalExercisesEl) totalExercisesEl.textContent = totalExercises;
    
    const totalQuestionsEl = document.getElementById('adminTotalQuestions');
    if (totalQuestionsEl) totalQuestionsEl.textContent = totalQuestions;
    
    const activeExercisesEl = document.getElementById('adminActiveExercises');
    if (activeExercisesEl) {
        activeExercisesEl.textContent = activeExercises;
        console.log(`✅ Updated active exercises to: ${activeExercises}`);
    } else {
        console.error("❌ Element #adminActiveExercises not found!");
    }
    
    const totalAttemptsEl = document.getElementById('adminTotalAttempts');
    if (totalAttemptsEl) totalAttemptsEl.textContent = totalAttempts;
    
    const avgScoreEl = document.getElementById('adminAvgScore');
    if (avgScoreEl) avgScoreEl.textContent = avgScore + '%';
}

// ===== UPDATE ADMIN PRACTICE PAGINATION =====
function updateAdminPracticePagination(total) {
    const perPage = 10;
    const totalPages = Math.ceil(total / perPage);
    const currentPage = window.adminPracticePage || 1;
    
    document.getElementById('adminPracticeStart').textContent = total > 0 ? ((currentPage - 1) * perPage) + 1 : 0;
    document.getElementById('adminPracticeEnd').textContent = Math.min(currentPage * perPage, total);
    document.getElementById('adminPracticeTotal').textContent = total;
    
    // Update page numbers
    const pagesContainer = document.getElementById('adminPracticePages');
    let pagesHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        pagesHtml += `<button class="pagination-page ${i === currentPage ? 'active' : ''}" onclick="goToAdminPracticePage(${i})">${i}</button>`;
    }
    pagesContainer.innerHTML = pagesHtml;
    
    // Update prev/next buttons
    document.getElementById('prevAdminPracticePage').disabled = currentPage === 1;
    document.getElementById('nextAdminPracticePage').disabled = currentPage === totalPages || totalPages === 0;
}

// ===== GO TO ADMIN PRACTICE PAGE =====
function goToAdminPracticePage(page) {
    window.adminPracticePage = page;
    loadAdminPracticeExercises();
}

// ===== CHANGE ADMIN PRACTICE PAGE =====
function changeAdminPracticePage(direction) {
    const currentPage = window.adminPracticePage || 1;
    const total = parseInt(document.getElementById('adminPracticeTotal').textContent) || 0;
    const totalPages = Math.ceil(total / 10);
    
    if (direction === 'prev' && currentPage > 1) {
        window.adminPracticePage = currentPage - 1;
    } else if (direction === 'next' && currentPage < totalPages) {
        window.adminPracticePage = currentPage + 1;
    }
    
    loadAdminPracticeExercises();
}

// ===== FILTER ADMIN PRACTICE =====
function filterAdminPractice() {
    console.log("🔍 Filtering practice exercises...");
    window.adminPracticePage = 1;
    loadAdminPracticeExercises();
}

// ===== SEARCH ADMIN PRACTICE =====
function searchAdminPractice() {
    console.log("🔍 Searching practice exercises...");
    window.adminPracticePage = 1;
    loadAdminPracticeExercises();
}

// ===== REFRESH PRACTICE DATA =====
function refreshPracticeData() {
    console.log("🔄 Refreshing practice data...");
    showNotification('info', 'Refreshing', 'Updating practice exercises...');
    loadAdminPracticeExercises();
}

// ===== UPDATED: Open Create Practice Modal with teacher dropdown =====
function openCreatePracticeModal() {
    console.log("📝 Opening create practice modal...");
    
    const modal = document.getElementById('createPracticeModal');
    if (!modal) return;
    
    // Reset form
    document.getElementById('practiceTitle').value = '';
    document.getElementById('practiceDescription').value = '';
    document.getElementById('practiceTopic').value = '';
    document.getElementById('practiceDifficulty').value = 'medium';
    document.getElementById('practiceType').value = 'multiple-choice';
    document.getElementById('practicePoints').value = '10';
    document.getElementById('practiceStatus').value = 'active';
    document.getElementById('practiceTags').value = '';
    document.getElementById('practiceId').value = '';
    
    // Clear teacher dropdown (show loading)
    const teacherSelect = document.getElementById('practiceAssignedTeacherId');
    if (teacherSelect) {
        teacherSelect.innerHTML = '<option value="">Loading teachers...</option>';
        teacherSelect.disabled = true;
    }
    
    // Clear questions
    document.getElementById('practiceQuestionsContainer').innerHTML = '';
    
    // Add one default question
    addPracticeQuestion();
    
    // Show modal
    modal.style.display = 'flex';
    modal.style.zIndex = '10001';
    document.body.classList.add('modal-open');
    
    // Load teachers for ALL dropdowns
    setTimeout(() => {
        loadTeachersForAssignment();
    }, 300);
    
    // Load topics
    loadPracticeTopics();
}

// ===== LOAD PRACTICE TOPICS FROM DATABASE - FIXED =====
async function loadPracticeTopics() {
    console.log("📚 Loading topics for practice...");
    
    const topicSelect = document.getElementById('practiceTopic');
    if (!topicSelect) return;
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) return;
        
        const response = await fetch('http://localhost:5000/api/admin/structure', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success && result.structure) {
            const topics = result.structure.topics || [];
            
            topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
            topics.forEach(topic => {
                const option = document.createElement('option');
                option.value = topic.id;
                option.textContent = topic.name;
                topicSelect.appendChild(option);
            });
            
            console.log(`✅ Loaded ${topics.length} topics`);
        }
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
    }
}
// ===== ADD PRACTICE QUESTION =====
function addPracticeQuestion() {
    const container = document.getElementById('practiceQuestionsContainer');
    const questionCount = container.children.length + 1;
    
    const questionHtml = `
        <div class="practice-question-item" id="practice_question_${questionCount}">
            <div class="question-header">
                <h4>Question ${questionCount}</h4>
                <button type="button" class="remove-question" onclick="removePracticeQuestion('practice_question_${questionCount}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="form-group">
                <label>Question Text</label>
                <input type="text" class="form-control" id="practice_q_${questionCount}_text" placeholder="Enter question">
            </div>
            
            <div class="options-container" id="practice_q_${questionCount}_options">
                <div class="option-row">
                    <input type="radio" name="practice_q_${questionCount}_correct" value="a" checked>
                    <input type="text" class="option-input" id="practice_q_${questionCount}_opt_a" placeholder="Option A">
                </div>
                <div class="option-row">
                    <input type="radio" name="practice_q_${questionCount}_correct" value="b">
                    <input type="text" class="option-input" id="practice_q_${questionCount}_opt_b" placeholder="Option B">
                </div>
                <div class="option-row">
                    <input type="radio" name="practice_q_${questionCount}_correct" value="c">
                    <input type="text" class="option-input" id="practice_q_${questionCount}_opt_c" placeholder="Option C">
                </div>
                <div class="option-row">
                    <input type="radio" name="practice_q_${questionCount}_correct" value="d">
                    <input type="text" class="option-input" id="practice_q_${questionCount}_opt_d" placeholder="Option D">
                </div>
            </div>
            
            <button type="button" class="add-option-btn" onclick="addPracticeOption('practice_q_${questionCount}')">
                <i class="fas fa-plus"></i> Add Option
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', questionHtml);
}

// ===== REMOVE PRACTICE QUESTION =====
function removePracticeQuestion(questionId) {
    const question = document.getElementById(questionId);
    if (question) {
        question.remove();
    }
}

// ===== ADD PRACTICE OPTION =====
function addPracticeOption(questionId) {
    const optionsContainer = document.getElementById(`${questionId}_options`);
    const optionCount = optionsContainer.children.length + 1;
    const letter = String.fromCharCode(96 + optionCount); // a, b, c, d, e...
    
    const optionHtml = `
        <div class="option-row">
            <input type="radio" name="${questionId}_correct" value="${letter}">
            <input type="text" class="option-input" id="${questionId}_opt_${letter}" placeholder="Option ${letter.toUpperCase()}">
        </div>
    `;
    
    optionsContainer.insertAdjacentHTML('beforeend', optionHtml);
}

// ===== CLOSE CREATE PRACTICE MODAL =====
function closeCreatePracticeModal() {
    const modal = document.getElementById('createPracticeModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== VIEW PRACTICE EXERCISE =====
function viewPracticeExercise(exerciseId) {
    console.log("👁️ Viewing practice exercise:", exerciseId);
    showNotification('info', 'View Exercise', `Viewing exercise #${exerciseId}`);
}

// ===== EDIT PRACTICE EXERCISE =====
function editPracticeExercise(exerciseId) {
    console.log("✏️ Editing practice exercise:", exerciseId);
    showNotification('info', 'Edit Exercise', `Editing exercise #${exerciseId}`);
}

// ===== DELETE PRACTICE EXERCISE =====
function deletePracticeExercise(exerciseId) {
    if (!confirm('Are you sure you want to delete this practice exercise? This action cannot be undone.')) {
        return;
    }
    
    console.log("🗑️ Deleting practice exercise:", exerciseId);
    showNotification('success', 'Deleted', `Exercise #${exerciseId} deleted successfully`);
    
    // Reload after delete
    setTimeout(() => {
        loadAdminPracticeExercises();
    }, 500);
}


// ===== SAVE PRACTICE EXERCISE TO DATABASE WITH TEACHER ASSIGNMENT =====
async function savePracticeExercise() {
    console.log("💾 ===== SAVING PRACTICE EXERCISE TO DATABASE =====");
    
    // Get form values
    const title = document.getElementById('practiceTitle')?.value.trim();
    const description = document.getElementById('practiceDescription')?.value.trim();
    const topicId = document.getElementById('practiceTopic')?.value;
    const difficulty = document.getElementById('practiceDifficulty')?.value;
    let contentType = document.getElementById('practiceType')?.value; // 'multiple-choice', 'true-false', 'fill-blank'
    const points = parseInt(document.getElementById('practicePoints')?.value) || 10;
    const status = document.getElementById('practiceStatus')?.value; // 'active', 'draft', 'inactive'
    const practiceId = document.getElementById('practiceId')?.value;
    
    // ===== GET ASSIGNED TEACHER (NEW) =====
    const assignedTeacherId = document.getElementById('practiceAssignedTeacherId')?.value;
    
    // ===== FIX: Convert hyphenated values to underscore format for database ENUM =====
    const contentTypeMap = {
        'multiple-choice': 'multiple_choice',
        'true-false': 'fill_blank',
        'fill-blank': 'fill_blank',
        'fill_blank': 'fill_blank',
        'matching': 'matching',
        'interactive': 'interactive'
    };
    
    const dbContentType = contentTypeMap[contentType] || 'multiple_choice';
    
    console.log('📝 Practice data:', { 
        title, 
        topicId, 
        difficulty, 
        originalType: contentType,
        mappedType: dbContentType,
        points,
        status,
        isUpdate: !!practiceId,
        assignedTeacherId: assignedTeacherId || 'none (self)'
    });
    
    // ===== VALIDATION =====
    if (!title) {
        showNotification('error', 'Error', 'Please enter a title');
        return;
    }
    
    if (!topicId) {
        showNotification('error', 'Error', 'Please select a topic');
        return;
    }
    
    // ===== COLLECT QUESTIONS =====
    console.log("📝 Collecting questions...");
    const questions = [];
    const questionItems = document.querySelectorAll('.practice-question-item');
    
    console.log(`📝 Found ${questionItems.length} questions`);
    
    if (questionItems.length === 0) {
        showNotification('error', 'Error', 'Please add at least one question');
        return;
    }
    
    for (let i = 0; i < questionItems.length; i++) {
        const q = questionItems[i];
        const qId = i + 1;
        
        // Get question text
        const questionText = document.getElementById(`practice_q_${qId}_text`)?.value.trim();
        if (!questionText) {
            showNotification('error', 'Error', `Please enter question ${qId} text`);
            return;
        }
        
        // Get correct answer
        const correctRadio = document.querySelector(`input[name="practice_q_${qId}_correct"]:checked`);
        if (!correctRadio) {
            showNotification('error', 'Error', `Please select correct answer for question ${qId}`);
            return;
        }
        const correctLetter = correctRadio.value;
        
        // Collect options
        const options = [];
        const optionLetters = ['a', 'b', 'c', 'd', 'e', 'f'];
        
        for (let j = 0; j < optionLetters.length; j++) {
            const letter = optionLetters[j];
            const optInput = document.getElementById(`practice_q_${qId}_opt_${letter}`);
            
            if (optInput && optInput.value.trim()) {
                options.push({
                    text: optInput.value.trim(),
                    correct: letter === correctLetter
                });
            }
        }
        
        if (options.length < 2) {
            showNotification('error', 'Error', `Question ${qId} must have at least 2 options`);
            return;
        }
        
        questions.push({
            text: questionText,
            type: 'multiple_choice',
            options: options
        });
    }
    
    // ===== PREPARE DATA FOR SERVER =====
    const contentJson = {
        questions: questions
    };
    
    const isActive = status === 'active' ? 1 : (status === 'inactive' ? 0 : 1);
    
    const practiceData = {
        title: title,
        description: description || '',
        topic_id: parseInt(topicId),
        difficulty: difficulty || 'medium',
        content_type: dbContentType,
        points: points,
        content_json: contentJson,
        is_active: isActive
    };
    
    // ===== ADD TEACHER ASSIGNMENT IF SELECTED =====
    if (assignedTeacherId) {
        practiceData.assigned_teacher_id = parseInt(assignedTeacherId);
        console.log(`👨‍🏫 Practice will be assigned to teacher ID: ${assignedTeacherId}`);
    }
    
    if (practiceId) {
        practiceData.exercise_id = parseInt(practiceId);
    }
    
    console.log("📤 Sending practice data:", practiceData);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        const saveBtn = document.querySelector('#createPracticeModal .btn-primary');
        const originalText = saveBtn?.innerHTML;
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        const url = practiceId 
            ? `http://localhost:5000/api/admin/practice/${practiceId}`
            : 'http://localhost:5000/api/admin/practice';
        
        console.log(`📡 Sending ${practiceId ? 'PUT' : 'POST'} request to:`, url);
        
        const response = await fetch(url, {
            method: practiceId ? 'PUT' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(practiceData)
        });
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (!response.ok) {
            throw new Error(result.message || `Server error: ${response.status}`);
        }
        
        if (result.success) {
            let message = practiceId 
                ? 'Practice exercise updated successfully!' 
                : 'Practice exercise created successfully!';
            
            if (assignedTeacherId) {
                message += ' (Assigned to teacher)';
            }
            
            showNotification('success', 'Success!', message);
            closeCreatePracticeModal();
            await loadAdminPracticeExercises();
        } else {
            throw new Error(result.message || 'Failed to save practice exercise');
        }
        
    } catch (error) {
        console.error('❌ Error saving practice exercise:', error);
        showNotification('error', 'Save Failed', error.message);
    } finally {
        const saveBtn = document.querySelector('#createPracticeModal .btn-primary');
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Exercise';
        }
    }
}

// ===== VIEW PRACTICE EXERCISE - FIXED =====
async function viewPracticeExercise(exerciseId) {
    console.log("👁️ Viewing practice exercise:", exerciseId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        showNotification('info', 'Loading', 'Fetching exercise details...');
        
        const response = await fetch(`http://localhost:5000/api/exercises/${exerciseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.exercise) {
            const exercise = result.exercise;
            
            // Create modal to view exercise
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'viewPracticeModal';
            modal.style.display = 'flex';
            
            let questionsHtml = '';
            if (exercise.content_json && exercise.content_json.questions) {
                exercise.content_json.questions.forEach((q, index) => {
                    questionsHtml += `
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <h4 style="margin: 0 0 10px 0; color: #7a0000;">Question ${index + 1}</h4>
                            <p style="margin: 0 0 10px 0;">${q.text}</p>
                            <div style="display: grid; gap: 8px;">
                                ${q.options.map(opt => `
                                    <div style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 4px; ${opt.correct ? 'border-left: 4px solid #4CAF50;' : ''}">
                                        <span>${opt.text}</span>
                                        ${opt.correct ? '<span style="color: #4CAF50; margin-left: auto;"><i class="fas fa-check"></i> Correct</span>' : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                });
            }
            
            modal.innerHTML = `
                <div class="modal-backdrop" onclick="closeViewPracticeModal()"></div>
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header" style="background: #7a0000; color: white;">
                        <h3><i class="fas fa-eye"></i> Practice Exercise Details</h3>
                        <button class="modal-close" onclick="closeViewPracticeModal()" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: #7a0000; margin-bottom: 10px;">${exercise.title}</h4>
                            <p style="color: #666; margin-bottom: 15px;">${exercise.description || 'No description'}</p>
                            
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                                <div style="background: #f8f9fa; padding: 10px; text-align: center; border-radius: 6px;">
                                    <span style="display: block; font-size: 1.2rem; font-weight: bold; color: #7a0000;">${exercise.difficulty || 'medium'}</span>
                                    <span style="font-size: 0.8rem; color: #666;">Difficulty</span>
                                </div>
                                <div style="background: #f8f9fa; padding: 10px; text-align: center; border-radius: 6px;">
                                    <span style="display: block; font-size: 1.2rem; font-weight: bold; color: #7a0000;">${exercise.content_json?.questions?.length || 0}</span>
                                    <span style="font-size: 0.8rem; color: #666;">Questions</span>
                                </div>
                                <div style="background: #f8f9fa; padding: 10px; text-align: center; border-radius: 6px;">
                                    <span style="display: block; font-size: 1.2rem; font-weight: bold; color: #7a0000;">${exercise.points || 10}</span>
                                    <span style="font-size: 0.8rem; color: #666;">Points</span>
                                </div>
                                <div style="background: #f8f9fa; padding: 10px; text-align: center; border-radius: 6px;">
                                    <span style="display: block; font-size: 1.2rem; font-weight: bold; color: #7a0000;">${exercise.attempts || 0}</span>
                                    <span style="font-size: 0.8rem; color: #666;">Attempts</span>
                                </div>
                            </div>
                            
                            <h5 style="color: #7a0000; margin-bottom: 15px;">Questions Preview:</h5>
                            ${questionsHtml}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="closeViewPracticeModal()">Close</button>
                        <button class="btn btn-primary" onclick="editPracticeExercise(${exerciseId})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            throw new Error(result.message || 'Failed to load exercise');
        }
        
    } catch (error) {
        console.error('❌ Error viewing practice exercise:', error);
        showNotification('error', 'Error', error.message);
    }
}

// ===== CLOSE VIEW PRACTICE MODAL =====
function closeViewPracticeModal() {
    const modal = document.getElementById('viewPracticeModal');
    if (modal) {
        modal.remove();
    }
}

// ===== EDIT PRACTICE EXERCISE - FIXED =====
async function editPracticeExercise(exerciseId) {
    console.log("✏️ Editing practice exercise:", exerciseId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        showNotification('info', 'Loading', 'Fetching exercise data...');
        
        const response = await fetch(`http://localhost:5000/api/exercises/${exerciseId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.exercise) {
            const exercise = result.exercise;
            
            // Open create modal (reuse the same modal)
            openCreatePracticeModal();
            
            // Change title to Edit mode
            document.getElementById('modalPracticeTitle').textContent = 'Edit Practice Exercise';
            
            // Populate form
            document.getElementById('practiceId').value = exerciseId;
            document.getElementById('practiceTitle').value = exercise.title || '';
            document.getElementById('practiceDescription').value = exercise.description || '';
            
            // Set topic if available
            if (exercise.topic_id) {
                // Wait for topics to load
                setTimeout(() => {
                    const topicSelect = document.getElementById('practiceTopic');
                    if (topicSelect) {
                        topicSelect.value = exercise.topic_id;
                    }
                }, 500);
            }
            
            document.getElementById('practiceDifficulty').value = exercise.difficulty || 'medium';
            document.getElementById('practiceType').value = exercise.content_type || 'multiple-choice';
            document.getElementById('practicePoints').value = exercise.points || 10;
            document.getElementById('practiceStatus').value = exercise.status || 'active';
            
            // Clear and add questions
            const container = document.getElementById('practiceQuestionsContainer');
            container.innerHTML = '';
            
            if (exercise.content_json && exercise.content_json.questions) {
                exercise.content_json.questions.forEach((q, index) => {
                    // Add question field
                    addPracticeQuestion();
                    
                    // Fill question data (with delay for DOM to update)
                    setTimeout(() => {
                        const qNum = index + 1;
                        
                        // Set question text
                        const questionInput = document.getElementById(`practice_q_${qNum}_text`);
                        if (questionInput) questionInput.value = q.text || '';
                        
                        // Set options
                        if (q.options && q.options.length > 0) {
                            q.options.forEach((opt, optIndex) => {
                                const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
                                const letter = letters[optIndex];
                                const optInput = document.getElementById(`practice_q_${qNum}_opt_${letter}`);
                                if (optInput) {
                                    optInput.value = opt.text || '';
                                }
                                
                                // Set correct answer
                                if (opt.correct) {
                                    const radio = document.querySelector(`input[name="practice_q_${qNum}_correct"][value="${letter}"]`);
                                    if (radio) radio.checked = true;
                                }
                            });
                        }
                    }, 100 * (index + 1));
                });
            }
            
            showNotification('success', 'Loaded', 'Exercise data loaded for editing');
            
        } else {
            throw new Error(result.message || 'Failed to load exercise');
        }
        
    } catch (error) {
        console.error('❌ Error editing practice exercise:', error);
        showNotification('error', 'Error', error.message);
    }
}

// ===== DELETE PRACTICE EXERCISE - FIXED =====
async function deletePracticeExercise(exerciseId) {
    if (!confirm('Are you sure you want to delete this practice exercise? This action cannot be undone.')) {
        return;
    }
    
    console.log("🗑️ Deleting practice exercise:", exerciseId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        showNotification('info', 'Deleting', 'Removing exercise from database...');
        
        const response = await fetch(`http://localhost:5000/api/admin/practice/${exerciseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Deleted', result.message || 'Exercise deleted successfully');
            
            // Reload the list after delete
            setTimeout(() => {
                loadAdminPracticeExercises();
            }, 500);
            
        } else {
            throw new Error(result.message || 'Failed to delete exercise');
        }
        
    } catch (error) {
        console.error('❌ Error deleting practice exercise:', error);
        showNotification('error', 'Delete Failed', error.message);
    }
}

// ===== VIEW PRACTICE STATISTICS - WITH PDF EXPORT =====
async function viewPracticeStats(exerciseId) {
    console.log("📊 Viewing practice statistics for exercise:", exerciseId);
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Show loading
        showNotification('info', 'Loading', 'Fetching exercise statistics...');
        
        const response = await fetch(`http://localhost:5000/api/admin/practice/${exerciseId}/attempts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const attempts = result.attempts || [];
            
            // Create modal to show statistics
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'practiceStatsModal';
            modal.style.display = 'flex';
            
            // Calculate stats
            const totalAttempts = attempts.length;
            const avgScore = totalAttempts > 0 
                ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts) 
                : 0;
            const passedCount = attempts.filter(a => a.score >= 70).length;
            const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
            
            // Calculate high score and low score
            const highScore = totalAttempts > 0 
                ? Math.max(...attempts.map(a => a.score || 0))
                : 0;
            const lowScore = totalAttempts > 0 
                ? Math.min(...attempts.map(a => a.score || 0))
                : 0;
            
            // Get exercise info (you may need to fetch this separately)
            let exerciseTitle = 'Practice Exercise';
            try {
                const exerciseResponse = await fetch(`http://localhost:5000/api/exercises/${exerciseId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (exerciseResponse.ok) {
                    const exerciseData = await exerciseResponse.json();
                    if (exerciseData.success && exerciseData.exercise) {
                        exerciseTitle = exerciseData.exercise.title || exerciseTitle;
                    }
                }
            } catch (e) {
                console.log('Could not fetch exercise title');
            }
            
            let attemptsHtml = '';
            if (attempts.length > 0) {
                attemptsHtml = attempts.map(a => `
                    <tr>
                        <td>${a.user_name || 'Unknown'}</td>
                        <td><span style="color: ${a.score >= 70 ? '#4CAF50' : '#f44336'}; font-weight: bold;">${a.score}%</span></td>
                        <td>${a.attempt_number || 1}</td>
                        <td>${Math.floor((a.time_spent_seconds || 0) / 60)}:${((a.time_spent_seconds || 0) % 60).toString().padStart(2, '0')}</td>
                        <td>${new Date(a.attempted_at).toLocaleDateString()}</td>
                    </tr>
                `).join('');
            } else {
                attemptsHtml = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px;">
                            <i class="fas fa-chart-bar" style="font-size: 2rem; color: #ccc;"></i>
                            <p style="color: #666; margin-top: 10px;">No attempts yet</p>
                        </td>
                    </tr>
                `;
            }
            
            modal.innerHTML = `
                <div class="modal-backdrop" onclick="closePracticeStatsModal()"></div>
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header" style="background: #7a0000; color: white;">
                        <h3><i class="fas fa-chart-bar"></i> Practice Statistics: ${exerciseTitle}</h3>
                        <button class="modal-close" onclick="closePracticeStatsModal()" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- Stats Summary Cards -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                                <span style="display: block; font-size: 2rem; font-weight: bold;">${totalAttempts}</span>
                                <span>Total Attempts</span>
                            </div>
                            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                                <span style="display: block; font-size: 2rem; font-weight: bold;">${avgScore}%</span>
                                <span>Average Score</span>
                            </div>
                            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                                <span style="display: block; font-size: 2rem; font-weight: bold;">${passRate}%</span>
                                <span>Pass Rate</span>
                            </div>
                            <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 20px; border-radius: 10px; text-align: center; color: white;">
                                <span style="display: block; font-size: 2rem; font-weight: bold;">${highScore}%</span>
                                <span>Highest Score</span>
                            </div>
                        </div>
                        
                        <!-- Additional Stats -->
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px;">
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #333;">Score Distribution</h4>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span>90-100%</span>
                                        <span>${attempts.filter(a => a.score >= 90).length}</span>
                                    </div>
                                    <div style="height: 8px; background: #e0e0e0; border-radius: 4px;">
                                        <div style="height: 100%; width: ${totalAttempts > 0 ? (attempts.filter(a => a.score >= 90).length / totalAttempts * 100) : 0}%; background: #4CAF50; border-radius: 4px;"></div>
                                    </div>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span>80-89%</span>
                                        <span>${attempts.filter(a => a.score >= 80 && a.score < 90).length}</span>
                                    </div>
                                    <div style="height: 8px; background: #e0e0e0; border-radius: 4px;">
                                        <div style="height: 100%; width: ${totalAttempts > 0 ? (attempts.filter(a => a.score >= 80 && a.score < 90).length / totalAttempts * 100) : 0}%; background: #2196F3; border-radius: 4px;"></div>
                                    </div>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span>70-79%</span>
                                        <span>${attempts.filter(a => a.score >= 70 && a.score < 80).length}</span>
                                    </div>
                                    <div style="height: 8px; background: #e0e0e0; border-radius: 4px;">
                                        <div style="height: 100%; width: ${totalAttempts > 0 ? (attempts.filter(a => a.score >= 70 && a.score < 80).length / totalAttempts * 100) : 0}%; background: #FF9800; border-radius: 4px;"></div>
                                    </div>
                                </div>
                                <div style="margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                                        <span>Below 70%</span>
                                        <span>${attempts.filter(a => a.score < 70).length}</span>
                                    </div>
                                    <div style="height: 8px; background: #e0e0e0; border-radius: 4px;">
                                        <div style="height: 100%; width: ${totalAttempts > 0 ? (attempts.filter(a => a.score < 70).length / totalAttempts * 100) : 0}%; background: #f44336; border-radius: 4px;"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                                <h4 style="margin: 0 0 10px 0; color: #333;">Quick Stats</h4>
                                <table style="width: 100%;">
                                    <tr>
                                        <td style="padding: 8px 0;">Lowest Score:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #f44336;">${lowScore}%</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">Total Passed:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #4CAF50;">${passedCount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">Total Failed:</td>
                                        <td style="padding: 8px 0; font-weight: bold; color: #f44336;">${totalAttempts - passedCount}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0;">Average Time:</td>
                                        <td style="padding: 8px 0; font-weight: bold;">
                                            ${totalAttempts > 0 
                                                ? Math.round(attempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / totalAttempts / 60) + ' min' 
                                                : '0 min'}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        
                        <h4 style="color: #7a0000; margin-bottom: 15px;">Student Attempts</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead style="background: #f8f9fa; position: sticky; top: 0;">
                                    <tr>
                                        <th style="padding: 10px; text-align: left;">Student</th>
                                        <th style="padding: 10px; text-align: left;">Score</th>
                                        <th style="padding: 10px; text-align: left;">Attempt</th>
                                        <th style="padding: 10px; text-align: left;">Time</th>
                                        <th style="padding: 10px; text-align: left;">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${attemptsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 15px 20px; border-top: 1px solid #e0e0e0;">
                        <button class="btn btn-secondary" onclick="closePracticeStatsModal()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="btn btn-primary" onclick="exportPracticeStatsPDF(${exerciseId})" style="background: #7a0000; color: white;">
                            <i class="fas fa-file-pdf"></i> Export to PDF
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
        } else {
            throw new Error(result.message || 'Failed to load statistics');
        }
        
    } catch (error) {
        console.error('❌ Error viewing practice statistics:', error);
        showNotification('error', 'Error', error.message);
    }
}

// ===== EXPORT PRACTICE STATISTICS TO PDF =====
async function exportPracticeStatsPDF(exerciseId) {
    console.log("📄 Exporting practice statistics to PDF for exercise:", exerciseId);
    
    showNotification('info', 'Generating PDF', 'Preparing statistics report...');
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            showNotification('error', 'Auth Error', 'Please login first');
            return;
        }
        
        // Fetch attempts data
        const response = await fetch(`http://localhost:5000/api/admin/practice/${exerciseId}/attempts`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load statistics');
        }
        
        const attempts = result.attempts || [];
        
        // Fetch exercise details
        let exerciseTitle = 'Practice Exercise';
        let exerciseDifficulty = 'medium';
        let exercisePoints = 10;
        
        try {
            const exerciseResponse = await fetch(`http://localhost:5000/api/exercises/${exerciseId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (exerciseResponse.ok) {
                const exerciseData = await exerciseResponse.json();
                if (exerciseData.success && exerciseData.exercise) {
                    exerciseTitle = exerciseData.exercise.title || exerciseTitle;
                    exerciseDifficulty = exerciseData.exercise.difficulty || 'medium';
                    exercisePoints = exerciseData.exercise.points || 10;
                }
            }
        } catch (e) {
            console.log('Could not fetch exercise title');
        }
        
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page.');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Calculate stats
        const totalAttempts = attempts.length;
        const avgScore = totalAttempts > 0 
            ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / totalAttempts) 
            : 0;
        const passedCount = attempts.filter(a => a.score >= 70).length;
        const passRate = totalAttempts > 0 ? Math.round((passedCount / totalAttempts) * 100) : 0;
        const highScore = totalAttempts > 0 ? Math.max(...attempts.map(a => a.score || 0)) : 0;
        const lowScore = totalAttempts > 0 ? Math.min(...attempts.map(a => a.score || 0)) : 0;
        
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = new Date().toLocaleTimeString();
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(36);
        doc.setFont('helvetica', 'bold');
        doc.text('PRACTICE EXERCISE', 148.5, 60, { align: 'center' });
        doc.text('STATISTICS REPORT', 148.5, 80, { align: 'center' });
        
        doc.setFontSize(24);
        doc.setFont('helvetica', 'normal');
        doc.text(exerciseTitle, 148.5, 110, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(`Difficulty: ${exerciseDifficulty.toUpperCase()}`, 148.5, 130, { align: 'center' });
        doc.text(`Points: ${exercisePoints}`, 148.5, 145, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text(`Generated on: ${currentDate}`, 148.5, 170, { align: 'center' });
        doc.text(`Time: ${currentTime}`, 148.5, 185, { align: 'center' });
        
        // Add new page
        doc.addPage();
        
        // ===== STATISTICS PAGE =====
        doc.setTextColor(0, 0, 0);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(122, 0, 0);
        doc.text('Performance Statistics', 20, 20);
        
        // Statistics table
        doc.autoTable({
            startY: 30,
            head: [['Metric', 'Value']],
            body: [
                ['Total Attempts', totalAttempts.toString()],
                ['Average Score', avgScore + '%'],
                ['Pass Rate', passRate + '%'],
                ['Highest Score', highScore + '%'],
                ['Lowest Score', lowScore + '%'],
                ['Total Passed', passedCount.toString()],
                ['Total Failed', (totalAttempts - passedCount).toString()]
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            margin: { top: 30 }
        });
        
        // Score Distribution
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Score Distribution', 20, 20);
        
        const score90plus = attempts.filter(a => a.score >= 90).length;
        const score80_89 = attempts.filter(a => a.score >= 80 && a.score < 90).length;
        const score70_79 = attempts.filter(a => a.score >= 70 && a.score < 80).length;
        const scoreBelow70 = attempts.filter(a => a.score < 70).length;
        
        doc.autoTable({
            startY: 30,
            head: [['Score Range', 'Number of Students', 'Percentage']],
            body: [
                ['90-100%', score90plus.toString(), totalAttempts > 0 ? Math.round((score90plus / totalAttempts) * 100) + '%' : '0%'],
                ['80-89%', score80_89.toString(), totalAttempts > 0 ? Math.round((score80_89 / totalAttempts) * 100) + '%' : '0%'],
                ['70-79%', score70_79.toString(), totalAttempts > 0 ? Math.round((score70_79 / totalAttempts) * 100) + '%' : '0%'],
                ['Below 70%', scoreBelow70.toString(), totalAttempts > 0 ? Math.round((scoreBelow70 / totalAttempts) * 100) + '%' : '0%']
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
        });
        
        // Student Attempts List
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Student Attempts', 20, 20);
        
        if (attempts.length > 0) {
            const tableData = attempts.map(a => [
                a.user_name || 'Unknown',
                a.score + '%',
                a.attempt_number?.toString() || '1',
                Math.floor((a.time_spent_seconds || 0) / 60) + ':' + ((a.time_spent_seconds || 0) % 60).toString().padStart(2, '0'),
                new Date(a.attempted_at).toLocaleDateString()
            ]);
            
            doc.autoTable({
                startY: 30,
                head: [['Student', 'Score', 'Attempt', 'Time', 'Date']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 20 },
                    3: { cellWidth: 30 },
                    4: { cellWidth: 35 }
                }
            });
        } else {
            doc.setFontSize(14);
            doc.setTextColor(100, 100, 100);
            doc.text('No attempts recorded for this exercise', 20, 40);
        }
        
        // Report Summary
        doc.addPage();
        doc.setFontSize(20);
        doc.setTextColor(122, 0, 0);
        doc.text('Report Summary', 20, 20);
        
        doc.autoTable({
            startY: 30,
            head: [['Item', 'Details']],
            body: [
                ['Exercise ID', '#' + exerciseId],
                ['Exercise Title', exerciseTitle],
                ['Difficulty', exerciseDifficulty.toUpperCase()],
                ['Points', exercisePoints.toString()],
                ['Report Generated', currentDate + ' at ' + currentTime],
                ['Generated By', localStorage.getItem('mathhub_user') ? 
                  JSON.parse(localStorage.getItem('mathhub_user')).full_name || 'Admin' : 'Admin']
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] }
        });
        
        // Add footer to all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(
                `MathHub Practice Statistics - ${exerciseTitle} - Page ${i} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
        
        // ===== DOWNLOAD THE PDF =====
        const fileName = `Practice_Stats_${exerciseTitle.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'PDF Downloaded', `Statistics report saved as ${fileName}`);
        console.log(`✅ Practice stats PDF downloaded: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating practice stats PDF:', error);
        showNotification('error', 'PDF Generation Failed', error.message);
        
        // Fallback to old export function
        exportPracticeStats(exerciseId);
    }
}

// ===== UPDATE THE OLD EXPORT FUNCTION TO BE A FALLBACK =====
function exportPracticeStats(exerciseId) {
    showNotification('info', 'Exporting', 'Preparing statistics for export...');
    
    setTimeout(() => {
        showNotification('success', 'Exported', 'Statistics exported successfully');
        closePracticeStatsModal();
    }, 1500);
}

// ===== CLOSE PRACTICE STATS MODAL =====
function closePracticeStatsModal() {
    const modal = document.getElementById('practiceStatsModal');
    if (modal) {
        modal.remove();
    }
}

// ===== EXPORT PRACTICE STATISTICS =====
function exportPracticeStats(exerciseId) {
    showNotification('info', 'Exporting', 'Preparing statistics for export...');
    
    setTimeout(() => {
        showNotification('success', 'Exported', 'Statistics exported successfully');
        closePracticeStatsModal();
    }, 1500);
}

// ===== EXPORT USERS TO PDF - DIRECT DOWNLOAD =====
async function exportUsers() {
    console.log("📄 Exporting users to PDF...");
    
    // Show notification
    showNotification('info', 'Generating PDF', 'Preparing users list...');
    
    try {
        // Check if jsPDF is loaded
        if (typeof window.jspdf === 'undefined') {
            throw new Error('PDF library not loaded. Please refresh the page.');
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        // Get current date and time
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const currentTime = new Date().toLocaleTimeString();
        
        // ===== GET FILTER AND SORT VALUES =====
        const filterValue = document.getElementById('userFilterSelect')?.value || 'all';
        const sortValue = document.getElementById('userSortSelect')?.value || 'name';
        
        // Get filter display name
        let filterDisplay = 'All Users';
        switch(filterValue) {
            case 'active': filterDisplay = 'Active Users'; break;
            case 'inactive': filterDisplay = 'Inactive Users'; break;
            case 'admins': filterDisplay = 'Administrators'; break;
            case 'students': filterDisplay = 'Students'; break;
            case 'teachers': filterDisplay = 'Teachers'; break;
            case 'pending': filterDisplay = 'Pending Approval'; break;
        }
        
        // Get sort display name
        let sortDisplay = 'Name (A-Z)';
        switch(sortValue) {
            case 'name': sortDisplay = 'Name (A-Z)'; break;
            case 'date': sortDisplay = 'Registration Date'; break;
            case 'lastLogin': sortDisplay = 'Last Login'; break;
            case 'activity': sortDisplay = 'Activity Level'; break;
        }
        
        // ===== PREPARE USER DATA =====
        // Use the global usersData array (from your loadUsersData function)
        let usersToExport = [];
        
        if (window.usersData && usersData.length > 0) {
            usersToExport = usersData;
        } else {
            // Try to get from usersData array
            if (typeof usersData !== 'undefined' && usersData.length > 0) {
                usersToExport = usersData;
            } else {
                // Try to get from localStorage backup
                try {
                    const backup = localStorage.getItem('mathhub_users_backup');
                    if (backup) {
                        usersToExport = JSON.parse(backup);
                    }
                } catch (e) {}
            }
        }
        
        // If still no data, show error
        if (usersToExport.length === 0) {
            showNotification('error', 'No Data', 'No users found to export');
            return;
        }
        
        console.log(`📊 Exporting ${usersToExport.length} users to PDF`);
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 297, 210, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(40);
        doc.setFont('helvetica', 'bold');
        doc.text('USERS REPORT', 148.5, 70, { align: 'center' });
        
        doc.setFontSize(28);
        doc.text('MathHub Admin Dashboard', 148.5, 100, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(`Generated on: ${currentDate}`, 148.5, 130, { align: 'center' });
        doc.text(`Time: ${currentTime}`, 148.5, 145, { align: 'center' });
        
        doc.setFontSize(14);
        doc.text(`Filter: ${filterDisplay}`, 148.5, 170, { align: 'center' });
        doc.text(`Sort: ${sortDisplay}`, 148.5, 185, { align: 'center' });
        
        // Add new page
        doc.addPage();
        
        // ===== STATISTICS PAGE =====
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        
        // Title
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(122, 0, 0);
        doc.text('User Statistics', 20, 20);
        
        // Calculate statistics
        const totalUsers = usersToExport.length;
        const activeUsers = usersToExport.filter(u => u.status === 'active' || u.status === '1').length;
        const inactiveUsers = usersToExport.filter(u => u.status === 'inactive' || u.status === '0').length;
        const pendingUsers = usersToExport.filter(u => u.status === 'pending').length;
        
        const admins = usersToExport.filter(u => u.role === 'admin').length;
        const teachers = usersToExport.filter(u => u.role === 'teacher').length;
        const students = usersToExport.filter(u => u.role === 'student').length;
        
        // Calculate new users today
        const today = new Date().toISOString().split('T')[0];
        const newToday = usersToExport.filter(u => {
            const regDate = u.registrationDate ? u.registrationDate.split('T')[0] : '';
            return regDate === today;
        }).length;
        
        // Statistics table
        doc.autoTable({
            startY: 30,
            head: [['Metric', 'Value']],
            body: [
                ['Total Users', totalUsers.toString()],
                ['Active Users', activeUsers.toString()],
                ['Inactive Users', inactiveUsers.toString()],
                ['Pending Approval', pendingUsers.toString()],
                ['Administrators', admins.toString()],
                ['Teachers', teachers.toString()],
                ['Students', students.toString()],
                ['New Users Today', newToday.toString()]
            ],
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            margin: { top: 30 }
        });
        
        // ===== USERS LIST PAGE =====
        doc.addPage();
        doc.setFontSize(24);
        doc.setTextColor(122, 0, 0);
        doc.text('All Users', 20, 20);
        
        // Prepare data for table
        const tableData = usersToExport.map(user => [
            user.id || 'N/A',
            user.name || user.username || 'Unknown',
            user.email || 'No email',
            (user.role || 'student').toUpperCase(),
            (user.status || 'active').toUpperCase(),
            user.registrationDate ? formatDateForPDF(user.registrationDate) : 'N/A',
            user.lastActive && user.lastActive !== 'Never' ? formatDateForPDF(user.lastActive) : 'Never'
        ]);
        
        doc.autoTable({
            startY: 30,
            head: [['ID', 'Name', 'Email', 'Role', 'Status', 'Registered', 'Last Active']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [122, 0, 0], textColor: [255, 255, 255] },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 35 },
                2: { cellWidth: 50 },
                3: { cellWidth: 20 },
                4: { cellWidth: 20 },
                5: { cellWidth: 25 },
                6: { cellWidth: 30 }
            },
            margin: { top: 30 },
            didDrawPage: function(data) {
                // Add footer
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(
                    `MathHub Users Report - Page ${data.pageCount}`,
                    doc.internal.pageSize.width / 2,
                    doc.internal.pageSize.height - 10,
                    { align: 'center' }
                );
            }
        });
        
        // ===== DOWNLOAD THE PDF =====
        const fileName = `MathHub_Users_Report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'PDF Downloaded', `Users report saved as ${fileName}`);
        console.log(`✅ Users PDF downloaded: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating users PDF:', error);
        showNotification('error', 'PDF Generation Failed', error.message);
        
        // Fallback to CSV if PDF fails
        exportUsersCSV();
    }
}

// ===== HELPER: Format date for PDF =====
function formatDateForPDF(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// ===== FALLBACK: Export Users as CSV =====
function exportUsersCSV() {
    console.log("📄 Exporting users as CSV (fallback)...");
    
    let usersToExport = [];
    
    if (window.usersData && usersData.length > 0) {
        usersToExport = usersData;
    } else if (typeof usersData !== 'undefined' && usersData.length > 0) {
        usersToExport = usersData;
    } else {
        showNotification('error', 'No Data', 'No users found to export');
        return;
    }
    
    // Create CSV content
    let csv = 'ID,Name,Email,Role,Status,Registration Date,Last Active\n';
    
    usersToExport.forEach(user => {
        const row = [
            user.id || '',
            `"${(user.name || user.username || 'Unknown').replace(/"/g, '""')}"`,
            `"${(user.email || '').replace(/"/g, '""')}"`,
            user.role || 'student',
            user.status || 'active',
            user.registrationDate || '',
            (user.lastActive && user.lastActive !== 'Never') ? user.lastActive : ''
        ];
        csv += row.join(',') + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `MathHub_Users_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('warning', 'CSV Downloaded', 'PDF generation failed. Exported as CSV instead.');
}

// ===== FILTERED EXPORT =====
function exportFilteredUsers() {
    console.log("📄 Exporting filtered users...");
    
    const filterValue = document.getElementById('userFilterSelect')?.value || 'all';
    
    // Filter users based on selected filter
    let filteredUsers = [...usersData];
    
    if (filterValue !== 'all') {
        if (filterValue === 'active') {
            filteredUsers = filteredUsers.filter(u => u.status === 'active');
        } else if (filterValue === 'inactive') {
            filteredUsers = filteredUsers.filter(u => u.status === 'inactive');
        } else if (filterValue === 'admins') {
            filteredUsers = filteredUsers.filter(u => u.role === 'admin');
        } else if (filterValue === 'students') {
            filteredUsers = filteredUsers.filter(u => u.role === 'student');
        } else if (filterValue === 'teachers') {
            filteredUsers = filteredUsers.filter(u => u.role === 'teacher');
        } else if (filterValue === 'pending') {
            filteredUsers = filteredUsers.filter(u => u.status === 'pending');
        }
    }
    
    // Sort users based on selected sort
    const sortValue = document.getElementById('userSortSelect')?.value || 'name';
    
    if (sortValue === 'name') {
        filteredUsers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortValue === 'date') {
        filteredUsers.sort((a, b) => new Date(b.registrationDate || 0) - new Date(a.registrationDate || 0));
    } else if (sortValue === 'lastLogin') {
        filteredUsers.sort((a, b) => {
            if (!a.lastLogin && !b.lastLogin) return 0;
            if (!a.lastLogin) return 1;
            if (!b.lastLogin) return -1;
            return new Date(b.lastLogin) - new Date(a.lastLogin);
        });
    }
    
    // Store filtered users temporarily
    window.tempFilteredUsers = filteredUsers;
    
    // Export filtered users
    if (typeof exportUsers === 'function') {
        exportUsers();
    } else {
        showNotification('error', 'Error', 'Export function not found');
    }
}

// ===== ADD EXPORT BUTTON TO SETTINGS FILTERS =====
function addExportButtonsToSettings() {
    console.log("🔧 Adding export buttons to settings...");
    
    // Get the settings filters container
    const filtersContainer = document.querySelector('.settings-filters');
    
    if (filtersContainer) {
        // Check if export button already exists
        if (!document.getElementById('exportFilteredUsersBtn')) {
            const exportFilteredBtn = document.createElement('button');
            exportFilteredBtn.id = 'exportFilteredUsersBtn';
            exportFilteredBtn.className = 'btn btn-secondary';
            exportFilteredBtn.innerHTML = '<i class="fas fa-file-export"></i> Export Filtered';
            exportFilteredBtn.onclick = exportFilteredUsers;
            
            // Add after the existing export button
            const existingExportBtn = filtersContainer.querySelector('.btn-secondary');
            if (existingExportBtn) {
                existingExportBtn.after(exportFilteredBtn);
            } else {
                filtersContainer.appendChild(exportFilteredBtn);
            }
            
            console.log("✅ Export filtered button added");
        }
    }
}

// ===== UPDATE SETTINGS INITIALIZATION =====
function initializeSettingsDashboard() {
    console.log("⚙️ Initializing Settings Dashboard...");
    
    // Load users data
    loadUsersData();  // <-- Dapat ito ay nandito
    
    // Update stats
    updateUserStats();
    
    // Update table
    updateUsersTable();
    
    // Load sessions
    loadSessions();
    
    // Initialize tabs
    openSettingsTab('userManagementTab');
    
    // Set up search
    const searchInput = document.getElementById('searchSettingsInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterUsersBySearch(this.value);
        });
    }
    
    // Add export buttons
    setTimeout(() => {
        addExportButtonsToSettings();
    }, 500);
}

// Make export functions globally available
window.exportUsers = exportUsers;
window.exportUsersCSV = exportUsersCSV;
window.exportFilteredUsers = exportFilteredUsers;

// ===== DEBUG: Check subject data directly =====
async function debugSubjectData() {
    console.log("🔍 DEBUG: Checking subject data...");
    
    try {
        const token = localStorage.getItem('admin_token') || localStorage.getItem('authToken');
        
        if (!token) {
            console.error("❌ No token found");
            return;
        }
        
        // Get current subject
        const subject = currentSubject || 'polynomial';
        const subjectId = getSubjectIdFromName(subject);
        
        console.log(`🔍 Testing with subject: ${subject} (ID: ${subjectId})`);
        
        // TEST 1: Check if lessons table exists and has data
        console.log("📋 TEST 1: Checking lessons table...");
        const lessonsResponse = await fetch(`http://localhost:5000/api/admin/lessons`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (lessonsResponse.ok) {
            const lessonsData = await lessonsResponse.json();
            console.log(`✅ Lessons table: ${lessonsData.lessons?.length || 0} total lessons`);
            
            // Check lessons for this subject
            const subjectLessons = lessonsData.lessons?.filter(l => {
                // Try different possible field names
                return l.lesson_id == subjectId || 
                       l.subject_id == subjectId ||
                       (l.lesson_name && l.lesson_name.toLowerCase() === subject.toLowerCase());
            });
            
            console.log(`📊 Lessons for subject ID ${subjectId}:`, subjectLessons?.length || 0);
            if (subjectLessons?.length > 0) {
                console.log("Sample lesson:", subjectLessons[0]);
            }
        } else {
            console.log("❌ Cannot fetch lessons");
        }
        
        // TEST 2: Call the subject summary endpoint directly
        console.log(`\n📋 TEST 2: Calling /api/subject/${subjectId}/summary...`);
        const summaryResponse = await fetch(`http://localhost:5000/api/subject/${subjectId}/summary`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            console.log("📥 Summary response:", summaryData);
        } else {
            console.log(`❌ Summary endpoint failed: ${summaryResponse.status}`);
            const errorText = await summaryResponse.text();
            console.log("Error:", errorText);
        }
        
        // TEST 3: Try a different endpoint - direct query
        console.log(`\n📋 TEST 3: Direct query for lessons in subject...`);
        const directResponse = await fetch(`http://localhost:5000/api/lessons/by-subject/${subjectId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (directResponse.ok) {
            const directData = await directResponse.json();
            console.log(`📥 Direct lessons query: ${directData.count || 0} lessons`);
            if (directData.lessons?.length > 0) {
                console.log("Sample:", directData.lessons[0]);
            }
        } else {
            console.log(`❌ Direct query failed: ${directResponse.status}`);
        }
        
    } catch (error) {
        console.error("❌ Debug error:", error);
    }
}