// ==================== utils/constants.js ====================
module.exports = {
  USER_ROLES: {
    STUDENT: 'student',
    RESIDENT: 'resident', 
    ATTENDING: 'attending',
    INSTRUCTOR: 'instructor',
    ADMIN: 'admin'
  },

  CASE_STATUS: {
    DRAFT: 'draft',
    REVIEW: 'review',
    APPROVED: 'approved',
    PUBLISHED: 'published',
    ARCHIVED: 'archived'
  },

  PROGRESS_STATUS: {
    STARTED: 'started',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    ABANDONED: 'abandoned',
    EXPIRED: 'expired'
  },

  DIFFICULTY_LEVELS: {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced'
  },

  MEDICAL_SPECIALTIES: [
    'Internal Medicine',
    'Surgery', 
    'Pediatrics',
    'Obstetrics & Gynecology',
    'Emergency Medicine',
    'Cardiology',
    'Neurology',
    'Psychiatry',
    'Radiology',
    'Pathology',
    'Anesthesiology',
    'Family Medicine',
    'Dermatology',
    'Ophthalmology',
    'Orthopedics',
    'Urology',
    'Gastroenterology',
    'Pulmonology',
    'Endocrinology',
    'Rheumatology',
    'Oncology',
    'Infectious Disease',
    'Critical Care',
    'Physical Medicine & Rehabilitation',
    'Plastic Surgery'
  ],

  BODY_SYSTEMS: [
    'Cardiovascular',
    'Respiratory', 
    'Gastrointestinal',
    'Genitourinary',
    'Musculoskeletal',
    'Neurological',
    'Endocrine',
    'Hematologic',
    'Immune',
    'Integumentary',
    'Reproductive',
    'Sensory'
  ],

  SIMULATION_STEP_TYPES: [
    'question',
    'decision',
    'assessment',
    'intervention',
    'diagnosis'
  ],

  DISCUSSION_TYPES: [
    'question',
    'comment',
    'clarification',
    'answer'
  ],

  NOTIFICATION_TYPES: [
    'achievement',
    'case_review',
    'discussion',
    'system',
    'welcome',
    'daily_digest',
    'reminder'
  ],

  ACHIEVEMENTS: [
    {
      name: 'First Steps',
      description: 'Complete your first case',
      icon: '🎯',
      category: 'progress',
      condition: (stats) => stats.casesCompleted >= 1
    },
    {
      name: 'Dedicated Learner', 
      description: 'Complete 10 cases',
      icon: '📚',
      category: 'progress',
      condition: (stats) => stats.casesCompleted >= 10
    },
    {
      name: 'Case Master',
      description: 'Complete 50 cases', 
      icon: '🏆',
      category: 'progress',
      condition: (stats) => stats.casesCompleted >= 50
    },
    {
      name: 'Century Club',
      description: 'Complete 100 cases',
      icon: '💯',
      category: 'progress',
      condition: (stats) => stats.casesCompleted >= 100
    },
    {
      name: 'Perfect Score',
      description: 'Score 100% on a case',
      icon: '⭐',
      category: 'performance',
      condition: (stats) => stats.perfectScores >= 1
    },
    {
      name: 'Speed Demon',
      description: 'Complete a case in under 10 minutes',
      icon: '⚡',
      category: 'performance',
      condition: (stats) => stats.fastestTime <= 600
    },
    {
      name: 'Streak Master',
      description: 'Maintain a 7-day learning streak',
      icon: '🔥',
      category: 'engagement',
      condition: (stats) => stats.streakDays >= 7
    },
    {
      name: 'Month Long Learner',
      description: 'Maintain a 30-day learning streak',
      icon: '📅',
      category: 'engagement',
      condition: (stats) => stats.streakDays >= 30
    },
    {
      name: 'Multi-Specialist',
      description: 'Complete cases in 5 different specialties',
      icon: '🌟',
      category: 'diversity',
      condition: (stats) => stats.specialtiesExplored >= 5
    },
    {
      name: 'Discussion Leader',
      description: 'Post 50 discussion comments',
      icon: '💬',
      category: 'community',
      condition: (stats) => stats.discussionPosts >= 50
    },
    {
      name: 'Helpful Helper',
      description: 'Receive 100 upvotes on discussions',
      icon: '👍',
      category: 'community',
      condition: (stats) => stats.discussionUpvotes >= 100
    },
    {
      name: 'Case Creator',
      description: 'Create your first case',
      icon: '✍️',
      category: 'contribution',
      condition: (stats) => stats.casesCreated >= 1
    }
  ],

  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    RATE_LIMIT: 'RATE_LIMIT_EXCEEDED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DUPLICATE_ERROR: 'DUPLICATE_ERROR',
    INVALID_ID: 'INVALID_ID'
  },

  API_LIMITS: {
    MAX_CASES_PER_HOUR: 10,
    MAX_LOGIN_ATTEMPTS: 5,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_TITLE_LENGTH: 200,
    MAX_DISCUSSION_LENGTH: 2000,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    MAX_SEARCH_RESULTS: 200
  },

  COMPETENCY_DOMAINS: {
    CLINICAL_REASONING: 'Clinical Reasoning',
    PATIENT_CARE: 'Patient Care',
    MEDICAL_KNOWLEDGE: 'Medical Knowledge',
    COMMUNICATION: 'Communication',
    PROFESSIONALISM: 'Professionalism',
    SYSTEMS_BASED_PRACTICE: 'Systems-Based Practice'
  },

  PERFORMANCE_LEVELS: {
    NOVICE: 'novice',
    BEGINNER: 'beginner',
    COMPETENT: 'competent',
    PROFICIENT: 'proficient',
    EXPERT: 'expert'
  },

  EMAIL_TEMPLATES: {
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password_reset',
    EMAIL_VERIFICATION: 'email_verification',
    ACHIEVEMENT: 'achievement',
    CASE_REVIEW: 'case_review',
    SYSTEM_NOTIFICATION: 'system_notification'
  },

  FILE_TYPES: {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    VIDEOS: ['video/mp4', 'video/webm', 'video/quicktime'],
    DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ALL_ALLOWED: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'application/pdf']
  },

  CACHE_KEYS: {
    USER_PERFORMANCE: 'user_performance',
    CASE_ANALYTICS: 'case_analytics',
    SYSTEM_STATS: 'system_stats',
    RECOMMENDATIONS: 'recommendations',
    LEADERBOARD: 'leaderboard'
  },

  SOCKET_EVENTS: {
    // Connection
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    
    // Simulation
    JOIN_SIMULATION: 'join_simulation',
    LEAVE_SIMULATION: 'leave_simulation',
    SIMULATION_STEP_UPDATE: 'simulation_step_update',
    STEP_COMPLETED: 'step_completed',
    
    // Discussion
    JOIN_DISCUSSION: 'join_discussion',
    LEAVE_DISCUSSION: 'leave_discussion',
    NEW_DISCUSSION: 'new_discussion',
    DISCUSSION_ADDED: 'discussion_added',
    TYPING_START: 'typing_start',
    TYPING_STOP: 'typing_stop',
    USER_TYPING: 'user_typing',
    USER_STOPPED_TYPING: 'user_stopped_typing',
    
    // Notifications
    NOTIFICATION: 'notification',
    SYSTEM_NOTIFICATION: 'system_notification',
    MARK_NOTIFICATION_READ: 'mark_notification_read',
    UNREAD_COUNT: 'unread_count'
  }
};