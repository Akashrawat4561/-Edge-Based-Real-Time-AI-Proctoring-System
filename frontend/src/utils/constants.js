// ─── Risk score mapping (points per event type) ───────────────────
// Used by Edge Decision Engine and risk calculator
export const EVENT_RISK_SCORES = {
  // Face monitoring
  'Multiple Faces': 50,
  'No Face': 30,
  'Looking Away': 20,
  'Face Mismatch': 50,

  // Object detection
  'Phone Detected': 40,
  'cell phone Detected': 40,
  'Book Detected': 30,
  'book Detected': 30,
  'remote Detected': 20,
  'laptop Detected': 15,
  'person Detected': 60,
  'Second Person Detected': 60,
  'Earphone Detected': 35,

  // Audio monitoring
  'Multiple Voices': 35,
  'Noise Spike': 25,
  'Whisper Detected': 30,

  // Browser behaviour
  'Tab Switching': 25,
  'Copy Paste': 30,
  'Dev Tools Open': 40,
  'Fullscreen Exit': 20,

  // Network
  'Network Drop': 10,
  'Offline Mode': 5,
};

// ─── Prohibited objects (COCO-SSD class names) ────────────────────
export const PROHIBITED_OBJECTS = [
  'cell phone',
  'book',
  'remote',
  'person',    // second person present
  'laptop',    // may indicate external device
  'keyboard',
  'mouse',
  'headphones',
  'earphones',
];

// ─── All event types (reference) ─────────────────────────────────
export const EVENT_TYPES = Object.keys(EVENT_RISK_SCORES);

// ─── Risk level thresholds ────────────────────────────────────────
export const RISK_LEVELS = {
  SAFE: { min: 0, max: 30, label: 'Safe', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  WARNING: { min: 31, max: 70, label: 'Warning', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  HIGH_RISK: { min: 71, max: 100, label: 'High Risk', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

// ─── Exam Modes ───────────────────────────────────────────────────
export const EXAM_MODES = {
  Exam: { strictness: 'high', description: 'Strictest monitoring — all violations trigger alerts' },
  Interview: { strictness: 'medium', description: 'Moderate monitoring — only high-severity violations' },
  Certification: { strictness: 'high', description: 'Full monitoring for official certifications' },
};

// ─── Socket events ────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  JOIN_ADMIN: 'join-admin',
  NEW_EVENT: 'new-event',
  HIGH_RISK_ALERT: 'high-risk-alert',
  CANDIDATE_ONLINE: 'candidate-online',
  CANDIDATE_OFFLINE: 'candidate-offline',
  CANDIDATE_DISCONNECTED: 'candidate-disconnected',
  EXAM_STARTED: 'exam-started',
  EXAM_ENDED: 'exam-ended',
  PING: 'ping-check',
  PONG: 'pong-check',
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
};

// ─── Local storage keys ───────────────────────────────────────────
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  EXAM_ID: 'examId',
  PENDING_EVENTS: 'pendingEvents',
};

// ─── AI Model config ──────────────────────────────────────────────
export const AI_CONFIG = {
  FACE: {
    MAX_FACES: 4,
    SCORE_THRESHOLD: 0.75,
    IOU_THRESHOLD: 0.3,
    INPUT_SIZE: 128,
  },
  OBJECT: {
    BASE_MODEL: 'lite_mobilenet_v2',
    CONFIDENCE_MIN: 0.60,
    DEBOUNCE_MS: 5000,
  },
  AUDIO: {
    FFT_SIZE: 1024,
    SMOOTHING: 0.8,
    CALIBRATION_SECS: 3,
    SPIKE_MULTIPLIER: 2.8,
    SUSTAINED_MULT: 1.8,
    SUSTAINED_SECS: 1.5,
  },
};

// ─── Performance tuning ───────────────────────────────────────────
// Face detection runs every N animation frames
export const DETECTION_FRAME_SKIP = 3;   // face detection: every 3rd frame (~20fps)
export const OBJ_DETECTION_SKIP = 9;   // object detection: every 9th frame (~6.7fps)

// ─── Confidence threshold for object detection ────────────────────
export const DEFAULT_CONFIDENCE_THRESHOLD = AI_CONFIG.OBJECT.CONFIDENCE_MIN;

// ─── Look-away detection ──────────────────────────────────────────
export const LOOK_AWAY_THRESHOLD_SECS = 10;   // seconds before firing event
export const LOOK_AWAY_CENTER_DIST = 0.40;  // 40% from center = looking away

// ─── HTTP status codes ────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200, CREATED: 201, BAD_REQUEST: 400,
  UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, SERVER_ERROR: 500,
};