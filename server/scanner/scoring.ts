import type { AccessibilityIssue, AuditScores, ScoreWeightsConfig } from '../../src/types/index.js';

export const DEFAULT_SCORE_WEIGHTS: ScoreWeightsConfig = {
  accessibility: 0.40,
  performance: 0.25,
  seo: 0.20,
  security: 0.15,
};

export function calculateAccessibilityScore(
  issues: AccessibilityIssue[],
  passedChecksCount: number
): { score: number; breakdown: AuditScores['breakdown'] } {
  let critical = 0;
  let serious = 0;
  let moderate = 0;
  let minor = 0;

  for (const issue of issues) {
    const count = issue.affectedElements.length || issue.occurrencesCount || 1;
    if (issue.severity === 'critical') critical += count;
    else if (issue.severity === 'serious') serious += count;
    else if (issue.severity === 'moderate') moderate += count;
    else if (issue.severity === 'minor') minor += count;
  }

  // Penalty deductions
  // Cap penalties so score stays within 0..100
  const penalty = (critical * 12) + (serious * 6) + (moderate * 2.5) + (minor * 1);
  const rawScore = 100 - penalty;

  // Small positive credit for high passed checks
  const passCredit = Math.min(passedChecksCount * 0.5, 10);
  const finalScore = Math.max(10, Math.min(100, Math.round(rawScore + (rawScore < 90 ? passCredit : 0))));

  return {
    score: finalScore,
    breakdown: {
      critical,
      serious,
      moderate,
      minor,
      passedChecks: passedChecksCount,
      incompleteChecks: 2, // Manual testing disclaimer placeholder
    },
  };
}

export function calculateOverallWebsiteQuality(
  a11yScore: number,
  perfScore: number,
  seoScore: number,
  secScore: number,
  weights: ScoreWeightsConfig = DEFAULT_SCORE_WEIGHTS
): number {
  const weighted =
    (a11yScore * weights.accessibility) +
    (perfScore * weights.performance) +
    (seoScore * weights.seo) +
    (secScore * weights.security);

  return Math.max(0, Math.min(100, Math.round(weighted)));
}
