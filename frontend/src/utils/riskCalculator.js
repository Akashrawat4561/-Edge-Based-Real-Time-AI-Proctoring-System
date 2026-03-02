import { EVENT_RISK_SCORES, RISK_LEVELS } from './constants';

/**
 * calculateRiskFromEvents
 * Computes an overall 0–100 risk score from a list of edge events.
 *
 * Each event contributes: baseRiskScore × confidence
 * The score is clamped to [0, 100].
 *
 * @param {Array<{eventType: string, confidence: number}>} events
 * @returns {number} risk score 0–100
 */
export const calculateRiskFromEvents = (events) => {
  if (!events || events.length === 0) return 0;

  let total = 0;
  events.forEach((e) => {
    const base = EVENT_RISK_SCORES[e.eventType] ?? 10;
    const confidence = typeof e.confidence === 'number'
      ? Math.max(0, Math.min(1, e.confidence))
      : 0.5;
    total += base * confidence;
  });

  return Math.min(100, Math.max(0, Math.round(total)));
};

/**
 * getRiskLevel
 * Returns the RISK_LEVELS entry matching the given score.
 */
export const getRiskLevel = (score) => {
  const s = Math.max(0, Math.min(100, score || 0));
  if (s <= RISK_LEVELS.SAFE.max) return RISK_LEVELS.SAFE;
  if (s <= RISK_LEVELS.WARNING.max) return RISK_LEVELS.WARNING;
  return RISK_LEVELS.HIGH_RISK;
};

/**
 * calculateIntegrityScore
 * Converts a risk score to a 0–100 integrity score.
 * High risk → low integrity.
 */
export const calculateIntegrityScore = (riskScore) => {
  return Math.max(0, Math.min(100, Math.round(100 - riskScore * 0.85)));
};

/**
 * computeEventStats
 * Summarises an event array into useful stats for the report/dashboard.
 *
 * @param {Array} events
 * @returns {{ totalEvents, highSeverity, mostCommon, avgConfidence, totalRisk }}
 */
export const computeEventStats = (events) => {
  if (!events || events.length === 0) {
    return { totalEvents: 0, highSeverity: 0, mostCommon: null, avgConfidence: 0, totalRisk: 0 };
  }

  const typeCount = {};
  let sumConf = 0;
  let highSeverity = 0;
  let totalRisk = 0;

  events.forEach(e => {
    typeCount[e.eventType] = (typeCount[e.eventType] || 0) + 1;
    sumConf += e.confidence || 0;
    const base = EVENT_RISK_SCORES[e.eventType] ?? 10;
    const pts = base * (e.confidence || 0.5);
    totalRisk += pts;
    if (pts >= 40) highSeverity++;
  });

  const mostCommon = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

  return {
    totalEvents: events.length,
    highSeverity,
    mostCommon: mostCommon ? { type: mostCommon[0], count: mostCommon[1] } : null,
    avgConfidence: parseFloat((sumConf / events.length).toFixed(2)),
    totalRisk: Math.min(100, Math.round(totalRisk)),
  };
};

/**
 * formatDuration
 * Formats seconds into a human-readable string: "1h 23m 45s" or "4m 30s"
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};