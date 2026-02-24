// ===== GLOBAL STATE =====
let currentSubject = 'polynomial';
const sections = document.querySelectorAll('.dashboard-section');
let teacherId = null;
let teacherName = 'Teacher';

// ===== FEEDBACK STATE =====
let teacherFeedbackData = [];
let currentFeedbackPage = 1;
const feedbackPerPage = 8;

// ===== QUIZ STATE =====
let quizData = [];
let currentQuizPage = 1;
let quizzesPerPage = 10;
let currentQuizFilter = 'all';
let quizChart = null;

// ===== PRACTICE STATE =====
let practiceData = [];
let currentPracticePage = 1;
const practicesPerPage = 12;
let practiceChart = null;

// ===== ASSIGNMENT STATE =====
let assignmentsData = [];
let currentAssignmentPage = 1;
const assignmentsPerPage = 10;

// ===== STUDENTS STATE =====
let myStudents = [];
let selectedStudents = new Set();
let currentStudentPage = 1;
const studentsPerPage = 10;

// ===== LESSON STATE =====
let myLessons = [];
let publishedLessons = 0;
let draftLessons = 0;
let needsReviewLessons = 0;
let avgCompletion = 0;

// ===== GLOBAL STATE FOR LESSONS =====
let lessonData = [];
let currentLessonPage = 1;
const lessonsPerPage = 12;
let currentLessonFilter = 'all';
let currentSubjectFilter = 'all';
let currentTypeFilter = 'all';
let lessonsList = [
    { id: 2, name: 'PolyLearn' },
    { id: 3, name: 'FactoLearn' },
    { id: 1, name: 'MathEase' }
];

let teacherModules = [];      // <--- ADD THIS
let teacherTopics = [];       // <--- ADD THIS
// ===== MAKE FUNCTIONS GLOBAL =====
window.editLesson = editLesson;
window.deleteLesson = deleteLesson;
window.saveEditedLesson = saveEditedLesson;  // <- ADD THIS
window.handleEditButtonClick = handleEditButtonClick;
window.handleDeleteButtonClick = handleDeleteButtonClick;
window.openCreateLessonModal = openCreateLessonModal;
window.closeModal = closeModal;
window.closeEditLessonModal = closeEditLessonModal;  // <- ADD THIS
window.viewSubjectLessons = viewSubjectLessons;

console.log("✅ All functions registered globally");

// ===== FIXED: SUBJECT DATA WITH STUDENTS PROPERTY =====
const subjectData = {
    polynomial: {
        name: 'PolyLearn',
        icon: 'fas fa-superscript',
        description: 'Algebraic expressions with variables and coefficients',
        color: '#7a0000',
        lessons: 0,
        resources: 0,
        students: 0  // <-- ADD THIS
    },
    factorial: {
        name: 'FactoLearn',
        icon: 'fas fa-exclamation-circle',
        description: 'Product of all positive integers less than or equal to n',
        color: '#009900',
        lessons: 0,
        resources: 0,
        students: 0  // <-- ADD THIS
    },
    mdas: {
        name: 'MathEase',
        icon: 'fas fa-divide',
        description: 'Order of operations: Multiplication, Division, Addition, Subtraction',
        color: '#0066cc',
        lessons: 0,
        resources: 0,
        students: 0  // <-- ADD THIS
    }
};

// ===== API CONFIGURATION =====
const API_BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Teacher Dashboard loading...');
    
    // Check authentication
    checkTeacherAuth();
    
    // Initialize components
    initializeEventListeners();
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // Load teacher data
    loadDashboardData();
    
    // Set default active section
    showDashboard();

    // ===== ADD THESE LINES =====
    // Initialize empty arrays kung sakaling undefined
    if (typeof teacherModules === 'undefined') teacherModules = [];
    if (typeof teacherTopics === 'undefined') teacherTopics = [];

    // ===== ADD THIS =====
    // Pre-load modules and topics
    setTimeout(() => {
        loadTeacherModules();
        loadTeacherTopics();
    }, 1000);
    
    console.log('✅ Teacher Dashboard initialized');
});

// ===== CORRECTED: CHECK TEACHER AUTHENTICATION USING TEACHERS TABLE =====
// ===== CORRECTED: CHECK TEACHER AUTHENTICATION USING TEACHERS TABLE =====
function checkTeacherAuth() {
    const token = localStorage.getItem('authToken');
    const userJson = localStorage.getItem('mathhub_user');
    
    if (!token || !userJson) {
        console.log('❌ No user logged in');
        showNotification('error', 'Not Logged In', 'Please login first');
        
        setTimeout(() => {
            window.location.href = '../index.html#login';  // ← GAMITIN ITO
        }, 2000);
        return false;
    }
    
    try {
        const user = JSON.parse(userJson);
        
        if (user.role !== 'teacher' && user.role !== 'admin') {
            console.log('❌ User is not a teacher');
            showNotification('error', 'Access Denied', 'Teacher access required');
            
            setTimeout(() => {
                window.location.href = '../index.html#dashboard';  // ← GAMITIN ITO
            }, 2000);
            return false;
        }
        
        // Store basic user info
        teacherId = user.id;
        teacherName = user.full_name || user.username || 'Teacher';
        authToken = token;
        
        console.log(`✅ Teacher authenticated: ${teacherName} (ID: ${teacherId})`);
        
        // Fetch additional teacher details from teachers table
        fetchTeacherDetails(teacherId);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error parsing user data:', error);
        return false;
    }
}

// ===== FETCH TEACHER DETAILS FROM TEACHERS TABLE =====
async function fetchTeacherDetails(teacherId) {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teachers/${teacherId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.teacher) {
            // Store teacher details in global state
            window.teacherDetails = result.teacher;
            
            console.log('✅ Teacher details loaded:', result.teacher);
            
            // Update UI with teacher details
            updateTeacherProfileUI(result.teacher);
        }
        
    } catch (error) {
        console.error('❌ Error fetching teacher details:', error);
    }
}

// ===== UPDATE TEACHER PROFILE UI =====
function updateTeacherProfileUI(teacher) {
    // Update profile section
    const departmentEl = document.getElementById('teacherDepartment');
    if (departmentEl) departmentEl.textContent = teacher.department || 'Mathematics';
    
    const qualificationEl = document.getElementById('teacherQualification');
    if (qualificationEl) qualificationEl.textContent = teacher.qualification || 'Licensed Professional Teacher';
    
    const experienceEl = document.getElementById('teacherExperience');
    if (experienceEl) experienceEl.textContent = teacher.years_experience + ' years';
    
    const ratingEl = document.getElementById('teacherRating');
    if (ratingEl) ratingEl.textContent = teacher.rating + ' / 5.0';
    
    const studentsEl = document.getElementById('teacherTotalStudents');
    if (studentsEl) studentsEl.textContent = teacher.total_students;
    
    const lessonsEl = document.getElementById('teacherTotalLessons');
    if (lessonsEl) lessonsEl.textContent = teacher.total_lessons;
    
    const bioEl = document.getElementById('teacherBio');
    if (bioEl) bioEl.textContent = teacher.bio || 'No bio available';
}

// ===== INITIALIZE EVENT LISTENERS =====
function initializeEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Footer hamburger menu
    const hamburger = document.getElementById('footerHamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const overlay = document.getElementById('mobileMenuOverlay');
    
    if (hamburger) {
        hamburger.addEventListener('click', openMobileMenu);
    }
    
    if (closeMenuBtn) {
        closeMenuBtn.addEventListener('click', closeMobileMenu);
    }
    
    if (overlay) {
        overlay.addEventListener('click', closeMobileMenu);
    }
    
    // Search inputs
    const searchStudents = document.getElementById('searchStudentsInput');
    if (searchStudents) {
        searchStudents.addEventListener('input', function() {
            filterStudents(this.value);
        });
    }
    
    const searchAssignments = document.getElementById('searchAssignmentsInput');
    if (searchAssignments) {
        searchAssignments.addEventListener('input', function() {
            filterAssignments(this.value);
        });
    }
    
    const searchQuizzes = document.getElementById('searchQuizzesInput');
    if (searchQuizzes) {
        searchQuizzes.addEventListener('input', function() {
            filterQuizzes(this.value);
        });
    }
    
    const searchPractice = document.getElementById('searchPracticeInput');
    if (searchPractice) {
        searchPractice.addEventListener('input', function() {
            filterPractice(this.value);
        });
    }
    
    // Time range select
    const timeRangeSelect = document.getElementById('timeRangeSelect');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', function() {
            loadDashboardData();
        });
    }
    
    // Performance time range
    const performanceTimeRange = document.getElementById('performanceTimeRange');
    if (performanceTimeRange) {
        performanceTimeRange.addEventListener('change', function() {
            if (typeof loadPerformanceTrendData === 'function') {
                loadPerformanceTrendData();
            }
        });
    }
    
    // Score distribution filter
    const scoreFilter = document.getElementById('scoreDistributionFilter');
    if (scoreFilter) {
        scoreFilter.addEventListener('change', function() {
            if (typeof loadScoreDistributionData === 'function') {
                loadScoreDistributionData();
            }
        });
    }
    
    // Top performers filter
    const topPerformersFilter = document.getElementById('topPerformersFilter');
    if (topPerformersFilter) {
        topPerformersFilter.addEventListener('change', function() {
            filterTopPerformers();
        });
    }
    
    // Assignment status filter
    const assignmentFilter = document.getElementById('assignmentStatusFilter');
    if (assignmentFilter) {
        assignmentFilter.addEventListener('change', function() {
            filterAssignmentsByStatus();
        });
    }
    
    // Quiz status filter
    const quizFilter = document.getElementById('quizStatusFilter');
    if (quizFilter) {
        quizFilter.addEventListener('change', function() {
            filterQuizzesByStatus();
        });
    }
    
    // Practice type filter
    const practiceFilter = document.getElementById('practiceTypeFilter');
    if (practiceFilter) {
        practiceFilter.addEventListener('change', function() {
            filterPracticeByType();
        });
    }

   // Sa loob ng initializeEventListeners function, idagdag ito:
document.addEventListener('change', function(e) {
    if (e.target.id === 'resourceFile') {
        const fileName = e.target.files[0]?.name || '';
        const fileNameEl = document.getElementById('resourceFileName');
        if (fileNameEl) {
            fileNameEl.textContent = fileName;
        }
    }
});
    
    // Feedback filter
    const feedbackFilter = document.getElementById('feedbackFilter');
    if (feedbackFilter) {
        feedbackFilter.addEventListener('change', function() {
            filterFeedback();
        });
    }
    
    // Close modals on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================


function showPerformanceDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('performanceDashboardSection');
    updatePageTitle('<i class="fas fa-chart-line"></i> Student Performance', 'Student Performance');
    updateActiveNav('performance');
    
    // Load performance data
    setTimeout(() => {
        loadPerformanceData();
    }, 100);
}


function showAssignmentsDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('assignmentsDashboardSection');
    updatePageTitle('<i class="fas fa-tasks"></i> Assignments & Grading', 'Assignments & Grading');
    updateActiveNav('assignments');
    
    // Load assignments
    setTimeout(() => {
        loadAssignments();
    }, 100);
}

function showProfileDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('profileDashboardSection');
    updatePageTitle('<i class="fas fa-user-circle"></i> My Profile', 'My Profile');
    updateActiveNav('profile');
    
    // Load profile data
    setTimeout(() => {
        loadProfileData();
    }, 100);
}


function showQuizDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('quizDashboardSection');
    updatePageTitle('<i class="fas fa-question-circle"></i> Quiz Management', 'Quiz Management');
    updateActiveNav('quiz');
    
    // Load quizzes
    setTimeout(() => {
        loadQuizzes();
    }, 100);
}

// ===== REFRESH ALL DASHBOARD DATA =====
async function refreshAllData() {
    console.log("🔄 Force refreshing all dashboard data...");
    
    // Clear all caches
    window.cachedDashboardData = null;
    window.cachedRecentLessons = null;
    teacherFeedbackData = [];
    myStudents = [];
    myLessons = [];
    lessonData = [];
    quizData = [];
    practiceData = [];
    
    // Show loading indicators
    showNotification('info', 'Refreshing', 'Updating all dashboard data...');
    
    // Reload all data
    await loadDashboardData(true); // force refresh
    await loadTeacherFeedback(true); // force refresh
    
    showNotification('success', 'Refreshed', 'All dashboard data updated');
}

// Add refresh button to HTML if not present
// You can add this to your teacher header

// ===== UPDATE SHOW PRACTICE DASHBOARD =====
function showPracticeDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('practiceDashboardSection');
    updatePageTitle('<i class="fas fa-dumbbell"></i> Practice Materials', 'Practice Materials');
    updateActiveNav('practice');
    
    // Load practice data
    setTimeout(() => {
        loadPracticeMaterials();
    }, 100);
}

function showSettingsDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('settingsDashboardSection');
    updatePageTitle('<i class="fas fa-cog"></i> Settings', 'Settings');
    updateActiveNav('settings');
    
    // Open default tab
    setTimeout(() => {
        openSettingsTab('accountTab');
    }, 100);
}

function setActiveSection(sectionId) {
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.add('active');
            section.style.display = 'block';
        } else {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });
}

function updatePageTitle(html, text) {
    const pageTitle = document.getElementById('pageTitle');
    const navTitle = document.getElementById('navTitle');
    
    if (pageTitle) pageTitle.innerHTML = html;
    if (navTitle) navTitle.textContent = text;
}

// ===== UPDATE ACTIVE NAVIGATION (COMPLETELY FIXED) =====
function updateActiveNav(activeItem) {
    console.log(`🔍 Updating active nav: ${activeItem}`);
    
    // ===== FOOTER NAVIGATION =====
    const footerItems = document.querySelectorAll('.footer-nav-item');
    
    // Remove active class from all footer items FIRST
    footerItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Then add active class to the correct one based on activeItem
    footerItems.forEach(item => {
        const span = item.querySelector('span');
        if (!span) return;
        
        const text = span.textContent.toLowerCase().trim();
        console.log(`Checking footer: "${text}" against "${activeItem}"`);
        
        // Check each case separately para sigurado
        if (activeItem === 'dashboard' && text === 'dashboard') {
            item.classList.add('active');
            console.log('✅ Dashboard activated');
        }
        else if (activeItem === 'lessons' && text === 'lessons') {
            item.classList.add('active');
            console.log('✅ Lessons activated');
        }
        else if (activeItem === 'quiz' && text === 'quizzes') {
            item.classList.add('active');
            console.log('✅ Quizzes activated');
        }
        else if (activeItem === 'profile' && text === 'profile') {
            item.classList.add('active');
            console.log('✅ Profile activated');
        }
    });
    
    // ===== MOBILE MENU =====
    const mobileItems = document.querySelectorAll('.mobile-menu-item');
    
    // Remove active class from all mobile items FIRST
    mobileItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Then add active class to the correct one
    mobileItems.forEach(item => {
        const span = item.querySelector('span');
        if (!span) return;
        
        const text = span.textContent.toLowerCase().trim();
        
        if (activeItem === 'dashboard' && text.includes('dashboard')) {
            item.classList.add('active');
        }
        else if (activeItem === 'lessons' && text.includes('lessons')) {
            item.classList.add('active');
        }
        else if (activeItem === 'feedback' && text.includes('feedback')) {
            item.classList.add('active');
        }
        else if (activeItem === 'quiz' && text.includes('quizzes')) {
            item.classList.add('active');
        }
        else if (activeItem === 'practice' && text.includes('practice')) {
            item.classList.add('active');
        }
        else if (activeItem === 'settings' && text.includes('settings')) {
            item.classList.add('active');
        }
        else if (activeItem === 'profile' && text.includes('profile')) {
            item.classList.add('active');
        }
    });
}

// Global variable para sa current feedback ID
    let currentFeedbackId = null;
    
    // Functions para sa modals
    function closeFeedbackReplyModal() {
        document.getElementById('feedbackReplyModal').style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    // ===== CLOSE FEEDBACK DETAIL MODAL =====
function closeFeedbackDetailModal() {
    const modal = document.getElementById('feedbackDetailModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Check if there are other modals open
        const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => 
            m.style.display === 'flex' || m.classList.contains('show')
        );
        
        if (!anyModalOpen) {
            document.body.classList.remove('modal-open');
        }
    }
}
    
    // ===== REPLY TO CURRENT FEEDBACK =====
function replyToCurrentFeedback() {
    closeFeedbackDetailModal();
    if (currentFeedbackId) {
        replyToFeedback(currentFeedbackId);
    }
}
    
    // ===== MARK CURRENT FEEDBACK RESOLVED =====
function markCurrentFeedbackResolved() {
    closeFeedbackDetailModal();
    if (currentFeedbackId) {
        markFeedbackResolved(currentFeedbackId);
    }
}
    
    // Quick response function
    function insertQuickResponse(text) {
        const textarea = document.getElementById('feedbackResponse');
        if (textarea) {
            textarea.value = textarea.value + (textarea.value ? '\n' : '') + text;
        }
    }



// ===== SHOW LESSON DASHBOARD (WITH SCROLL TO TOP) =====
function showLessonDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("📚 Showing lesson dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('lessonDashboardSection');
    updatePageTitle('<i class="fas fa-book-open"></i> Lesson Management', 'Lesson Management');
    updateActiveNav('lessons');
    
    // Use cached lesson data
    if (lessonData && lessonData.length > 0) {
        console.log(`📚 Using cached lesson data (${lessonData.length} items)`);
        displayLessonsGrid();
    } else {
        loadLessonData();
    }
}

// ===== SHOW FEEDBACK DASHBOARD (WITH SCROLL TO TOP) =====
function showFeedbackDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("💬 Showing feedback dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('feedbackDashboardSection');
    updatePageTitle('<i class="fas fa-comment-dots"></i> Feedback & Reviews', 'Feedback & Reviews');
    updateActiveNav('feedback');
    
    // Use cached feedback data
    if (teacherFeedbackData && teacherFeedbackData.length > 0) {
        console.log(`💬 Using cached feedback data (${teacherFeedbackData.length} items)`);
        displayTeacherFeedback(teacherFeedbackData);
        updateFeedbackStats(teacherFeedbackData);
    } else {
        setTimeout(() => {
            loadTeacherFeedback();
        }, 100);
    }
}

// ===== SHOW QUIZ DASHBOARD (WITH SCROLL TO TOP) =====
function showQuizDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("📝 Showing quiz dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('quizDashboardSection');
    updatePageTitle('<i class="fas fa-question-circle"></i> Quiz Management', 'Quiz Management');
    updateActiveNav('quiz');
    
    // Load quizzes
    setTimeout(() => {
        loadQuizzes();
    }, 100);
}

// ===== SHOW PRACTICE DASHBOARD (WITH SCROLL TO TOP) =====
function showPracticeDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("💪 Showing practice dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('practiceDashboardSection');
    updatePageTitle('<i class="fas fa-dumbbell"></i> Practice Materials', 'Practice Materials');
    updateActiveNav('practice');
    
    // Load practice data
    setTimeout(() => {
        loadPracticeMaterials();
    }, 100);
}

// ===== SHOW PROFILE DASHBOARD (WITH SCROLL TO TOP) =====
function showProfileDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("👤 Showing profile dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('profileDashboardSection');
    updatePageTitle('<i class="fas fa-user-circle"></i> My Profile', 'My Profile');
    updateActiveNav('profile');
    
    // Load profile data
    setTimeout(() => {
        loadProfileData();
    }, 100);
}

// ===== SHOW SETTINGS DASHBOARD (WITH SCROLL TO TOP) =====
function showSettingsDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("⚙️ Showing settings dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('settingsDashboardSection');
    updatePageTitle('<i class="fas fa-cog"></i> Settings', 'Settings');
    updateActiveNav('settings');
    
    // Load settings data
    setTimeout(() => {
        loadSettingsData();
        openSettingsTab('accountTab');
    }, 100);
}

// ===== SHOW PERFORMANCE DASHBOARD (WITH SCROLL TO TOP) =====
function showPerformanceDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("📈 Showing performance dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('performanceDashboardSection');
    updatePageTitle('<i class="fas fa-chart-line"></i> Student Performance', 'Student Performance');
    updateActiveNav('performance');
    
    // Load performance data
    setTimeout(() => {
        loadPerformanceData();
    }, 100);
}

// ===== SHOW ASSIGNMENTS DASHBOARD (WITH SCROLL TO TOP) =====
function showAssignmentsDashboard(e) {
    if (e) e.preventDefault();
    
    console.log("📋 Showing assignments dashboard");
    
    // ===== SCROLL TO TOP =====
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    closeMobileMenu();
    setActiveSection('assignmentsDashboardSection');
    updatePageTitle('<i class="fas fa-tasks"></i> Assignments & Grading', 'Assignments & Grading');
    updateActiveNav('assignments');
    
    // Load assignments
    setTimeout(() => {
        loadAssignments();
    }, 100);
}

// ============================================
// MOBILE MENU FUNCTIONS
// ============================================

function openMobileMenu() {
    const panel = document.getElementById('mobileMenuPanel');
    const overlay = document.getElementById('mobileMenuOverlay');
    
    if (panel && overlay) {
        panel.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('menu-open');
    }
}

function closeMobileMenu() {
    const panel = document.getElementById('mobileMenuPanel');
    const overlay = document.getElementById('mobileMenuOverlay');
    
    if (panel && overlay) {
        panel.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('menu-open');
    }
}

// ============================================
// DASHBOARD DATA LOADING
// ============================================

// ===== LOAD DASHBOARD DATA (WITH CACHE) =====
async function loadDashboardData(forceRefresh = false) {
    console.log('📊 Loading dashboard data from database...');
    
    // Check kung may cached data na at hindi force refresh
    if (!forceRefresh && window.cachedDashboardData) {
        console.log('📊 Using cached dashboard data');
        applyDashboardData(window.cachedDashboardData);
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        // Show loading states
        animateNumber('totalLessons', 0);
        animateNumber('totalStudents', 0);
        animateNumber('avgGrade', '0%');
        animateNumber('pendingReviews', 0);
        
        // ===== FETCH DASHBOARD STATS =====
        const response = await fetch(`${API_BASE_URL}/teacher/dashboard/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const dashboardData = {};
        
        if (result.success) {
            const stats = result.stats;
            dashboardData.stats = stats;
            
            // Update main stats cards
            animateNumber('totalLessons', stats.total_lessons || 0);
            animateNumber('totalStudents', stats.total_students || 0);
            animateNumber('avgGrade', (stats.avg_grade || 0) + '%');
            animateNumber('pendingReviews', stats.pending_reviews || 0);
            
            // Update lesson stats
            const publishedEl = document.getElementById('publishedLessons');
            const draftEl = document.getElementById('draftLessons');
            const avgCompletionEl = document.getElementById('avgCompletion');
            
            if (publishedEl) publishedEl.textContent = stats.published || 0;
            if (draftEl) draftEl.textContent = stats.draft || 0;
            if (avgCompletionEl) avgCompletionEl.textContent = (stats.avg_completion || 0) + '%';
            
            console.log('✅ Dashboard stats updated:', stats);
        }
        
        // ===== LOAD STUDENTS =====
        console.log('📥 Loading students...');
        await loadMyStudents(forceRefresh);
        dashboardData.students = myStudents;
        
        // ===== LOAD LESSONS =====
        console.log('📥 Loading lessons...');
        await loadMyLessons(forceRefresh);
        dashboardData.lessons = myLessons;
        
        // ===== LOAD RECENT LESSONS =====
        await loadRecentLessons(forceRefresh);
        
        // ===== SAVE TO CACHE =====
        window.cachedDashboardData = dashboardData;
        
        // ===== FINAL UPDATE =====
        updateSidebarStats();
        updateActiveSubject();
        
        console.log('✅ All dashboard data cached');
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        showNotification('error', 'Dashboard Error', 'Could not load dashboard data');
    }
}

// ===== HELPER: NAVIGATE TO SECTION WITH SCROLL =====
function navigateToSection(sectionId, title, navItem, callback) {
    console.log(`🧭 Navigating to ${sectionId}`);
    
    // Scroll to top
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // Close mobile menu
    closeMobileMenu();
    
    // Set active section
    setActiveSection(sectionId);
    
    // Update title
    if (typeof title === 'string') {
        updatePageTitle(title, title.replace(/<[^>]*>/g, ''));
    } else if (title.html && title.text) {
        updatePageTitle(title.html, title.text);
    }
    
    // Update active nav
    updateActiveNav(navItem);
    
    // Execute callback
    if (callback && typeof callback === 'function') {
        setTimeout(callback, 100);
    }
}

// Gamitin ang helper:
function showDashboard(e) {
    if (e) e.preventDefault();
    navigateToSection(
        'dashboardSection', 
        '<i class="fas fa-chart-pie"></i> Teacher Dashboard', 
        'dashboard',
        () => {
            if (window.cachedDashboardData) {
                applyDashboardData(window.cachedDashboardData);
            } else {
                loadDashboardData();
            }
        }
    );
}


function showFeedbackDashboard(e) {
    if (e) e.preventDefault();
    navigateToSection(
        'feedbackDashboardSection',
        '<i class="fas fa-comment-dots"></i> Feedback & Reviews',
        'feedback',
        () => {
            if (teacherFeedbackData && teacherFeedbackData.length > 0) {
                displayTeacherFeedback(teacherFeedbackData);
                updateFeedbackStats(teacherFeedbackData);
            } else {
                loadTeacherFeedback();
            }
        }
    );
}

// Helper function to apply dashboard data
function applyDashboardData(data) {
    if (!data) return;
    
    if (data.stats) {
        animateNumber('totalLessons', data.stats.total_lessons || 0);
        animateNumber('totalStudents', data.stats.total_students || 0);
        animateNumber('avgGrade', (data.stats.avg_grade || 0) + '%');
        animateNumber('pendingReviews', data.stats.pending_reviews || 0);
        
        const publishedEl = document.getElementById('publishedLessons');
        const draftEl = document.getElementById('draftLessons');
        const avgCompletionEl = document.getElementById('avgCompletion');
        
        if (publishedEl) publishedEl.textContent = data.stats.published || 0;
        if (draftEl) draftEl.textContent = data.stats.draft || 0;
        if (avgCompletionEl) avgCompletionEl.textContent = (data.stats.avg_completion || 0) + '%';
    }
    
    // Update other UI elements
    updateSidebarStats();
    updateActiveSubject();
}

// Sa teacher-dashboard.js, palitan ang tawag sa quick stats
async function loadQuickStats() {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/quick-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            
            // Update UI elements
            document.getElementById('totalLessons').textContent = stats.totalLessons;
            document.getElementById('totalStudents').textContent = stats.totalStudents;
            document.getElementById('totalResources').textContent = stats.totalResources;
            
            console.log('✅ Teacher quick stats loaded:', stats);
        }
        
    } catch (error) {
        console.error('❌ Error loading teacher quick stats:', error);
    }
}

// ===== LOAD MY STUDENTS (WITH CACHE) =====
async function loadMyStudents(forceRefresh = false) {
    console.log('========== LOAD MY STUDENTS ==========');
    
    // Check cache
    if (!forceRefresh && myStudents && myStudents.length > 0) {
        console.log(`✅ Using cached students: ${myStudents.length} students`);
        displayStudentsList(myStudents);
        return myStudents;
    }
    
    const studentsContainer = document.getElementById('myStudentsList');
    if (!studentsContainer) return;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
            const students = result.students || [];
            myStudents = students;
            
            console.log(`✅ Students loaded and cached: ${students.length}`);
            
            // Update subject counts
            if (result.subject_counts) {
                subjectData.polynomial.students = result.subject_counts.polynomial || 0;
                subjectData.factorial.students = result.subject_counts.factorial || 0;
                subjectData.mdas.students = result.subject_counts.mdas || 0;
            }
            
            // Display students
            displayStudentsList(students);
            
            return students;
        }
        
    } catch (error) {
        console.error('❌ Error loading students:', error);
        studentsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load students</p>
            </div>
        `;
    }
}

// Helper function to display students
function displayStudentsList(students) {
    const studentsContainer = document.getElementById('myStudentsList');
    if (!studentsContainer) return;
    
    if (students.length === 0) {
        studentsContainer.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-user-graduate"></i>
                <p>No students yet</p>
                <small>Students will appear here once they complete your lessons</small>
            </div>
        `;
        return;
    }
    
    const recentStudents = students.slice(0, 5);
    studentsContainer.innerHTML = '';
    
    recentStudents.forEach(student => {
        const studentItem = document.createElement('div');
        studentItem.className = 'student-item';
        studentItem.innerHTML = `
            <div class="student-avatar" style="background: ${getAvatarColor(student.name)}">
                ${student.avatar || getInitials(student.name)}
            </div>
            <div class="student-info">
                <h4>${student.name}</h4>
                <div class="student-meta">
                    <span><i class="fas fa-book"></i> ${student.lessons_completed} lessons</span>
                    <span><i class="fas fa-star"></i> ${student.avg_score}% avg</span>
                </div>
            </div>
            <span class="student-time">${student.last_active}</span>
        `;
        studentsContainer.appendChild(studentItem);
    });
}

// ===== LOAD TEACHER FEEDBACK (UPDATED) =====
async function loadTeacherFeedback() {
    console.log('💬 Loading teacher feedback...');
    
    const feedbackList = document.getElementById('feedbackList');
    const statsContainer = document.getElementById('feedbackStats');
    
    if (!feedbackList) return;
    
    // Check kung may naka-save na feedback data
    if (teacherFeedbackData && teacherFeedbackData.length > 0) {
        console.log(`📊 Using cached feedback data (${teacherFeedbackData.length} items)`);
        displayTeacherFeedback(teacherFeedbackData);
        updateFeedbackStats(teacherFeedbackData);
        return;
    }
    
    feedbackList.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-pulse fa-2x"></i>
            <p>Loading feedback...</p>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/my-feedback`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            // ===== SAVE TO GLOBAL VARIABLE =====
            teacherFeedbackData = result.feedback || [];
            console.log(`✅ Saved ${teacherFeedbackData.length} feedback items to cache`);
            
            displayTeacherFeedback(teacherFeedbackData);
            updateFeedbackStats(teacherFeedbackData);
        } else {
            throw new Error(result.message || 'Failed to load feedback');
        }
        
    } catch (error) {
        console.error('❌ Error loading feedback:', error);
        feedbackList.innerHTML = `
            <div class="error-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load feedback</p>
                <button class="btn btn-sm btn-primary" onclick="loadTeacherFeedback()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== DISPLAY TEACHER FEEDBACK (UPDATED WITH CONSISTENT STRUCTURE) =====
function displayTeacherFeedback(feedback) {
    const feedbackList = document.getElementById('feedbackList');
    
    if (!feedbackList) return;
    
    if (!feedback || feedback.length === 0) {
        feedbackList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-comment-slash fa-3x"></i>
                <h4 class="mobile-font-small">No Feedback Yet</h4>
                <p class="mobile-font-smaller">When students leave feedback, it will appear here</p>
            </div>
        `;
        return;
    }
    
    feedbackList.innerHTML = '';
    
    feedback.forEach(item => {
        // Generate star rating
        const stars = generateStarRating(item.rating);
        
        // Get type info
        const typeInfo = getFeedbackTypeInfo(item.type);
        
        // Get status class
        const statusClass = item.status || 'new';
        
        // ===== FIXED: Get student name from multiple possible locations =====
        let studentName = 'Anonymous';
        let studentAvatar = 'U';
        
        // Check different possible structures
        if (item.student && item.student.name) {
            // Structure: { student: { name: "John" } }
            studentName = item.student.name;
            studentAvatar = item.student.avatar || getInitials(item.student.name);
        } else if (item.student_name) {
            // Structure: { student_name: "John" }
            studentName = item.student_name;
            studentAvatar = getInitials(item.student_name);
        } else if (item.user_name) {
            // Structure: { user_name: "John" }
            studentName = item.user_name;
            studentAvatar = getInitials(item.user_name);
        } else if (item.name) {
            // Structure: { name: "John" }
            studentName = item.name;
            studentAvatar = getInitials(item.name);
        }
        
        // ===== FIXED: Get lesson title =====
        let lessonTitle = null;
        if (item.lesson && item.lesson.title) {
            lessonTitle = item.lesson.title;
        } else if (item.lesson_title) {
            lessonTitle = item.lesson_title;
        }
        
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item ${statusClass}`;
        feedbackItem.dataset.id = item.id;
        
        feedbackItem.innerHTML = `
            <div class="feedback-header">
                <div class="student-info">
                    <div class="student-avatar" style="background: ${getAvatarColor(studentName)}">
                        ${studentAvatar}
                    </div>
                    <div>
                        <h4 class="mobile-font-small">${studentName}</h4>
                        <span class="feedback-time">${item.time_ago || 'Recently'}</span>
                    </div>
                </div>
                <div class="feedback-status">
                    <span class="badge badge-${statusClass}">${statusClass.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="feedback-content">
                <div class="feedback-type">
                    <i class="fas ${typeInfo.icon}" style="color: ${typeInfo.color}"></i>
                    <span class="mobile-font-smaller">${typeInfo.label}</span>
                    ${item.rating ? `<span class="feedback-rating">${stars}</span>` : ''}
                </div>
                <p class="feedback-message mobile-font-smaller">${item.message || 'No message'}</p>
                ${lessonTitle ? `
                    <div class="feedback-lesson">
                        <i class="fas fa-book-open"></i>
                        <span class="mobile-font-smaller">Lesson: ${lessonTitle}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="feedback-actions">
                <button class="btn btn-sm btn-outline" onclick="viewFeedbackDetails(${item.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-primary" onclick="replyToFeedback(${item.id})">
                    <i class="fas fa-reply"></i> Reply
                </button>
                ${item.status === 'new' ? `
                    <button class="btn btn-sm btn-success" onclick="markFeedbackResolved(${item.id})">
                        <i class="fas fa-check-circle"></i> Mark Resolved
                    </button>
                ` : ''}
            </div>
        `;
        
        feedbackList.appendChild(feedbackItem);
    });
    
    // Update stats
    updateFeedbackStats(feedback);
}

// ===== GET FEEDBACK TYPE INFO =====
function getFeedbackTypeInfo(type) {
    const types = {
        'suggestion': { 
            icon: 'fa-lightbulb', 
            color: '#FFC107', 
            label: 'Suggestion' 
        },
        'bug': { 
            icon: 'fa-bug', 
            color: '#f44336', 
            label: 'Bug Report' 
        },
        'praise': { 
            icon: 'fa-heart', 
            color: '#4CAF50', 
            label: 'Praise' 
        },
        'question': { 
            icon: 'fa-question-circle', 
            color: '#2196F3', 
            label: 'Question' 
        },
        'complaint': { 
            icon: 'fa-exclamation-triangle', 
            color: '#FF9800', 
            label: 'Complaint' 
        },
        'rating': { 
            icon: 'fa-star', 
            color: '#9C27B0', 
            label: 'Rating' 
        },
        'other': { 
            icon: 'fa-comment', 
            color: '#9E9E9E', 
            label: 'Feedback' 
        }
    };
    
    return types[type] || types.other;
}

// ===== UPDATE FEEDBACK STATS =====
function updateFeedbackStats(feedback) {
    const statsContainer = document.getElementById('feedbackStats');
    if (!statsContainer) return;
    
    const total = feedback.length;
    const newCount = feedback.filter(f => f.status === 'new').length;
    const resolved = feedback.filter(f => f.status === 'resolved').length;
    
    const avgRating = feedback.filter(f => f.rating > 0)
        .reduce((sum, f) => sum + f.rating, 0) / 
        (feedback.filter(f => f.rating > 0).length || 1);
    
    statsContainer.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Total Feedback</span>
            <span class="stat-value">${total}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Pending</span>
            <span class="stat-value">${newCount}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Resolved</span>
            <span class="stat-value">${resolved}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Avg Rating</span>
            <span class="stat-value">${avgRating.toFixed(1)} ★</span>
        </div>
    `;
}

// ===== MARK FEEDBACK AS RESOLVED (UPDATED) =====
async function markFeedbackResolved(feedbackId) {
    if (!confirm('Mark this feedback as resolved?')) return;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/feedback/${feedbackId}/resolve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Success', 'Feedback marked as resolved');
            
            // ===== UPDATE LOCAL CACHE =====
            // Update the status in the cached data
            const feedbackIndex = teacherFeedbackData.findIndex(f => f.id === feedbackId);
            if (feedbackIndex !== -1) {
                teacherFeedbackData[feedbackIndex].status = 'resolved';
            }
            
            // Refresh the display with updated cache
            displayTeacherFeedback(teacherFeedbackData);
            updateFeedbackStats(teacherFeedbackData);
            
            // Update dashboard stats
            loadDashboardData();
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== VIEW FEEDBACK DETAILS (FROM DATABASE) =====
async function viewFeedbackDetails(feedbackId) {
    console.log(`🔍 Fetching feedback details from database for ID: ${feedbackId}`);
    
    // Show loading state sa modal
    const modal = document.getElementById('feedbackDetailModal');
    const container = document.getElementById('feedbackDetailContainer');
    
    if (!modal || !container) {
        console.error("❌ Feedback detail modal or container not found");
        showNotification('error', 'Error', 'Modal not found');
        return;
    }
    
    // Show loading
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: var(--primary);"></i>
            <p style="margin-top: 20px;">Loading feedback details...</p>
        </div>
    `;
    
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    try {
        const token = localStorage.getItem('authToken');
        
        // Fetch feedback details from server
        const response = await fetch(`${API_BASE_URL}/teacher/feedback/${feedbackId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const feedback = result.feedback;
            
            // Set current feedback ID for reply/resolve buttons
            currentFeedbackId = feedbackId;
            
            // Generate star rating
            const stars = generateStarRating(feedback.rating);
            
            // Get type info
            const typeInfo = getFeedbackTypeInfo(feedback.type);
            
            // Format date
            const feedbackDate = feedback.created_at ? new Date(feedback.created_at).toLocaleString() : 'Unknown date';
            
            // Get status class
            const statusClass = feedback.status || 'new';
            const statusText = (feedback.status || 'new').toUpperCase();
            
            // Create HTML content with real data from database
            container.innerHTML = `
                <div class="feedback-detail">
                    <!-- Student Info Header -->
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--border-color);">
                        <div class="student-avatar large" style="width: 60px; height: 60px; border-radius: 50%; background: ${getAvatarColor(feedback.student_name)}; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            ${getInitials(feedback.student_name || 'U')}
                        </div>
                        <div>
                            <h3 style="margin: 0 0 5px 0; color: var(--primary);">${feedback.student_name || 'Anonymous Student'}</h3>
                            <p style="margin: 0; color: var(--medium-gray); font-size: 0.9rem;">
                                <i class="fas fa-envelope"></i> ${feedback.student_email || 'No email provided'}
                            </p>
                            <p style="margin: 5px 0 0 0; color: var(--medium-gray); font-size: 0.8rem;">
                                <i class="fas fa-clock"></i> ${feedbackDate}
                            </p>
                        </div>
                    </div>
                    
                    <!-- Feedback Type, Rating, Status Badges -->
                    <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                        <div style="background: var(--light-bg); padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas ${typeInfo.icon}" style="color: ${typeInfo.color};"></i>
                            <span style="font-weight: 500;">${typeInfo.label}</span>
                        </div>
                        
                        ${feedback.rating ? `
                            <div style="background: var(--light-bg); padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-star" style="color: #FFD700;"></i>
                                <span style="font-weight: 500;">${stars} (${feedback.rating}/5)</span>
                            </div>
                        ` : ''}
                        
                        <div style="background: var(--light-bg); padding: 8px 15px; border-radius: 20px; display: flex; align-items: center; gap: 5px;">
                            <span class="badge badge-${statusClass}">${statusText}</span>
                        </div>
                    </div>
                    
                    <!-- Related Lesson (if any) -->
                    ${feedback.lesson_title ? `
                        <div style="background: var(--light-bg); padding: 12px 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                            <i class="fas fa-book-open" style="color: var(--primary);"></i>
                            <span><strong>Related Lesson:</strong> ${feedback.lesson_title}</span>
                        </div>
                    ` : ''}
                    
                    <!-- Original Feedback Message -->
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 8px 0; color: var(--primary);">Feedback Message:</h4>
                        <div style="background: var(--light-bg); padding: 20px; border-radius: 8px; border-left: 4px solid var(--primary);">
                            <p style="margin: 0; line-height: 1.6; white-space: pre-wrap; font-size: 1rem;">${feedback.message || 'No message provided'}</p>
                        </div>
                    </div>
                    
                    <!-- Admin/Teacher Response (if any) -->
                    ${feedback.admin_response ? `
                        <div style="margin-bottom: 20px;">
                            <h4 style="margin: 0 0 8px 0; color: var(--success);">Your Response:</h4>
                            <div style="background: rgba(76, 175, 80, 0.1); padding: 20px; border-radius: 8px; border-left: 4px solid var(--success);">
                                <p style="margin: 0; line-height: 1.6;">${feedback.admin_response}</p>
                                ${feedback.responded_at ? `
                                    <p style="margin: 10px 0 0 0; color: var(--medium-gray); font-size: 0.8rem;">
                                        <i class="fas fa-clock"></i> Responded on: ${new Date(feedback.responded_at).toLocaleString()}
                                    </p>
                                ` : ''}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Metadata -->
                    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color); font-size: 0.8rem; color: var(--medium-gray);">
                        <p><i class="fas fa-id-card"></i> Feedback ID: ${feedback.id}</p>
                        ${feedback.ip_address ? `<p><i class="fas fa-network-wired"></i> IP Address: ${feedback.ip_address}</p>` : ''}
                        ${feedback.user_agent ? `<p><i class="fas fa-globe"></i> Browser: ${feedback.user_agent.substring(0, 50)}...</p>` : ''}
                    </div>
                </div>
            `;
            
            // Update modal footer buttons based on status
            const replyBtn = document.getElementById('detailReplyBtn');
            const resolveBtn = document.getElementById('detailResolveBtn');
            
            if (replyBtn) {
                replyBtn.onclick = function() {
                    replyToCurrentFeedback();
                };
            }
            
            if (resolveBtn) {
                if (feedback.status === 'new') {
                    resolveBtn.style.display = 'inline-flex';
                    resolveBtn.onclick = function() {
                        markCurrentFeedbackResolved();
                    };
                } else {
                    resolveBtn.style.display = 'none';
                }
            }
            
        } else {
            throw new Error(result.message || 'Failed to load feedback details');
        }
        
    } catch (error) {
        console.error('❌ Error loading feedback details:', error);
        
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color: #dc3545;"></i>
                <h4 style="margin-top: 20px;">Failed to Load Feedback</h4>
                <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
                <button class="btn btn-primary" onclick="viewFeedbackDetails(${feedbackId})">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== GENERATE STAR RATING =====
function generateStarRating(rating) {
    if (!rating) return '';
    const fullStars = '★'.repeat(rating);
    const emptyStars = '☆'.repeat(5 - rating);
    return `<span class="stars">${fullStars}${emptyStars}</span>`;
}

// ===== GET AVATAR COLOR =====
function getAvatarColor(name) {
    const colors = [
        '#7a0000', '#0066cc', '#009900', '#ff6600', 
        '#9c27b0', '#00bcd4', '#795548', '#607d8b'
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
}

// ===== LOAD PENDING REVIEWS =====
async function loadPendingReviews() {
    console.log('💬 Loading pending reviews...');
    
    const reviewsContainer = document.getElementById('pendingReviewsList');
    if (!reviewsContainer) return;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/pending-reviews`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const reviews = result.pending_reviews || [];
            const totalPending = result.total || 0;
            
            // Update the pending reviews count in stats
            document.getElementById('pendingReviews').textContent = totalPending;
            
            if (reviews.length === 0) {
                reviewsContainer.innerHTML = `
                    <div class="no-data-message">
                        <i class="fas fa-check-circle"></i>
                        <p>No pending reviews</p>
                        <small>All caught up!</small>
                    </div>
                `;
                return;
            }
            
            // Display pending reviews
            reviewsContainer.innerHTML = '';
            
            reviews.forEach(review => {
                const reviewItem = document.createElement('div');
                reviewItem.className = 'review-item';
                reviewItem.innerHTML = `
                    <div class="review-header">
                        <div class="review-user">
                            <div class="user-avatar small" style="background: ${getAvatarColor(review.student_name)}">
                                ${review.student_avatar}
                            </div>
                            <div>
                                <h4>${review.student_name || 'Anonymous'}</h4>
                                <span class="review-type" style="color: ${review.type_color}">
                                    <i class="fas ${review.type === 'suggestion' ? 'fa-lightbulb' : 
                                                       review.type === 'bug' ? 'fa-bug' : 
                                                       review.type === 'praise' ? 'fa-heart' : 
                                                       review.type === 'question' ? 'fa-question-circle' : 'fa-comment'}"></i>
                                    ${review.type_label}
                                </span>
                            </div>
                        </div>
                        <span class="review-time">${review.time_ago}</span>
                    </div>
                    <div class="review-message">
                        <p>${review.message.length > 100 ? review.message.substring(0, 100) + '...' : review.message}</p>
                    </div>
                    ${review.rating ? `
                        <div class="review-rating">
                            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                        </div>
                    ` : ''}
                    <div class="review-actions">
                        <button class="btn btn-sm btn-success" onclick="markAsResolved(${review.id})">
                            <i class="fas fa-check-circle"></i> Mark as Resolved
                        </button>
                    </div>
                `;
                reviewsContainer.appendChild(reviewItem);
            });
            
            console.log(`✅ Displayed ${reviews.length} pending reviews`);
        }
        
    } catch (error) {
        console.error('❌ Error loading pending reviews:', error);
        reviewsContainer.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load reviews</p>
            </div>
        `;
    }
}

// ===== MARK REVIEW AS RESOLVED =====
async function markAsResolved(reviewId) {
    if (!confirm('Mark this feedback as resolved?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/feedback/${reviewId}/resolve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Resolved', 'Feedback marked as resolved');
            
            // Reload both pending reviews and dashboard stats
            loadPendingReviews();
            loadDashboardData();
            
        } else {
            throw new Error(result.message || 'Failed to resolve');
        }
        
    } catch (error) {
        console.error('❌ Error resolving feedback:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== REPLY TO REVIEW =====
async function replyToReview(reviewId) {
    const reply = prompt('Enter your reply:');
    if (!reply) return;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/feedback/${reviewId}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reply: reply })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Reply Sent', 'Your reply has been sent');
            loadPendingReviews(); // Reload the list
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error replying:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== MARK REVIEW AS READ =====
async function markAsRead(reviewId) {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/feedback/${reviewId}/mark-read`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Marked as Read', 'Review removed from pending');
            loadPendingReviews(); // Reload the list
            loadDashboardData(); // Update stats
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error marking as read:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== LOAD RECENT LESSONS (WITH CACHE) =====
async function loadRecentLessons(forceRefresh = false) {
    const lessonsList = document.querySelector('.activity-list');
    if (!lessonsList) return;
    
    // Check cache
    if (!forceRefresh && window.cachedRecentLessons) {
        console.log('✅ Using cached recent lessons');
        displayRecentLessons(window.cachedRecentLessons);
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const lessons = result.lessons || [];
        
        // Get recent 5 lessons
        const recent = lessons.slice(0, 5);
        
        // Cache the data
        window.cachedRecentLessons = recent;
        
        displayRecentLessons(recent);
        
    } catch (error) {
        console.error('Error loading recent lessons:', error);
        lessonsList.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-exclamation-circle"></i>
                <p>Failed to load recent lessons</p>
            </div>
        `;
    }
}

// Helper function to display recent lessons
function displayRecentLessons(lessons) {
    const lessonsList = document.querySelector('.activity-list');
    if (!lessonsList) return;
    
    if (lessons.length === 0) {
        lessonsList.innerHTML = `
            <div class="no-data-message">
                <i class="fas fa-info-circle"></i>
                <p>No lessons available</p>
            </div>
        `;
        return;
    }
    
    lessonsList.innerHTML = '';
    
    lessons.forEach(lesson => {
        const timeAgo = getTimeAgo(lesson.created_at);
        
        // Determine icon
        let icon = 'fa-file-alt';
        if (lesson.content_type === 'video') icon = 'fa-video';
        else if (lesson.content_type === 'pdf') icon = 'fa-file-pdf';
        
        // Add badge for admin-created lessons
        const adminBadge = lesson.is_from_admin ? 
            '<span class="badge" style="background: #7a0000; color: white; font-size: 0.6rem; padding: 2px 6px; margin-left: 8px;">From Admin</span>' : 
            '';
        
        // Add badge for own lessons
        const ownBadge = lesson.is_own ? 
            '<span class="badge" style="background: #4CAF50; color: white; font-size: 0.6rem; padding: 2px 6px; margin-left: 8px;">My Lesson</span>' : 
            '';
        
        // Get subject name
        const subjectName = lesson.lesson_name || 'General';
        const creator = lesson.creator_name || (lesson.is_from_admin ? 'Admin' : 'Unknown');
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon" style="background: rgba(122, 0, 0, 0.1); color: #7a0000;">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <h4>${lesson.content_title || 'Untitled Lesson'} ${adminBadge} ${ownBadge}</h4>
                <p>${subjectName} • ${lesson.content_type || 'lesson'} • Created by: ${creator}</p>
            </div>
            <span class="activity-time">${timeAgo}</span>
        `;
        lessonsList.appendChild(item);
    });
}

async function loadRecentActivities() {
    // This would load from activity log
    // For now, use sample data
}

// ===== UPDATE QUICK STATS DISPLAY =====
function updateQuickStats() {
    const publishedEl = document.getElementById('publishedLessons');
    const draftEl = document.getElementById('draftLessons');
    const needsReviewEl = document.getElementById('needsReviewLessons');
    const avgCompletionEl = document.getElementById('avgCompletion');
    
    if (publishedEl) publishedEl.textContent = window.publishedLessons || 0;
    if (draftEl) draftEl.textContent = window.draftLessons || 0;
    if (needsReviewEl) needsReviewEl.textContent = window.needsReviewLessons || 0;
    if (avgCompletionEl) avgCompletionEl.textContent = (window.avgCompletion || 0) + '%';
}


// ===== LOAD LESSONS FOR DROPDOWN =====
function loadLessonsForDropdown() {
    console.log('📚 Loading lessons for dropdown...');
    
    const lessonSelect = document.getElementById('createLessonLesson');
    if (!lessonSelect) return;
    
    // Keep the existing HTML options, just make sure they're there
    // The HTML already has the options, so we don't need to populate
    console.log('✅ Lessons dropdown ready');
}

// ===== UPDATED: LOAD MODULES FOR LESSON =====
// ===== UPDATED: LOAD MODULES FOR LESSON (NO DEFAULTS) =====
// ===== UPDATED: LOAD MODULES FOR LESSON =====
async function loadModulesForLesson() {
    const lessonSelect = document.getElementById('createLessonLesson');
    if (!lessonSelect) return;
    
    const lessonId = lessonSelect.value;
    const lessonName = lessonSelect.options[lessonSelect.selectedIndex]?.text || '';
    
    console.log(`📦 Loading modules for ${lessonName} (ID: ${lessonId})`);
    
    const moduleSelect = document.getElementById('createLessonModule');
    const topicSelect = document.getElementById('createLessonTopic');
    
    if (!moduleSelect || !topicSelect) return;
    
    // Reset module and topic dropdowns
    moduleSelect.innerHTML = '';
    topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
    topicSelect.disabled = true;
    
    if (!lessonId) {
        moduleSelect.innerHTML = '<option value="">-- Select Lesson First --</option>';
        moduleSelect.disabled = true;
        return;
    }
    
    moduleSelect.disabled = false;
    
    try {
        // Load modules from database
        await loadTeacherModules();
        
        // Filter modules for this lesson
        const lessonModules = teacherModules.filter(m => 
            m.lesson_id == lessonId || m.lesson_name?.toLowerCase().includes(lessonName.toLowerCase())
        );
        
        console.log(`Found ${lessonModules.length} modules for ${lessonName}`);
        
        // Build dropdown options
        let options = '';
        
        // Add "Create New Module" option FIRST
        options += `<option value="create_new" style="color: #7a0000; font-weight: bold; background: #fff0f0;">➕ CREATE NEW MODULE...</option>`;
        
        // Add separator if there are existing modules
        if (lessonModules.length > 0) {
            options += `<option value="" disabled style="font-weight: bold; background: #f0f0f0;">─────────────────────</option>`;
            
            lessonModules.forEach(module => {
                const creatorBadge = module.created_by === 'teacher' ? ' (My Module)' : 
                                     (module.created_by === 'admin' ? ' (Admin)' : '');
                options += `<option value="${module.id}">📂 ${module.name}${creatorBadge}</option>`;
            });
        }
        
        moduleSelect.innerHTML = options;
        
        // Add change event listener for module selection
        moduleSelect.onchange = function() {
            if (this.value === 'create_new') {
                // Open create module modal
                openCreateModuleModal();
                // Reset selection
                this.value = '';
            } else if (this.value) {
                // Load topics for selected module
                loadTopicsForModule();
            }
        };
        
    } catch (error) {
        console.error('❌ Error loading modules:', error);
        
        // Kung may error, Create New Module option lang
        moduleSelect.innerHTML = `
            <option value="create_new" style="color: #7a0000; font-weight: bold; background: #fff0f0;">➕ CREATE NEW MODULE...</option>
            <option value="" disabled style="font-weight: bold; background: #f0f0f0;">─────────────────────</option>
            <option value="" disabled style="color: #999;">No modules found. Create one above.</option>
        `;
        
        moduleSelect.onchange = function() {
            if (this.value === 'create_new') {
                openCreateModuleModal();
                this.value = '';
            }
        };
    }
}

// ===== LOAD TOPICS BASED ON SELECTED MODULE =====
// ===== UPDATED: LOAD TOPICS FOR MODULE =====
async function loadTopicsForModule() {
    const moduleSelect = document.getElementById('createLessonModule');
    if (!moduleSelect) return;
    
    const moduleValue = moduleSelect.value;
    const moduleText = moduleSelect.options[moduleSelect.selectedIndex]?.text || '';
    
    console.log(`📚 Loading topics for module: ${moduleText} (Value: ${moduleValue})`);
    
    const topicSelect = document.getElementById('createLessonTopic');
    if (!topicSelect) return;
    
    // Handle "Create New Module" selection
    if (moduleValue === 'create_new') {
        openCreateModuleModal();
        // Reset module selection
        moduleSelect.value = '';
        return;
    }
    
    // Handle "General Module" selection
    if (moduleValue === 'general') {
        // Auto-create a general module
        await autoCreateGeneralModule();
        return;
    }
    
    // Reset topic dropdown
    topicSelect.innerHTML = '';
    
    if (!moduleValue) {
        topicSelect.innerHTML = '<option value="">-- Select Module First --</option>';
        topicSelect.disabled = true;
        return;
    }
    
    topicSelect.disabled = false;
    
    try {
        // Load topics from database
        await loadTeacherTopics();
        
        // Filter topics for this module
        const moduleTopics = teacherTopics.filter(t => 
            t.module_id == moduleValue || t.module_name?.toLowerCase().includes(moduleText.toLowerCase())
        );
        
        console.log(`Found ${moduleTopics.length} topics for module: ${moduleText}`);
        
        // Build dropdown options
        let options = '';
        
        // Add "General Topic" as first option
        options += `<option value="general" style="color: #4CAF50; font-weight: bold;">📄 General Topic (Auto-create)</option>`;
        
        // Add separator if there are existing topics
        if (moduleTopics.length > 0) {
            options += `<option value="" disabled style="font-weight: bold; background: #f0f0f0;">─── EXISTING TOPICS ───</option>`;
            
            moduleTopics.forEach(topic => {
                const creatorBadge = topic.created_by === 'teacher' ? ' (My Topic)' : '';
                options += `<option value="${topic.id}">📌 ${topic.name}${creatorBadge}</option>`;
            });
        }
        
        // Add "Create New" option at the end
        options += `<option value="" disabled style="font-weight: bold; background: #f0f0f0;">─── ACTIONS ───</option>`;
        options += `<option value="create_new" style="color: #7a0000; font-weight: bold;">➕ Create New Topic...</option>`;
        
        topicSelect.innerHTML = options;
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
        
        // Fallback: Show default options
        topicSelect.innerHTML = `
            <option value="general" style="color: #4CAF50; font-weight: bold;">📄 General Topic (Auto-create)</option>
            <option value="" disabled style="font-weight: bold; background: #f0f0f0;">─── ACTIONS ───</option>
            <option value="create_new" style="color: #7a0000; font-weight: bold;">➕ Create New Topic...</option>
        `;
    }
}

// ===== FIXED: OPEN CREATE LESSON MODAL =====
function openCreateLessonModal() {
    console.log("📝 Opening create lesson modal");
    
    // Close other modals
    const otherModals = document.querySelectorAll('.modal');
    otherModals.forEach(modal => {
        if (modal.id !== 'createLessonModal') {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
    
    const modal = document.getElementById('createLessonModal');
    if (!modal) {
        console.error("❌ Create lesson modal not found in DOM");
        showNotification('error', 'Error', 'Modal not found');
        return;
    }
    
    // Reset form
    resetLessonForm();
    
    // Make sure lesson select is enabled
    const lessonSelect = document.getElementById('createLessonLesson');
    if (lessonSelect) {
        lessonSelect.disabled = false;
    }
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Focus on title input
    setTimeout(() => {
        const titleInput = document.getElementById('createLessonTitle');
        if (titleInput) titleInput.focus();

        enhanceCreateLessonModal(); // <-- DAGDAGIN MO LANG ITO
    }, 300);
}
// ===== OPEN CREATE TOPIC MODAL =====
function openCreateTopicModal() {
    console.log('📚 Opening create topic modal...');
    
    const moduleSelect = document.getElementById('createLessonModule');
    const selectedModuleId = moduleSelect?.value;
    const selectedModuleName = moduleSelect?.options[moduleSelect.selectedIndex]?.text || '';
    
    if (!selectedModuleId || selectedModuleId === 'create_new') {
        showNotification('error', 'Error', 'Please select a module first');
        return;
    }
    
    // Remove existing modal if any
    const existingModal = document.getElementById('createTopicModal');
    if (existingModal) existingModal.remove();
    
    // Clean module name (remove badges)
    const cleanModuleName = selectedModuleName.replace(/\s*\([^)]*\)/g, '').trim();
    
    // Create modal HTML
    const modalHtml = `
        <div class="modal" id="createTopicModal" style="display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 10020; align-items: center; justify-content: center;">
            <div class="modal-content" style="background: white; border-radius: 12px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto;">
                <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #7a0000; color: white; border-radius: 12px 12px 0 0;">
                    <h3 style="margin: 0;"><i class="fas fa-tag"></i> Create New Topic</h3>
                    <button class="btn-icon" onclick="closeCreateTopicModal()" style="color: white; background: none; border: none; font-size: 1.5rem; cursor: pointer;">&times;</button>
                </div>
                
                <div class="modal-body" style="padding: 20px;">
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label class="form-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Module</label>
                        <input type="text" class="form-control" value="${cleanModuleName}" readonly disabled style="background: #f5f5f5; width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <input type="hidden" id="newTopicModuleId" value="${selectedModuleId}">
                        <input type="hidden" id="newTopicModuleName" value="${cleanModuleName}">
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label class="form-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Topic Name <span style="color: red;">*</span></label>
                        <input type="text" class="form-control" id="newTopicName" placeholder="e.g., Solving Quadratic Equations" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required>
                    </div>
                    
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label class="form-label" style="display: block; margin-bottom: 5px; font-weight: 600;">Description (Optional)</label>
                        <textarea class="form-control" id="newTopicDescription" rows="3" placeholder="Brief description of this topic" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
                    </div>
                    
                    <div class="preview-section" id="topicPreviewSection" style="display: none; margin-top: 20px; background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #7a0000;">
                        <h4 style="margin: 0 0 10px 0; font-size: 0.9rem; color: #666;">Preview:</h4>
                        <div id="topicPreview"></div>
                    </div>
                </div>
                
                <div class="modal-footer" style="padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px;">
                    <button class="btn btn-secondary" onclick="closeCreateTopicModal()" style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button class="btn btn-primary" onclick="saveNewTopic()" style="padding: 8px 16px; background: #7a0000; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        <i class="fas fa-save"></i> Create Topic
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.body.classList.add('modal-open');
    
    // Add preview functionality
    const nameInput = document.getElementById('newTopicName');
    const descInput = document.getElementById('newTopicDescription');
    const previewSection = document.getElementById('topicPreviewSection');
    const previewDiv = document.getElementById('topicPreview');
    
    if (nameInput && descInput && previewSection && previewDiv) {
        nameInput.addEventListener('input', updateTopicPreview);
        descInput.addEventListener('input', updateTopicPreview);
    }
    
    function updateTopicPreview() {
        const topicName = nameInput.value.trim();
        const topicDesc = descInput.value.trim() || 'No description provided';
        const moduleName = document.getElementById('newTopicModuleName')?.value || '';
        
        if (topicName) {
            previewSection.style.display = 'block';
            previewDiv.innerHTML = `
                <div style="background: white; padding: 10px; border-radius: 4px;">
                    <strong style="color: #7a0000;">${topicName}</strong>
                    <p style="margin: 5px 0 0 0; font-size: 0.7rem; color: #999;">Module: ${moduleName}</p>
                    <p style="margin: 5px 0 0 0; font-size: 0.8rem; color: #666;">${topicDesc}</p>
                </div>
            `;
        } else {
            previewSection.style.display = 'none';
        }
    }
    
    setTimeout(() => {
        document.getElementById('newTopicName')?.focus();
    }, 300);
}

// ===== CLOSE CREATE TOPIC MODAL =====
function closeCreateTopicModal() {
    const modal = document.getElementById('createTopicModal');
    if (modal) {
        modal.remove();
        
        const anyModalOpen = document.querySelectorAll('.modal').length > 0;
        if (!anyModalOpen) {
            document.body.classList.remove('modal-open');
        }
    }
}

// ===== SAVE NEW TOPIC =====
async function saveNewTopic() {
    console.log('💾 Saving new topic...');
    
    const topicName = document.getElementById('newTopicName')?.value.trim();
    const moduleId = document.getElementById('newTopicModuleId')?.value;
    const moduleName = document.getElementById('newTopicModuleName')?.value;
    const description = document.getElementById('newTopicDescription')?.value.trim() || '';
    
    if (!topicName) {
        showNotification('error', 'Error', 'Topic name is required');
        return;
    }
    
    if (!moduleId) {
        showNotification('error', 'Error', 'Module ID not found');
        return;
    }
    
    const saveBtn = document.querySelector('#createTopicModal .btn-primary');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        const topicData = {
            name: topicName,
            description: description,
            module_id: parseInt(moduleId),
            module_name: moduleName,
            created_by: 'teacher'
        };
        
        console.log('📤 Sending topic data:', topicData);
        
        const response = await fetch(`${API_BASE_URL}/teacher/topics/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(topicData)
        });
        
        const result = await response.json();
        console.log('📥 Server response:', result);
        
        if (result.success) {
            showNotification('success', 'Success!', `Topic "${topicName}" created!`);
            
            // Add to local cache
            const newTopic = result.topic || {
                id: result.topic_id || Date.now(),
                name: topicName,
                description: description,
                module_id: parseInt(moduleId),
                module_name: moduleName,
                created_by: 'teacher'
            };
            
            teacherTopics.push(newTopic);
            
            closeCreateTopicModal();
            
            // Refresh topic dropdown
            setTimeout(() => {
                loadTopicsForModule();
            }, 300);
            
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
// ===== FIXED: CREATE NEW LESSON WITH PROPER NULL CHECKS =====
// ===== UPDATED: CREATE NEW LESSON =====
async function createNewLesson() {
    console.log("💾 Creating new lesson...");
    
    // Get all elements with null checks
    const titleInput = document.getElementById('createLessonTitle');
    const descInput = document.getElementById('createLessonDescription');
    const lessonSelect = document.getElementById('createLessonLesson');
    const moduleSelect = document.getElementById('createLessonModule');
    const topicSelect = document.getElementById('createLessonTopic');
    
    // Check if elements exist
    if (!titleInput) {
        console.error('❌ createLessonTitle element not found');
        showNotification('error', 'Error', 'Form element not found');
        return;
    }
    
    if (!lessonSelect) {
        console.error('❌ createLessonLesson element not found');
        showNotification('error', 'Error', 'Lesson selector not found');
        return;
    }
    
    // Get values with safe checks
    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    
    const lessonId = lessonSelect.value;
    const lessonName = lessonSelect.options[lessonSelect.selectedIndex]?.text || 'Unknown Lesson';
    
    // Check module and topic - they might be in the process of auto-creation
    let moduleId = moduleSelect?.value;
    let moduleName = moduleSelect?.options[moduleSelect.selectedIndex]?.text || 'Unknown Module';
    let topicId = topicSelect?.value;
    let topicName = topicSelect?.options[topicSelect.selectedIndex]?.text || 'Unknown Topic';
    
    // Clean module name (remove badges like "(My Module)")
    moduleName = moduleName.replace(/\s*\([^)]*\)/g, '').trim();
    topicName = topicName.replace(/\s*\([^)]*\)/g, '').trim();
    
    // Log all values for debugging
    console.log('📝 Form values:', {
        title,
        description,
        lessonId,
        lessonName,
        moduleId,
        moduleName,
        topicId,
        topicName
    });
    
    // Validate required fields
    if (!title) {
        showNotification('error', 'Error', 'Please enter a lesson title');
        return;
    }
    
    if (!lessonId) {
        showNotification('error', 'Error', 'Please select a lesson');
        return;
    }
    
    // If module is still being created, wait a bit
    if (!moduleId || moduleId === 'general' || moduleId === 'create_new') {
        showNotification('error', 'Error', 'Please wait for module to be created or select a module');
        return;
    }
    
    if (!topicId || topicId === 'general' || topicId === 'create_new') {
        showNotification('error', 'Error', 'Please wait for topic to be created or select a topic');
        return;
    }
    
    // Determine content type
    const videoFileInput = document.getElementById('videoFileInput');
    const youtubeUrlInput = document.getElementById('videoYoutubeUrl');
    const textContentInput = document.getElementById('textContentInput');
    const pdfFileInput = document.getElementById('pdfFileInput');
    
    const videoFile = videoFileInput?.files[0];
    const youtubeUrl = youtubeUrlInput?.value.trim();
    const textContent = textContentInput?.value.trim();
    const pdfFile = pdfFileInput?.files[0];
    
    let contentType = 'text';
    if (videoFile || youtubeUrl) contentType = 'video';
    else if (pdfFile) contentType = 'pdf';
    
    console.log('📁 Content type:', contentType);
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('topic_id', topicId);
    formData.append('content_type', contentType);
    formData.append('lesson_id', lessonId);
    formData.append('lesson_name', lessonName);
    formData.append('module_id', moduleId);
    formData.append('module_name', moduleName);
    formData.append('topic_name', topicName);
    
    if (contentType === 'video') {
        if (youtubeUrl) formData.append('youtube_url', youtubeUrl);
        if (videoFile) formData.append('video_file', videoFile);
    } else if (contentType === 'text' && textContent) {
        formData.append('text_content', textContent);
    } else if (contentType === 'pdf' && pdfFile) {
        formData.append('pdf_file', pdfFile);
    }
    
    const saveBtn = document.querySelector('#createLessonModal .btn-primary');
    if (!saveBtn) {
        console.error('❌ Save button not found');
        showNotification('error', 'Error', 'Save button not found');
        return;
    }
    
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        console.log('🚀 Sending request to server...');
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Server response:', result);
        
        if (result.success) {
            showNotification('success', 'Success!', `Lesson created in ${topicName}`);
            closeCreateLessonModal();
            
            // Refresh lessons
            setTimeout(() => {
                loadMyLessons();
                loadLessonData();
                loadRecentLessons();
            }, 500);
        } else {
            throw new Error(result.message || 'Failed to create lesson');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('error', 'Failed', error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}
// ===== LOAD TEACHER MODULES FROM DATABASE =====
// ===== UPDATED: LOAD TEACHER MODULES FROM DATABASE =====
async function loadTeacherModules(forceRefresh = false) {
    console.log('📦 Loading teacher modules from database...');
    
    if (!forceRefresh && teacherModules && teacherModules.length > 0) {
        console.log(`✅ Using cached modules: ${teacherModules.length} modules`);
        return teacherModules;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/modules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            teacherModules = result.modules || [];
            console.log(`✅ Loaded ${teacherModules.length} modules from database`);
            return teacherModules;
        } else {
            throw new Error(result.message || 'Failed to load modules');
        }
        
    } catch (error) {
        console.error('❌ Error loading modules:', error);
        showNotification('warning', 'Modules Unavailable', 'Using default modules');
        
        // ===== FALLBACK TO DEFAULT MODULES =====
        teacherModules = getDefaultModules();  // <-- This will now work
        console.log(`✅ Using ${teacherModules.length} default modules as fallback`);
        return teacherModules;
    }
}
// ===== LOAD TEACHER TOPICS FROM DATABASE =====
async function loadTeacherTopics(forceRefresh = false) {
    console.log('📚 Loading teacher topics from database...');
    
    if (!forceRefresh && teacherTopics.length > 0) {
        console.log(`✅ Using cached topics: ${teacherTopics.length} topics`);
        return teacherTopics;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/topics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            teacherTopics = result.topics || [];
            console.log(`✅ Loaded ${teacherTopics.length} topics from database`);
            return teacherTopics;
        } else {
            throw new Error(result.message || 'Failed to load topics');
        }
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
        showNotification('warning', 'Topics Unavailable', 'Using default topics');
        
        // Fallback to default topics
        teacherTopics = getDefaultTopics();
        return teacherTopics;
    }
}d
// ===== NEW: AUTO-CREATE GENERAL MODULE =====
// ===== UPDATED: AUTO-CREATE GENERAL MODULE =====
async function autoCreateGeneralModule() {
    console.log('🤖 Auto-creating general module...');
    
    // ===== ADD THIS SAFETY CHECK =====
    if (typeof teacherModules === 'undefined') {
        console.warn('⚠️ teacherModules is undefined, initializing...');
        teacherModules = [];
    }
    
    const lessonSelect = document.getElementById('createLessonLesson');
    const moduleSelect = document.getElementById('createLessonModule');
    
    if (!lessonSelect || !moduleSelect) return;
    
    const lessonId = lessonSelect.value;
    const lessonName = lessonSelect.options[lessonSelect.selectedIndex]?.text || '';
    
    if (!lessonId) {
        showNotification('error', 'Error', 'Please select a lesson first');
        moduleSelect.value = '';
        return;
    }
    
    // Generate module name
    const moduleName = `${lessonName} - General Module`;
    
    // Show loading indicator sa module select
    const originalOptions = moduleSelect.innerHTML;
    moduleSelect.innerHTML = `<option value="">Creating general module...</option>`;
    moduleSelect.disabled = true;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const moduleData = {
            name: moduleName,
            description: `General module for ${lessonName}`,
            lesson_id: parseInt(lessonId),
            lesson_name: lessonName,
            module_order: 999,
            created_by: 'teacher',
            is_general: true
        };
        
        console.log('📦 Auto-creating general module:', moduleData);
        
        // Try to save to database
        const response = await fetch(`${API_BASE_URL}/teacher/modules/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(moduleData)
        });
        
        let newModule;
        
        if (response.ok) {
            const result = await response.json();
            newModule = result.module || {
                id: result.module_id || Date.now(),
                ...moduleData
            };
            showNotification('success', 'Module Created', `General module created for ${lessonName}`);
        } else {
            // If server fails, create local module
            newModule = {
                id: Date.now(),
                ...moduleData
            };
            showNotification('warning', 'Offline Mode', 'General module saved locally');
        }
        
        // Add to teacherModules array
        teacherModules.push(newModule);
        
        // Refresh module dropdown and select the new module
        await loadModulesForLesson();
        
        // Find and select the newly created module
        setTimeout(() => {
            const updatedModuleSelect = document.getElementById('createLessonModule');
            if (updatedModuleSelect) {
                // Find the option with the new module name
                for (let i = 0; i < updatedModuleSelect.options.length; i++) {
                    if (updatedModuleSelect.options[i].text.includes(moduleName)) {
                        updatedModuleSelect.selectedIndex = i;
                        // Trigger topics load
                        loadTopicsForModule();
                        break;
                    }
                }
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error auto-creating module:', error);
        
        // Fallback: Create local module
        const newModule = {
            id: Date.now(),
            name: moduleName,
            description: `General module for ${lessonName}`,
            lesson_id: parseInt(lessonId),
            lesson_name: lessonName,
            module_order: 999,
            created_by: 'teacher',
            is_general: true
        };
        
        teacherModules.push(newModule);
        
        showNotification('warning', 'Module Created', 'General module saved locally');
        
        // Refresh dropdown
        moduleSelect.disabled = false;
        await loadModulesForLesson();
        
        // Select the new module
        setTimeout(() => {
            const updatedModuleSelect = document.getElementById('createLessonModule');
            if (updatedModuleSelect) {
                for (let i = 0; i < updatedModuleSelect.options.length; i++) {
                    if (updatedModuleSelect.options[i].text.includes(moduleName)) {
                        updatedModuleSelect.selectedIndex = i;
                        loadTopicsForModule();
                        break;
                    }
                }
            }
        }, 300);
    }
}
// ===== NEW: AUTO-CREATE GENERAL TOPIC =====
// ===== UPDATED: AUTO-CREATE GENERAL TOPIC =====
async function autoCreateGeneralTopic() {
    console.log('🤖 Auto-creating general topic...');
    
    // ===== ADD THIS SAFETY CHECK =====
    if (typeof teacherTopics === 'undefined') {
        console.warn('⚠️ teacherTopics is undefined, initializing...');
        teacherTopics = [];
    }
    
    const moduleSelect = document.getElementById('createLessonModule');
    const topicSelect = document.getElementById('createLessonTopic');
    
    if (!moduleSelect || !topicSelect) return;
    
    const moduleValue = moduleSelect.value;
    const moduleText = moduleSelect.options[moduleSelect.selectedIndex]?.text || '';
    
    if (!moduleValue || moduleValue === 'general' || moduleValue === 'create_new') {
        showNotification('error', 'Error', 'Please select a valid module');
        topicSelect.value = '';
        return;
    }
    
    // Get module ID (remove any text in parentheses)
    const moduleId = parseInt(moduleValue);
    const cleanModuleText = moduleText.replace(/\s*\([^)]*\)/g, '').trim();
    
    // Generate topic name
    const topicName = `${cleanModuleText} - General Topic`;
    
    // Show loading indicator
    topicSelect.innerHTML = `<option value="">Creating general topic...</option>`;
    topicSelect.disabled = true;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const topicData = {
            name: topicName,
            description: `General topic for ${cleanModuleText}`,
            module_id: moduleId,
            module_name: cleanModuleText,
            topic_order: 999,
            created_by: 'teacher',
            is_general: true
        };
        
        console.log('📚 Auto-creating general topic:', topicData);
        
        // Try to save to database
        const response = await fetch(`${API_BASE_URL}/teacher/topics/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(topicData)
        });
        
        let newTopic;
        
        if (response.ok) {
            const result = await response.json();
            newTopic = result.topic || {
                id: result.topic_id || Date.now(),
                ...topicData
            };
            showNotification('success', 'Topic Created', `General topic created for ${cleanModuleText}`);
        } else {
            // If server fails, create local topic
            newTopic = {
                id: Date.now(),
                ...topicData
            };
            showNotification('warning', 'Offline Mode', 'General topic saved locally');
        }
        
        // Add to teacherTopics array
        teacherTopics.push(newTopic);
        
        // Refresh topic dropdown
        await loadTopicsForModule();
        
        // Find and select the newly created topic
        setTimeout(() => {
            const updatedTopicSelect = document.getElementById('createLessonTopic');
            if (updatedTopicSelect) {
                for (let i = 0; i < updatedTopicSelect.options.length; i++) {
                    if (updatedTopicSelect.options[i].text.includes(topicName)) {
                        updatedTopicSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 500);
        
    } catch (error) {
        console.error('❌ Error auto-creating topic:', error);
        
        // Fallback: Create local topic
        const newTopic = {
            id: Date.now(),
            name: topicName,
            description: `General topic for ${cleanModuleText}`,
            module_id: moduleId,
            module_name: cleanModuleText,
            topic_order: 999,
            created_by: 'teacher',
            is_general: true
        };
        
        teacherTopics.push(newTopic);
        
        showNotification('warning', 'Topic Created', 'General topic saved locally');
        
        // Refresh dropdown
        topicSelect.disabled = false;
        await loadTopicsForModule();
        
        // Select the new topic
        setTimeout(() => {
            const updatedTopicSelect = document.getElementById('createLessonTopic');
            if (updatedTopicSelect) {
                for (let i = 0; i < updatedTopicSelect.options.length; i++) {
                    if (updatedTopicSelect.options[i].text.includes(topicName)) {
                        updatedTopicSelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }, 300);
    }
}
// ===== UPDATED: HANDLE TOPIC SELECTION =====
function handleTopicSelection() {
    const topicSelect = document.getElementById('createLessonTopic');
    if (!topicSelect) return;
    
    const selectedValue = topicSelect.value;
    
    if (selectedValue === 'create_new') {
        openCreateTopicModal();
        // Reset selection
        topicSelect.value = '';
    } else if (selectedValue === 'general') {
        // Auto-create general topic
        autoCreateGeneralTopic();
    }
}

// ===== ADD THIS FUNCTION TO YOUR SCRIPT =====
function enhanceCreateLessonModal() {
    console.log("🔧 Enhancing create lesson modal with module/topic features");
    
    // Add event listener for lesson selection
    const lessonSelect = document.getElementById('createLessonLesson');
    if (lessonSelect) {
        // Remove existing listener para hindi mag-duplicate
        lessonSelect.removeEventListener('change', loadModulesForLesson);
        lessonSelect.addEventListener('change', loadModulesForLesson);
    }
    
    // Add event listener for module selection
    const moduleSelect = document.getElementById('createLessonModule');
    if (moduleSelect) {
        moduleSelect.removeEventListener('change', function() {
            if (this.value === 'create_new') {
                openCreateModuleModal();
                this.value = '';
            } else if (this.value === 'general') {
                autoCreateGeneralModule();
            } else if (this.value) {
                loadTopicsForModule();
            }
        });
        
        moduleSelect.addEventListener('change', function() {
            if (this.value === 'create_new') {
                openCreateModuleModal();
                this.value = '';
            } else if (this.value === 'general') {
                autoCreateGeneralModule();
            } else if (this.value) {
                loadTopicsForModule();
            }
        });
    }
    
    // Add event listener for topic selection
    const topicSelect = document.getElementById('createLessonTopic');
    if (topicSelect) {
        topicSelect.removeEventListener('change', function() {
            if (this.value === 'create_new') {
                openCreateTopicModal();
                this.value = '';
            } else if (this.value === 'general') {
                autoCreateGeneralTopic();
            }
        });
        
        topicSelect.addEventListener('change', function() {
            if (this.value === 'create_new') {
                openCreateTopicModal();
                this.value = '';
            } else if (this.value === 'general') {
                autoCreateGeneralTopic();
            }
        });
    }
}
// ============================================
// PERFORMANCE DASHBOARD
// ============================================

let performanceCharts = {
    trendChart: null,
    distributionChart: null
};

async function loadPerformanceData() {
    console.log('📈 Loading performance data...');
    
    await Promise.all([
        loadPerformanceStats(),
        loadTopPerformers(),
        loadPerformanceTrendData(),
        loadScoreDistributionData()
    ]);
}

// ===== UPDATED loadPerformanceStats() =====
async function loadPerformanceStats() {
    try {
        const token = localStorage.getItem('authToken');
        
        // Use TEACHER endpoint, not ADMIN
        const response = await fetch(`${API_BASE_URL}/teacher/performance/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            
            document.getElementById('avgScore').textContent = stats.avg_score + '%';
            document.getElementById('completionRate').textContent = stats.completion_rate + '%';
            document.getElementById('avgTime').textContent = (stats.avg_time_minutes || 0) + 'm';
            document.getElementById('activeStudents').textContent = stats.active_students || 0;
            
            // Update change indicators
            const changeElements = document.querySelectorAll('.performance-stat-change');
            if (changeElements.length >= 4) {
                changeElements[0].innerHTML = stats.score_change > 0 
                    ? `<i class="fas fa-arrow-up"></i> ${stats.score_change}% from last month`
                    : `<i class="fas fa-minus"></i> No change`;
                    
                changeElements[1].innerHTML = stats.completion_change > 0
                    ? `<i class="fas fa-arrow-up"></i> ${stats.completion_change}% from last month`
                    : `<i class="fas fa-minus"></i> No change`;
                    
                changeElements[2].innerHTML = stats.time_change > 0
                    ? `<i class="fas fa-arrow-down"></i> ${stats.time_change}m from last month`
                    : `<i class="fas fa-minus"></i> No change`;
                    
                changeElements[3].innerHTML = stats.students_change > 0
                    ? `<i class="fas fa-arrow-up"></i> ${stats.students_change} from last month`
                    : `<i class="fas fa-minus"></i> No change`;
            }
        } else {
            throw new Error(result.message || 'Failed to load stats');
        }
        
    } catch (error) {
        console.error('Error loading performance stats:', error);
        
        // Set default values on error
        document.getElementById('avgScore').textContent = '0%';
        document.getElementById('completionRate').textContent = '0%';
        document.getElementById('avgTime').textContent = '0m';
        document.getElementById('activeStudents').textContent = '0';
    }
}

// ===== UPDATED loadTopPerformers() =====
async function loadTopPerformers() {
    const tableBody = document.getElementById('topPerformersBody');
    if (!tableBody) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const filter = document.getElementById('topPerformersFilter')?.value || 'all';
        
        // Use TEACHER endpoint
        const response = await fetch(`${API_BASE_URL}/teacher/performance/top-performers?subject=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        const performers = result.performers || [];
        
        if (performers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4">
                        <div class="no-data-message">
                            <i class="fas fa-users"></i>
                            <p>No performance data available</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = '';
        
        performers.forEach((student, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
            const scoreClass = student.score >= 90 ? 'high' : student.score >= 80 ? 'medium' : 'low';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div class="student-rank ${rankClass}">${rank}</div></td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar" style="background: ${getAvatarColor(student.name)}">
                            ${getInitials(student.name)}
                        </div>
                        <div class="user-info">
                            <span class="user-name">${student.name}</span>
                            <span class="user-email">${student.email || ''}</span>
                        </div>
                    </div>
                </td>
                <td>${student.subject || 'General'}</td>
                <td><span class="score-badge ${scoreClass}">${Math.round(student.score)}%</span></td>
                <td>
                    <div class="progress-cell">
                        <div class="progress-track">
                            <div class="progress-bar" style="width: ${student.progress}%"></div>
                        </div>
                        <span class="progress-percent">${student.progress}%</span>
                    </div>
                </td>
                <td>
                    <button class="btn-icon small" onclick="viewStudentDetails(${student.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Error loading top performers:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="no-data-message">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Failed to load top performers</p>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ===== UPDATED loadPerformanceTrendData() =====
async function loadPerformanceTrendData() {
    const ctx = document.getElementById('performanceTrendChart');
    if (!ctx) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const timeRange = document.getElementById('performanceTimeRange')?.value || 'month';
        
        // Use TEACHER endpoint
        const response = await fetch(`${API_BASE_URL}/teacher/performance/trend?range=${timeRange}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const trend = result.trend;
            
            if (performanceCharts.trendChart) {
                performanceCharts.trendChart.destroy();
            }
            
            performanceCharts.trendChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: trend.labels || ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                    datasets: [
                        {
                            label: 'Average Score',
                            data: trend.avg_scores || [0, 0, 0, 0],
                            borderColor: '#7a0000',
                            backgroundColor: 'rgba(122, 0, 0, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Completion Rate',
                            data: trend.completion_rates || [0, 0, 0, 0],
                            borderColor: '#FFC107',
                            backgroundColor: 'rgba(255, 193, 7, 0.1)',
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
                        legend: { position: 'top' }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { callback: v => v + '%' }
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading trend data:', error);
    }
}

// ===== UPDATED loadScoreDistributionData() =====
async function loadScoreDistributionData() {
    const ctx = document.getElementById('scoreDistributionChart');
    if (!ctx) return;
    
    try {
        const token = localStorage.getItem('authToken');
        const filter = document.getElementById('scoreDistributionFilter')?.value || 'all';
        
        // Use TEACHER endpoint
        const response = await fetch(`${API_BASE_URL}/teacher/performance/score-distribution?filter=${filter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success) {
            const distribution = result.distribution;
            
            if (performanceCharts.distributionChart) {
                performanceCharts.distributionChart.destroy();
            }
            
            const hasData = distribution.total > 0;
            
            performanceCharts.distributionChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['90-100%', '80-89%', '70-79%', '60-69%', 'Below 60%'],
                    datasets: [{
                        data: [
                            distribution['90-100%'] || 0,
                            distribution['80-89%'] || 0,
                            distribution['70-79%'] || 0,
                            distribution['60-69%'] || 0,
                            distribution['Below 60%'] || 0
                        ],
                        backgroundColor: [
                            '#4CAF50',
                            '#2196F3',
                            '#FFC107',
                            '#FF9800',
                            '#f44336'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right' },
                        title: {
                            display: !hasData,
                            text: 'No score data available',
                            color: '#999'
                        }
                    }
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading distribution data:', error);
    }
}

// ============================================
// LESSON MANAGEMENT
// ============================================

// ===== LOAD LESSONS =====
async function loadLessonData() {
    console.log('📚 Loading lesson data from database...');
    
    const container = document.querySelector('.main-content');
    if (!container) return;
    
    // Show loading state
    document.getElementById('welcomeSection').innerHTML = `
        <div class="loading-spinner" style="text-align: center; padding: 60px;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
            <p style="margin-top: 20px; color: #666;">Loading lessons...</p>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            lessonData = result.lessons || [];
            const stats = result.stats || {};
            
            console.log(`✅ Loaded ${lessonData.length} lessons`);
            
            // Update stats
            updateLessonStats(stats);
            
            // Update subject stats
            updateSubjectStats();
            
            // Display lessons based on current view
            if (document.getElementById('welcomeSection').style.display !== 'none') {
                displayLessonsGrid();
            }
            
            // Update sidebar stats
            updateSidebarStats();
        } else {
            throw new Error(result.message || 'Failed to load lessons');
        }
        
    } catch (error) {
        console.error('❌ Error loading lessons:', error);
        
        document.getElementById('welcomeSection').innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color: #dc3545;"></i>
                <h4 style="margin-top: 20px;">Failed to Load Lessons</h4>
                <p style="color: #666;">${error.message}</p>
                <button class="btn btn-primary" onclick="loadLessonData()" style="margin-top: 20px;">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ===== ADD THIS MISSING FUNCTION =====
function updateSubjectStats() {
    console.log('📊 Updating subject stats from lessonData...');
    
    if (!lessonData || lessonData.length === 0) {
        console.log('⚠️ No lesson data available');
        return;
    }
    
    // Initialize counts
    let polyCount = 0;
    let factCount = 0;
    let mdasCount = 0;
    let polyResources = 0;
    let factResources = 0;
    let mdasResources = 0;
    
    lessonData.forEach(lesson => {
        // Get subject name safely
        let subjectName = '';
        
        if (lesson.subject && typeof lesson.subject === 'object' && lesson.subject.name) {
            subjectName = lesson.subject.name.toLowerCase();
        } else if (lesson.subject && typeof lesson.subject === 'string') {
            subjectName = lesson.subject.toLowerCase();
        } else if (lesson.lesson_name && typeof lesson.lesson_name === 'string') {
            subjectName = lesson.lesson_name.toLowerCase();
        } else if (lesson.subject_name && typeof lesson.subject_name === 'string') {
            subjectName = lesson.subject_name.toLowerCase();
        }
        
        // Check if it's a resource (video, pdf, etc.)
        const isResource = lesson.type === 'video' || lesson.type === 'pdf' || 
                          lesson.content_type === 'video' || lesson.content_type === 'pdf';
        
        // Count by subject
        if (subjectName.includes('poly') || subjectName === 'polynomial' || subjectName === 'polylearn') {
            polyCount++;
            if (isResource) polyResources++;
        } 
        else if (subjectName.includes('fact') || subjectName === 'factorial' || subjectName === 'factolearn') {
            factCount++;
            if (isResource) factResources++;
        } 
        else if (subjectName.includes('math') || subjectName === 'mdas' || subjectName === 'mathease') {
            mdasCount++;
            if (isResource) mdasResources++;
        }
    });
    
    console.log('📊 Subject counts:', { 
        poly: polyCount, 
        fact: factCount, 
        mdas: mdasCount,
        polyResources,
        factResources,
        mdasResources
    });
    
    // Update subjectData object
    subjectData.polynomial.lessons = polyCount;
    subjectData.polynomial.resources = polyResources;
    subjectData.factorial.lessons = factCount;
    subjectData.factorial.resources = factResources;
    subjectData.mdas.lessons = mdasCount;
    subjectData.mdas.resources = mdasResources;
    
    // Update UI elements with null checks
    const polyLessonsEl = document.getElementById('polyLessons');
    const factLessonsEl = document.getElementById('factLessons');
    const mdasLessonsEl = document.getElementById('mdasLessons');
    
    if (polyLessonsEl) polyLessonsEl.textContent = polyCount;
    if (factLessonsEl) factLessonsEl.textContent = factCount;
    if (mdasLessonsEl) mdasLessonsEl.textContent = mdasCount;
    
    const polyResourcesEl = document.getElementById('polyResources');
    const factResourcesEl = document.getElementById('factResources');
    const mdasResourcesEl = document.getElementById('mdasResources');
    
    if (polyResourcesEl) polyResourcesEl.textContent = polyResources;
    if (factResourcesEl) factResourcesEl.textContent = factResources;
    if (mdasResourcesEl) mdasResourcesEl.textContent = mdasResources;
    
    // Update progress bars
    const polyProgress = Math.min(100, Math.round((polyCount / 20) * 100));
    const factProgress = Math.min(100, Math.round((factCount / 20) * 100));
    const mdasProgress = Math.min(100, Math.round((mdasCount / 20) * 100));
    
    const polyProgressFill = document.querySelector('.subject-card[data-subject="polynomial"] .progress-fill-small');
    const polyProgressLabel = document.querySelector('.subject-card[data-subject="polynomial"] .progress-label span:last-child');
    
    const factProgressFill = document.querySelector('.subject-card[data-subject="factorial"] .progress-fill-small');
    const factProgressLabel = document.querySelector('.subject-card[data-subject="factorial"] .progress-label span:last-child');
    
    const mdasProgressFill = document.querySelector('.subject-card[data-subject="mdas"] .progress-fill-small');
    const mdasProgressLabel = document.querySelector('.subject-card[data-subject="mdas"] .progress-label span:last-child');
    
    if (polyProgressFill) polyProgressFill.style.width = polyProgress + '%';
    if (polyProgressLabel) polyProgressLabel.textContent = polyProgress + '%';
    
    if (factProgressFill) factProgressFill.style.width = factProgress + '%';
    if (factProgressLabel) factProgressLabel.textContent = factProgress + '%';
    
    if (mdasProgressFill) mdasProgressFill.style.width = mdasProgress + '%';
    if (mdasProgressLabel) mdasProgressLabel.textContent = mdasProgress + '%';
    
    console.log('✅ Subject stats updated successfully');
}

// ===== UPDATE LESSON STATS (make sure this function exists too) =====
function updateLessonStats(stats) {
    console.log('📊 Updating lesson stats:', stats);
    
    // Update main stats
    const totalLessonsSidebar = document.getElementById('totalLessonsSidebar');
    if (totalLessonsSidebar) {
        totalLessonsSidebar.textContent = stats.total_lessons || lessonData.length || 0;
    }
    
    // Update quick stats in dashboard
    const publishedEl = document.getElementById('publishedLessons');
    const draftEl = document.getElementById('draftLessons');
    const avgCompletionEl = document.getElementById('avgCompletion');
    
    if (publishedEl) {
        const active = stats.active_lessons || lessonData.filter(l => l.status === 'active').length || 0;
        publishedEl.textContent = active;
    }
    
    if (draftEl) {
        const inactive = stats.inactive_lessons || lessonData.filter(l => l.status === 'inactive').length || 0;
        draftEl.textContent = inactive;
    }
    
    if (avgCompletionEl) {
        let avgScore = stats.avg_score_all || 0;
        if (avgScore === 0 && lessonData.length > 0) {
            const scores = lessonData
                .map(l => l.stats?.avg_score || 0)
                .filter(score => score > 0);
            
            if (scores.length > 0) {
                avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
        }
        avgCompletionEl.textContent = avgScore + '%';
    }
}

// ===== UPDATE SUBJECT COUNTS =====
function updateSubjectCounts() {
    // Count by subject
    const polyCount = lessonData.filter(l => 
        l.subject?.name?.toLowerCase().includes('poly') || 
        l.subject?.name === 'PolyLearn'
    ).length;
    
    const factCount = lessonData.filter(l => 
        l.subject?.name?.toLowerCase().includes('fact') || 
        l.subject?.name === 'FactoLearn'
    ).length;
    
    const mdasCount = lessonData.filter(l => 
        l.subject?.name?.toLowerCase().includes('math') || 
        l.subject?.name === 'MathEase' ||
        l.subject?.name?.toLowerCase().includes('mdas')
    ).length;
    
    // Update UI
    document.getElementById('polyLessons').textContent = polyCount;
    document.getElementById('factLessons').textContent = factCount;
    document.getElementById('mdasLessons').textContent = mdasCount;
    
    // Count resources
    document.getElementById('polyResources').textContent = 
        lessonData.filter(l => l.type === 'video' || l.type === 'pdf').filter(l => 
            l.subject?.name?.toLowerCase().includes('poly')
        ).length;
    
    document.getElementById('factResources').textContent = 
        lessonData.filter(l => l.type === 'video' || l.type === 'pdf').filter(l => 
            l.subject?.name?.toLowerCase().includes('fact')
        ).length;
    
    document.getElementById('mdasResources').textContent = 
        lessonData.filter(l => l.type === 'video' || l.type === 'pdf').filter(l => 
            l.subject?.name?.toLowerCase().includes('math')
        ).length;
    
    // Update progress bars
    const polyProgress = Math.min(100, Math.round((polyCount / 20) * 100));
    const factProgress = Math.min(100, Math.round((factCount / 20) * 100));
    const mdasProgress = Math.min(100, Math.round((mdasCount / 20) * 100));
    
    document.querySelectorAll('.subject-card[data-subject="polynomial"] .progress-fill-small')[0].style.width = polyProgress + '%';
    document.querySelectorAll('.subject-card[data-subject="polynomial"] .progress-label span:last-child')[0].textContent = polyProgress + '%';
    
    document.querySelectorAll('.subject-card[data-subject="factorial"] .progress-fill-small')[0].style.width = factProgress + '%';
    document.querySelectorAll('.subject-card[data-subject="factorial"] .progress-label span:last-child')[0].textContent = factProgress + '%';
    
    document.querySelectorAll('.subject-card[data-subject="mdas"] .progress-fill-small')[0].style.width = mdasProgress + '%';
    document.querySelectorAll('.subject-card[data-subject="mdas"] .progress-label span:last-child')[0].textContent = mdasProgress + '%';
}

// ===== FINAL FIXED: UPDATE SIDEBAR STATS =====
function updateSidebarStats() {
    console.log('📊 Updating sidebar stats...');
    console.log('myStudents length inside updateSidebarStats:', myStudents ? myStudents.length : 0);
    
    // Get total students from myStudents array
    let totalStudents = 0;
    
    if (myStudents && myStudents.length > 0) {
        totalStudents = myStudents.length;
        console.log(`✅ Found ${totalStudents} students in myStudents array`);
    } else {
        console.log('⚠️ No students in myStudents array');
    }
    
    // Update ALL student count elements
    const studentCountEl = document.getElementById('studentCount');
    const welcomeStudentCount = document.getElementById('welcomeStudentCount');
    const sidebarStudentCount = document.getElementById('sidebarStudentCount');
    const totalStudentsSidebar = document.getElementById('totalStudentsSidebar');
    
    if (studentCountEl) {
        studentCountEl.textContent = totalStudents;
        console.log('studentCount set to:', totalStudents);
    }
    
    if (welcomeStudentCount) {
        welcomeStudentCount.textContent = totalStudents;
        console.log('welcomeStudentCount set to:', totalStudents);
    }
    
    if (sidebarStudentCount) {
        sidebarStudentCount.textContent = totalStudents;
        console.log('sidebarStudentCount set to:', totalStudents);
    }
    
    if (totalStudentsSidebar) {
        totalStudentsSidebar.textContent = totalStudents;
        console.log('totalStudentsSidebar set to:', totalStudents);
    }
    
    // Update other stats
    const totalLessonsEl = document.getElementById('totalLessonsSidebar');
    const totalSubjectsEl = document.getElementById('totalSubjectsSidebar');
    const totalResourcesEl = document.getElementById('totalResourcesSidebar');
    
    if (totalLessonsEl) {
        const lessonCount = (lessonData && lessonData.length) || (myLessons && myLessons.length) || 0;
        totalLessonsEl.textContent = lessonCount;
        console.log('totalLessonsSidebar set to:', lessonCount);
    }
    
    if (totalSubjectsEl) {
        totalSubjectsEl.textContent = 3;
        console.log('totalSubjectsSidebar set to: 3');
    }
    
    if (totalResourcesEl) {
        let resourceCount = 0;
        if (lessonData && lessonData.length > 0) {
            resourceCount = lessonData.filter(lesson => 
                lesson.content_type === 'video' || 
                lesson.content_type === 'pdf'
            ).length;
        }
        totalResourcesEl.textContent = resourceCount;
        console.log('totalResourcesSidebar set to:', resourceCount);
    }
}

// ===== LOAD MY LESSONS (WITH CACHE) =====
async function loadMyLessons(forceRefresh = false) {
    // Check cache
    if (!forceRefresh && myLessons && myLessons.length > 0) {
        console.log(`✅ Using cached lessons: ${myLessons.length} lessons`);
        return myLessons;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const result = await response.json();
        
        if (result.success && result.lessons) {
            myLessons = result.lessons;
            lessonData = result.lessons;
            
            console.log(`✅ Loaded and cached ${myLessons.length} lessons from DB`);
            
            // Count OWN lessons only for stats
            const ownLessons = myLessons.filter(l => l.is_own);
            
            publishedLessons = ownLessons.filter(l => l.is_active === 1).length;
            draftLessons = ownLessons.filter(l => l.is_active === 0).length;
            
            // Calculate average completion
            const ownWithCompletion = ownLessons.filter(l => l.completion_rate);
            const totalCompletion = ownWithCompletion.reduce((sum, l) => sum + (parseInt(l.completion_rate) || 0), 0);
            avgCompletion = ownWithCompletion.length > 0 ? Math.round(totalCompletion / ownWithCompletion.length) : 0;
            
            // Update quick stats
            updateQuickStats();
            
            // Update subject stats
            await loadSubjectStats();
            
            // Update sidebar stats
            updateSidebarStats();
            
            return myLessons;
        }
        
    } catch (error) {
        console.error('❌ Error loading lessons:', error);
    }
}

// ===== FIXED VERSION: LOAD SUBJECT STATS =====
async function loadSubjectStats() {
    // Count lessons per subject
    let polyCount = 0;
    let factCount = 0;
    let mdasCount = 0;
    
    myLessons.forEach(lesson => {
        // SAFELY get subject name - check kung string or object
        let subjectName = '';
        
        // Try different possible fields where subject might be stored
        if (lesson.lesson_name && typeof lesson.lesson_name === 'string') {
            subjectName = lesson.lesson_name.toLowerCase();
        } else if (lesson.subject && typeof lesson.subject === 'string') {
            subjectName = lesson.subject.toLowerCase();
        } else if (lesson.subject && typeof lesson.subject === 'object' && lesson.subject.name) {
            // If subject is an object with a name property
            subjectName = lesson.subject.name.toLowerCase();
        } else if (lesson.lesson_title && typeof lesson.lesson_title === 'string') {
            subjectName = lesson.lesson_title.toLowerCase();
        }
        
        // Check for polynomial/polylearn
        if (subjectName.includes('poly') || subjectName === 'polynomial' || subjectName === 'polylearn') {
            polyCount++;
        } 
        // Check for factorial/factolearn
        else if (subjectName.includes('fact') || subjectName === 'factorial' || subjectName === 'factolearn') {
            factCount++;
        } 
        // Check for mdas/mathease
        else if (subjectName.includes('math') || subjectName === 'mdas' || subjectName === 'mathease') {
            mdasCount++;
        }
    });
    
    console.log('📊 Subject counts:', { poly: polyCount, fact: factCount, mdas: mdasCount });
    
    // Update subject data
    subjectData.polynomial.lessons = polyCount;
    subjectData.factorial.lessons = factCount;
    subjectData.mdas.lessons = mdasCount;
    
    // Update UI with null checks
    const polyLessonsEl = document.getElementById('polyLessons');
    const factLessonsEl = document.getElementById('factLessons');
    const mdasLessonsEl = document.getElementById('mdasLessons');
    
    if (polyLessonsEl) polyLessonsEl.textContent = polyCount;
    if (factLessonsEl) factLessonsEl.textContent = factCount;
    if (mdasLessonsEl) mdasLessonsEl.textContent = mdasCount;
    
    // Count resources
    subjectData.polynomial.resources = myLessons.filter(l => {
        // Check if lesson belongs to polynomial
        let subjectName = '';
        if (l.lesson_name && typeof l.lesson_name === 'string') {
            subjectName = l.lesson_name.toLowerCase();
        } else if (l.subject && typeof l.subject === 'string') {
            subjectName = l.subject.toLowerCase();
        } else if (l.subject && typeof l.subject === 'object' && l.subject.name) {
            subjectName = l.subject.name.toLowerCase();
        }
        
        return (subjectName.includes('poly') || subjectName === 'polynomial') && 
               (l.content_type === 'video' || l.content_type === 'pdf');
    }).length;
    
    subjectData.factorial.resources = myLessons.filter(l => {
        let subjectName = '';
        if (l.lesson_name && typeof l.lesson_name === 'string') {
            subjectName = l.lesson_name.toLowerCase();
        } else if (l.subject && typeof l.subject === 'string') {
            subjectName = l.subject.toLowerCase();
        } else if (l.subject && typeof l.subject === 'object' && l.subject.name) {
            subjectName = l.subject.name.toLowerCase();
        }
        
        return (subjectName.includes('fact') || subjectName === 'factorial') && 
               (l.content_type === 'video' || l.content_type === 'pdf');
    }).length;
    
    subjectData.mdas.resources = myLessons.filter(l => {
        let subjectName = '';
        if (l.lesson_name && typeof l.lesson_name === 'string') {
            subjectName = l.lesson_name.toLowerCase();
        } else if (l.subject && typeof l.subject === 'string') {
            subjectName = l.subject.toLowerCase();
        } else if (l.subject && typeof l.subject === 'object' && l.subject.name) {
            subjectName = l.subject.name.toLowerCase();
        }
        
        return (subjectName.includes('math') || subjectName === 'mdas') && 
               (l.content_type === 'video' || l.content_type === 'pdf');
    }).length;
    
    // Update resource counts with null checks
    const polyResourcesEl = document.getElementById('polyResources');
    const factResourcesEl = document.getElementById('factResources');
    const mdasResourcesEl = document.getElementById('mdasResources');
    
    if (polyResourcesEl) polyResourcesEl.textContent = subjectData.polynomial.resources;
    if (factResourcesEl) factResourcesEl.textContent = subjectData.factorial.resources;
    if (mdasResourcesEl) mdasResourcesEl.textContent = subjectData.mdas.resources;
    
    // Update progress bars
    const polyProgress = Math.min(100, Math.round((polyCount / 10) * 100));
    const factProgress = Math.min(100, Math.round((factCount / 10) * 100));
    const mdasProgress = Math.min(100, Math.round((mdasCount / 10) * 100));
    
    const polyProgressFill = document.querySelector('.subject-card[data-subject="polynomial"] .progress-fill-small');
    const polyProgressLabel = document.querySelector('.subject-card[data-subject="polynomial"] .progress-label span:last-child');
    
    const factProgressFill = document.querySelector('.subject-card[data-subject="factorial"] .progress-fill-small');
    const factProgressLabel = document.querySelector('.subject-card[data-subject="factorial"] .progress-label span:last-child');
    
    const mdasProgressFill = document.querySelector('.subject-card[data-subject="mdas"] .progress-fill-small');
    const mdasProgressLabel = document.querySelector('.subject-card[data-subject="mdas"] .progress-label span:last-child');
    
    if (polyProgressFill) polyProgressFill.style.width = polyProgress + '%';
    if (polyProgressLabel) polyProgressLabel.textContent = polyProgress + '%';
    
    if (factProgressFill) factProgressFill.style.width = factProgress + '%';
    if (factProgressLabel) factProgressLabel.textContent = factProgress + '%';
    
    if (mdasProgressFill) mdasProgressFill.style.width = mdasProgress + '%';
    if (mdasProgressLabel) mdasProgressLabel.textContent = mdasProgress + '%';
    
    console.log('✅ Subject stats updated');
}

function selectSubject(subject) {
    if (currentSubject === subject) return;
    
    document.querySelectorAll('.subject-card').forEach(card => {
        card.classList.remove('active');
    });
    
    const newCard = document.querySelector(`.subject-card[data-subject="${subject}"]`);
    if (newCard) {
        newCard.classList.add('active');
    }
    
    currentSubject = subject;
    updateActiveSubject();
}

// ===== SIMPLE VERSION: UPDATE ACTIVE SUBJECT =====
function updateActiveSubject() {
    const subject = subjectData[currentSubject];
    
    if (!subject) return;
    
    console.log('Updating active subject, students =', subject.students);
    
    // Update ALL student count elements
    const studentCount = document.getElementById('studentCount');
    if (studentCount) studentCount.textContent = subject.students;
    
    const welcomeStudentCount = document.getElementById('welcomeStudentCount');
    if (welcomeStudentCount) welcomeStudentCount.textContent = subject.students;
    
    const sidebarStudentCount = document.getElementById('sidebarStudentCount');
    if (sidebarStudentCount) sidebarStudentCount.textContent = subject.students;
    
    // Update other elements
    const elements = {
        'welcomeSubjectName': subject.name,
        'welcomeSubjectDesc': subject.description,
        'welcomeLessonCount': subject.lessons || 0,
        'welcomeResourceCount': subject.resources || 0,
        'sidebarSubjectName': subject.name,
        'sidebarLessonCount': subject.lessons || 0,
        'sidebarProgress': Math.min(100, Math.round(((subject.lessons || 0) / 10) * 100)) + '%',
        'currentSubjectName': subject.name,
        'lessonCount': subject.lessons || 0,
        'resourceCount': subject.resources || 0
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }
}




// ============================================
// EDIT & CREATE LESSON FUNCTIONS FOR TEACHER
// ============================================

// Global variables for current lesson being edited
let currentEditLessonId = null;
let currentEditLessonData = null;

// ===== OPEN CREATE LESSON MODAL (WALANG CONFLICT) =====

// ===== CLOSE CREATE LESSON MODAL =====
function closeCreateLessonModal() {
    const modal = document.getElementById('createLessonModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        
        // Check if there are any other modals open
        const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => 
            m.style.display === 'flex' || m.classList.contains('show')
        );
        
        if (!anyModalOpen) {
            document.body.classList.remove('modal-open');
        }
    }
}

// ===== SHOW CONTENT SECTION =====
function showContentSection(section) {
    // Hide all sections
    document.getElementById('videoContentSection').style.display = 'none';
    document.getElementById('pdfContentSection').style.display = 'none';
    document.getElementById('textContentSection').style.display = 'none';
    
    // Remove active class from buttons
    document.getElementById('videoTypeBtn').classList.remove('active');
    document.getElementById('pdfTypeBtn').classList.remove('active');
    document.getElementById('textTypeBtn').classList.remove('active');
    
    // Show selected section
    if (section === 'video') {
        document.getElementById('videoContentSection').style.display = 'block';
        document.getElementById('videoTypeBtn').classList.add('active');
    } else if (section === 'pdf') {
        document.getElementById('pdfContentSection').style.display = 'block';
        document.getElementById('pdfTypeBtn').classList.add('active');
    } else if (section === 'text') {
        document.getElementById('textContentSection').style.display = 'block';
        document.getElementById('textTypeBtn').classList.add('active');
    }
}

// ===== VIDEO UPLOAD HANDLERS =====
function triggerVideoUpload() {
    document.getElementById('videoFileInput').click();
}

function handleVideoFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('videoFileName').textContent = file.name;
    document.getElementById('videoFileSize').textContent = (file.size / (1024*1024)).toFixed(2) + ' MB';
    document.getElementById('videoFileInfo').style.display = 'block';
    
    // Preview
    const preview = document.getElementById('videoPreview');
    const previewContainer = document.getElementById('videoPreviewContainer');
    preview.src = URL.createObjectURL(file);
    previewContainer.style.display = 'block';
    
    // Highlight upload area
    document.getElementById('videoUploadArea').style.borderColor = '#4caf50';
}

function removeVideoFile() {
    document.getElementById('videoFileInput').value = '';
    document.getElementById('videoFileInfo').style.display = 'none';
    document.getElementById('videoPreviewContainer').style.display = 'none';
    document.getElementById('videoUploadArea').style.borderColor = '#ddd';
}

// ===== PDF UPLOAD HANDLERS =====
function triggerPdfUpload() {
    document.getElementById('pdfFileInput').click();
}

function handlePdfFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('pdfFileName').textContent = file.name;
    document.getElementById('pdfFileSize').textContent = (file.size / (1024*1024)).toFixed(2) + ' MB';
    document.getElementById('pdfFileInfo').style.display = 'block';
}

function removePdfFile() {
    document.getElementById('pdfFileInput').value = '';
    document.getElementById('pdfFileInfo').style.display = 'none';
}

// ===== TEXT UPLOAD HANDLERS =====
function triggerTextFileUpload() {
    document.getElementById('textFileInput').click();
}

function handleTextFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('textFileName').textContent = file.name;
    document.getElementById('textFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
    document.getElementById('textFileInfo').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('textContentInput').value = e.target.result;
    };
    reader.readAsText(file);
}

function removeTextFile() {
    document.getElementById('textFileInput').value = '';
    document.getElementById('textFileInfo').style.display = 'none';
}

// ===== CLOSE EDIT LESSON MODAL (UPDATED) =====
function closeEditLessonModal() {
    console.log("🔴 Closing edit lesson modal...");
    const modal = document.getElementById('editLessonModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        
        // I-restore ang questionModal
        const questionModal = document.getElementById('questionModal');
        if (questionModal) {
            questionModal.style.opacity = '1';
            questionModal.style.pointerEvents = 'auto';
        }
        
        currentEditLessonId = null;
        currentEditLessonData = null;
    }
}
// ===== SAVE EDITED LESSON (FIXED) =====
async function saveEditedLesson() {
    console.log("%c========== SAVE EDITED LESSON ==========", "color: purple; font-size: 14px; font-weight: bold");
    
    const lessonIdInput = document.getElementById('editLessonId');
    if (!lessonIdInput) {
        showNotification('error', 'Error', 'Lesson ID not found');
        return;
    }
    
    const lessonId = lessonIdInput.value;
    if (!lessonId) {
        showNotification('error', 'Error', 'No lesson selected');
        return;
    }
    
    const titleInput = document.getElementById('editLessonTitle');
    const descInput = document.getElementById('editLessonDescription');
    const subjectSelect = document.getElementById('editLessonSubject');
    const statusSelect = document.getElementById('editLessonStatus');
    
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';
    const subject = subjectSelect ? subjectSelect.value : 'polynomial';
    const is_active = statusSelect ? statusSelect.value === '1' : true;
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a lesson title');
        return;
    }
    
    const keepVideoCheck = document.getElementById('keepExistingVideo');
    const videoFileInput = document.getElementById('editVideoFileInput');
    const youtubeUrlInput = document.getElementById('editVideoYoutubeUrl');
    
    const keepTextCheck = document.getElementById('keepExistingText');
    const textContentInput = document.getElementById('editTextContentInput');
    
    const keepVideo = keepVideoCheck ? keepVideoCheck.checked : true;
    const videoFile = videoFileInput?.files[0];
    const youtubeUrl = youtubeUrlInput?.value.trim();
    
    const keepText = keepTextCheck ? keepTextCheck.checked : true;
    const textContent = textContentInput?.value.trim();
    
    const saveBtn = document.querySelector('#editLessonModal .btn-primary');
    if (!saveBtn) {
        console.error('❌ Save button not found');
        showNotification('error', 'Error', 'Save button not found');
        return;
    }
    
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('subject', subject);
        formData.append('is_active', is_active ? '1' : '0');
        
        // Add new content if replacing
        if (!keepVideo) {
            if (youtubeUrl) {
                formData.append('youtube_url', youtubeUrl);
                formData.append('content_type', 'video');
            } else if (videoFile) {
                formData.append('video_file', videoFile);
                formData.append('content_type', 'video');
            }
        }
        
        if (!keepText && textContent) {
            formData.append('text_content', textContent);
            formData.append('content_type', 'text');
        }
        
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            throw new Error('No authentication token found');
        }
        
        console.log('🚀 Sending update request for lesson:', lessonId);
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons/${lessonId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('📥 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Server response:', result);
        
        if (result.success) {
            showNotification('success', 'Success!', 'Lesson updated successfully!');
            closeEditLessonModal();
            
            // Refresh lessons
            setTimeout(() => {
                loadMyLessons();
                loadLessonData();
                loadRecentLessons();
            }, 500);
        } else {
            throw new Error(result.message || 'Failed to update lesson');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('error', 'Failed', error.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
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
    document.getElementById('editExistingVideoInfo').style.display = 'none';
    
    document.getElementById('keepExistingVideo').checked = true;
    document.getElementById('keepExistingText').checked = true;
    
    toggleVideoReplaceMode();
    toggleTextReplaceMode();
}

// ===== SHOW EDIT CONTENT SECTION =====
function showEditContentSection(section) {
    document.getElementById('editVideoContentSection').style.display = 'none';
    document.getElementById('editTextContentSection').style.display = 'none';
    
    document.getElementById('editVideoTypeBtn').classList.remove('active');
    document.getElementById('editTextTypeBtn').classList.remove('active');
    
    if (section === 'video') {
        document.getElementById('editVideoContentSection').style.display = 'block';
        document.getElementById('editVideoTypeBtn').classList.add('active');
    } else {
        document.getElementById('editTextContentSection').style.display = 'block';
        document.getElementById('editTextTypeBtn').classList.add('active');
    }
}

// ===== EDIT VIDEO FUNCTIONS =====
function triggerEditVideoUpload() {
    const keepCheckbox = document.getElementById('keepExistingVideo');
    if (keepCheckbox && keepCheckbox.checked) {
        showNotification('warning', 'Cannot Upload', 'Uncheck "Keep existing video" first');
        return;
    }
    document.getElementById('editVideoFileInput').click();
}

function handleEditVideoFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('editNewVideoFilename').textContent = file.name + ' (' + (file.size / (1024*1024)).toFixed(2) + ' MB)';
    document.getElementById('editNewVideoIndicator').style.display = 'block';
    
    const preview = document.getElementById('editVideoPreview');
    const previewContainer = document.getElementById('editVideoPreviewContainer');
    preview.src = URL.createObjectURL(file);
    previewContainer.style.display = 'block';
    
    document.getElementById('editVideoUploadArea').style.borderColor = '#4caf50';
}

function cancelEditNewVideo() {
    document.getElementById('editVideoFileInput').value = '';
    document.getElementById('editNewVideoIndicator').style.display = 'none';
    document.getElementById('editVideoPreviewContainer').style.display = 'none';
    document.getElementById('editVideoUploadArea').style.borderColor = '#ddd';
}

function clearEditExistingVideo() {
    document.getElementById('editExistingVideoInfo').style.display = 'none';
    window.removeEditExistingVideo = true;
    showNotification('info', 'Video Removed', 'Existing video will be removed when you save');
}

// ===== EDIT TEXT FUNCTIONS =====
function triggerEditTextFileUpload() {
    const keepCheckbox = document.getElementById('keepExistingText');
    if (keepCheckbox && keepCheckbox.checked) {
        showNotification('warning', 'Cannot Upload', 'Uncheck "Keep existing text" first');
        return;
    }
    document.getElementById('editTextFileInput').click();
}

function handleEditTextFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    document.getElementById('editNewTextFilename').textContent = file.name;
    document.getElementById('editNewTextFileSize').textContent = (file.size / 1024).toFixed(2) + ' KB';
    document.getElementById('editNewTextIndicator').style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('editTextContentInput').value = e.target.result;
    };
    reader.readAsText(file);
}

function cancelEditNewText() {
    document.getElementById('editTextFileInput').value = '';
    document.getElementById('editNewTextIndicator').style.display = 'none';
    document.getElementById('editTextContentInput').value = '';
}

// ===== TOGGLE REPLACE MODES =====
function toggleVideoReplaceMode() {
    const keepCheckbox = document.getElementById('keepExistingVideo');
    const uploadArea = document.getElementById('editVideoUploadArea');
    
    if (keepCheckbox.checked) {
        uploadArea.style.opacity = '0.5';
        uploadArea.style.pointerEvents = 'none';
        document.getElementById('editVideoFileInput').value = '';
        document.getElementById('editNewVideoIndicator').style.display = 'none';
    } else {
        uploadArea.style.opacity = '1';
        uploadArea.style.pointerEvents = 'auto';
    }
}

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



// ===== SHOW FEEDBACK DASHBOARD (WITHOUT RELOAD) =====
function showFeedbackDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('feedbackDashboardSection');
    updatePageTitle('<i class="fas fa-comment-dots"></i> Feedback & Reviews', 'Feedback & Reviews');
    updateActiveNav('feedback');
    
    // Use cached feedback data
    if (teacherFeedbackData && teacherFeedbackData.length > 0) {
        console.log(`💬 Using cached feedback data (${teacherFeedbackData.length} items)`);
        displayTeacherFeedback(teacherFeedbackData);
        updateFeedbackStats(teacherFeedbackData);
    } else {
        // Load from server if no cache
        setTimeout(() => {
            loadTeacherFeedback();
        }, 100);
    }
}



// ===== VIEW SUBJECT LESSONS (FIXED - WITH DEBUGGING) =====
function viewSubjectLessons(subject, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    console.log("========== VIEW SUBJECT LESSONS ==========");
    console.log(`🔍 Viewing lessons for subject: ${subject}`);

    selectSubject(subject);

    const subjectInfo = subjectData[subject];
    if (!subjectInfo) {
        showNotification('error', 'Error', 'Subject not found');
        return;
    }

    const subjectName = subjectInfo.name;

    // Filter lessons by subject
    const lessons = myLessons.filter(l => {
        let lessonSubject = '';
        
        if (l.lesson_name && typeof l.lesson_name === 'string') {
            lessonSubject = l.lesson_name;
        } else if (l.subject && typeof l.subject === 'string') {
            lessonSubject = l.subject;
        }
        
        lessonSubject = lessonSubject.toLowerCase();
        const searchSubject = subjectName.toLowerCase();
        
        return lessonSubject.includes(searchSubject) || 
               (subject === 'polynomial' && lessonSubject.includes('poly')) ||
               (subject === 'factorial' && lessonSubject.includes('fact')) ||
               (subject === 'mdas' && (lessonSubject.includes('math') || lessonSubject.includes('mdas')));
    });

    console.log(`Found ${lessons.length} lessons for ${subjectName}`);

    // Close all other modals first


    // Use questionModal for viewing lessons
    openModal(`${subjectName} Lessons`);

    const modalBody = document.getElementById('modalBody');
    
    if (lessons.length === 0) {
        modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="fas fa-book-open" style="font-size: 3rem; color: #ccc;"></i>
                <h4>No Lessons Found</h4>
                <p>Create your first lesson for ${subjectName}</p>
                <button class="btn btn-primary" onclick="closeModal(); openCreateLessonModal()">Create Lesson</button>
            </div>
        `;
        return;
    }
    
    let html = '<div style="max-height: 400px; overflow-y: auto;">';
    
    lessons.forEach(lesson => {
        const date = new Date(lesson.created_at).toLocaleDateString();
        const typeIcon = lesson.content_type === 'video' ? 'fa-video' : 
                        lesson.content_type === 'pdf' ? 'fa-file-pdf' : 'fa-file-alt';
        
        html += `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <span style="width: 30px; height: 30px; background: #7a0000; color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${typeIcon}"></i>
                    </span>
                    <h4 style="margin: 0; flex: 1;">${lesson.content_title || 'Untitled'}</h4>
                    <span class="badge ${lesson.is_active ? 'badge-success' : 'badge-secondary'}">
                        ${lesson.is_active ? 'Published' : 'Draft'}
                    </span>
                </div>
                <p style="margin: 5px 0 5px 40px; color: #666; font-size: 0.9rem;">
                    ${lesson.content_description || 'No description'}
                </p>
                <div style="display: flex; gap: 15px; margin-left: 40px; font-size: 0.8rem; color: #999;">
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px; margin-left: 40px;">
                    <!-- ===== FIXED: Gumamit ng direct function call ===== -->
                    <button class="btn btn-sm btn-primary edit-lesson-btn" 
                            data-lesson-id="${lesson.content_id}"
                            style="cursor: pointer;">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger delete-lesson-btn" 
                            data-lesson-id="${lesson.content_id}"
                            style="cursor: pointer;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    modalBody.innerHTML = html;
    
    // ===== MAG-ADD NG EVENT LISTENERS PARA SA MGA BUTTON =====
    // Ito ang pinakamahalagang parte - gagamit tayo ng event listeners sa halip na onclick attribute
    
    setTimeout(() => {
        // Add event listeners to all edit buttons
        document.querySelectorAll('.edit-lesson-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const lessonId = this.getAttribute('data-lesson-id');
                console.log("Edit button clicked via listener, lesson ID:", lessonId);
                
                // Call editLesson directly without closing the modal
                if (typeof window.editLesson === 'function') {
                    window.editLesson(parseInt(lessonId), true);
                } else if (typeof editLesson === 'function') {
                    editLesson(parseInt(lessonId), true);
                } else {
                    console.error("editLesson function not found");
                    showNotification('error', 'Error', 'Edit function not available');
                }
            });
        });
        
        // Add event listeners to all delete buttons
        document.querySelectorAll('.delete-lesson-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const lessonId = this.getAttribute('data-lesson-id');
                console.log("Delete button clicked via listener, lesson ID:", lessonId);
                
                if (confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
                    if (typeof window.deleteLesson === 'function') {
                        window.deleteLesson(parseInt(lessonId), true);
                    } else if (typeof deleteLesson === 'function') {
                        deleteLesson(parseInt(lessonId), true);
                    }
                }
            });
        });
    }, 100);
    
    // Update footer buttons
    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Close</button>
        `;
    }
}




// ===== HANDLE EDIT BUTTON CLICK =====
function handleEditButtonClick(event, lessonId) {
    // IMPORTANT: Prevent event from bubbling up
    event.preventDefault();
    event.stopPropagation();
    
    console.log("%c========== EDIT BUTTON CLICKED ==========", "color: green; font-size: 14px; font-weight: bold");
    console.log("Lesson ID:", lessonId);
    
    // I-save ang current state ng questionModal para hindi ito mawala
    const questionModal = document.getElementById('questionModal');
    if (questionModal) {
        // I-ensure na mananatiling visible ang questionModal sa background
        questionModal.style.opacity = '0.5';
        questionModal.style.pointerEvents = 'none';
    }
    
    // Call editLesson function with the second argument `true` to keep the current modal open
    if (typeof window.editLesson === 'function') {
        window.editLesson(parseInt(lessonId), true);
    } else if (typeof editLesson === 'function') {
        editLesson(parseInt(lessonId), true);
    } else {
        console.error("❌ editLesson function not found");
        showNotification('error', 'Error', 'Edit function not available');
    }
}

// ===== HANDLE DELETE BUTTON CLICK =====
function handleDeleteButtonClick(event, lessonId) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log("%c========== DELETE BUTTON CLICKED ==========", "color: red; font-size: 14px; font-weight: bold");
    console.log("Lesson ID:", lessonId);
    
    if (confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
        if (typeof window.deleteLesson === 'function') {
            window.deleteLesson(parseInt(lessonId), true);
        } else if (typeof deleteLesson === 'function') {
            deleteLesson(parseInt(lessonId), true);
        }
    }
}


// ===== FIXED: RESET LESSON FORM =====
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
    
    // Reset dropdowns
    const lessonSelect = document.getElementById('createLessonLesson');
    const moduleSelect = document.getElementById('createLessonModule');
    const topicSelect = document.getElementById('createLessonTopic');
    
    if (lessonSelect) {
        lessonSelect.value = ''; // Start with no selection
    }
    
    if (moduleSelect) {
        moduleSelect.innerHTML = '<option value="">-- Select Module --</option>';
        moduleSelect.disabled = true;
        moduleSelect.value = '';
    }
    
    if (topicSelect) {
        topicSelect.innerHTML = '<option value="">-- Select Topic --</option>';
        topicSelect.disabled = true;
        topicSelect.value = '';
    }
    
    // Clear file inputs
    const videoInput = document.getElementById('videoFileInput');
    if (videoInput) videoInput.value = '';
    
    const pdfInput = document.getElementById('pdfFileInput');
    if (pdfInput) pdfInput.value = '';
    
    const textFileInput = document.getElementById('textFileInput');
    if (textFileInput) textFileInput.value = '';
    
    // Hide file info
    const videoInfo = document.getElementById('videoFileInfo');
    if (videoInfo) videoInfo.style.display = 'none';
    
    const pdfInfo = document.getElementById('pdfFileInfo');
    if (pdfInfo) pdfInfo.style.display = 'none';
    
    const textInfo = document.getElementById('textFileInfo');
    if (textInfo) textInfo.style.display = 'none';
    
    const previewContainer = document.getElementById('videoPreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Reset active button states
    const videoTypeBtn = document.getElementById('videoTypeBtn');
    const pdfTypeBtn = document.getElementById('pdfTypeBtn');
    const textTypeBtn = document.getElementById('textTypeBtn');
    
    if (videoTypeBtn) videoTypeBtn.classList.add('active');
    if (pdfTypeBtn) pdfTypeBtn.classList.remove('active');
    if (textTypeBtn) textTypeBtn.classList.remove('active');
    
    // Show video section by default
    showContentSection('video');
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
    document.getElementById('editExistingVideoInfo').style.display = 'none';
    
    document.getElementById('keepExistingVideo').checked = true;
    document.getElementById('keepExistingText').checked = true;
    
    toggleVideoReplaceMode();
    toggleTextReplaceMode();
    
    document.getElementById('editVideoUploadArea').style.borderColor = '#ddd';
    document.getElementById('editVideoUploadArea').style.background = '';
}


// ===== SHOW EDIT CONTENT SECTION =====
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






// ============================================
// SUBJECT ACTIONS - EDIT, ADD RESOURCE, VIEW
// ============================================

// ===== EDIT SUBJECT (UPDATED) =====
function editSubject(subject, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const subjectInfo = subjectData[subject];
    if (!subjectInfo) return;

    // Close all other modals first
    closeAllModals();

    // Use questionModal for editing subject
    openModal(`Edit ${subjectInfo.name}`);

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-section">
            <div class="form-group">
                <label>Subject Name</label>
                <input type="text" class="form-control" value="${subjectInfo.name}" id="editSubjectName">
            </div>
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" rows="3" id="editSubjectDesc">${subjectInfo.description}</textarea>
            </div>
            <div class="form-group">
                <label>Icon Class</label>
                <input type="text" class="form-control" value="${subjectInfo.icon}" id="editSubjectIcon" placeholder="e.g., fas fa-superscript">
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" class="form-control" value="${subjectInfo.color}" id="editSubjectColor" style="height: 50px;">
            </div>
        </div>
    `;

    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveSubjectChanges('${subject}')">Save Changes</button>
        `;
    }
}

// ===== SAVE SUBJECT CHANGES =====
function saveSubjectChanges(subject) {
    const name = document.getElementById('editSubjectName')?.value;
    const desc = document.getElementById('editSubjectDesc')?.value;
    const icon = document.getElementById('editSubjectIcon')?.value;
    const color = document.getElementById('editSubjectColor')?.value;
    
    if (!name) {
        showNotification('error', 'Error', 'Subject name is required');
        return;
    }
    
    // Update local data
    if (subjectData[subject]) {
        subjectData[subject].name = name;
        subjectData[subject].description = desc;
        subjectData[subject].icon = icon || subjectData[subject].icon;
        subjectData[subject].color = color;
    }
    
    // Update UI
    updateActiveSubject();
    
    // Update subject card icons and colors
    const subjectCard = document.querySelector(`.subject-card[data-subject="${subject}"]`);
    if (subjectCard) {
        const iconEl = subjectCard.querySelector('.subject-icon i');
        if (iconEl) {
            iconEl.className = subjectData[subject].icon;
        }
        
        // Update color if needed
        subjectCard.style.borderColor = color;
    }
    
    showNotification('success', 'Subject Updated', `${name} has been updated`);
    closeModal();
}

// ===== ADD RESOURCE TO SUBJECT (UPDATED) =====
function addSubjectResource(subject, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    const subjectInfo = subjectData[subject];
    if (!subjectInfo) return;

    closeAllModals();

    // Use questionModal for adding resource
    openModal(`Add Resource to ${subjectInfo.name}`);

    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-section">
            <div class="form-group">
                <label>Resource Type</label>
                <select class="form-control" id="resourceType" onchange="toggleResourceFields()">
                    <option value="video">Video</option>
                    <option value="pdf">PDF Document</option>
                    <option value="link">External Link</option>
                    <option value="text">Text Content</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Title</label>
                <input type="text" class="form-control" id="resourceTitle" placeholder="Enter resource title">
            </div>
            
            <div class="form-group" id="resourceUrlGroup">
                <label>URL</label>
                <input type="text" class="form-control" id="resourceUrl" placeholder="Enter URL">
            </div>
            
            <div class="form-group" id="resourceFileGroup" style="display: none;">
                <label>Upload File</label>
                <div class="upload-area-small" onclick="document.getElementById('resourceFile').click()">
                    <i class="fas fa-cloud-upload-alt"></i> Choose File
                    <input type="file" id="resourceFile" style="display: none;" accept=".pdf,.mp4,.txt">
                </div>
                <div id="resourceFileName" class="file-name" style="margin-top: 10px;"></div>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" rows="3" id="resourceDesc" placeholder="Enter description"></textarea>
            </div>
            
            <div class="form-group">
                <label>Tags (comma separated)</label>
                <input type="text" class="form-control" id="resourceTags" placeholder="e.g., beginner, tutorial, exercise">
            </div>
        </div>
    `;

    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveResource('${subject}')">Add Resource</button>
        `;
    }
}

// ===== TOGGLE RESOURCE FIELDS BASED ON TYPE =====
function toggleResourceFields() {
    const type = document.getElementById('resourceType')?.value;
    const urlGroup = document.getElementById('resourceUrlGroup');
    const fileGroup = document.getElementById('resourceFileGroup');
    
    if (type === 'video' || type === 'link') {
        urlGroup.style.display = 'block';
        fileGroup.style.display = 'none';
    } else if (type === 'pdf' || type === 'text') {
        urlGroup.style.display = 'none';
        fileGroup.style.display = 'block';
    }
}

// ===== SAVE NEW RESOURCE =====
async function saveResource(subject) {
    const type = document.getElementById('resourceType')?.value;
    const title = document.getElementById('resourceTitle')?.value.trim();
    const url = document.getElementById('resourceUrl')?.value.trim();
    const desc = document.getElementById('resourceDesc')?.value.trim();
    const tags = document.getElementById('resourceTags')?.value.trim();
    const fileInput = document.getElementById('resourceFile');
    
    if (!title) {
        showNotification('error', 'Error', 'Title is required');
        return;
    }
    
    if ((type === 'video' || type === 'link') && !url) {
        showNotification('error', 'Error', 'URL is required');
        return;
    }
    
    showNotification('info', 'Saving', 'Adding resource...');
    
    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('description', desc || '');
        formData.append('tags', tags || '');
        formData.append('subject', subject);
        
        if (type === 'video' || type === 'link') {
            formData.append('url', url);
        } else if (fileInput && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }
        
        const token = localStorage.getItem('authToken');
        
        // Simulated API call - palitan ng actual endpoint
        // const response = await fetch(`${API_BASE_URL}/teacher/subjects/${subject}/resources`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${token}`
        //     },
        //     body: formData
        // });
        // 
        // const result = await response.json();
        
        // Simulated success
        setTimeout(() => {
            // Update local count
            if (subjectData[subject]) {
                subjectData[subject].resources++;
            }
            
            // Update UI
            document.getElementById(`${subject}Resources`).textContent = subjectData[subject].resources;
            
            showNotification('success', 'Resource Added', `"${title}" has been added to ${subjectData[subject].name}`);
            closeModal();
        }, 1000);
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// Open create lesson popup
function openCreateLessonPopup(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    openModal('Create New Lesson');
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-section">
            <div class="form-group">
                <label>Lesson Title</label>
                <input type="text" class="form-control" id="newLessonTitle" placeholder="Enter lesson title">
            </div>
            
            <div class="form-group">
                <label>Subject</label>
                <select class="form-control" id="newLessonSubject">
                    <option value="polynomial">PolyLearn</option>
                    <option value="factorial">FactoLearn</option>
                    <option value="mdas">MathEase</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" id="newLessonDescription" rows="3" placeholder="Enter lesson description"></textarea>
            </div>
            
            <div class="form-group">
                <label>Content Type</label>
                <select class="form-control" id="newLessonContentType">
                    <option value="video">Video</option>
                    <option value="pdf">PDF</option>
                    <option value="text">Text</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Content URL / File</label>
                <input type="text" class="form-control" id="newLessonContent" placeholder="Enter URL or file name">
            </div>
        </div>
    `;
    
    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="createNewLesson()">Create Lesson</button>
        `;
    }
}


// ===== OPEN EDIT LESSON MODAL (UPDATED WITH Z-INDEX) =====
async function editLesson(lessonId, keepCurrentModalOpen = false) {
    console.log("%c========== EDIT LESSON CALLED ==========", "color: blue; font-size: 14px; font-weight: bold");
    console.log("📝 Editing lesson:", lessonId);
    console.log("keepCurrentModalOpen:", keepCurrentModalOpen);
    
    // Convert to number
    const id = parseInt(lessonId);
    
    // Find lesson
    const lesson = myLessons.find(l => l.content_id === id);
    if (!lesson) {
        console.error("❌ Lesson not found");
        console.log("Available lessons:", myLessons);
        showNotification('error', 'Error', 'Lesson not found');
        return;
    }
    
    console.log("✅ Lesson found:", lesson.content_title);
    
    // --- IMPORTANT: Only close the previous modal if we're not keeping it open ---
    if (!keepCurrentModalOpen) {
        closeModal();
        await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Show the edit modal
    const modal = document.getElementById('editLessonModal');
    if (!modal) {
        console.error("❌ Edit modal not found");
        showNotification('error', 'Error', 'Edit modal not found');
        return;
    }
    
    // Reset form
    resetEditLessonForm();
    
    // Populate form - using the correct field IDs from HTML
    const idInput = document.getElementById('editLessonId');
    const titleInput = document.getElementById('editLessonTitle');
    const descInput = document.getElementById('editLessonDescription');
    const statusSelect = document.getElementById('editLessonStatus');
    const subjectSelect = document.getElementById('editLessonSubject');
    
    if (idInput) idInput.value = id;
    if (titleInput) titleInput.value = lesson.content_title || '';
    if (descInput) descInput.value = lesson.content_description || '';
    if (statusSelect) statusSelect.value = lesson.is_active ? '1' : '0';
    
    // Set subject
    if (subjectSelect) {
        const subject = lesson.lesson_name || lesson.subject || '';
        if (subject.toLowerCase().includes('poly')) {
            subjectSelect.value = 'polynomial';
        } else if (subject.toLowerCase().includes('fact')) {
            subjectSelect.value = 'factorial';
        } else if (subject.toLowerCase().includes('math') || subject.toLowerCase().includes('mdas')) {
            subjectSelect.value = 'mdas';
        }
    }
    
    // Show current content info
    const editCurrentContentType = document.getElementById('editCurrentContentType');
    if (editCurrentContentType) {
        editCurrentContentType.textContent = (lesson.content_type || 'text').toUpperCase();
    }
    
    const editExistingVideoInfo = document.getElementById('editExistingVideoInfo');
    const editExistingVideoFilename = document.getElementById('editExistingVideoFilename');
    const editCurrentContentFilename = document.getElementById('editCurrentContentFilename');
    
    if (lesson.video_filename && editExistingVideoInfo && editExistingVideoFilename) {
        editExistingVideoFilename.textContent = lesson.video_filename;
        editExistingVideoInfo.style.display = 'block';
        if (editCurrentContentFilename) {
            editCurrentContentFilename.textContent = lesson.video_filename;
        }
    } else if (lesson.content_url && editCurrentContentFilename) {
        editCurrentContentFilename.textContent = 
            lesson.content_type === 'text' ? 'Text content' : lesson.content_url;
    }
    
    // ===== IMPORTANT: Set z-index para nasa ibabaw ng questionModal =====
    modal.style.zIndex = '10002'; // Higher than questionModal's 10000
    modal.style.display = 'flex';
    
    // Huwag nang mag-add ng modal-open class kung meron na
    // document.body.classList.add('modal-open'); - REMOVE THIS
    
    // Show appropriate content section
    if (lesson.content_type === 'video') {
        showEditContentSection('video');
    } else {
        showEditContentSection('text');
    }
    
    console.log("✅ Edit modal opened with z-index 10002");
}

// ===== DELETE LESSON (UPDATED) =====
async function deleteLesson(lessonId, keepCurrentModalOpen = false) {
    console.log("%c========== DELETE LESSON CALLED ==========", "color: orange; font-size: 14px; font-weight: bold");
    console.log("🗑️ Deleting lesson:", lessonId);
    
    const id = parseInt(lessonId);
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('success', 'Deleted', result.message);
            
            // Remove from local arrays
            myLessons = myLessons.filter(l => l.content_id !== id);
            lessonData = lessonData.filter(l => l.content_id !== id);
            
            // Refresh displays
            updateQuickStats();
            updateSidebarStats();
            updateSubjectStats();
            
            // If we're keeping the modal open, refresh the lesson list
            if (keepCurrentModalOpen) {
                // Close current modal and reopen with updated list
                closeModal();
                setTimeout(() => {
                    // You might want to refresh the view based on current subject
                    if (currentSubject) {
                        viewSubjectLessons(currentSubject);
                    }
                }, 300);
            } else {
                closeModal();
            }
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// Save lesson changes
function saveLessonChangesOld(lessonId) {
    const title = document.getElementById('editLessonTitle')?.value.trim();
    const desc = document.getElementById('editLessonDesc')?.value.trim();
    const status = document.getElementById('editLessonStatus')?.value;
    
    if (!title) {
        showNotification('error', 'Error', 'Lesson title is required');
        return;
    }
    
    // Find and update lesson in myLessons
    const lessonIndex = myLessons.findIndex(l => l.content_id === lessonId);
    if (lessonIndex !== -1) {
        myLessons[lessonIndex].content_title = title;
        myLessons[lessonIndex].content_description = desc;
        myLessons[lessonIndex].is_active = parseInt(status);
    }
    
    // Recalculate stats
    loadMyLessons();
    
    showNotification('success', 'Lesson Updated', 'Changes saved successfully');
    closeModal();
}


// ============================================
// ASSIGNMENTS & GRADING
// ============================================

async function loadAssignments() {
    console.log('📋 Loading assignments...');
    
    // Show loading state
    document.getElementById('assignmentsTableBody').innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <i class="fas fa-spinner fa-pulse fa-2x"></i>
                <p>Loading assignments...</p>
            </td>
        </tr>
    `;
    
    try {
        // Fetch assignments from server
        const response = await fetch(`${API_BASE_URL}/admin/assignments?teacher_id=${teacherId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        assignmentsData = result.assignments || [];
        
        // Update stats
        const active = assignmentsData.filter(a => a.status === 'active').length;
        const submitted = assignmentsData.filter(a => a.status === 'submitted').length;
        const graded = assignmentsData.filter(a => a.status === 'graded').length;
        const pending = assignmentsData.filter(a => a.status === 'pending').length;
        
        document.getElementById('activeAssignments').textContent = active;
        document.getElementById('submittedAssignments').textContent = submitted;
        document.getElementById('gradedAssignments').textContent = graded;
        document.getElementById('pendingGrading').textContent = pending;
        
        // Display assignments
        displayAssignments();
        
    } catch (error) {
        console.error('Error loading assignments:', error);
        
        // Use sample data if server fails
        assignmentsData = getSampleAssignments();
        
        document.getElementById('activeAssignments').textContent = '3';
        document.getElementById('submittedAssignments').textContent = '12';
        document.getElementById('gradedAssignments').textContent = '8';
        document.getElementById('pendingGrading').textContent = '4';
        
        displayAssignments();
    }
}

function getSampleAssignments() {
    return [
        {
            id: 1,
            title: 'Polynomial Functions Quiz',
            subject: 'PolyLearn',
            due_date: '2025-03-15',
            submissions: 24,
            total_students: 32,
            avg_grade: 78,
            status: 'active'
        },
        {
            id: 2,
            title: 'Factorial Notation Practice',
            subject: 'FactoLearn',
            due_date: '2025-03-10',
            submissions: 18,
            total_students: 28,
            avg_grade: 82,
            status: 'submitted'
        },
        {
            id: 3,
            title: 'MDAS Operations Worksheet',
            subject: 'MathEase',
            due_date: '2025-03-05',
            submissions: 25,
            total_students: 30,
            avg_grade: 85,
            status: 'graded'
        },
        {
            id: 4,
            title: 'Quadratic Equations Test',
            subject: 'PolyLearn',
            due_date: '2025-03-18',
            submissions: 10,
            total_students: 32,
            avg_grade: 0,
            status: 'pending'
        }
    ];
}

function displayAssignments() {
    const tableBody = document.getElementById('assignmentsTableBody');
    if (!tableBody) return;
    
    if (assignmentsData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-tasks" style="font-size: 2rem; color: #ccc;"></i>
                    <p>No assignments found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    assignmentsData.forEach(assignment => {
        const dueDate = new Date(assignment.due_date).toLocaleDateString();
        const submissionsPercent = assignment.total_students > 0 
            ? Math.round((assignment.submissions / assignment.total_students) * 100) 
            : 0;
        
        const statusClass = assignment.status === 'active' ? 'badge-success' :
                           assignment.status === 'submitted' ? 'badge-warning' :
                           assignment.status === 'graded' ? 'badge-info' : 'badge-secondary';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${assignment.title}</strong></td>
            <td>${assignment.subject}</td>
            <td>${dueDate}</td>
            <td>${assignment.submissions}/${assignment.total_students} (${submissionsPercent}%)</td>
            <td>${assignment.avg_grade}%</td>
            <td><span class="badge ${statusClass}">${assignment.status}</span></td>
            <td>
                <button class="btn-icon small" onclick="viewAssignment(${assignment.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon small" onclick="gradeAssignment(${assignment.id})" title="Grade">
                    <i class="fas fa-check-circle"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function filterAssignments() {
    filterAssignmentsByStatus();
}

function filterAssignmentsByStatus() {
    const filter = document.getElementById('assignmentStatusFilter')?.value || 'all';
    
    const filtered = filter === 'all' 
        ? assignmentsData 
        : assignmentsData.filter(a => a.status === filter);
    
    displayFilteredAssignments(filtered);
}

function filterAssignments(searchTerm) {
    if (!searchTerm) {
        displayAssignments();
        return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = assignmentsData.filter(a => 
        a.title.toLowerCase().includes(term) ||
        a.subject.toLowerCase().includes(term)
    );
    
    displayFilteredAssignments(filtered);
}

function displayFilteredAssignments(assignments) {
    const tableBody = document.getElementById('assignmentsTableBody');
    if (!tableBody) return;
    
    if (assignments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <p>No matching assignments found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    assignments.forEach(assignment => {
        const dueDate = new Date(assignment.due_date).toLocaleDateString();
        const submissionsPercent = assignment.total_students > 0 
            ? Math.round((assignment.submissions / assignment.total_students) * 100) 
            : 0;
        
        const statusClass = assignment.status === 'active' ? 'badge-success' :
                           assignment.status === 'submitted' ? 'badge-warning' :
                           assignment.status === 'graded' ? 'badge-info' : 'badge-secondary';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${assignment.title}</strong></td>
            <td>${assignment.subject}</td>
            <td>${dueDate}</td>
            <td>${assignment.submissions}/${assignment.total_students} (${submissionsPercent}%)</td>
            <td>${assignment.avg_grade}%</td>
            <td><span class="badge ${statusClass}">${assignment.status}</span></td>
            <td>
                <button class="btn-icon small" onclick="viewAssignment(${assignment.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon small" onclick="gradeAssignment(${assignment.id})" title="Grade">
                    <i class="fas fa-check-circle"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function createAssignment() {
    openModal('Create Assignment');
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="form-section">
            <div class="form-group">
                <label>Assignment Title</label>
                <input type="text" class="form-control" id="newAssignmentTitle" placeholder="Enter title">
            </div>
            
            <div class="form-group">
                <label>Subject</label>
                <select class="form-control" id="newAssignmentSubject">
                    <option value="polynomial">PolyLearn</option>
                    <option value="factorial">FactoLearn</option>
                    <option value="mdas">MathEase</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Description</label>
                <textarea class="form-control" id="newAssignmentDescription" rows="3" placeholder="Enter description"></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group half">
                    <label>Due Date</label>
                    <input type="date" class="form-control" id="newAssignmentDueDate">
                </div>
                
                <div class="form-group half">
                    <label>Total Points</label>
                    <input type="number" class="form-control" id="newAssignmentPoints" value="100" min="1">
                </div>
            </div>
            
            <div class="form-group">
                <label>Assign to Students</label>
                <select class="form-control" id="newAssignmentStudents" multiple size="3">
                    <option value="all">All Students</option>
                    ${myStudents.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                </select>
                <small class="text-muted">Hold Ctrl/Cmd to select multiple</small>
            </div>
        </div>
    `;
    
    // Update modal footer
    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveNewAssignment()">Create Assignment</button>
        `;
    }
}

function saveNewAssignment() {
    const title = document.getElementById('newAssignmentTitle')?.value.trim();
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a title');
        return;
    }
    
    showNotification('success', 'Assignment Created', `"${title}" has been created`);
    closeModal();
}

function viewAssignment(assignmentId) {
    const assignment = assignmentsData.find(a => a.id === assignmentId);
    if (!assignment) return;
    
    openModal('Assignment Details');
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="assignment-detail">
            <h3>${assignment.title}</h3>
            <p><strong>Subject:</strong> ${assignment.subject}</p>
            <p><strong>Due Date:</strong> ${new Date(assignment.due_date).toLocaleDateString()}</p>
            <p><strong>Submissions:</strong> ${assignment.submissions}/${assignment.total_students}</p>
            <p><strong>Average Grade:</strong> ${assignment.avg_grade}%</p>
            <p><strong>Status:</strong> ${assignment.status}</p>
            
            <hr>
            
            <h4>Student Submissions</h4>
            <div style="max-height: 300px; overflow-y: auto;">
                ${getSampleSubmissions(assignmentId)}
            </div>
        </div>
    `;
}

function getSampleSubmissions(assignmentId) {
    return `
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between;">
                <span>John Smith</span>
                <span>85%</span>
                <span><span class="badge badge-success">Graded</span></span>
            </div>
        </div>
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between;">
                <span>Sarah Johnson</span>
                <span>92%</span>
                <span><span class="badge badge-success">Graded</span></span>
            </div>
        </div>
        <div style="padding: 10px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between;">
                <span>Mike Wilson</span>
                <span>78%</span>
                <span><span class="badge badge-warning">Pending</span></span>
            </div>
        </div>
        <div style="padding: 10px;">
            <div style="display: flex; justify-content: space-between;">
                <span>Emily Davis</span>
                <span>Not submitted</span>
                <span><span class="badge badge-secondary">Missing</span></span>
            </div>
        </div>
    `;
}

function gradeAssignment(assignmentId) {
    openModal('Grade Assignment');
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div style="padding: 20px;">
            <p>Select student to grade:</p>
            <select class="form-control" id="gradeStudentSelect">
                <option value="">-- Select Student --</option>
                <option value="1">John Smith</option>
                <option value="2">Sarah Johnson</option>
                <option value="3">Mike Wilson</option>
            </select>
            
            <div style="margin-top: 20px;">
                <label>Score:</label>
                <input type="number" class="form-control" id="gradeScore" placeholder="Enter score" min="0" max="100">
            </div>
            
            <div style="margin-top: 20px;">
                <label>Feedback:</label>
                <textarea class="form-control" id="gradeFeedback" rows="3" placeholder="Enter feedback"></textarea>
            </div>
        </div>
    `;
    
    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="submitGrade()">Submit Grade</button>
        `;
    }
}

function submitGrade() {
    const score = document.getElementById('gradeScore')?.value;
    if (!score) {
        showNotification('error', 'Error', 'Please enter a score');
        return;
    }
    
    showNotification('success', 'Grade Submitted', 'Grade has been saved');
    closeModal();
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

async function loadProfileData() {
    console.log('👤 Loading profile data...');
    
    try {
        // Get user info from localStorage
        const userJson = localStorage.getItem('mathhub_user');
        if (userJson) {
            const user = JSON.parse(userJson);
            
            document.getElementById('teacherName').textContent = user.full_name || user.username || 'Teacher Name';
            document.getElementById('teacherFullName').value = user.full_name || user.username || '';
            document.getElementById('teacherEmail').value = user.email || '';
        }
        
        // Update profile stats
        const stats = document.querySelectorAll('.profile-stat .stat-value');
        if (stats.length >= 4) {
            stats[0].textContent = Object.keys(subjectData).length;
            stats[1].textContent = myLessons.length;
            stats[2].textContent = myStudents.length;
            stats[3].textContent = '4.8'; // Rating
        }
        
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function openProfileTab(tabId) {
    document.querySelectorAll('.profile-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.profile-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
}

function saveProfile() {
    const name = document.getElementById('teacherFullName')?.value;
    const email = document.getElementById('teacherEmail')?.value;
    
    if (!name || !email) {
        showNotification('error', 'Error', 'Please fill required fields');
        return;
    }
    
    showNotification('success', 'Profile Updated', 'Your profile has been updated');
}

// ============================================
// FEEDBACK & REVIEWS
// ============================================


function updateFeedbackStats() {
    const statsContainer = document.getElementById('feedbackStats');
    if (!statsContainer) return;
    
    // Get the current feedback from teacherFeedbackData
    const feedback = teacherFeedbackData || [];
    
    const total = feedback.length;
    const newCount = feedback.filter(f => f.status === 'new').length;
    const resolved = feedback.filter(f => f.status === 'resolved').length;
    
    const avgRating = feedback.filter(f => f.rating > 0)
        .reduce((sum, f) => sum + f.rating, 0) / 
        (feedback.filter(f => f.rating > 0).length || 1);
    
    // Satisfaction rate (ratings >= 4)
    const ratings = feedback.filter(f => f.rating > 0);
    const satisfied = ratings.filter(f => f.rating >= 4).length;
    const satisfactionRate = ratings.length > 0 
        ? Math.round((satisfied / ratings.length) * 100)
        : 0;
    
    // Update the stats HTML - ADJUST BASED ON YOUR HTML STRUCTURE
    const averageRatingEl = document.getElementById('averageRating');
    const totalReviewsEl = document.getElementById('totalReviews');
    const pendingFeedbackEl = document.getElementById('pendingFeedback');
    const satisfactionRateEl = document.getElementById('satisfactionRate');
    
    if (averageRatingEl) averageRatingEl.textContent = avgRating.toFixed(1);
    if (totalReviewsEl) totalReviewsEl.textContent = total;
    if (pendingFeedbackEl) pendingFeedbackEl.textContent = newCount;
    if (satisfactionRateEl) satisfactionRateEl.textContent = satisfactionRate + '%';
}



function filterFeedback() {
    const filter = document.getElementById('feedbackFilter')?.value || 'all';
    const typeFilter = document.getElementById('feedbackTypeFilter')?.value || 'all';
    
    let filtered = [...teacherFeedbackData];
    
    // Filter by status
    if (filter !== 'all') {
        filtered = filtered.filter(f => f.status === filter);
    }
    
    // Filter by type
    if (typeFilter !== 'all') {
        filtered = filtered.filter(f => f.type === typeFilter);
    }
    
    // Re-display filtered feedback
    displayFilteredFeedback(filtered);
}

// ===== DELETE or COMMENT OUT ang isa sa mga duplicate na 'to =====
function displayFilteredFeedback(feedback) {
    const feedbackList = document.getElementById('feedbackList');
    if (!feedbackList) return;
    
    if (feedback.length === 0) {
        feedbackList.innerHTML = `
            <div class="no-feedback-message">
                <i class="fas fa-filter"></i>
                <p>No matching feedback found</p>
            </div>
        `;
        return;
    }
    
    feedbackList.innerHTML = '';
    
    feedback.forEach(item => {
        const stars = generateStarRating(item.rating);
        const typeInfo = getFeedbackTypeInfo(item.type);
        const statusClass = item.status || 'new';
        
        const feedbackItem = document.createElement('div');
        feedbackItem.className = `feedback-item ${statusClass}`;
        feedbackItem.dataset.id = item.id;
        
        feedbackItem.innerHTML = `
            <div class="feedback-header">
                <div class="student-info">
                    <div class="student-avatar" style="background: ${getAvatarColor(item.student?.name)}">
                        ${item.student?.avatar || 'U'}
                    </div>
                    <div>
                        <h4 class="mobile-font-small">${item.student?.name || 'Anonymous'}</h4>
                        <span class="feedback-time">${item.time_ago || 'Recently'}</span>
                    </div>
                </div>
                <div class="feedback-status">
                    <span class="badge badge-${statusClass}">${statusClass.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="feedback-content">
                <div class="feedback-type">
                    <i class="fas ${typeInfo.icon}" style="color: ${typeInfo.color}"></i>
                    <span class="mobile-font-smaller">${typeInfo.label}</span>
                    ${item.rating ? `<span class="feedback-rating">${stars}</span>` : ''}
                </div>
                <p class="feedback-message mobile-font-smaller">${item.message || 'No message'}</p>
                ${item.lesson ? `
                    <div class="feedback-lesson">
                        <i class="fas fa-book-open"></i>
                        <span class="mobile-font-smaller">Lesson: ${item.lesson.title}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="feedback-actions">
                <button class="btn btn-sm btn-outline" onclick="viewFeedbackDetails(${item.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="btn btn-sm btn-primary" onclick="replyToFeedback(${item.id})">
                    <i class="fas fa-reply"></i> Reply
                </button>
                ${item.status === 'new' ? `
                    <button class="btn btn-sm btn-success" onclick="markFeedbackResolved(${item.id})">
                        <i class="fas fa-check-circle"></i> Mark Resolved
                    </button>
                ` : ''}
            </div>
        `;
        
        feedbackList.appendChild(feedbackItem);
    });
}

// ===== REPLY TO FEEDBACK (UPDATED) =====
async function replyToFeedback(feedbackId) {
    const feedback = teacherFeedbackData.find(f => f.id === feedbackId);
    if (!feedback) return;
    
    currentFeedbackId = feedbackId;
    
    // Open your modal
    const modal = document.getElementById('feedbackReplyModal');
    if (modal) {
        // Get student name
        let studentName = 'Anonymous';
        if (feedback.student && feedback.student.name) {
            studentName = feedback.student.name;
        } else if (feedback.student_name) {
            studentName = feedback.student_name;
        }
        
        // Populate modal with feedback data
        const studentNameEl = document.getElementById('replyStudentName');
        const studentAvatarEl = document.getElementById('replyStudentAvatar');
        const feedbackPreviewEl = document.getElementById('feedbackPreview');
        const ratingContainer = document.getElementById('replyRatingContainer');
        const ratingEl = document.getElementById('replyRating');
        const lessonContainer = document.getElementById('replyLessonContainer');
        const lessonTitleEl = document.getElementById('replyLessonTitle');
        
        if (studentNameEl) studentNameEl.textContent = studentName;
        if (studentAvatarEl) studentAvatarEl.textContent = getInitials(studentName);
        if (feedbackPreviewEl) feedbackPreviewEl.innerHTML = `<p>${feedback.message || 'No message'}</p>`;
        
        // Show rating if exists
        if (feedback.rating) {
            if (ratingContainer) ratingContainer.style.display = 'block';
            if (ratingEl) ratingEl.innerHTML = generateStarRating(feedback.rating);
        } else {
            if (ratingContainer) ratingContainer.style.display = 'none';
        }
        
        // Show lesson if exists
        let lessonTitle = null;
        if (feedback.lesson && feedback.lesson.title) {
            lessonTitle = feedback.lesson.title;
        } else if (feedback.lesson_title) {
            lessonTitle = feedback.lesson_title;
        }
        
        if (lessonTitle) {
            if (lessonContainer) lessonContainer.style.display = 'block';
            if (lessonTitleEl) lessonTitleEl.textContent = lessonTitle;
        } else {
            if (lessonContainer) lessonContainer.style.display = 'none';
        }
        
        // Clear previous response
        const responseEl = document.getElementById('feedbackResponse');
        if (responseEl) responseEl.value = '';
        
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    }
}

// ===== SEND FEEDBACK RESPONSE (UPDATED) =====
async function sendFeedbackResponse() {
    const response = document.getElementById('feedbackResponse')?.value.trim();
    const feedbackId = currentFeedbackId;
    
    if (!response) {
        showNotification('error', 'Error', 'Please enter a response');
        return;
    }
    
    if (!feedbackId) {
        showNotification('error', 'Error', 'No feedback selected');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const apiResponse = await fetch(`${API_BASE_URL}/teacher/feedback/${feedbackId}/reply`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reply: response })
        });
        
        const result = await apiResponse.json();
        
        if (result.success) {
            showNotification('success', 'Response Sent', 'Your response has been sent');
            
            // ===== UPDATE LOCAL CACHE =====
            const feedbackIndex = teacherFeedbackData.findIndex(f => f.id === feedbackId);
            if (feedbackIndex !== -1) {
                teacherFeedbackData[feedbackIndex].status = 'reviewed';
                // You might also want to store the response
                if (!teacherFeedbackData[feedbackIndex].responses) {
                    teacherFeedbackData[feedbackIndex].responses = [];
                }
                teacherFeedbackData[feedbackIndex].responses.push({
                    message: response,
                    date: new Date().toISOString()
                });
            }
            
            // Refresh display
            displayTeacherFeedback(teacherFeedbackData);
            
            closeFeedbackReplyModal();
        } else {
            throw new Error(result.message || 'Failed to send response');
        }
        
    } catch (error) {
        console.error('❌ Error sending response:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== REFRESH FEEDBACK (FORCE RELOAD FROM SERVER) =====
async function refreshFeedback() {
    console.log('🔄 Force refreshing feedback from server...');
    
    // Clear cache
    teacherFeedbackData = [];
    
    // Reload from server
    await loadTeacherFeedback();
    
    showNotification('success', 'Refreshed', 'Feedback data updated');
}

// ===== EXPORT FEEDBACK AS PDF =====
async function exportFeedbackData() {
    console.log('📄 Exporting feedback as PDF...');
    
    if (!teacherFeedbackData || teacherFeedbackData.length === 0) {
        showNotification('error', 'No Data', 'No feedback to export');
        return;
    }
    
    // Show loading notification
    showNotification('info', 'Generating PDF', 'Please wait...');
    
    try {
        // Create PDF document
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Add custom font (optional, but makes it look better)
        doc.setFont('helvetica');
        
        // ===== COVER PAGE =====
        doc.setFillColor(122, 0, 0); // #7a0000
        doc.rect(0, 0, 210, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('Feedback Report', 105, 25, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Teacher: ${teacherName || 'Teacher'}`, 105, 35, { align: 'center' });
        
        // Date
        const exportDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`Export Date: ${exportDate}`, 105, 45, { align: 'center' });
        
        // ===== SUMMARY STATISTICS =====
        let yPos = 60;
        
        doc.setTextColor(122, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary Statistics', 20, yPos);
        
        yPos += 10;
        
        // Calculate stats
        const totalFeedback = teacherFeedbackData.length;
        const newCount = teacherFeedbackData.filter(f => f.status === 'new').length;
        const resolvedCount = teacherFeedbackData.filter(f => f.status === 'resolved').length;
        const avgRating = teacherFeedbackData.filter(f => f.rating > 0)
            .reduce((sum, f) => sum + f.rating, 0) / 
            (teacherFeedbackData.filter(f => f.rating > 0).length || 1);
        
        // Stats table
        doc.setDrawColor(200, 200, 200);
        doc.setFillColor(245, 245, 245);
        doc.rect(20, yPos - 5, 170, 30, 'F');
        doc.setDrawColor(122, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(20, yPos - 5, 170, 30);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        
        // Row 1
        doc.text(`Total Feedback: ${totalFeedback}`, 30, yPos + 2);
        doc.text(`New: ${newCount}`, 100, yPos + 2);
        doc.text(`Resolved: ${resolvedCount}`, 150, yPos + 2);
        
        // Row 2
        doc.text(`Average Rating: ${avgRating.toFixed(1)} ★`, 30, yPos + 12);
        doc.text(`Satisfaction Rate: ${Math.round((avgRating / 5) * 100)}%`, 100, yPos + 12);
        
        yPos += 35;
        
        // ===== FEEDBACK DETAILS TABLE =====
        doc.setTextColor(122, 0, 0);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Feedback Details', 20, yPos);
        
        yPos += 5;
        
        // Table headers
        const headers = ['Student', 'Type', 'Rating', 'Message', 'Date', 'Status'];
        const columnWidths = [35, 25, 15, 60, 25, 20];
        let xPos = 20;
        
        doc.setFillColor(122, 0, 0);
        doc.rect(xPos, yPos, 170, 10, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        headers.forEach((header, index) => {
            doc.text(header, xPos + 2, yPos + 6);
            xPos += columnWidths[index];
        });
        
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        
        // Table rows
        let rowCount = 0;
        let startY = yPos;
        
        teacherFeedbackData.forEach((feedback, index) => {
            // Check if we need a new page
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
                startY = yPos;
                
                // Redraw headers on new page
                doc.setFillColor(122, 0, 0);
                doc.rect(20, yPos, 170, 10, 'F');
                
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                
                xPos = 20;
                headers.forEach((header, idx) => {
                    doc.text(header, xPos + 2, yPos + 6);
                    xPos += columnWidths[idx];
                });
                
                yPos += 10;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');
            }
            
            // Alternate row background
            if (index % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(20, yPos - 4, 170, 8, 'F');
            }
            
            xPos = 20;
            
            // Student name (truncate if too long)
            let studentName = feedback.student?.name || 'Anonymous';
            if (studentName.length > 15) studentName = studentName.substring(0, 12) + '...';
            doc.text(studentName, xPos + 2, yPos);
            xPos += columnWidths[0];
            
            // Type
            const typeLabel = getFeedbackTypeInfo(feedback.type).label;
            doc.text(typeLabel, xPos + 2, yPos);
            xPos += columnWidths[1];
            
            // Rating
            const ratingText = feedback.rating ? '★'.repeat(feedback.rating) : '-';
            doc.text(ratingText, xPos + 2, yPos);
            xPos += columnWidths[2];
            
            // Message (truncate)
            let message = feedback.message || 'No message';
            if (message.length > 30) message = message.substring(0, 27) + '...';
            doc.text(message, xPos + 2, yPos);
            xPos += columnWidths[3];
            
            // Date
            const date = feedback.date ? new Date(feedback.date).toLocaleDateString() : 'N/A';
            doc.text(date, xPos + 2, yPos);
            xPos += columnWidths[4];
            
            // Status
            const status = (feedback.status || 'new').toUpperCase();
            doc.text(status, xPos + 2, yPos);
            
            yPos += 8;
            rowCount++;
        });
        
        // Add footer with page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(`Page ${i} of ${pageCount}`, 180, 290, { align: 'center' });
        }
        
        // ===== DETAILED FEEDBACK SECTION (Optional - for longer messages) =====
        if (teacherFeedbackData.length > 0) {
            doc.addPage();
            yPos = 20;
            
            doc.setTextColor(122, 0, 0);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Detailed Feedback Messages', 20, yPos);
            
            yPos += 10;
            
            teacherFeedbackData.forEach((feedback, index) => {
                // Check page space
                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setDrawColor(122, 0, 0);
                doc.setLineWidth(0.2);
                doc.rect(20, yPos - 2, 170, 25);
                
                doc.setFillColor(245, 245, 245);
                doc.rect(20, yPos - 2, 170, 8, 'F');
                
                doc.setTextColor(0, 0, 0);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`#${index + 1} - ${feedback.student?.name || 'Anonymous'}`, 25, yPos + 3);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.text(`Type: ${getFeedbackTypeInfo(feedback.type).label} | Rating: ${feedback.rating ? '★'.repeat(feedback.rating) : 'N/A'} | Date: ${feedback.date ? new Date(feedback.date).toLocaleDateString() : 'N/A'}`, 25, yPos + 8);
                
                // Message with word wrap
                const message = feedback.message || 'No message';
                const splitMessage = doc.splitTextToSize(message, 160);
                doc.text(splitMessage, 25, yPos + 14);
                
                yPos += 30;
            });
        }
        
        // Save the PDF
        const fileName = `feedback_report_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        showNotification('success', 'Export Complete', `Feedback exported as PDF: ${fileName}`);
        
    } catch (error) {
        console.error('❌ Error generating PDF:', error);
        showNotification('error', 'Export Failed', error.message);
        
        // Fallback to CSV if PDF fails
        exportFeedbackAsCSV();
    }
}

// ===== FALLBACK: Export as CSV =====
function exportFeedbackAsCSV() {
    if (teacherFeedbackData.length === 0) return;
    
    // Create CSV content
    const headers = ['Student', 'Type', 'Rating', 'Message', 'Date', 'Status', 'Lesson'];
    const rows = teacherFeedbackData.map(f => [
        f.student?.name || 'Anonymous',
        f.type || 'other',
        f.rating || '',
        `"${(f.message || '').replace(/"/g, '""')}"`,
        f.date ? new Date(f.date).toLocaleDateString() : '',
        f.status || 'new',
        f.lesson?.title || ''
    ]);
    
    const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('warning', 'CSV Export', 'PDF failed, exported as CSV instead');
}

// ============================================
// QUIZ MANAGEMENT
// ============================================

// ===== LOAD QUIZZES =====
async function loadQuizzes() {
    console.log('📝 Loading quizzes...');
    
    const tableBody = document.getElementById('quizTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center py-4">
                <div class="loading-state">
                    <i class="fas fa-spinner fa-pulse fa-2x"></i>
                    <p>Loading quizzes...</p>
                </div>
            </td>
        </tr>
    `;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/quizzes`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            quizData = result.quizzes || [];
            const stats = result.stats || {};
            
            console.log(`✅ Loaded ${quizData.length} quizzes`);
            console.log('📊 Quiz stats:', stats);
            
            // ===== IMPORTANT: Update stats first =====
            updateQuizStats(stats);
            
            // Then display quizzes
            displayQuizzes();
            
            // Initialize chart if element exists
            initializeQuizChart();
        } else {
            throw new Error(result.message || 'Failed to load quizzes');
        }
        
    } catch (error) {
        console.error('❌ Error loading quizzes:', error);
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="error-state">
                        <i class="fas fa-exclamation-circle fa-2x"></i>
                        <p>Failed to load quizzes</p>
                        <button class="btn btn-sm btn-primary" onclick="loadQuizzes()">
                            <i class="fas fa-sync-alt"></i> Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// ===== UPDATE QUIZ STATS - FIXED =====
function updateQuizStats(stats) {
    console.log('📊 Updating quiz stats with:', stats);
    console.log('📊 quizData length:', quizData.length);
    
    // Update stat cards
    const totalQuizzesEl = document.getElementById('totalQuizzes');
    const activeQuizzesEl = document.getElementById('activeQuizzes');
    const draftQuizzesEl = document.getElementById('draftQuizzes');
    const avgQuizScoreEl = document.getElementById('avgQuizScore');
    
    // Update Total Quizzes
    if (totalQuizzesEl) {
        const total = stats.total_quizzes || quizData.length || 0;
        console.log('Setting totalQuizzes to:', total);
        totalQuizzesEl.textContent = total;
        // Optional: animate
        // animateNumber('totalQuizzes', total);
    } else {
        console.log('⚠️ totalQuizzes element not found');
    }
    
    // Update Active Quizzes
    if (activeQuizzesEl) {
        const active = stats.active_quizzes || 
            quizData.filter(q => q.status === 'active').length || 0;
        console.log('Setting activeQuizzes to:', active);
        activeQuizzesEl.textContent = active;
    }
    
    // Update Draft Quizzes
    if (draftQuizzesEl) {
        const draft = stats.draft_quizzes || 
            quizData.filter(q => q.status === 'draft').length || 0;
        console.log('Setting draftQuizzes to:', draft);
        draftQuizzesEl.textContent = draft;
    }
    
    // ===== FIXED: Update Average Score =====
    if (avgQuizScoreEl) {
        let avgScore = 0;
        
        // Try to get from stats first
        if (stats.avg_score_all !== undefined) {
            avgScore = stats.avg_score_all;
            console.log('Using stats.avg_score_all:', avgScore);
        } 
        // Otherwise calculate from quizData
        else if (quizData.length > 0) {
            const scores = quizData
                .map(q => q.stats?.avg_score || 0)
                .filter(score => score > 0);
            
            if (scores.length > 0) {
                avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
                console.log(`Calculated from ${scores.length} quizzes with scores:`, avgScore);
            } else {
                console.log('No quizzes with scores found');
            }
        }
        
        console.log('Final avgScore:', avgScore);
        avgQuizScoreEl.textContent = avgScore + '%';
    } else {
        console.log('⚠️ avgQuizScore element not found');
    }
}

// Helper to calculate average score from quizData
function calculateAverageScore() {
    const scores = quizData.filter(q => q.stats?.avg_score > 0)
        .map(q => q.stats.avg_score);
    
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ===== DISPLAY QUIZZES =====
function displayQuizzes() {
    const tableBody = document.getElementById('quizTableBody');
    if (!tableBody) return;
    
    // Apply filters
    let filteredQuizzes = filterQuizzesData(quizData);
    
    // Pagination
    const start = (currentQuizPage - 1) * quizzesPerPage;
    const end = start + quizzesPerPage;
    const paginatedQuizzes = filteredQuizzes.slice(start, end);
    
    if (paginatedQuizzes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <div class="no-data-message">
                        <i class="fas fa-question-circle fa-2x"></i>
                        <p>No quizzes found</p>
                        ${quizData.length === 0 ? 
                            '<small>Create your first quiz or wait for admin assignments</small>' : 
                            '<small>Try adjusting your filters</small>'}
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    paginatedQuizzes.forEach(quiz => {
        const statusClass = quiz.status === 'active' ? 'badge-success' :
                           quiz.status === 'draft' ? 'badge-secondary' : 'badge-info';
        
        const scoreClass = quiz.stats?.avg_score >= 80 ? 'score-high' :
                          quiz.stats?.avg_score >= 60 ? 'score-medium' : 'score-low';
        
        // Source badge
        const sourceBadge = `<span class="badge" style="background: ${quiz.source.color}; color: white; margin-left: 8px; font-size: 0.6rem;">
            ${quiz.source.label}
        </span>`;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${quiz.title}</strong>
                ${sourceBadge}
                <div class="quiz-meta" style="font-size: 0.7rem; color: #666;">
                    ${quiz.question_count} questions • ${quiz.time_limit} min
                </div>
            </td>
            <td>${quiz.subject || 'General'}</td>
            <td class="text-center">${quiz.question_count || 0}</td>
            <td><span class="badge ${statusClass}">${quiz.status}</span></td>
            <td>
                <span class="${scoreClass}">${quiz.stats?.avg_score || 0}%</span>
                <div style="font-size: 0.6rem; color: #666;">
                    ${quiz.stats?.total_attempts || 0} attempts
                </div>
            </td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 5px;">
                    <button class="btn-icon small" onclick="viewQuizDetails(${quiz.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${quiz.is_editable ? `
                        <button class="btn-icon small" onclick="editQuiz(${quiz.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon small" onclick="viewQuizStats(${quiz.id})" title="Statistics">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                    <button class="btn-icon small" onclick="previewQuiz(${quiz.id})" title="Preview">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    updateQuizPagination(filteredQuizzes.length);
}

// Filter quizzes based on current filters
function filterQuizzesData(quizzes) {
    let filtered = [...quizzes];
    
    // Filter by status
    if (currentQuizFilter !== 'all') {
        filtered = filtered.filter(q => q.status === currentQuizFilter);
    }
    
    // Filter by search term
    const searchTerm = document.getElementById('searchQuizzesInput')?.value?.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(q => 
            q.title.toLowerCase().includes(searchTerm) ||
            q.subject?.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

// ===== VIEW QUIZ DETAILS =====
async function viewQuizDetails(quizId) {
    console.log(`🔍 Viewing quiz ${quizId} details...`);
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/quizzes/${quizId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showQuizDetailsModal(result.quiz);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading quiz details:', error);
        showNotification('error', 'Failed', 'Could not load quiz details');
    }
}

// ===== VIEW QUIZ STATISTICS =====
async function viewQuizStats(quizId) {
    console.log(`📊 Loading stats for quiz ${quizId}...`);
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/quizzes/${quizId}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showQuizStatsModal(result.stats);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading quiz stats:', error);
        showNotification('error', 'Failed', 'Could not load statistics');
    }
}

// ===== SHOW QUIZ DETAILS MODAL =====
function showQuizDetailsModal(quiz) {
    openModal('Quiz Details');
    
    const modalBody = document.getElementById('modalBody');
    
    let questionsHtml = '';
    if (quiz.questions && quiz.questions.length > 0) {
        questionsHtml = quiz.questions.map((q, index) => `
            <div class="quiz-question-preview" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>Q${index + 1}:</strong>
                    <span style="color: #7a0000;">${q.points} pts</span>
                </div>
                <p style="margin: 5px 0;">${q.question_text}</p>
                <div style="font-size: 0.8rem; color: #666;">
                    Type: ${q.question_type} • ${q.options?.length || 0} options
                </div>
            </div>
        `).join('');
    } else {
        questionsHtml = '<p class="text-muted">No questions available</p>';
    }
    
    modalBody.innerHTML = `
        <div class="quiz-details">
            <h3>${quiz.title}</h3>
            <p>${quiz.description || 'No description'}</p>
            
            <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0;">
                <div class="info-item">
                    <strong>Subject:</strong> ${quiz.subject}
                </div>
                <div class="info-item">
                    <strong>Difficulty:</strong> ${quiz.difficulty}
                </div>
                <div class="info-item">
                    <strong>Time Limit:</strong> ${quiz.time_limit} minutes
                </div>
                <div class="info-item">
                    <strong>Passing Score:</strong> ${quiz.passing_score}%
                </div>
                <div class="info-item">
                    <strong>Questions:</strong> ${quiz.question_count}
                </div>
                <div class="info-item">
                    <strong>Status:</strong> <span class="badge badge-${quiz.status}">${quiz.status}</span>
                </div>
            </div>
            
            <div class="creator-info" style="background: #f0f0f0; padding: 10px; border-radius: 8px; margin: 15px 0;">
                <i class="fas fa-user"></i>
                Created by: ${quiz.creator?.name || 'Unknown'} (${quiz.creator?.role || 'Unknown'})
            </div>
            
            <h4>Questions Preview</h4>
            <div class="questions-preview" style="max-height: 300px; overflow-y: auto;">
                ${questionsHtml}
            </div>
            
            ${quiz.recent_attempts?.length > 0 ? `
                <h4 style="margin-top: 20px;">Recent Attempts</h4>
                <div class="recent-attempts">
                    ${quiz.recent_attempts.map(a => `
                        <div style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #eee;">
                            <span>${a.student_name}</span>
                            <span class="${a.score >= quiz.passing_score ? 'text-success' : 'text-danger'}">
                                ${a.score}%
                            </span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// ===== SHOW QUIZ STATS MODAL =====
function showQuizStatsModal(stats) {
    openModal('Quiz Statistics');
    
    const modalBody = document.getElementById('modalBody');
    
    // Create distribution chart data
    const distData = stats.distribution || {};
    
    modalBody.innerHTML = `
        <div class="quiz-stats">
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; color: #7a0000;">${stats.overall.total_attempts}</div>
                    <div style="font-size: 0.8rem;">Total Attempts</div>
                </div>
                <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; color: #7a0000;">${stats.overall.unique_students}</div>
                    <div style="font-size: 0.8rem;">Unique Students</div>
                </div>
                <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; color: #7a0000;">${stats.overall.avg_score}%</div>
                    <div style="font-size: 0.8rem;">Average Score</div>
                </div>
                <div class="stat-card" style="background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; color: #7a0000;">${stats.overall.pass_rate}%</div>
                    <div style="font-size: 0.8rem;">Pass Rate</div>
                </div>
            </div>
            
            <h4>Score Distribution</h4>
            <div class="distribution-bars" style="margin: 15px 0;">
                ${Object.entries(distData).map(([range, count]) => `
                    <div style="margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; font-size: 0.8rem;">
                            <span>${range}</span>
                            <span>${count} students</span>
                        </div>
                        <div class="progress-bar-small" style="height: 8px; background: #eee; border-radius: 4px;">
                            <div class="progress-fill-small" style="width: ${(count / (stats.overall.total_attempts || 1)) * 100}%; background: #7a0000; height: 8px; border-radius: 4px;"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <h4>Daily Activity (Last 30 Days)</h4>
            <div class="daily-stats" style="max-height: 200px; overflow-y: auto;">
                ${stats.daily?.map(day => `
                    <div style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #eee;">
                        <span>${day.date}</span>
                        <span>${day.attempts} attempts</span>
                        <span style="color: ${day.avg_score >= 70 ? '#4CAF50' : '#f44336'};">${day.avg_score}%</span>
                    </div>
                `).join('') || '<p>No data available</p>'}
            </div>
        </div>
    `;
}

// ===== PREVIEW QUIZ =====
function previewQuiz(quizId) {
    showNotification('info', 'Preview Mode', `Opening quiz #${quizId} in preview mode`);
    // You can implement quiz preview functionality here
}

function getSampleQuizzes() {
    return [
        {
            id: 1,
            title: 'Polynomial Functions Quiz',
            subject: 'PolyLearn',
            questions: 15,
            status: 'active',
            avg_score: 78,
            attempts: 24
        },
        {
            id: 2,
            title: 'Factorial Notation Quiz',
            subject: 'FactoLearn',
            questions: 10,
            status: 'draft',
            avg_score: 0,
            attempts: 0
        },
        {
            id: 3,
            title: 'MDAS Operations Quiz',
            subject: 'MathEase',
            questions: 20,
            status: 'active',
            avg_score: 82,
            attempts: 18
        },
        {
            id: 4,
            title: 'Quadratic Equations',
            subject: 'PolyLearn',
            questions: 12,
            status: 'completed',
            avg_score: 85,
            attempts: 15
        }
    ];
}

// ===== UPDATE QUIZ PAGINATION - FIXED =====
function updateQuizPagination(total) {
    const totalPages = Math.ceil(total / quizzesPerPage);
    
    // Safely update pagination info
    const quizStartEl = document.getElementById('quizStart');
    const quizEndEl = document.getElementById('quizEnd');
    const quizTotalEl = document.getElementById('quizTotal');
    const pagesContainer = document.getElementById('quizPages');
    const prevBtn = document.getElementById('prevQuizPage');
    const nextBtn = document.getElementById('nextQuizPage');
    
    // Update start/end/total if elements exist
    if (quizStartEl) {
        quizStartEl.textContent = total > 0 ? ((currentQuizPage - 1) * quizzesPerPage) + 1 : 0;
    }
    
    if (quizEndEl) {
        quizEndEl.textContent = Math.min(currentQuizPage * quizzesPerPage, total);
    }
    
    if (quizTotalEl) {
        quizTotalEl.textContent = total;
    }
    
    // Update page numbers if container exists
    if (pagesContainer) {
        let pagesHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            pagesHtml += `<button class="page-number ${i === currentQuizPage ? 'active' : ''}" onclick="goToQuizPage(${i})">${i}</button>`;
        }
        pagesContainer.innerHTML = pagesHtml;
    }
    
    // Update prev/next buttons if they exist
    if (prevBtn) {
        prevBtn.disabled = currentQuizPage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentQuizPage === totalPages || totalPages === 0;
    }
}

function goToQuizPage(page) {
    currentQuizPage = page;
    displayQuizzes();
}

function changeQuizPage(direction) {
    const total = parseInt(document.getElementById('quizTotal')?.textContent) || 0;
    const totalPages = Math.ceil(total / quizzesPerPage);
    
    if (direction === 'prev' && currentQuizPage > 1) {
        currentQuizPage--;
    } else if (direction === 'next' && currentQuizPage < totalPages) {
        currentQuizPage++;
    }
    
    displayQuizzes();
}

// ===== FILTER QUIZZES =====
function filterQuizzes() {
    currentQuizPage = 1;
    displayQuizzes();
}

function filterQuizzesByStatus() {
    currentQuizFilter = document.getElementById('quizStatusFilter')?.value || 'all';
    currentQuizPage = 1;
    displayQuizzes();
}

function filterQuizzes(searchTerm) {
    currentQuizPage = 1;
    displayQuizzes();
}

function displayFilteredQuizzes(quizzes) {
    const tableBody = document.getElementById('quizTableBody');
    if (!tableBody) return;
    
    if (quizzes.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p>No matching quizzes found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = '';
    
    quizzes.forEach(quiz => {
        const statusClass = quiz.status === 'active' ? 'badge-success' :
                           quiz.status === 'draft' ? 'badge-secondary' : 'badge-info';
        
        const scoreClass = quiz.avg_score >= 80 ? 'score-high' :
                          quiz.avg_score >= 60 ? 'score-medium' : 'score-low';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${quiz.title}</strong></td>
            <td>${quiz.subject || 'General'}</td>
            <td>${quiz.questions || 0}</td>
            <td><span class="badge ${statusClass}">${quiz.status}</span></td>
            <td><span class="${scoreClass}">${quiz.avg_score || 0}%</span></td>
            <td>
                <button class="btn-icon small" onclick="viewQuiz(${quiz.id})" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-icon small" onclick="editQuiz(${quiz.id})" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon small" onclick="takeQuiz(${quiz.id})" title="Take Quiz">
                    <i class="fas fa-play"></i>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}


function editQuiz(quizId) {
    showNotification('info', 'Edit Quiz', `Editing quiz #${quizId}`);
}

function takeQuiz(quizId) {
    showNotification('info', 'Take Quiz', 'Opening quiz...');
    setTimeout(() => {
        showNotification('success', 'Quiz Started', 'You can now take the quiz');
    }, 500);
}

function initializeQuizChart() {
    const ctx = document.getElementById('quizPerformanceChart');
    if (!ctx) return;
    
    if (quizChart) {
        quizChart.destroy();
    }
    
    // Prepare data
    const labels = generateLast30DaysLabels();
    const attempts = generateRandomData(30, 0, 10);
    const avgScores = generateRandomData(30, 60, 95);
    
    quizChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Attempts',
                    data: attempts,
                    borderColor: '#7a0000',
                    backgroundColor: 'rgba(122, 0, 0, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Average Score',
                    data: avgScores,
                    borderColor: '#FFC107',
                    backgroundColor: 'rgba(255, 193, 7, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: { display: true, text: 'Attempts' }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Score (%)' }
                }
            }
        }
    });
}

function updateQuizChart(range) {
    if (quizChart) {
        quizChart.data.labels = generateLast30DaysLabels();
        quizChart.data.datasets[0].data = generateRandomData(30, 0, 10);
        quizChart.data.datasets[1].data = generateRandomData(30, 60, 95);
        quizChart.update();
    }
}


// ===== LOAD QUIZ CATEGORIES =====
async function loadQuizCategories() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/quiz/categories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load categories');
        
        const result = await response.json();
        return result.categories || [];
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

// ===== LOAD TOPICS FOR TEACHER =====
async function loadTopics() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/teacher/topics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            return result.topics || [];
        } else {
            throw new Error(result.message || 'Failed to load topics');
        }
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('warning', 'Topics Unavailable', 'Using default topics');
        
        // Return default topics as fallback
        return [
            { id: 1, name: 'Polynomial Functions' },
            { id: 2, name: 'Factorial Notation' },
            { id: 3, name: 'MDAS Operations' },
            { id: 4, name: 'Quadratic Equations' },
            { id: 5, name: 'Rational Expressions' }
        ];
    }
}

// ===== CREATE NEW QUIZ =====
function createNewQuiz() {
    console.log('📝 Creating new quiz...');
    openCreateQuizModal();
}

// ===== OPEN CREATE QUIZ MODAL =====
async function openCreateQuizModal() {
    console.log('📝 Opening create quiz modal...');
    
    // Load categories and topics
    const categories = await loadQuizCategories();
    const topics = await loadTopics();
    
    openModal('Create New Quiz');
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="quiz-creation-form" style="max-height: 60vh; overflow-y: auto; padding: 10px;">
            <!-- Quiz Basic Information -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #7a0000; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-info-circle"></i> Quiz Information
                </h4>
                
                <div class="form-group">
                    <label class="form-label">Quiz Title <span style="color: red;">*</span></label>
                    <input type="text" class="form-control" id="quizTitle" placeholder="e.g., Polynomial Functions Quiz" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" id="quizDescription" rows="2" placeholder="Brief description of the quiz"></textarea>
                </div>
                
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Category/Subject <span style="color: red;">*</span></label>
                        <select class="form-control" id="quizCategoryId" required>
                            <option value="">Select Subject</option>
                            ${categories.map(c => `<option value="${c.category_id}">${c.category_name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Topic (Optional)</label>
                        <select class="form-control" id="quizTopicId">
                            <option value="">No specific topic</option>
                            ${topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Quiz Settings -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #7a0000; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-cog"></i> Quiz Settings
                </h4>
                
                <div class="form-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Difficulty</label>
                        <select class="form-control" id="quizDifficulty">
                            <option value="easy">Easy</option>
                            <option value="medium" selected>Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Time Limit (minutes)</label>
                        <input type="number" class="form-control" id="quizTimeLimit" value="30" min="1" max="180">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Passing Score (%)</label>
                        <input type="number" class="form-control" id="quizPassingScore" value="70" min="0" max="100">
                    </div>
                </div>
                
                <div class="form-row" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                    <div class="form-group">
                        <label class="form-label">Max Attempts</label>
                        <input type="number" class="form-control" id="quizMaxAttempts" value="3" min="1" max="10">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-control" id="quizStatus">
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Require Lessons</label>
                        <select class="form-control" id="quizRequireLessons">
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Questions Section -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #7a0000; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-question-circle"></i> Questions
                    </h4>
                    <button type="button" class="btn btn-primary btn-sm" onclick="addQuizQuestion()">
                        <i class="fas fa-plus"></i> Add Question
                    </button>
                </div>
                
                <div id="quizQuestionsContainer" style="max-height: 300px; overflow-y: auto;">
                    <!-- Questions will be added here dynamically -->
                    <div class="text-muted" style="text-align: center; padding: 20px;">
                        <i class="fas fa-info-circle"></i> Click "Add Question" to start creating questions
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="saveQuizToDatabase()">Create Quiz</button>
        `;
    }
}

// ===== ADD QUIZ QUESTION =====
function addQuizQuestion() {
    const container = document.getElementById('quizQuestionsContainer');
    const questionCount = container.children.length + 1;
    
    // Remove placeholder if exists
    if (container.children.length === 1 && container.children[0].classList.contains('text-muted')) {
        container.innerHTML = '';
    }
    
    const questionId = 'q_' + Date.now() + '_' + questionCount;
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'quiz-question-item';
    questionDiv.id = questionId;
    questionDiv.style.cssText = 'margin-bottom: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 8px; position: relative;';
    
    questionDiv.innerHTML = `
        <button type="button" class="btn-icon small" onclick="removeQuizQuestion('${questionId}')" style="position: absolute; top: 5px; right: 5px; color: #dc3545; background: none; border: none; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
        
        <div style="margin-bottom: 10px;">
            <label class="form-label">Question ${questionCount}</label>
            <input type="text" class="form-control" placeholder="Enter question text" id="${questionId}_text">
        </div>
        
        <div style="margin-bottom: 10px;">
            <label class="form-label">Question Type</label>
            <select class="form-control" id="${questionId}_type" onchange="toggleQuestionOptions('${questionId}')">
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True or False</option>
                <option value="short_answer">Short Answer</option>
            </select>
        </div>
        
        <div id="${questionId}_options_container">
            <!-- Options will be loaded here based on type -->
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <div>
                <label class="form-label">Points</label>
                <input type="number" class="form-control" style="width: 80px;" value="10" min="1" id="${questionId}_points">
            </div>
            <div style="flex: 1;">
                <label class="form-label">Explanation (Optional)</label>
                <input type="text" class="form-control" placeholder="Explain the correct answer" id="${questionId}_explanation">
            </div>
        </div>
    `;
    
    container.appendChild(questionDiv);
    
    // Initialize with multiple choice options
    updateQuestionOptions(questionId, 'multiple_choice');
}

// ===== TOGGLE QUESTION OPTIONS BASED ON TYPE =====
function toggleQuestionOptions(questionId) {
    const typeSelect = document.getElementById(questionId + '_type');
    const type = typeSelect ? typeSelect.value : 'multiple_choice';
    updateQuestionOptions(questionId, type);
}

// ===== UPDATE QUESTION OPTIONS =====
function updateQuestionOptions(questionId, type) {
    const container = document.getElementById(questionId + '_options_container');
    if (!container) return;
    
    let html = '';
    
    if (type === 'multiple_choice') {
        html = `
            <label class="form-label">Options</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${[0,1,2,3].map(i => `
                    <div>
                        <input type="text" class="form-control" placeholder="Option ${String.fromCharCode(65 + i)}" id="${questionId}_opt_${i}">
                        <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                            <input type="radio" name="${questionId}_correct" value="${i}"> Correct
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (type === 'true_false') {
        html = `
            <label class="form-label">Correct Answer</label>
            <div style="display: flex; gap: 20px;">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="${questionId}_correct" value="true"> True
                </label>
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="${questionId}_correct" value="false"> False
                </label>
            </div>
        `;
    } else if (type === 'short_answer') {
        html = `
            <div class="form-group">
                <label class="form-label">Correct Answer</label>
                <input type="text" class="form-control" id="${questionId}_correct_answer" placeholder="Enter the correct answer">
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ===== REMOVE QUIZ QUESTION =====
function removeQuizQuestion(questionId) {
    const questionDiv = document.getElementById(questionId);
    if (questionDiv) {
        questionDiv.remove();
    }
}

// ===== COLLECT QUIZ DATA =====
function collectQuizData() {
    const title = document.getElementById('quizTitle')?.value;
    if (!title) {
        showNotification('error', 'Error', 'Quiz title is required');
        return null;
    }
    
    const categoryId = document.getElementById('quizCategoryId')?.value;
    if (!categoryId) {
        showNotification('error', 'Error', 'Please select a subject');
        return null;
    }
    
    // Collect questions
    const questions = [];
    const questionContainers = document.querySelectorAll('[id^="q_"][id$="_text"]');
    
    if (questionContainers.length === 0) {
        showNotification('error', 'Error', 'At least one question is required');
        return null;
    }
    
    questionContainers.forEach((input, index) => {
        const questionId = input.id.replace('_text', '');
        const questionText = input.value;
        
        if (!questionText) return;
        
        const type = document.getElementById(questionId + '_type')?.value || 'multiple_choice';
        const points = parseInt(document.getElementById(questionId + '_points')?.value) || 10;
        const explanation = document.getElementById(questionId + '_explanation')?.value || '';
        
        let options = [];
        
        if (type === 'multiple_choice') {
            // Collect multiple choice options
            for (let i = 0; i < 4; i++) {
                const optText = document.getElementById(questionId + '_opt_' + i)?.value;
                if (optText && optText.trim() !== '') {
                    const isCorrect = document.querySelector(`input[name="${questionId}_correct"]:checked`)?.value === i.toString();
                    options.push({
                        option_text: optText,
                        is_correct: isCorrect,
                        option_order: i + 1
                    });
                }
            }
        } else if (type === 'true_false') {
            const correct = document.querySelector(`input[name="${questionId}_correct"]:checked`)?.value;
            options = [
                { option_text: 'True', is_correct: correct === 'true', option_order: 1 },
                { option_text: 'False', is_correct: correct === 'false', option_order: 2 }
            ];
        } else if (type === 'short_answer') {
            const correctAnswer = document.getElementById(questionId + '_correct_answer')?.value || '';
            options = [{
                option_text: correctAnswer,
                is_correct: true,
                option_order: 1
            }];
        }
        
        questions.push({
            question_text: questionText,
            question_type: type,
            points: points,
            explanation: explanation,
            question_order: index + 1,
            options: options
        });
    });
    
    if (questions.length === 0) {
        showNotification('error', 'Error', 'Please fill in question details');
        return null;
    }
    
    return {
        title: title,
        description: document.getElementById('quizDescription')?.value || '',
        category_id: parseInt(categoryId),
        topic_id: document.getElementById('quizTopicId')?.value ? parseInt(document.getElementById('quizTopicId').value) : null,
        difficulty: document.getElementById('quizDifficulty')?.value || 'medium',
        duration_minutes: parseInt(document.getElementById('quizTimeLimit')?.value) || 30,
        passing_score: parseFloat(document.getElementById('quizPassingScore')?.value) || 70,
        max_attempts: parseInt(document.getElementById('quizMaxAttempts')?.value) || 3,
        is_active: document.getElementById('quizStatus')?.value === 'active' ? 1 : 0,
        requires_lesson_completion: document.getElementById('quizRequireLessons')?.value === '1' ? 1 : 0,
        total_questions: questions.length,
        questions: questions
    };
}

// ===== SAVE QUIZ TO DATABASE (TEACHER VERSION) =====
async function saveQuizToDatabase() {
    console.log('💾 Saving quiz to database...');
    
    // Collect quiz data
    const quizData = collectQuizData();
    if (!quizData) return;
    
    // Show loading
    showNotification('info', 'Saving', 'Creating quiz...');
    
    try {
        const token = localStorage.getItem('authToken');
        
        // Use TEACHER endpoint, not admin
        const response = await fetch(`${API_BASE_URL}/teacher/quizzes/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            showNotification('success', 'Success!', `Quiz "${quizData.title}" created successfully!`);
            closeModal();
            
            // Refresh quiz list
            setTimeout(() => {
                loadQuizzes();
            }, 500);
        } else {
            throw new Error(result.message || 'Failed to create quiz');
        }
        
    } catch (error) {
        console.error('❌ Error creating quiz:', error);
        showNotification('error', 'Failed', error.message);
    }
}


// ===== SAVE NEW QUIZ =====
function saveNewQuiz() {
    const title = document.getElementById('newQuizTitle')?.value.trim();
    
    if (!title) {
        showNotification('error', 'Error', 'Please enter a quiz title');
        return;
    }
    
    // Collect quiz data
    const quizData = {
        title: title,
        subject: document.getElementById('newQuizSubject')?.value,
        description: document.getElementById('newQuizDescription')?.value,
        time_limit: parseInt(document.getElementById('newQuizTimeLimit')?.value) || 30,
        passing_score: parseInt(document.getElementById('newQuizPassingScore')?.value) || 70,
        difficulty: document.getElementById('newQuizDifficulty')?.value,
        status: document.getElementById('newQuizStatus')?.value,
        questions: collectQuestions()
    };
    
    console.log('Quiz data:', quizData);
    
    // Here you would send to server
    showNotification('success', 'Quiz Created', `"${title}" has been created`);
    closeModal();
}

// ===== COLLECT QUESTIONS =====
function collectQuestions() {
    const questions = [];
    const container = document.getElementById('quizQuestionsContainer');
    const questionItems = container.children;
    
    for (let i = 0; i < questionItems.length; i++) {
        const qNum = i + 1;
        const questionText = document.getElementById(`question_${qNum}_text`)?.value;
        
        if (!questionText) continue;
        
        const options = [
            document.getElementById(`question_${qNum}_opt_a`)?.value,
            document.getElementById(`question_${qNum}_opt_b`)?.value,
            document.getElementById(`question_${qNum}_opt_c`)?.value,
            document.getElementById(`question_${qNum}_opt_d`)?.value
        ].filter(opt => opt && opt.trim() !== '');
        
        const correctRadio = document.querySelector(`input[name="correct_${qNum}"]:checked`);
        const correctIndex = correctRadio ? ['a', 'b', 'c', 'd'].indexOf(correctRadio.value) : -1;
        
        const points = parseInt(document.getElementById(`question_${qNum}_points`)?.value) || 10;
        
        questions.push({
            question_text: questionText,
            question_type: 'multiple_choice',
            points: points,
            options: options.map((opt, idx) => ({
                option_text: opt,
                is_correct: idx === correctIndex
            }))
        });
    }
    
    return questions;
}

// ============================================
// SETTINGS DASHBOARD - DATA LOADING
// ============================================

// ===== LOAD ALL SETTINGS DATA =====
async function loadSettingsData() {
    console.log('⚙️ Loading settings data...');
    
    try {
        await Promise.all([
            loadTeacherProfile(),
            loadNotificationSettings(),
            loadPrivacySettings(),
            loadAppearanceSettings(),
            loadTeacherOverviewStats()
        ]);
        
        console.log('✅ Settings data loaded');
    } catch (error) {
        console.error('❌ Error loading settings:', error);
        showNotification('error', 'Failed', 'Could not load some settings');
    }
}

// ===== LOAD TEACHER PROFILE =====
async function loadTeacherProfile() {
    console.log('👤 Loading teacher profile...');
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            const profile = result.profile;
            console.log('✅ Profile loaded:', profile);
            
            // Update profile information in UI
            updateProfileUI(profile);
            
            // Store in global
            window.teacherProfile = profile;
            
            return profile;
        } else {
            throw new Error(result.message || 'Failed to load profile');
        }
        
    } catch (error) {
        console.error('❌ Error loading profile:', error);
        showNotification('error', 'Profile Error', 'Could not load profile data');
        return null;
    }
}

// ===== UPDATE PROFILE UI =====
function updateProfileUI(profile) {
    // Personal Info Tab
    const fullNameInput = document.getElementById('teacherFullName');
    const emailInput = document.getElementById('teacherEmail');
    const phoneInput = document.getElementById('teacherPhone');
    const educationInput = document.getElementById('teacherEducation');
    
    if (fullNameInput) fullNameInput.value = profile.full_name || '';
    if (emailInput) emailInput.value = profile.email || '';
    if (phoneInput) phoneInput.value = profile.phone || '';
    if (educationInput) educationInput.value = profile.education || '';
    
    // Teaching Tab
    const deptInput = document.getElementById('teacherDepartment');
    const sinceInput = document.getElementById('teacherSince');
    const bioInput = document.getElementById('teacherBio');
    
    if (deptInput) deptInput.value = profile.department || 'Mathematics';
    if (sinceInput) sinceInput.value = profile.teacher_since ? new Date(profile.teacher_since).getFullYear() : '2024';
    if (bioInput) bioInput.value = profile.bio || '';
    
    // Settings Tab - Display Name & Email
    const settingsName = document.getElementById('settingsDisplayName');
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsDept = document.getElementById('settingsDepartment');
    
    if (settingsName) settingsName.value = profile.full_name || '';
    if (settingsEmail) settingsEmail.value = profile.email || '';
    if (settingsDept) settingsDept.value = profile.department || 'Mathematics';
    
    // Account Security Tab
    const userEmailSpan = document.getElementById('currentUserEmail');
    const sessionTimeSpan = document.getElementById('sessionTime');
    
    if (userEmailSpan) userEmailSpan.textContent = profile.email || 'teacher@example.com';
    if (sessionTimeSpan) {
        const loginTime = localStorage.getItem('loginTime') || new Date().toLocaleTimeString();
        sessionTimeSpan.textContent = `Today, ${loginTime}`;
    }
    
    // Update teacher name in header
    const teacherNameEl = document.getElementById('teacherName');
    if (teacherNameEl) teacherNameEl.textContent = profile.full_name || 'Teacher';
}

// ===== LOAD NOTIFICATION SETTINGS =====
async function loadNotificationSettings() {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/settings/notifications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load notification settings');
        
        const result = await response.json();
        
        if (result.success) {
            const settings = result.settings;
            
            // Update checkboxes
            const notifEmail = document.getElementById('notifEmail');
            const notifAssignments = document.getElementById('notifAssignmentsSettings');
            const notifQuestions = document.getElementById('notifStudentQuestions');
            const notifGrades = document.getElementById('notifGradeUpdates');
            const notifSystem = document.getElementById('notifSystemAnnouncements');
            const digestTime = document.getElementById('digestTime');
            
            if (notifEmail) notifEmail.checked = settings.email_notifications;
            if (notifAssignments) notifAssignments.checked = settings.assignment_submissions;
            if (notifQuestions) notifQuestions.checked = settings.student_questions;
            if (notifGrades) notifGrades.checked = settings.grade_updates;
            if (notifSystem) notifSystem.checked = settings.system_announcements;
            if (digestTime) digestTime.value = settings.digest_time || '09:00';
        }
        
    } catch (error) {
        console.error('Error loading notification settings:', error);
    }
}

// ===== LOAD PRIVACY SETTINGS =====
async function loadPrivacySettings() {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/settings/privacy`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load privacy settings');
        
        const result = await response.json();
        
        if (result.success) {
            const settings = result.settings;
            
            const privacyShow = document.getElementById('privacyShowProfile');
            const privacyContact = document.getElementById('privacyAllowContact');
            const privacyShare = document.getElementById('privacyShareLessons');
            const privacyData = document.getElementById('privacyUsageData');
            
            if (privacyShow) privacyShow.checked = settings.show_profile_to_students;
            if (privacyContact) privacyContact.checked = settings.allow_contact;
            if (privacyShare) privacyShare.checked = settings.share_lessons;
            if (privacyData) privacyData.checked = settings.collect_usage_data;
        }
        
    } catch (error) {
        console.error('Error loading privacy settings:', error);
    }
}

// ===== LOAD APPEARANCE SETTINGS =====
async function loadAppearanceSettings() {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/settings/appearance`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load appearance settings');
        
        const result = await response.json();
        
        if (result.success) {
            const settings = result.settings;
            
            const fontSize = document.getElementById('fontSize');
            const density = document.getElementById('density');
            
            if (fontSize) fontSize.value = settings.font_size || 'medium';
            if (density) density.value = settings.density || 'normal';
            
            // Apply theme
            if (settings.theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        }
        
    } catch (error) {
        console.error('Error loading appearance settings:', error);
    }
}

// ===== LOAD TEACHER OVERVIEW STATS =====
async function loadTeacherOverviewStats() {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/stats/overview`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const result = await response.json();
        
        if (result.success) {
            const stats = result.stats;
            
            // Update profile stats
            const statValues = document.querySelectorAll('.profile-stat .stat-value');
            if (statValues.length >= 4) {
                statValues[0].textContent = stats.total_lessons || 0;
                statValues[1].textContent = stats.total_quizzes || 0;
                statValues[2].textContent = stats.total_students || 0;
                statValues[3].textContent = (stats.total_feedback || 0) + '';
            }
        }
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===== SAVE PROFILE CHANGES =====
async function saveProfile() {
    console.log('💾 Saving profile...');
    
    // Get form values
    const profileData = {
        full_name: document.getElementById('teacherFullName')?.value,
        email: document.getElementById('teacherEmail')?.value,
        phone: document.getElementById('teacherPhone')?.value,
        education: document.getElementById('teacherEducation')?.value,
        department: document.getElementById('teacherDepartment')?.value,
        bio: document.getElementById('teacherBio')?.value
    };
    
    if (!profileData.full_name || !profileData.email) {
        showNotification('error', 'Error', 'Name and email are required');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/profile/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(profileData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            showNotification('success', 'Success', 'Profile updated successfully');
            
            // Update local storage
            const userJson = localStorage.getItem('mathhub_user');
            if (userJson) {
                const user = JSON.parse(userJson);
                user.full_name = profileData.full_name;
                user.email = profileData.email;
                localStorage.setItem('mathhub_user', JSON.stringify(user));
            }
            
            // Reload profile
            loadTeacherProfile();
        } else {
            throw new Error(result.message || 'Failed to update profile');
        }
        
    } catch (error) {
        console.error('❌ Error saving profile:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== CHANGE PASSWORD =====
async function changePassword() {
    const currentPassword = document.getElementById('currentPassword')?.value;
    const newPassword = document.getElementById('newPassword')?.value;
    const confirmPassword = document.getElementById('confirmPassword')?.value;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
        showNotification('error', 'Error', 'All fields are required');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('error', 'Error', 'New passwords do not match');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('error', 'Error', 'Password must be at least 6 characters');
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/profile/change-password`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            showNotification('success', 'Success', 'Password changed successfully');
            
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            throw new Error(result.message || 'Failed to change password');
        }
        
    } catch (error) {
        console.error('❌ Error changing password:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== SAVE SETTINGS =====
async function saveSettings() {
    console.log('⚙️ Saving settings...');
    
    // Get active tab
    const activeTab = document.querySelector('.settings-tab-content.active');
    
    if (!activeTab) return;
    
    const tabId = activeTab.id;
    
    try {
        if (tabId === 'accountTab') {
            // Account settings are saved via saveProfile
            await saveProfile();
            
        } else if (tabId === 'notificationsTab') {
            // Save notification settings
            const settings = {
                email_notifications: document.getElementById('notifEmail')?.checked || false,
                assignment_submissions: document.getElementById('notifAssignmentsSettings')?.checked || false,
                student_questions: document.getElementById('notifStudentQuestions')?.checked || false,
                grade_updates: document.getElementById('notifGradeUpdates')?.checked || false,
                system_announcements: document.getElementById('notifSystemAnnouncements')?.checked || false,
                digest_time: document.getElementById('digestTime')?.value || '09:00'
            };
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/teacher/settings/notifications`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('success', 'Success', 'Notification settings saved');
            } else {
                throw new Error(result.message);
            }
            
        } else if (tabId === 'privacyTab') {
            // Save privacy settings
            const settings = {
                show_profile_to_students: document.getElementById('privacyShowProfile')?.checked || false,
                allow_contact: document.getElementById('privacyAllowContact')?.checked || false,
                share_lessons: document.getElementById('privacyShareLessons')?.checked || false,
                collect_usage_data: document.getElementById('privacyUsageData')?.checked || false
            };
            
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/teacher/settings/privacy`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('success', 'Success', 'Privacy settings saved');
            } else {
                throw new Error(result.message);
            }
            
        } else if (tabId === 'appearanceTab') {
            // Appearance settings are client-side only
            showNotification('success', 'Success', 'Appearance settings saved');
            
        } else if (tabId === 'accountSecurityTab') {
            // No settings to save here
            showNotification('info', 'Info', 'No changes to save');
        }
        
    } catch (error) {
        console.error('❌ Error saving settings:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== EXPORT ALL DATA =====
async function exportAllData() {
    showNotification('info', 'Export', 'Preparing your data...');
    
    // This would typically generate a ZIP file with all teacher data
    setTimeout(() => {
        showNotification('success', 'Export Complete', 'Your data has been exported');
    }, 2000);
}

// ===== REQUEST DATA DELETION =====
function requestDataDeletion() {
    if (confirm('Are you sure you want to request data deletion? This action cannot be undone.')) {
        showNotification('warning', 'Request Sent', 'Your request has been submitted to admin');
    }
}

// ===== UPDATE SHOW SETTINGS DASHBOARD =====
function showSettingsDashboard(e) {
    if (e) e.preventDefault();
    closeMobileMenu();
    setActiveSection('settingsDashboardSection');
    updatePageTitle('<i class="fas fa-cog"></i> Settings', 'Settings');
    updateActiveNav('settings');
    
    // Load settings data
    setTimeout(() => {
        loadSettingsData();
        openSettingsTab('accountTab');
    }, 100);
}

// ============================================
// PRACTICE DASHBOARD - COMPLETE FUNCTIONS
// ============================================

// ===== LOAD PRACTICE MATERIALS =====
async function loadPracticeMaterials() {
    console.log('💪 Loading practice materials from database...');
    
    const grid = document.getElementById('practiceMaterialsGrid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-pulse fa-3x" style="color: #7a0000;"></i>
            <p style="margin-top: 20px;">Loading practice materials...</p>
        </div>
    `;
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/practice`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            practiceData = result.practice || [];
            const stats = result.stats || {};
            
            console.log(`✅ Loaded ${practiceData.length} practice materials`);
            console.log('📊 Practice stats:', stats);
            
            // Update stats
            updatePracticeStats(stats);
            
            // Display practice materials
            displayPracticeMaterials();
            
            // Load practice stats overview
            loadPracticeStatsOverview();
        } else {
            throw new Error(result.message || 'Failed to load practice materials');
        }
        
    } catch (error) {
        console.error('❌ Error loading practice materials:', error);
        
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-exclamation-circle fa-3x" style="color: #dc3545;"></i>
                <p style="margin-top: 20px;">Failed to load practice materials</p>
                <button class="btn btn-primary" onclick="loadPracticeMaterials()">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

// ============================================
// PRACTICE DASHBOARD - LIKE QUIZ DASHBOARD
// ============================================

// ===== ADD PRACTICE MATERIAL =====
function addPracticeMaterial() {
    console.log('➕ Opening create practice modal...');
    openCreatePracticeModal();
}

// ===== GET TOPICS FROM DATABASE =====
async function getPracticeTopics() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/teacher/topics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load topics');
        
        const result = await response.json();
        return result.topics || [];
    } catch (error) {
        console.error('Error loading topics:', error);
        showNotification('warning', 'Topics Unavailable', 'Using default topics');
        
        // Return default topics as fallback
        return [
            { id: 1, name: 'Polynomial Functions' },
            { id: 2, name: 'Factorial Notation' },
            { id: 3, name: 'MDAS Operations' }
        ];
    }
}

// ===== OPEN CREATE PRACTICE MODAL =====
async function openCreatePracticeModal() {
    console.log('📝 Opening create practice modal...');
    
    // Load topics from database
    const topics = await getPracticeTopics();
    
    openModal('Create Practice Material');
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div class="practice-creation-form" style="max-height: 60vh; overflow-y: auto; padding: 15px;">
            <!-- Practice Information -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="color: #7a0000; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-info-circle"></i> Practice Information
                </h4>
                
                <div class="form-group">
                    <label class="form-label">Title <span style="color: red;">*</span></label>
                    <input type="text" class="form-control" id="practiceTitle" placeholder="e.g., Polynomial Functions Practice" required>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" id="practiceDescription" rows="2" placeholder="Brief description of the practice"></textarea>
                </div>
                
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Topic <span style="color: red;">*</span></label>
                        <select class="form-control" id="practiceTopicId" required>
                            <option value="">Select Topic</option>
                            ${topics.map(t => `<option value="${t.id}">${t.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Difficulty</label>
                        <select class="form-control" id="practiceDifficulty">
                            <option value="easy">Easy</option>
                            <option value="medium" selected>Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div class="form-group">
                        <label class="form-label">Points</label>
                        <input type="number" class="form-control" id="practicePoints" value="10" min="1">
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-control" id="practiceStatus">
                            <option value="draft">Draft</option>
                            <option value="active" selected>Active</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- Questions Section -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h4 style="color: #7a0000; margin: 0; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-question-circle"></i> Questions
                    </h4>
                    <button type="button" class="btn btn-primary btn-sm" onclick="addPracticeQuestion()">
                        <i class="fas fa-plus"></i> Add Question
                    </button>
                </div>
                
                <div id="practiceQuestionsContainer" style="max-height: 300px; overflow-y: auto;">
                    <!-- Questions will be added here dynamically -->
                    <div class="text-muted" style="text-align: center; padding: 20px;">
                        <i class="fas fa-info-circle"></i> Click "Add Question" to start creating questions
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalFooter = document.querySelector('#questionModal .modal-footer');
    if (modalFooter) {
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            <button class="btn btn-primary" onclick="savePracticeToDatabase()">Create Practice</button>
        `;
    }
}

// ===== ADD PRACTICE QUESTION =====
function addPracticeQuestion() {
    const container = document.getElementById('practiceQuestionsContainer');
    const questionCount = container.children.length + 1;
    
    // Remove placeholder if exists
    if (container.children.length === 1 && container.children[0].classList.contains('text-muted')) {
        container.innerHTML = '';
    }
    
    const questionId = 'pq_' + Date.now() + '_' + questionCount;
    
    const questionDiv = document.createElement('div');
    questionDiv.className = 'practice-question-item';
    questionDiv.id = questionId;
    questionDiv.style.cssText = 'margin-bottom: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 8px; position: relative;';
    
    questionDiv.innerHTML = `
        <button type="button" class="btn-icon small" onclick="removePracticeQuestion('${questionId}')" style="position: absolute; top: 5px; right: 5px; color: #dc3545; background: none; border: none; cursor: pointer;">
            <i class="fas fa-times"></i>
        </button>
        
        <div style="margin-bottom: 10px;">
            <label class="form-label">Question ${questionCount}</label>
            <input type="text" class="form-control" placeholder="Enter question text" id="${questionId}_text">
        </div>
        
        <div style="margin-bottom: 10px;">
            <label class="form-label">Question Type</label>
            <select class="form-control" id="${questionId}_type" onchange="togglePracticeQuestionOptions('${questionId}')">
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True or False</option>
                <option value="fill_blank">Fill in the Blank</option>
                <option value="matching">Matching Type</option>
            </select>
        </div>
        
        <div id="${questionId}_options_container">
            <!-- Options will be loaded here based on type -->
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 10px;">
            <div>
                <label class="form-label">Points</label>
                <input type="number" class="form-control" style="width: 80px;" value="10" min="1" id="${questionId}_points">
            </div>
            <div style="flex: 1;">
                <label class="form-label">Explanation (Optional)</label>
                <input type="text" class="form-control" placeholder="Explain the correct answer" id="${questionId}_explanation">
            </div>
        </div>
    `;
    
    container.appendChild(questionDiv);
    
    // Initialize with multiple choice options
    updatePracticeQuestionOptions(questionId, 'multiple_choice');
}

// ===== REMOVE PRACTICE QUESTION =====
function removePracticeQuestion(questionId) {
    const questionDiv = document.getElementById(questionId);
    if (questionDiv) {
        questionDiv.remove();
    }
}

// ===== TOGGLE QUESTION OPTIONS BASED ON TYPE =====
function togglePracticeQuestionOptions(questionId) {
    const typeSelect = document.getElementById(questionId + '_type');
    const type = typeSelect ? typeSelect.value : 'multiple_choice';
    updatePracticeQuestionOptions(questionId, type);
}

// ===== UPDATE QUESTION OPTIONS =====
function updatePracticeQuestionOptions(questionId, type) {
    const container = document.getElementById(questionId + '_options_container');
    if (!container) return;
    
    let html = '';
    
    if (type === 'multiple_choice') {
        html = `
            <label class="form-label">Options</label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${[0,1,2,3].map(i => `
                    <div>
                        <input type="text" class="form-control" placeholder="Option ${String.fromCharCode(65 + i)}" id="${questionId}_opt_${i}">
                        <label style="font-size: 0.8rem; display: flex; align-items: center; gap: 5px; margin-top: 5px;">
                            <input type="radio" name="${questionId}_correct" value="${i}"> Correct
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (type === 'true_false') {
        html = `
            <label class="form-label">Correct Answer</label>
            <div style="display: flex; gap: 20px;">
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="${questionId}_correct" value="true"> True
                </label>
                <label style="display: flex; align-items: center; gap: 5px;">
                    <input type="radio" name="${questionId}_correct" value="false"> False
                </label>
            </div>
        `;
    } else if (type === 'fill_blank') {
        html = `
            <div class="form-group">
                <label class="form-label">Correct Answer(s)</label>
                <input type="text" class="form-control" id="${questionId}_correct_answer" placeholder="Enter the correct answer">
                <small class="text-muted">For multiple blanks, separate with | (e.g., answer1|answer2)</small>
            </div>
            <div class="form-group">
                <label class="form-label">Case Sensitive?</label>
                <select class="form-control" id="${questionId}_case_sensitive">
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                </select>
            </div>
        `;
    } else if (type === 'matching') {
        html = `
            <div class="form-group">
                <label class="form-label">Matching Pairs (Left:Right)</label>
                <div id="${questionId}_matching_pairs">
                    <div style="display: flex; gap: 10px; margin-bottom: 5px;">
                        <input type="text" class="form-control" placeholder="Left item 1" id="${questionId}_left_1">
                        <input type="text" class="form-control" placeholder="Right item 1" id="${questionId}_right_1">
                    </div>
                    <div style="display: flex; gap: 10px; margin-bottom: 5px;">
                        <input type="text" class="form-control" placeholder="Left item 2" id="${questionId}_left_2">
                        <input type="text" class="form-control" placeholder="Right item 2" id="${questionId}_right_2">
                    </div>
                    <div style="display: flex; gap: 10px; margin-bottom: 5px;">
                        <input type="text" class="form-control" placeholder="Left item 3" id="${questionId}_left_3">
                        <input type="text" class="form-control" placeholder="Right item 3" id="${questionId}_right_3">
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline" onclick="addMatchingPair('${questionId}')">
                    <i class="fas fa-plus"></i> Add Pair
                </button>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ===== ADD MATCHING PAIR =====
function addMatchingPair(questionId) {
    const container = document.getElementById(questionId + '_matching_pairs');
    const pairCount = container.children.length + 1;
    
    const pairDiv = document.createElement('div');
    pairDiv.style.cssText = 'display: flex; gap: 10px; margin-bottom: 5px;';
    pairDiv.innerHTML = `
        <input type="text" class="form-control" placeholder="Left item ${pairCount}" id="${questionId}_left_${pairCount}">
        <input type="text" class="form-control" placeholder="Right item ${pairCount}" id="${questionId}_right_${pairCount}">
    `;
    
    container.appendChild(pairDiv);
}

// ===== COLLECT PRACTICE DATA =====
function collectPracticeData() {
    const title = document.getElementById('practiceTitle')?.value?.trim();
    if (!title) {
        showNotification('error', 'Error', 'Title is required');
        return null;
    }
    
    const topicId = document.getElementById('practiceTopicId')?.value;
    if (!topicId) {
        showNotification('error', 'Error', 'Please select a topic');
        return null;
    }
    
    // Collect questions
    const questions = [];
    const questionItems = document.querySelectorAll('.practice-question-item');
    
    if (questionItems.length === 0) {
        showNotification('error', 'Error', 'At least one question is required');
        return null;
    }
    
    for (let i = 0; i < questionItems.length; i++) {
        const item = questionItems[i];
        const questionId = item.id;
        
        // Get question text
        const textInput = document.getElementById(questionId + '_text');
        if (!textInput || !textInput.value?.trim()) {
            showNotification('error', 'Error', `Question ${i + 1} text is required`);
            return null;
        }
        const questionText = textInput.value.trim();
        
        // Get question type
        const typeSelect = document.getElementById(questionId + '_type');
        const type = typeSelect ? typeSelect.value : 'multiple_choice';
        
        // Get points
        const pointsInput = document.getElementById(questionId + '_points');
        const points = pointsInput ? parseInt(pointsInput.value) || 10 : 10;
        
        // Get explanation
        const explanationInput = document.getElementById(questionId + '_explanation');
        const explanation = explanationInput ? explanationInput.value?.trim() || '' : '';
        
        let options = [];
        let correctAnswer = null;
        
        if (type === 'multiple_choice') {
            // Collect multiple choice options
            for (let j = 0; j < 4; j++) {
                const optInput = document.getElementById(questionId + '_opt_' + j);
                if (optInput && optInput.value?.trim()) {
                    const isCorrect = document.querySelector(`input[name="${questionId}_correct"]:checked`)?.value === j.toString();
                    options.push({
                        option_text: optInput.value.trim(),
                        is_correct: isCorrect,
                        option_order: j + 1
                    });
                    if (isCorrect) correctAnswer = optInput.value.trim();
                }
            }
            
            if (options.length < 2) {
                showNotification('error', 'Error', `Question ${i + 1} must have at least 2 options`);
                return null;
            }
            
            if (!options.some(opt => opt.is_correct)) {
                showNotification('error', 'Error', `Question ${i + 1} must have a correct answer`);
                return null;
            }
            
        } else if (type === 'true_false') {
            const correct = document.querySelector(`input[name="${questionId}_correct"]:checked`)?.value;
            if (!correct) {
                showNotification('error', 'Error', `Question ${i + 1} must have a correct answer`);
                return null;
            }
            
            options = [
                { option_text: 'True', is_correct: correct === 'true', option_order: 1 },
                { option_text: 'False', is_correct: correct === 'false', option_order: 2 }
            ];
            correctAnswer = correct === 'true' ? 'True' : 'False';
            
        } else if (type === 'fill_blank') {
            const correctAnswerInput = document.getElementById(questionId + '_correct_answer');
            if (!correctAnswerInput || !correctAnswerInput.value?.trim()) {
                showNotification('error', 'Error', `Question ${i + 1} must have a correct answer`);
                return null;
            }
            
            const caseSensitive = document.getElementById(questionId + '_case_sensitive')?.value === '1';
            correctAnswer = correctAnswerInput.value.trim();
            
            options = [{
                option_text: correctAnswer,
                is_correct: true,
                option_order: 1,
                case_sensitive: caseSensitive
            }];
            
        } else if (type === 'matching') {
            const pairs = [];
            let pairIndex = 1;
            
            while (document.getElementById(questionId + '_left_' + pairIndex)) {
                const leftInput = document.getElementById(questionId + '_left_' + pairIndex);
                const rightInput = document.getElementById(questionId + '_right_' + pairIndex);
                
                if (leftInput && rightInput && leftInput.value?.trim() && rightInput.value?.trim()) {
                    pairs.push({
                        left: leftInput.value.trim(),
                        right: rightInput.value.trim(),
                        pair_order: pairIndex
                    });
                }
                pairIndex++;
            }
            
            if (pairs.length < 2) {
                showNotification('error', 'Error', `Question ${i + 1} must have at least 2 matching pairs`);
                return null;
            }
            
            options = pairs;
            correctAnswer = 'matching';
        }
        
        questions.push({
            question_text: questionText,
            question_type: type,
            points: points,
            explanation: explanation,
            question_order: i + 1,
            options: options,
            correct_answer: correctAnswer
        });
    }
    
    // Determine content type based on questions
    const uniqueTypes = [...new Set(questions.map(q => q.question_type))];
    const contentType = uniqueTypes.length === 1 ? uniqueTypes[0] : 'mixed';
    
    // Create content_json
    const contentJson = {
        questions: questions,
        total_points: questions.reduce((sum, q) => sum + q.points, 0),
        question_count: questions.length,
        type: contentType,
        metadata: {
            created_at: new Date().toISOString(),
            version: '1.0'
        }
    };
    
    return {
        topic_id: parseInt(topicId),
        title: title,
        description: document.getElementById('practiceDescription')?.value?.trim() || '',
        difficulty: document.getElementById('practiceDifficulty')?.value || 'medium',
        content_type: contentType,
        points: parseInt(document.getElementById('practicePoints')?.value) || 10,
        is_active: document.getElementById('practiceStatus')?.value === 'active' ? 1 : 0,
        content_json: contentJson
    };
}

// ===== SAVE PRACTICE TO DATABASE =====
async function savePracticeToDatabase() {
    console.log('💾 Saving practice material to database...');
    
    const practiceData = collectPracticeData();
    if (!practiceData) return;
    
    showNotification('info', 'Saving', 'Creating practice material...');
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/practice/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(practiceData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            showNotification('success', 'Success!', `Practice material "${practiceData.title}" created successfully!`);
            closeModal();
            
            setTimeout(() => {
                loadPracticeMaterials();
            }, 500);
        } else {
            throw new Error(result.message || 'Failed to create practice');
        }
        
    } catch (error) {
        console.error('❌ Error creating practice:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== FIXED: UPDATE PRACTICE STATS - WITH DIFFICULTY BREAKDOWN =====
function updatePracticeStats(stats) {
    console.log('📊 Updating practice stats:', stats);
    
    const totalPracticeEl = document.getElementById('totalPractice');
    const completedPracticeEl = document.getElementById('completedPractice');
    const practiceStudentsEl = document.getElementById('practiceStudents');
    const avgPracticeScoreEl = document.getElementById('avgPracticeScore');
    
    if (totalPracticeEl) {
        animateNumber('totalPractice', stats.total_practice || practiceData.length || 0);
    }
    
    if (completedPracticeEl) {
        completedPracticeEl.textContent = stats.active_practice || 
            practiceData.filter(p => p.status === 'active').length || 0;
    }
    
    if (practiceStudentsEl) {
        practiceStudentsEl.textContent = stats.unique_students || 
            calculateUniqueStudents() || 0;
    }
    
    if (avgPracticeScoreEl) {
        let avgScore = stats.avg_score_all || 0;
        
        // Calculate from practiceData if needed
        if (avgScore === 0 && practiceData.length > 0) {
            const scores = practiceData
                .map(p => p.stats?.avg_score || 0)
                .filter(score => score > 0);
            
            if (scores.length > 0) {
                avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
        }
        
        avgPracticeScoreEl.textContent = avgScore + '%';
    }
    
    // Call the missing function - pero kailangan nating i-define ito
    addDifficultyBreakdown();
}

// ===== ADD THIS MISSING FUNCTION =====
function addDifficultyBreakdown() {
    console.log('📊 Adding difficulty breakdown...');
    
    // Check if there's a container for difficulty breakdown
    const difficultyContainer = document.getElementById('difficultyBreakdown');
    if (!difficultyContainer) {
        // If container doesn't exist, just return (optional)
        return;
    }
    
    // Calculate difficulty breakdown from practiceData
    const easyCount = practiceData.filter(p => p.difficulty === 'easy').length;
    const mediumCount = practiceData.filter(p => p.difficulty === 'medium').length;
    const hardCount = practiceData.filter(p => p.difficulty === 'hard').length;
    const total = practiceData.length || 1;
    
    // Update the container if it exists
    difficultyContainer.innerHTML = `
        <div class="difficulty-item">
            <span class="difficulty-label">Easy</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.round((easyCount / total) * 100)}%; background: #4CAF50;"></div>
            </div>
            <span class="difficulty-count">${easyCount}</span>
        </div>
        <div class="difficulty-item">
            <span class="difficulty-label">Medium</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.round((mediumCount / total) * 100)}%; background: #FF9800;"></div>
            </div>
            <span class="difficulty-count">${mediumCount}</span>
        </div>
        <div class="difficulty-item">
            <span class="difficulty-label">Hard</span>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.round((hardCount / total) * 100)}%; background: #f44336;"></div>
            </div>
            <span class="difficulty-count">${hardCount}</span>
        </div>
    `;
}
// ===== FIXED: DISPLAY LESSONS GRID WITH FILTERS =====
function displayLessonsGrid() {
    const container = document.getElementById('welcomeSection');
    if (!container) return;
    
    if (lessonData.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 60px;">
                <i class="fas fa-book-open fa-3x" style="color: #ccc;"></i>
                <h4 style="margin-top: 20px;">No Lessons Found</h4>
                <p style="color: #666;">Create your first lesson to get started</p>
                <button class="btn btn-primary" onclick="openCreateLessonModal()" style="margin-top: 20px;">
                    <i class="fas fa-plus"></i> Create New Lesson
                </button>
            </div>
        `;
        return;
    }
    
    // Apply filters
    let filteredLessons = filterLessons(lessonData);
    
    // Pagination
    const start = (currentLessonPage - 1) * lessonsPerPage;
    const end = start + lessonsPerPage;
    const paginatedLessons = filteredLessons.slice(start, end);
    
    let html = `
        <div class="section-header mobile-compact">
            <h2 class="mobile-font-small"><i class="fas fa-book"></i> My Lessons</h2>
            <div class="filter-controls" style="display: flex; gap: 10px;">
                <select class="form-control small" onchange="filterLessonsBySubject(this.value)">
                    <option value="all" ${currentSubjectFilter === 'all' ? 'selected' : ''}>All Subjects</option>
                    <option value="polynomial" ${currentSubjectFilter === 'polynomial' ? 'selected' : ''}>PolyLearn</option>
                    <option value="factorial" ${currentSubjectFilter === 'factorial' ? 'selected' : ''}>FactoLearn</option>
                    <option value="mdas" ${currentSubjectFilter === 'mdas' ? 'selected' : ''}>MathEase</option>
                </select>
                <select class="form-control small" onchange="filterLessonsByType(this.value)">
                    <option value="all" ${currentTypeFilter === 'all' ? 'selected' : ''}>All Types</option>
                    <option value="video" ${currentTypeFilter === 'video' ? 'selected' : ''}>Videos</option>
                    <option value="pdf" ${currentTypeFilter === 'pdf' ? 'selected' : ''}>PDFs</option>
                    <option value="text" ${currentTypeFilter === 'text' ? 'selected' : ''}>Text</option>
                </select>
                <select class="form-control small" onchange="filterLessonsByStatus(this.value)">
                    <option value="all" ${currentLessonFilter === 'all' ? 'selected' : ''}>All Status</option>
                    <option value="active" ${currentLessonFilter === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${currentLessonFilter === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        </div>
        
        <div class="lessons-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
    `;
    
    if (paginatedLessons.length === 0) {
        html += `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-filter fa-3x" style="color: #ccc;"></i>
                <h4 style="margin-top: 15px;">No lessons match your filters</h4>
                <button class="btn btn-primary" onclick="resetFilters()">
                    <i class="fas fa-redo"></i> Reset Filters
                </button>
            </div>
        `;
    } else {
        paginatedLessons.forEach(lesson => {
            // Determine source badge
            const sourceBadge = lesson.is_from_admin ? 
                '<span class="badge" style="background: #7a0000; color: white; font-size: 0.6rem; padding: 2px 6px; margin-left: 8px;">From Admin</span>' : 
                (lesson.is_own ? 
                    '<span class="badge" style="background: #4CAF50; color: white; font-size: 0.6rem; padding: 2px 6px; margin-left: 8px;">My Lesson</span>' : 
                    '');
            
            const statusClass = lesson.is_active ? 'badge-success' : 'badge-secondary';
            const statusText = lesson.is_active ? 'Active' : 'Inactive';
            
            // Determine icon based on content type
            let typeIcon = 'fa-file-alt';
            if (lesson.content_type === 'video') typeIcon = 'fa-video';
            else if (lesson.content_type === 'pdf') typeIcon = 'fa-file-pdf';
            
            // Subject name
            const subjectName = lesson.lesson_name || 'General';
            
            // Stats with fallbacks
            const completions = lesson.completions || 0;
            const uniqueStudents = lesson.unique_students || 0;
            const avgScore = lesson.avg_score || 0;
            
            html += `
                <div class="lesson-card" data-lesson-id="${lesson.content_id}" data-subject="${subjectName.toLowerCase()}" data-type="${lesson.content_type}" data-status="${lesson.is_active ? 'active' : 'inactive'}" style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div class="lesson-card-header" style="padding: 15px; background: #f8f9fa; display: flex; gap: 12px; cursor: pointer;" onclick="viewLessonDetails(${lesson.content_id})">
                        <div class="lesson-icon" style="width: 50px; height: 50px; border-radius: 10px; background: #7a0000; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="fas ${typeIcon}"></i>
                        </div>
                        <div class="lesson-title" style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; font-size: 1rem;">${lesson.content_title || 'Untitled'} ${sourceBadge}</h4>
                            <div class="lesson-meta" style="display: flex; gap: 10px; font-size: 0.7rem; color: #666;">
                                <span><i class="fas fa-tag"></i> ${subjectName}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="lesson-card-body" style="padding: 15px; cursor: pointer;" onclick="viewLessonDetails(${lesson.content_id})">
                        <p class="lesson-description" style="font-size: 0.8rem; color: #666; margin: 0 0 15px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${lesson.content_description || 'No description'}
                        </p>
                        
                        <div class="lesson-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 15px;">
                            <div class="stat-item" style="background: #f8f9fa; padding: 8px; border-radius: 6px; text-align: center;">
                                <span class="stat-value" style="font-size: 1.1rem; font-weight: bold; color: #7a0000; display: block;">${completions}</span>
                                <span class="stat-label" style="font-size: 0.6rem; color: #666;">Completed</span>
                            </div>
                            <div class="stat-item" style="background: #f8f9fa; padding: 8px; border-radius: 6px; text-align: center;">
                                <span class="stat-value" style="font-size: 1.1rem; font-weight: bold; color: #7a0000; display: block;">${uniqueStudents}</span>
                                <span class="stat-label" style="font-size: 0.6rem; color: #666;">Students</span>
                            </div>
                            <div class="stat-item" style="background: #f8f9fa; padding: 8px; border-radius: 6px; text-align: center;">
                                <span class="stat-value" style="font-size: 1.1rem; font-weight: bold; color: #7a0000; display: block;">${avgScore}%</span>
                                <span class="stat-label" style="font-size: 0.6rem; color: #666;">Avg Score</span>
                            </div>
                        </div>
                        
                        <div class="lesson-badges" style="display: flex; gap: 8px; flex-wrap: wrap;">
                            <span class="badge ${statusClass}">${statusText}</span>
                            <span class="badge" style="background: #6c757d; color: white;">${lesson.content_type || 'text'}</span>
                        </div>
                    </div>
                    
                    <div class="lesson-card-footer" style="padding: 12px 15px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                        <div class="lesson-creator" style="display: flex; align-items: center; gap: 5px; font-size: 0.7rem; color: #666;">
                            <i class="fas fa-user"></i>
                            <span>${lesson.creator_name || 'Unknown'}</span>
                        </div>
                        <div class="lesson-actions" style="display: flex; gap: 5px;">
                            <button class="btn-icon small" onclick="viewLessonDetails(${lesson.content_id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            ${lesson.is_own ? `
                                <button class="btn-icon small" onclick="editLesson(${lesson.content_id})" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-icon small" onclick="deleteLesson(${lesson.content_id})" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    // Add pagination
    html += getLessonPagination(filteredLessons.length);
    
    container.innerHTML = html;
}

// Add this temporary debug function
function debugStudentData() {
    console.log('🔍 DEBUGGING STUDENT DATA:');
    console.log('myStudents:', myStudents);
    console.log('myStudents length:', myStudents ? myStudents.length : 0);
    console.log('subjectData:', subjectData);
    
    // Check if students are loaded from API
    if (myStudents && myStudents.length > 0) {
        console.log('First student:', myStudents[0]);
    } else {
        console.log('⚠️ No students in myStudents array');
    }
    
    // Check UI elements
    const totalStudentsEl = document.getElementById('totalStudentsSidebar');
    const studentCountEl = document.getElementById('studentCount');
    const welcomeStudentCount = document.getElementById('welcomeStudentCount');
    
    console.log('UI Elements:', {
        totalStudentsSidebar: totalStudentsEl ? totalStudentsEl.textContent : 'not found',
        studentCount: studentCountEl ? studentCountEl.textContent : 'not found',
        welcomeStudentCount: welcomeStudentCount ? welcomeStudentCount.textContent : 'not found'
    });
}

// ===== UPDATED: FILTER LESSONS =====
function filterLessons(lessons) {
    let filtered = [...lessons];
    
    // Filter by subject
    if (currentSubjectFilter !== 'all') {
        filtered = filtered.filter(l => {
            // Check multiple possible fields where subject might be stored
            const subjectName = 
                (l.lesson_name || '').toLowerCase() ||
                (l.subject_name || '').toLowerCase() ||
                (l.subject || '').toLowerCase() ||
                (l.lesson_title || '').toLowerCase();
            
            // Map filter values to actual subject names
            if (currentSubjectFilter === 'polynomial') {
                return subjectName.includes('poly') || 
                       subjectName === 'polynomial' || 
                       subjectName === 'polylearn';
            } else if (currentSubjectFilter === 'factorial') {
                return subjectName.includes('fact') || 
                       subjectName === 'factorial' || 
                       subjectName === 'factolearn';
            } else if (currentSubjectFilter === 'mdas') {
                return subjectName.includes('math') || 
                       subjectName.includes('mdas') ||
                       subjectName === 'mathease' ||
                       subjectName === 'mdas';
            }
            return false;
        });
    }
    
    // Filter by type (content_type)
    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(l => {
            const contentType = l.content_type || l.type || '';
            return contentType.toLowerCase() === currentTypeFilter.toLowerCase();
        });
    }
    
    // Filter by status (is_active)
    if (currentLessonFilter !== 'all') {
        const isActive = currentLessonFilter === 'active';
        filtered = filtered.filter(l => {
            // Check both possible status fields
            const status = l.is_active !== undefined ? l.is_active : 
                          (l.status === 'active' ? 1 : 0);
            return status === (isActive ? 1 : 0);
        });
    }
    
    console.log(`🔍 Filtered ${filtered.length} lessons (from ${lessons.length})`);
    return filtered;
}

// ===== GET SUBJECT NAME =====
function getSubjectName(filter) {
    const subjects = {
        'polynomial': 'PolyLearn',
        'factorial': 'FactoLearn',
        'mdas': 'MathEase'
    };
    return subjects[filter] || filter;
}

function filterLessonsBySubject(subject) {
    console.log(`🔍 Filtering by subject: ${subject}`);
    currentSubjectFilter = subject;
    currentLessonPage = 1;
    displayLessonsGrid();
}


function filterLessonsByType(type) {
    console.log(`🔍 Filtering by type: ${type}`);
    currentTypeFilter = type;
    currentLessonPage = 1;
    displayLessonsGrid();
}


function filterLessonsByStatus(status) {
    console.log(`🔍 Filtering by status: ${status}`);
    currentLessonFilter = status;
    currentLessonPage = 1;
    displayLessonsGrid();
}
function resetFilters() {
    console.log('🔄 Resetting all filters');
    currentSubjectFilter = 'all';
    currentTypeFilter = 'all';
    currentLessonFilter = 'all';
    currentLessonPage = 1;
    displayLessonsGrid();
}

// ===== GET LESSON PAGINATION =====
function getLessonPagination(total) {
    const totalPages = Math.ceil(total / lessonsPerPage);
    
    if (totalPages <= 1) return '';
    
    let html = `
        <div class="pagination-controls" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 30px;">
            <button class="btn-icon small" onclick="changeLessonPage('prev')" ${currentLessonPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="page-number ${i === currentLessonPage ? 'active' : ''}" onclick="goToLessonPage(${i})">${i}</button>`;
    }
    
    html += `
            <button class="btn-icon small" onclick="changeLessonPage('next')" ${currentLessonPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    return html;
}

// ===== CHANGE LESSON PAGE =====
function changeLessonPage(direction) {
    const total = lessonData.length;
    const totalPages = Math.ceil(total / lessonsPerPage);
    
    if (direction === 'prev' && currentLessonPage > 1) {
        currentLessonPage--;
    } else if (direction === 'next' && currentLessonPage < totalPages) {
        currentLessonPage++;
    }
    
    displayLessonsGrid();
}

// ===== GO TO LESSON PAGE =====
function goToLessonPage(page) {
    currentLessonPage = page;
    displayLessonsGrid();
}

// ===== VIEW LESSON DETAILS =====
async function viewLessonDetails(lessonId) {
    console.log(`🔍 Viewing lesson ${lessonId} details...`);
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/lessons/${lessonId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showLessonDetailsModal(result.lesson);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading lesson details:', error);
        showNotification('error', 'Failed', 'Could not load lesson details');
    }
}

// ===== SHOW LESSON DETAILS MODAL =====
function showLessonDetailsModal(lesson) {
    openModal('Lesson Details');
    
    const modalBody = document.getElementById('modalBody');
    
    const duration = lesson.content?.duration_seconds ? 
        Math.floor(lesson.content.duration_seconds / 60) + ' min' : 'N/A';
    
    modalBody.innerHTML = `
        <div class="lesson-details" style="padding: 10px;">
            <h3 style="color: #7a0000; margin-top: 0;">${lesson.title}</h3>
            <p>${lesson.description || 'No description'}</p>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                <div><strong>Subject:</strong> ${lesson.subject?.name || 'General'}</div>
                <div><strong>Topic:</strong> ${lesson.subject?.topic || 'General'}</div>
                <div><strong>Type:</strong> ${lesson.type}</div>
                <div><strong>Duration:</strong> ${duration}</div>
                <div><strong>Status:</strong> <span class="badge badge-${lesson.status}">${lesson.status}</span></div>
                <div><strong>Required:</strong> ${lesson.is_required ? 'Yes' : 'No'}</div>
            </div>
            
            <div style="margin: 15px 0;">
                <h4>Statistics</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div style="text-align: center; background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <div style="font-size: 1.5rem; color: #7a0000;">${lesson.stats?.completions || 0}</div>
                        <div style="font-size: 0.8rem;">Completions</div>
                    </div>
                    <div style="text-align: center; background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <div style="font-size: 1.5rem; color: #7a0000;">${lesson.stats?.total_students || 0}</div>
                        <div style="font-size: 0.8rem;">Students</div>
                    </div>
                    <div style="text-align: center; background: #f8f9fa; padding: 10px; border-radius: 8px;">
                        <div style="font-size: 1.5rem; color: #7a0000;">${lesson.stats?.avg_score || 0}%</div>
                        <div style="font-size: 0.8rem;">Avg Score</div>
                    </div>
                </div>
            </div>
            
            ${lesson.recent_activity && lesson.recent_activity.length > 0 ? `
                <div style="margin: 15px 0;">
                    <h4>Recent Activity</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
                        ${lesson.recent_activity.map(a => `
                            <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                                <span>${a.student_name}</span>
                                <span>${a.completion_status === 'completed' ? '✓ Completed' : 'In Progress'}</span>
                                <span>${a.score ? a.score + '%' : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            <div style="margin-top: 15px; color: #666; font-size: 0.8rem;">
                <i class="fas fa-calendar"></i> Created: ${new Date(lesson.created_at).toLocaleDateString()}
                ${lesson.creator ? ` • Created by: ${lesson.creator.name}` : ''}
            </div>
        </div>
    `;
}

// ===== ANIMATE STAT CARD =====
function animateStatCard(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    element.style.transform = 'scale(1.2)';
    element.style.color = '#7a0000';
    
    setTimeout(() => {
        element.textContent = targetValue;
        element.style.transform = 'scale(1)';
        element.style.color = '';
    }, 200);
    
    setTimeout(() => {
        element.style.transition = '';
    }, 700);
}


// ===== CALCULATE UNIQUE STUDENTS =====
function calculateUniqueStudents() {
    const students = new Set();
    lessonData.forEach(l => {
        if (l.stats?.unique_students) {
            students.add(l.stats.unique_students);
        }
    });
    return students.size;
}

// ===== DISPLAY PRACTICE MATERIALS - WITH DIFFICULTY BADGES =====
function displayPracticeMaterials() {
    const grid = document.getElementById('practiceMaterialsGrid');
    if (!grid) return;
    
    if (practiceData.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <i class="fas fa-dumbbell" style="font-size: 3rem; color: #ccc;"></i>
                <h4 style="margin-top: 15px;">No Practice Materials</h4>
                <p>Create your first practice material</p>
                <button class="btn btn-primary" onclick="addPracticeMaterial()">
                    <i class="fas fa-plus"></i> Create Practice Material
                </button>
            </div>
        `;
        return;
    }
    
    // Apply filters
    let filteredPractice = filterPracticeData(practiceData);
    
    // Pagination
    const start = (currentPracticePage - 1) * practicesPerPage;
    const end = start + practicesPerPage;
    const paginatedPractice = filteredPractice.slice(start, end);
    
    grid.innerHTML = '';
    
    paginatedPractice.forEach(practice => {
        const typeIcon = getPracticeTypeIcon(practice.type);
        
        // Difficulty badge with appropriate color
        const difficultyClass = `difficulty-${practice.difficulty}`;
        const difficultyLabel = practice.difficulty ? 
            practice.difficulty.charAt(0).toUpperCase() + practice.difficulty.slice(1) : 'Medium';
        
        const statusClass = practice.status === 'active' ? 'badge-success' : 'badge-secondary';
        
        // Source badge
        const sourceBadge = practice.source ? 
            `<span class="badge" style="background: ${practice.source.color}; color: white; font-size: 0.6rem; padding: 2px 6px; margin-left: 8px;">
                ${practice.source.label}
            </span>` : '';
        
        const card = document.createElement('div');
        card.className = 'practice-card';
        card.setAttribute('data-practice-id', practice.id);
        card.setAttribute('data-difficulty', practice.difficulty || 'medium');
        card.setAttribute('data-status', practice.status);
        
        card.innerHTML = `
            <div class="practice-card-header" onclick="viewPracticeDetails(${practice.id})">
                <div class="practice-icon" style="background: ${practice.source?.color || '#7a0000'};">
                    <i class="fas ${typeIcon}"></i>
                </div>
                <div class="practice-title">
                    <h4>${practice.title} ${sourceBadge}</h4>
                    <div class="practice-meta">
                        <span><i class="fas fa-tag"></i> ${practice.subject || 'General'}</span>
                        <span><i class="fas fa-layer-group"></i> ${practice.topic || 'General'}</span>
                    </div>
                </div>
            </div>
            
            <div class="practice-card-body" onclick="viewPracticeDetails(${practice.id})">
                <p class="practice-description">${practice.description || 'No description'}</p>
                
                <div class="practice-stats-grid">
                    <div class="stat-item">
                        <span class="stat-value">${practice.question_count || 0}</span>
                        <span class="stat-label">Questions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${practice.stats?.completions || 0}</span>
                        <span class="stat-label">Completions</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${practice.stats?.avg_score || 0}%</span>
                        <span class="stat-label">Avg Score</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-value">${practice.points || 10}</span>
                        <span class="stat-label">Points</span>
                    </div>
                </div>
                
                <div class="practice-badges">
                    <span class="difficulty-badge ${difficultyClass}">${difficultyLabel}</span>
                    <span class="badge ${statusClass}">${practice.status}</span>
                </div>
            </div>
            
            <div class="practice-card-footer">
                <div class="practice-creator">
                    <i class="fas fa-user"></i>
                    <span>${practice.source?.creator || 'Unknown'}</span>
                </div>
                <div class="practice-actions">
                    <button class="btn-icon small" onclick="viewPracticeDetails(${practice.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${practice.is_editable ? `
                        <button class="btn-icon small" onclick="editPracticeMaterial(${practice.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon small" onclick="deletePracticeMaterial(${practice.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        grid.appendChild(card);
    });
    
    // Update pagination
    updatePracticePagination(filteredPractice.length);
    
    // Update filter count display
    updateFilterCount(filteredPractice.length, practiceData.length);
}

// ===== GET PRACTICE TYPE ICON =====
function getPracticeTypeIcon(type) {
    const icons = {
        'multiple_choice': 'fa-list',
        'fill_blank': 'fa-pencil-alt',
        'matching': 'fa-link',
        'interactive': 'fa-gamepad',
        'worksheet': 'fa-file-alt',
        'exercise': 'fa-dumbbell',
        'game': 'fa-gamepad',
        'simulation': 'fa-cogs'
    };
    return icons[type] || 'fa-puzzle-piece';
}

// ===== UPDATE FILTER COUNT DISPLAY =====
function updateFilterCount(filtered, total) {
    const filterInfo = document.querySelector('.filter-info');
    if (!filterInfo) {
        const header = document.querySelector('.practice-grid-header');
        if (header) {
            const info = document.createElement('div');
            info.className = 'filter-info';
            info.style.cssText = 'font-size: 0.8rem; color: #666; margin-top: 5px;';
            header.appendChild(info);
        }
    }
    
    const infoEl = document.querySelector('.filter-info');
    if (infoEl) {
        if (filtered < total) {
            infoEl.innerHTML = `<i class="fas fa-filter"></i> Showing ${filtered} of ${total} materials`;
        } else {
            infoEl.innerHTML = `<i class="fas fa-th-large"></i> ${total} total materials`;
        }
    }
}

// ============================================
// LOGOUT FUNCTIONALITY
// ============================================

// Show logout confirmation modal
function showLogoutConfirmation() {
    console.log("🚪 Showing logout confirmation modal");
    
    // Get user info from localStorage
    const userJson = localStorage.getItem('mathhub_user');
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            
            // Update account email sa modal
            const emailSpan = document.getElementById('confirmationAccountEmail');
            if (emailSpan) {
                emailSpan.textContent = user.email || user.username || 'teacher@example.com';
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
        }
    }
    
    // Update active subjects count
    const subjectsSpan = document.querySelector('.confirmation-details p:last-child strong');
    if (subjectsSpan) {
        const subjectCount = Object.keys(subjectData).length || 3;
        const subjectsText = document.querySelector('.confirmation-details p:last-child');
        if (subjectsText) {
            subjectsText.innerHTML = `<i class="fas fa-chalkboard-teacher"></i> <strong>Active subjects:</strong> ${subjectCount} subjects`;
        }
    }
    
    // Update session time
    const sessionSpan = document.getElementById('confirmationSessionTime');
    if (sessionSpan) {
        const loginTime = localStorage.getItem('loginTime') || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        sessionSpan.textContent = `Today, ${loginTime}`;
    }
    
    // Show the modal
    const modal = document.getElementById('logoutConfirmationModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    } else {
        console.error('Logout confirmation modal not found');
        // Fallback to confirm dialog if modal not found
        if (confirm('Are you sure you want to logout?')) {
            directLogout();
        }
    }
}

// Close logout confirmation modal
function closeLogoutConfirmation() {
    console.log("🔴 Closing logout confirmation modal");
    
    const modal = document.getElementById('logoutConfirmationModal');
    if (modal) {
        modal.style.display = 'none';
        
        // Check if there are other modals open
        const anyModalOpen = Array.from(document.querySelectorAll('.modal')).some(m => 
            m.style.display === 'flex' || m.classList.contains('show')
        );
        
        if (!anyModalOpen) {
            document.body.classList.remove('modal-open');
        }
    }
}

// Confirm logout and redirect to login
function confirmLogout() {
    console.log("✅ Logout confirmed");
    
    // Get checkbox values
    const clearLocalData = document.getElementById('clearLocalData')?.checked || false;
    const rememberLogout = document.getElementById('rememberLogout')?.checked || false;
    
    console.log(`Settings: clearLocalData=${clearLocalData}, rememberLogout=${rememberLogout}`);
    
    // Show loading state sa button
    const confirmBtn = document.querySelector('.btn-confirm-logout');
    const cancelBtn = document.querySelector('.btn-cancel-logout');
    
    if (confirmBtn) {
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        confirmBtn.disabled = true;
    }
    
    if (cancelBtn) {
        cancelBtn.disabled = true;
    }
    
    // Simulate loading
    setTimeout(() => {
        performLogout(clearLocalData, rememberLogout);
    }, 800);
}

// Main logout function
// Main logout function
function performLogout(clearLocalData, rememberLogout) {
    console.log("🚪 Performing logout...");
    
    // Get user info for logging
    const userJson = localStorage.getItem('mathhub_user');
    let userEmail = 'Unknown';
    let userName = 'Teacher';
    
    if (userJson) {
        try {
            const user = JSON.parse(userJson);
            userEmail = user.email || user.username || 'Unknown';
            userName = user.full_name || user.username || 'Teacher';
        } catch (e) {}
    }
    
    console.log(`Logging out user: ${userName} (${userEmail})`);
    
    // Clear teacher-specific data (optional)
    if (clearLocalData) {
        console.log("🧹 Clearing local data and cache");
        
        // Clear all teacher-specific localStorage items
        localStorage.removeItem('teacherFontSize');
        localStorage.removeItem('teacherDensity');
        localStorage.removeItem('teacherTheme');
        localStorage.removeItem('cachedDashboardData');
        localStorage.removeItem('cachedRecentLessons');
        
        // Clear session storage
        sessionStorage.clear();
        
        // Clear any other cached data
        window.cachedDashboardData = null;
        window.cachedRecentLessons = null;
        teacherFeedbackData = [];
        myStudents = [];
        myLessons = [];
        lessonData = [];
        quizData = [];
        practiceData = [];
    }
    
    // Always remove auth token
    localStorage.removeItem('authToken');
    
    // If not remembering logout preference, remove user info
    if (!rememberLogout) {
        localStorage.removeItem('mathhub_user');
        localStorage.removeItem('loginTime');
    }
    
    // Show success notification
    showNotification('success', 'Logged Out', `Goodbye, ${userName}! Redirecting to login...`);
    
    // Close the modal
    closeLogoutConfirmation();
    
    // ===== FIXED: Redirect to root index.html with login hash =====
    setTimeout(() => {
        console.log("➡️ Redirecting to ../index.html#login");
        window.location.href = '../index.html#login';  // ← GAMITIN ITO
    }, 1500);
}

// Direct logout function (fallback)
// Direct logout function (fallback)
function directLogout() {
    console.log("🚪 Direct logout (fallback)");
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('mathhub_user');
    localStorage.removeItem('loginTime');
    
    showNotification('info', 'Logged Out', 'Redirecting to login...');
    
    setTimeout(() => {
        window.location.href = '../index.html#login';  // ← GAMITIN ITO
    }, 1000);
}

// Update login time
function updateLoginTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    localStorage.setItem('loginTime', timeString);
}

// Call updateLoginTime when page loads
updateLoginTime();

// Override existing logout function
window.logout = function() {
    showLogoutConfirmation();
};

// ===== ADD PRACTICE CARD STYLES =====
function addPracticeCardStyles() {
    if (document.getElementById('practice-card-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'practice-card-styles';
    style.textContent = `
        .practice-card {
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        
        .practice-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(122,0,0,0.2);
        }
        
        .practice-card-header {
            padding: 15px;
            background: #f8f9fa;
            display: flex;
            gap: 12px;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        
        .practice-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 1.5rem;
        }
        
        .practice-title {
            flex: 1;
        }
        
        .practice-title h4 {
            margin: 0 0 5px 0;
            font-size: 1rem;
            line-height: 1.3;
        }
        
        .practice-meta {
            display: flex;
            gap: 10px;
            font-size: 0.7rem;
            color: #666;
        }
        
        .practice-meta span {
            display: flex;
            align-items: center;
            gap: 3px;
        }
        
        .practice-card-body {
            padding: 15px;
            flex: 1;
            cursor: pointer;
        }
        
        .practice-description {
            font-size: 0.8rem;
            color: #666;
            margin: 0 0 15px 0;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .practice-stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .stat-item {
            background: #f8f9fa;
            padding: 8px;
            border-radius: 6px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.1rem;
            font-weight: bold;
            color: #7a0000;
            display: block;
        }
        
        .stat-label {
            font-size: 0.6rem;
            color: #666;
            text-transform: uppercase;
        }
        
        .practice-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        
        .practice-card-footer {
            padding: 12px 15px;
            background: #f8f9fa;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .practice-creator {
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.7rem;
            color: #666;
        }
        
        .practice-actions {
            display: flex;
            gap: 5px;
        }
        
        .difficulty-easy { background: #4CAF50; color: white; }
        .difficulty-medium { background: #FF9800; color: white; }
        .difficulty-hard { background: #f44336; color: white; }
        
        @media (max-width: 768px) {
            .practice-stats-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .practice-meta {
                flex-direction: column;
                gap: 3px;
            }
        }
    `;
    
    document.head.appendChild(style);
}

// ===== FILTER PRACTICE DATA - UPDATED WITH DIFFICULTY =====
function filterPracticeData(practice) {
    let filtered = [...practice];
    
    // Filter by difficulty (easy, medium, hard)
    const difficultyFilter = document.getElementById('practiceFilter')?.value;
    if (difficultyFilter && difficultyFilter !== 'all') {
        filtered = filtered.filter(p => p.difficulty === difficultyFilter);
        console.log(`Filtered by difficulty: ${difficultyFilter} - ${filtered.length} items`);
    }
    
    // Filter by type
    const typeFilter = document.getElementById('practiceTypeFilter')?.value;
    if (typeFilter && typeFilter !== 'all') {
        filtered = filtered.filter(p => p.type === typeFilter);
    }
    
    // Filter by status
    const statusFilter = document.getElementById('practiceStatusFilter')?.value;
    if (statusFilter && statusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    // Search by title/description
    const searchTerm = document.getElementById('searchPracticeInput')?.value?.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.title.toLowerCase().includes(searchTerm) ||
            p.description?.toLowerCase().includes(searchTerm) ||
            p.subject?.toLowerCase().includes(searchTerm)
        );
    }
    
    return filtered;
}

// ===== FILTER PRACTICE MATERIALS BY DIFFICULTY =====
function filterPracticeMaterials() {
    console.log('🔍 Filtering practice materials...');
    currentPracticePage = 1;
    displayPracticeMaterials();
}

// ===== FILTER PRACTICE BY TYPE =====
function filterPracticeByType() {
    currentPracticePage = 1;
    displayPracticeMaterials();
}

// ===== FILTER PRACTICE =====
function filterPractice(searchTerm) {
    currentPracticePage = 1;
    displayPracticeMaterials();
}

// ===== UPDATE PRACTICE PAGINATION =====
function updatePracticePagination(total) {
    const totalPages = Math.ceil(total / practicesPerPage);
    
    const startEl = document.getElementById('practiceStart');
    const endEl = document.getElementById('practiceEnd');
    const totalEl = document.getElementById('practiceTotal');
    const pagesContainer = document.getElementById('practicePages');
    const prevBtn = document.getElementById('prevPracticePage');
    const nextBtn = document.getElementById('nextPracticePage');
    
    if (startEl) {
        startEl.textContent = total > 0 ? ((currentPracticePage - 1) * practicesPerPage) + 1 : 0;
    }
    
    if (endEl) {
        endEl.textContent = Math.min(currentPracticePage * practicesPerPage, total);
    }
    
    if (totalEl) {
        totalEl.textContent = total;
    }
    
    if (pagesContainer) {
        let pagesHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            pagesHtml += `<button class="page-number ${i === currentPracticePage ? 'active' : ''}" onclick="goToPracticePage(${i})">${i}</button>`;
        }
        pagesContainer.innerHTML = pagesHtml;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPracticePage === 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPracticePage === totalPages || totalPages === 0;
    }
}

// ===== GO TO PRACTICE PAGE =====
function goToPracticePage(page) {
    currentPracticePage = page;
    displayPracticeMaterials();
}

// ===== CHANGE PRACTICE PAGE =====
function changePracticePage(direction) {
    const total = parseInt(document.getElementById('practiceTotal')?.textContent) || 0;
    const totalPages = Math.ceil(total / practicesPerPage);
    
    if (direction === 'prev' && currentPracticePage > 1) {
        currentPracticePage--;
    } else if (direction === 'next' && currentPracticePage < totalPages) {
        currentPracticePage++;
    }
    
    displayPracticeMaterials();
}

// ===== VIEW PRACTICE DETAILS =====
async function viewPracticeDetails(practiceId) {
    console.log(`🔍 Viewing practice ${practiceId} details...`);
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/practice/${practiceId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showPracticeDetailsModal(result.practice);
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading practice details:', error);
        showNotification('error', 'Failed', 'Could not load practice details');
    }
}

// ===== SHOW PRACTICE DETAILS MODAL =====
function showPracticeDetailsModal(practice) {
    openModal('Practice Material Details');
    
    const modalBody = document.getElementById('modalBody');
    
    // Generate questions preview
    let questionsHtml = '';
    if (practice.content?.questions && practice.content.questions.length > 0) {
        questionsHtml = practice.content.questions.map((q, index) => `
            <div class="practice-question-preview" style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between;">
                    <strong>Q${index + 1}:</strong>
                    <span style="color: #7a0000;">${q.points || 10} pts</span>
                </div>
                <p style="margin: 5px 0;">${q.question_text}</p>
                <div style="font-size: 0.8rem; color: #666;">
                    Type: ${q.type || practice.content_type}
                </div>
            </div>
        `).join('');
    } else {
        questionsHtml = '<p class="text-muted">No questions available</p>';
    }
    
    modalBody.innerHTML = `
        <div class="practice-details">
            <h3>${practice.title}</h3>
            <p>${practice.description || 'No description'}</p>
            
            <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0;">
                <div><strong>Subject:</strong> ${practice.subject}</div>
                <div><strong>Topic:</strong> ${practice.topic_name}</div>
                <div><strong>Difficulty:</strong> ${practice.difficulty}</div>
                <div><strong>Type:</strong> ${practice.content_type}</div>
                <div><strong>Points:</strong> ${practice.points}</div>
                <div><strong>Questions:</strong> ${practice.question_count}</div>
                <div><strong>Status:</strong> <span class="badge badge-${practice.status}">${practice.status}</span></div>
            </div>
            
            <div class="stats-section" style="background: #f0f0f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h4>Statistics</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                    <div class="stat-box" style="text-align: center;">
                        <div style="font-size: 1.5rem; color: #7a0000;">${practice.stats.total_attempts}</div>
                        <div style="font-size: 0.8rem;">Total Attempts</div>
                    </div>
                    <div class="stat-box" style="text-align: center;">
                        <div style="font-size: 1.5rem; color: #7a0000;">${practice.stats.completions}</div>
                        <div style="font-size: 0.8rem;">Completions</div>
                    </div>
                    <div class="stat-box" style="text-align: center;">
                        <div style="font-size: 1.5rem; color: #7a0000;">${practice.stats.avg_score}%</div>
                        <div style="font-size: 0.8rem;">Avg Score</div>
                    </div>
                </div>
            </div>
            
            <h4>Questions Preview</h4>
            <div class="questions-preview" style="max-height: 300px; overflow-y: auto;">
                ${questionsHtml}
            </div>
            
            ${practice.recent_attempts?.length > 0 ? `
                <h4 style="margin-top: 20px;">Recent Attempts</h4>
                <div class="recent-attempts">
                    ${practice.recent_attempts.map(a => `
                        <div style="display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #eee;">
                            <span>${a.student_name}</span>
                            <span>${a.score}%</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
}

// ===== EDIT PRACTICE MATERIAL =====
function editPracticeMaterial(practiceId) {
    showNotification('info', 'Edit Practice', `Editing practice #${practiceId}`);
    // Implement edit functionality
}

// ===== DELETE PRACTICE MATERIAL =====
async function deletePracticeMaterial(practiceId) {
    if (!confirm('Are you sure you want to delete this practice material? This action cannot be undone.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/practice/${practiceId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || `HTTP error! status: ${response.status}`);
        }
        
        if (result.success) {
            showNotification('success', 'Deleted', result.message);
            
            // Remove from local array
            practiceData = practiceData.filter(p => p.id !== practiceId);
            
            // Refresh display
            displayPracticeMaterials();
            updatePracticeStats({});
        } else {
            throw new Error(result.message || 'Failed to delete');
        }
        
    } catch (error) {
        console.error('❌ Error deleting practice material:', error);
        showNotification('error', 'Failed', error.message);
    }
}

// ===== LOAD PRACTICE STATS OVERVIEW =====
async function loadPracticeStatsOverview() {
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/practice/stats/overview`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to load stats');
        
        const result = await response.json();
        
        if (result.success) {
            console.log('📊 Practice stats overview:', result.stats);
            // Update additional stats if needed
        }
        
    } catch (error) {
        console.error('Error loading practice stats:', error);
    }
}

// ===== VIEW PRACTICE MATERIAL (old function, keep for compatibility) =====
function viewPracticeMaterial(practiceId) {
    viewPracticeDetails(practiceId);
}

// ============================================
// SETTINGS FUNCTIONS
// ============================================

function openSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.settings-menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.add('active');
    event.target.classList.add('active');
    
    // Special handling for appearance tab
    if (tabId === 'appearanceTab') {
        loadFontSizeSettings();
    }
}

function loadFontSizeSettings() {
    const fontSize = localStorage.getItem('teacherFontSize') || 'medium';
    const density = localStorage.getItem('teacherDensity') || 'normal';
    
    const fontSizeSelect = document.getElementById('fontSize');
    if (fontSizeSelect) fontSizeSelect.value = fontSize;
    
    const densitySelect = document.getElementById('density');
    if (densitySelect) densitySelect.value = density;
    
    updateFontSizePreview();
}

function changeFontSize(size) {
    localStorage.setItem('teacherFontSize', size);
    
    const root = document.documentElement;
    const sizes = {
        small: '14px',
        medium: '16px',
        large: '18px'
    };
    
    root.style.fontSize = sizes[size] || '16px';
    updateFontSizePreview();
}

function increaseFontSize() {
    const current = localStorage.getItem('teacherFontSize') || 'medium';
    const sizes = ['small', 'medium', 'large'];
    const index = sizes.indexOf(current);
    
    if (index < sizes.length - 1) {
        changeFontSize(sizes[index + 1]);
    }
}

function decreaseFontSize() {
    const current = localStorage.getItem('teacherFontSize') || 'medium';
    const sizes = ['small', 'medium', 'large'];
    const index = sizes.indexOf(current);
    
    if (index > 0) {
        changeFontSize(sizes[index - 1]);
    }
}

function resetFontSize() {
    changeFontSize('medium');
}

function updateFontSizePreview() {
    const preview = document.getElementById('fontSizePreviewText');
    const indicator = document.getElementById('currentFontSizeValue');
    
    if (preview && indicator) {
        const size = localStorage.getItem('teacherFontSize') || 'medium';
        const percents = {
            small: '90%',
            medium: '100%',
            large: '110%'
        };
        indicator.textContent = percents[size] || '100%';
    }
}

function changeDensity(density) {
    localStorage.setItem('teacherDensity', density);
    
    const spacings = {
        compact: '0.5rem',
        normal: '1rem',
        comfortable: '1.5rem'
    };
    
    document.documentElement.style.setProperty('--spacing-unit', spacings[density] || '1rem');
}

function setTheme(theme) {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    localStorage.setItem('teacherTheme', theme);
    
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-theme');
    setTheme(isDark ? 'light' : 'dark');
}

function saveSettings() {
    showNotification('success', 'Settings Saved', 'Your settings have been updated');
}


// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateCurrentTime() {
    const now = new Date();
    
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    
    const timeDisplay = document.getElementById('currentTime');
    if (timeDisplay) {
        timeDisplay.textContent = `${hours}:${minutes} ${ampm}`;
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const currentValue = parseInt(element.textContent) || 0;
    
    if (currentValue === targetValue) return;
    
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

function getInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function getAvatarColor(name) {
    const colors = [
        'linear-gradient(135deg, #7a0000, #ff0000)',
        'linear-gradient(135deg, #006400, #008000)',
        'linear-gradient(135deg, #00008b, #0000ff)',
        'linear-gradient(135deg, #8b008b, #800080)',
        'linear-gradient(135deg, #8b4513, #a0522d)',
        'linear-gradient(135deg, #4b0082, #9400d3)',
        'linear-gradient(135deg, #2e8b57, #3cb371)',
        'linear-gradient(135deg, #b8860b, #daa520)'
    ];
    
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
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

function generateRandomData(count, min, max) {
    return Array(count).fill(0).map(() => Math.floor(Math.random() * (max - min + 1)) + min);
}

function generateLast30DaysLabels() {
    const labels = [];
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    return labels;
}

// ===== OPEN MODAL (FOR QUESTION MODAL) - UPDATED =====
function openModal(title) {
    const modal = document.getElementById('questionModal');
    if (!modal) return;
    
    const modalTitle = modal.querySelector('.modal-title') || modal.querySelector('h3');
    if (modalTitle) {
        modalTitle.innerHTML = title;
    }
    
    // HUWAG nang mag-close ng ibang modals dito
    // Ang createLessonModal ay dapat manatiling sarado lang kung ito ang io-open natin
    
    modal.style.display = 'flex';
    modal.style.zIndex = '10000'; // Base z-index for questionModal
    document.body.classList.add('modal-open');
}

function closeModal() {
    const modal = document.getElementById('questionModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
}

// ===== CLOSE ALL MODALS =====
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
        modal.classList.remove('show');
    });
    document.body.classList.remove('modal-open');
}

function showNotification(type, title, message) {
    console.log(`📢 [${type}] ${title}: ${message}`);
    
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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}


// ===== UPDATED: LOAD TEACHER TOPICS FROM DATABASE =====
async function loadTeacherTopics(forceRefresh = false) {
    console.log('📚 Loading teacher topics from database...');
    
    if (!forceRefresh && teacherTopics && teacherTopics.length > 0) {
        console.log(`✅ Using cached topics: ${teacherTopics.length} topics`);
        return teacherTopics;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        
        const response = await fetch(`${API_BASE_URL}/teacher/topics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            teacherTopics = result.topics || [];
            console.log(`✅ Loaded ${teacherTopics.length} topics from database`);
            return teacherTopics;
        } else {
            throw new Error(result.message || 'Failed to load topics');
        }
        
    } catch (error) {
        console.error('❌ Error loading topics:', error);
        showNotification('warning', 'Topics Unavailable', 'Using default topics');
        
        // ===== FALLBACK TO DEFAULT TOPICS =====
        teacherTopics = getDefaultTopics();  // <-- This will now work
        console.log(`✅ Using ${teacherTopics.length} default topics as fallback`);
        return teacherTopics;
    }
}
// ===== DEFAULT MODULES (FALLBACK) - ADD THIS =====
function getDefaultModules() {
    console.log('📦 Using default modules (fallback)');
    return [
        // PolyLearn Modules
        { id: 101, name: 'Introduction to Polynomials', lesson_id: 1, lesson_name: 'PolyLearn', created_by: 'system' },
        { id: 102, name: 'Operations with Polynomials', lesson_id: 1, lesson_name: 'PolyLearn', created_by: 'system' },
        { id: 103, name: 'Factoring Polynomials', lesson_id: 1, lesson_name: 'PolyLearn', created_by: 'system' },
        
        // FactoLearn Modules
        { id: 201, name: 'Introduction to Factorials', lesson_id: 2, lesson_name: 'FactoLearn', created_by: 'system' },
        { id: 202, name: 'Factorial Notation', lesson_id: 2, lesson_name: 'FactoLearn', created_by: 'system' },
        { id: 203, name: 'Applications of Factorials', lesson_id: 2, lesson_name: 'FactoLearn', created_by: 'system' },
        
        // MathEase Modules
        { id: 301, name: 'Order of Operations', lesson_id: 3, lesson_name: 'MathEase', created_by: 'system' },
        { id: 302, name: 'Multiplication & Division', lesson_id: 3, lesson_name: 'MathEase', created_by: 'system' },
        { id: 303, name: 'Addition & Subtraction', lesson_id: 3, lesson_name: 'MathEase', created_by: 'system' }
    ];
}

// ===== DEFAULT TOPICS (FALLBACK) - ADD THIS =====
function getDefaultTopics() {
    console.log('📚 Using default topics (fallback)');
    return [
        // Polynomial Topics
        { id: 1001, name: 'Basic Concepts', module_id: 101, module_name: 'Introduction to Polynomials', created_by: 'system' },
        { id: 1002, name: 'Polynomial Expressions', module_id: 101, module_name: 'Introduction to Polynomials', created_by: 'system' },
        { id: 1003, name: 'Addition of Polynomials', module_id: 102, module_name: 'Operations with Polynomials', created_by: 'system' },
        { id: 1004, name: 'Subtraction of Polynomials', module_id: 102, module_name: 'Operations with Polynomials', created_by: 'system' },
        { id: 1005, name: 'Multiplication of Polynomials', module_id: 102, module_name: 'Operations with Polynomials', created_by: 'system' },
        { id: 1006, name: 'Factoring Basics', module_id: 103, module_name: 'Factoring Polynomials', created_by: 'system' },
        
        // Factorial Topics
        { id: 2001, name: 'Factorial Definition', module_id: 201, module_name: 'Introduction to Factorials', created_by: 'system' },
        { id: 2002, name: 'Factorial Examples', module_id: 201, module_name: 'Introduction to Factorials', created_by: 'system' },
        { id: 2003, name: 'Factorial Notation Rules', module_id: 202, module_name: 'Factorial Notation', created_by: 'system' },
        { id: 2004, name: 'Simplifying Factorials', module_id: 202, module_name: 'Factorial Notation', created_by: 'system' },
        { id: 2005, name: 'Permutations', module_id: 203, module_name: 'Applications of Factorials', created_by: 'system' },
        { id: 2006, name: 'Combinations', module_id: 203, module_name: 'Applications of Factorials', created_by: 'system' },
        
        // MathEase Topics
        { id: 3001, name: 'PEMDAS Rule', module_id: 301, module_name: 'Order of Operations', created_by: 'system' },
        { id: 3002, name: 'Examples and Practice', module_id: 301, module_name: 'Order of Operations', created_by: 'system' },
        { id: 3003, name: 'Multiplication Practice', module_id: 302, module_name: 'Multiplication & Division', created_by: 'system' },
        { id: 3004, name: 'Division Practice', module_id: 302, module_name: 'Multiplication & Division', created_by: 'system' },
        { id: 3005, name: 'Addition Practice', module_id: 303, module_name: 'Addition & Subtraction', created_by: 'system' },
        { id: 3006, name: 'Subtraction Practice', module_id: 303, module_name: 'Addition & Subtraction', created_by: 'system' }
    ];
}