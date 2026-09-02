export type ScanStatus = 
  | 'queued' 
  | 'initializing' 
  | 'crawling' 
  | 'analyzing' 
  | 'generating_report' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export type AuditErrorCode =
  | 'INVALID_URL'
  | 'SSRF_BLOCKED'
  | 'DNS_ERROR'
  | 'TARGET_UNREACHABLE'
  | 'TARGET_TIMEOUT'
  | 'TARGET_HTTP_ERROR'
  | 'TARGET_REDIRECT_ERROR'
  | 'ACCESS_DENIED'
  | 'BROWSER_ERROR'
  | 'CRAWLER_ERROR'
  | 'SCAN_NOT_FOUND'
  | 'QUEUE_ERROR'
  | 'DATABASE_ERROR'
  | 'AUDIT_ERROR'
  | 'SERVER_ERROR';

export interface ApiErrorDetail {
  code: AuditErrorCode;
  message: string;
  userFriendlyMessage: string;
  suggestion?: string;
  details?: string;
  targetUrl?: string;
  stage?: string;
  statusCode: number;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  message?: string;
}

export type ScanDepth = 'quick' | 'standard' | 'deep';

export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type IssueCategory = 'accessibility' | 'seo' | 'performance' | 'security';

export interface AffectedElement {
  id: string;
  targetSelector: string;
  htmlSnippet: string;
  failureSummary: string;
  pageUrl: string;
  xpath?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AccessibilityIssue {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  helpText: string;
  helpUrl: string;
  severity: IssueSeverity;
  category: IssueCategory;
  wcagRef: string;
  wcagLevel: 'A' | 'AA' | 'AAA' | 'Best Practice';
  tags: string[];
  affectedElements: AffectedElement[];
  occurrencesCount: number;
  status: 'open' | 'fixed' | 'ignored';
  suggestedFix: string;
  aiExplanation?: {
    whatItMeans: string;
    whyItMatters: string;
    affectedUsers: string;
    remediationSteps: string[];
  };
  aiRemediation?: {
    beforeHtml: string;
    afterHtml: string;
    language: 'html' | 'react' | 'tailwind';
    explanation: string;
  };
}

export interface SeoCheckItem {
  id: string;
  title: string;
  status: 'pass' | 'fail' | 'warn';
  value?: string;
  detail: string;
  recommendation: string;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  score: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  details: string;
}

export interface SecurityObservation {
  id: string;
  headerName: string;
  present: boolean;
  value?: string;
  status: 'pass' | 'warn' | 'fail';
  description: string;
  recommendation: string;
}

export interface AuditScores {
  accessibility: number; // 0 - 100
  performance: number;   // 0 - 100
  seo: number;           // 0 - 100
  security: number;      // 0 - 100
  overallQuality: number;// 0 - 100
  breakdown: {
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    passedChecks: number;
    incompleteChecks: number;
  };
}

export interface PageAuditResult {
  id: string;
  url: string;
  title: string;
  loadTimeMs: number;
  httpStatus: number;
  scores: AuditScores;
  issuesCount: number;
  issues: AccessibilityIssue[];
  seoChecks: SeoCheckItem[];
  perfMetrics: PerformanceMetric[];
  securityObservations: SecurityObservation[];
}

export interface ScanLogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export interface FullScanReport {
  id: string;
  websiteId: string;
  targetUrl: string;
  domain: string;
  status: ScanStatus;
  progressPercent: number;
  currentStepMessage: string;
  scanDepth: ScanDepth;
  createdAt: string;
  completedAt?: string;
  durationMs: number;
  scores: AuditScores;
  pages: PageAuditResult[];
  issues: AccessibilityIssue[];
  seoSummary: SeoCheckItem[];
  perfSummary: PerformanceMetric[];
  securitySummary: SecurityObservation[];
  logs: ScanLogEntry[];
  httpStatus?: number;
  redirectChain?: string[];
  finalUrl?: string;
  navigationMetadata?: {
    httpStatus: number;
    redirectChain: string[];
    finalUrl: string;
    serverHeader?: string;
    contentType?: string;
    loadTimeMs?: number;
  };
  errorMessage?: string;
  errorCode?: AuditErrorCode;
  errorDetail?: ApiErrorDetail;
  isDemo?: boolean;
  limitationsNotice?: string;
}

export type RemediationSuggestion = NonNullable<AccessibilityIssue['aiRemediation']>;

export interface WebsiteProfile {
  id: string;
  domain: string;
  rootUrl: string;
  firstScannedAt: string;
  lastScannedAt: string;
  latestScore: number;
  latestScanId: string;
  totalScansCount: number;
  historicalScans: Array<{
    scanId: string;
    date: string;
    overallScore: number;
    a11yScore: number;
    perfScore: number;
    seoScore: number;
    secScore: number;
    criticalCount: number;
    seriousCount: number;
  }>;
}

export interface ScheduledMonitoring {
  id: string;
  websiteId: string;
  domain: string;
  targetUrl: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  depth: ScanDepth;
  nextRun: string;
  lastRun?: string;
  notifyEmail: string;
  alertThresholdScore: number;
  active: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'auditor' | 'viewer';
  avatarUrl?: string;
  createdAt: string;
}

export interface ScoreWeightsConfig {
  accessibility: number; // e.g. 0.40
  performance: number;   // e.g. 0.25
  seo: number;           // e.g. 0.20
  security: number;      // e.g. 0.15
}
