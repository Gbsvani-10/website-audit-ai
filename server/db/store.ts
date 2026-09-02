import type { FullScanReport, WebsiteProfile, ScheduledMonitoring, UserAccount } from '../../src/types/index.js';

class InMemoryStore {
  private scans: Map<string, FullScanReport> = new Map();
  private websites: Map<string, WebsiteProfile> = new Map();
  private scheduledMonitors: Map<string, ScheduledMonitoring> = new Map();
  private users: Map<string, UserAccount> = new Map();

  constructor() {
    this.seedDemoData();
  }

  public saveScan(scan: FullScanReport): FullScanReport {
    this.scans.set(scan.id, scan);
    this.updateWebsiteProfile(scan);
    return scan;
  }

  public getScan(scanId: string): FullScanReport | undefined {
    return this.scans.get(scanId);
  }

  public getAllScans(): FullScanReport[] {
    return Array.from(this.scans.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getWebsite(websiteId: string): WebsiteProfile | undefined {
    return this.websites.get(websiteId);
  }

  public getAllWebsites(): WebsiteProfile[] {
    return Array.from(this.websites.values()).sort(
      (a, b) => new Date(b.lastScannedAt).getTime() - new Date(a.lastScannedAt).getTime()
    );
  }

  public getWebsiteScans(websiteId: string): FullScanReport[] {
    return this.getAllScans().filter((s) => s.websiteId === websiteId);
  }

  public saveScheduledMonitoring(monitoring: ScheduledMonitoring): ScheduledMonitoring {
    this.scheduledMonitors.set(monitoring.id, monitoring);
    return monitoring;
  }

  public getAllScheduledMonitors(): ScheduledMonitoring[] {
    return Array.from(this.scheduledMonitors.values());
  }

  public deleteScheduledMonitoring(id: string): boolean {
    return this.scheduledMonitors.delete(id);
  }

  private updateWebsiteProfile(scan: FullScanReport) {
    if (scan.status !== 'completed' || !scan.scores) {
      return;
    }
    let site = this.websites.get(scan.websiteId);
    if (!site) {
      site = {
        id: scan.websiteId,
        domain: scan.domain,
        rootUrl: scan.targetUrl,
        firstScannedAt: scan.createdAt,
        lastScannedAt: scan.createdAt,
        latestScore: scan.scores.overallQuality,
        latestScanId: scan.id,
        totalScansCount: 1,
        historicalScans: [
          {
            scanId: scan.id,
            date: scan.createdAt,
            overallScore: scan.scores.overallQuality,
            a11yScore: scan.scores.accessibility,
            perfScore: scan.scores.performance,
            seoScore: scan.scores.seo,
            secScore: scan.scores.security,
            criticalCount: scan.scores.breakdown.critical,
            seriousCount: scan.scores.breakdown.serious,
          },
        ],
      };
    } else {
      site.lastScannedAt = scan.createdAt;
      site.latestScore = scan.scores.overallQuality;
      site.latestScanId = scan.id;
      site.totalScansCount += 1;
      site.historicalScans.unshift({
        scanId: scan.id,
        date: scan.createdAt,
        overallScore: scan.scores.overallQuality,
        a11yScore: scan.scores.accessibility,
        perfScore: scan.scores.performance,
        seoScore: scan.scores.seo,
        secScore: scan.scores.security,
        criticalCount: scan.scores.breakdown.critical,
        seriousCount: scan.scores.breakdown.serious,
      });
    }
    this.websites.set(scan.websiteId, site);
  }

  private seedDemoData() {
    const demoSiteId = 'site_acme_saas_com';
    const demoScanId = 'scan_demo_production_99';
    const previousScanId = 'scan_demo_baseline_01';

    // Baseline historical scan
    const baselineScan: FullScanReport = {
      id: previousScanId,
      websiteId: demoSiteId,
      targetUrl: 'https://acme-saas.com',
      domain: 'acme-saas.com',
      status: 'completed',
      progressPercent: 100,
      currentStepMessage: 'Baseline audit complete',
      scanDepth: 'standard',
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      completedAt: new Date(Date.now() - 14 * 86400000 + 45000).toISOString(),
      durationMs: 45000,
      scores: {
        accessibility: 64,
        performance: 71,
        seo: 82,
        security: 68,
        overallQuality: 70,
        breakdown: {
          critical: 7,
          serious: 11,
          moderate: 14,
          minor: 6,
          passedChecks: 38,
          incompleteChecks: 3,
        },
      },
      pages: [],
      issues: [],
      seoSummary: [],
      perfSummary: [],
      securitySummary: [],
      logs: [],
      isDemo: true,
    };

    // Current latest audit scan
    const currentScan: FullScanReport = {
      id: demoScanId,
      websiteId: demoSiteId,
      targetUrl: 'https://acme-saas.com',
      domain: 'acme-saas.com',
      status: 'completed',
      progressPercent: 100,
      currentStepMessage: 'Audit completed successfully',
      scanDepth: 'standard',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      completedAt: new Date(Date.now() - 2 * 86400000 + 38000).toISOString(),
      durationMs: 38000,
      scores: {
        accessibility: 83,
        performance: 88,
        seo: 92,
        security: 86,
        overallQuality: 86,
        breakdown: {
          critical: 2,
          serious: 5,
          moderate: 8,
          minor: 3,
          passedChecks: 52,
          incompleteChecks: 2,
        },
      },
      pages: [
        {
          id: 'page_1_home',
          url: 'https://acme-saas.com',
          title: 'Acme SaaS — Cloud Automation & Workflow Intelligence',
          loadTimeMs: 420,
          httpStatus: 200,
          scores: {
            accessibility: 85,
            performance: 90,
            seo: 94,
            security: 86,
            overallQuality: 88,
            breakdown: { critical: 1, serious: 2, moderate: 3, minor: 1, passedChecks: 50, incompleteChecks: 2 },
          },
          issuesCount: 7,
          issues: [],
          seoChecks: [],
          perfMetrics: [],
          securityObservations: [],
        },
        {
          id: 'page_2_pricing',
          url: 'https://acme-saas.com/pricing',
          title: 'Pricing & Plans — Acme SaaS',
          loadTimeMs: 380,
          httpStatus: 200,
          scores: {
            accessibility: 81,
            performance: 86,
            seo: 90,
            security: 86,
            overallQuality: 84,
            breakdown: { critical: 1, serious: 3, moderate: 5, minor: 2, passedChecks: 48, incompleteChecks: 2 },
          },
          issuesCount: 11,
          issues: [],
          seoChecks: [],
          perfMetrics: [],
          securityObservations: [],
        },
      ],
      issues: [
        {
          id: 'issue_button_name_demo',
          ruleId: 'button-name',
          title: 'Buttons must have discernible text',
          description: 'Ensures buttons have discernible text that explains their purpose to assistive technology.',
          helpText: 'Icon-only buttons without text, aria-label, or title cannot be identified or announced by screen readers.',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/button-name',
          severity: 'critical',
          category: 'accessibility',
          wcagRef: 'WCAG 2.1 Level A (4.1.2 Name, Role, Value)',
          wcagLevel: 'A',
          tags: ['wcag2a', 'wcag412', 'cat.name-role-value'],
          occurrencesCount: 3,
          status: 'open',
          suggestedFix: 'Add `aria-label="Search"` or `<span class="sr-only">Search</span>` to the icon button.',
          affectedElements: [
            {
              id: 'elem_btn_1',
              targetSelector: 'nav button.search-toggle-btn',
              htmlSnippet: '<button class="p-2 search-toggle-btn hover:bg-slate-800">\n  <svg class="w-5 h-5 text-slate-300">...</svg>\n</button>',
              failureSummary: 'Button has no accessible name from inner text, aria-label, or aria-labelledby.',
              pageUrl: 'https://acme-saas.com',
            },
            {
              id: 'elem_btn_2',
              targetSelector: 'header button.theme-switch',
              htmlSnippet: '<button class="theme-switch">\n  <i class="icon-moon"></i>\n</button>',
              failureSummary: 'Button contains only a font icon with no label or text.',
              pageUrl: 'https://acme-saas.com/pricing',
            },
          ],
          aiExplanation: {
            whatItMeans: 'The browser cannot calculate an Accessible Name for the button element, causing screen readers to output generic "button" or "unlabeled button".',
            whyItMatters: 'Users relying on VoiceOver, NVDA, or JAWS cannot determine what clicking this button will do.',
            affectedUsers: 'Blind, low-vision, and voice-command speech-to-text users.',
            remediationSteps: [
              'Add aria-label="Search website" to the button tag.',
              'Ensure child SVG icon is marked with aria-hidden="true".',
              'Test with a screen reader to verify the name is clearly announced.',
            ],
          },
          aiRemediation: {
            beforeHtml: '<button class="p-2 search-toggle-btn">\n  <svg class="w-5 h-5">...</svg>\n</button>',
            afterHtml: '<button\n  type="button"\n  class="p-2 search-toggle-btn"\n  aria-label="Search website"\n>\n  <svg class="w-5 h-5" aria-hidden="true">...</svg>\n</button>',
            language: 'html',
            explanation: 'Added `aria-label="Search website"` and hid the decorative SVG icon from the accessibility tree using `aria-hidden="true"`.',
          },
        },
        {
          id: 'issue_image_alt_demo',
          ruleId: 'image-alt',
          title: 'Images must have alternative text',
          description: 'Ensures <img> elements have alternate text or a role of "none" or "presentation".',
          helpText: 'Images require meaningful alt text so that screen readers can convey the content to users.',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/image-alt',
          severity: 'critical',
          category: 'accessibility',
          wcagRef: 'WCAG 2.1 Level A (1.1.1 Non-text Content)',
          wcagLevel: 'A',
          tags: ['wcag2a', 'wcag111', 'cat.text-alternatives'],
          occurrencesCount: 2,
          status: 'open',
          suggestedFix: 'Add descriptive `alt="Customer satisfaction analytics graph"` attribute.',
          affectedElements: [
            {
              id: 'elem_img_1',
              targetSelector: 'section.hero img.analytics-preview',
              htmlSnippet: '<img class="analytics-preview shadow-xl" src="/assets/graphs/report-q3.png">',
              failureSummary: 'Image element is missing the required `alt` attribute.',
              pageUrl: 'https://acme-saas.com',
            },
          ],
          aiExplanation: {
            whatItMeans: 'An image element is missing an alt attribute, leading assistive technologies to read the raw file URL path.',
            whyItMatters: 'Users cannot understand data graphs or visual diagrams without informative textual alternatives.',
            affectedUsers: 'Screen reader users and users with images disabled on slow networks.',
            remediationSteps: [
              'Add a concise alt attribute describing key insights from the graph.',
              'Avoid redundant phrases like "image of".',
            ],
          },
          aiRemediation: {
            beforeHtml: '<img class="analytics-preview" src="/assets/graphs/report-q3.png">',
            afterHtml: '<img\n  class="analytics-preview"\n  src="/assets/graphs/report-q3.png"\n  alt="Quarterly workflow efficiency growth chart showing 42% acceleration"\n>',
            language: 'html',
            explanation: 'Added an informative alt attribute summarizing the data depicted in the image.',
          },
        },
        {
          id: 'issue_color_contrast_demo',
          ruleId: 'color-contrast',
          title: 'Elements must meet minimum color contrast ratio',
          description: 'Ensures text color contrast against background meets WCAG 2 AA minimum ratio of 4.5:1 for body copy.',
          helpText: 'Low contrast text is difficult or impossible to read for users with low vision or under glare.',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
          severity: 'serious',
          category: 'accessibility',
          wcagRef: 'WCAG 2.1 Level AA (1.4.3 Contrast Minimum)',
          wcagLevel: 'AA',
          tags: ['wcag2aa', 'wcag143', 'cat.color'],
          occurrencesCount: 4,
          status: 'open',
          suggestedFix: 'Darken text color from #94a3b8 to #475569 on light backgrounds, or brighten on dark backgrounds.',
          affectedElements: [
            {
              id: 'elem_contrast_1',
              targetSelector: 'div.pricing-card p.tier-subtitle',
              htmlSnippet: '<p class="text-slate-500 bg-slate-900">Ideal for small teams starting automation</p>',
              failureSummary: 'Contrast ratio of 3.2:1 is below the required 4.5:1 threshold for 14px font.',
              pageUrl: 'https://acme-saas.com/pricing',
            },
          ],
          aiExplanation: {
            whatItMeans: 'The visual luminance difference between text (#94a3b8) and background (#0f172a) yields a 3.2:1 contrast ratio, below the 4.5:1 AA threshold.',
            whyItMatters: 'Causes eye fatigue and renders text illegible for users with diminished contrast sensitivity.',
            affectedUsers: 'People with low vision, color blindness, aging eyes, and mobile users outdoors.',
            remediationSteps: [
              'Upgrade the text class to `text-slate-300` or `#cbd5e1` to achieve 7.8:1 contrast.',
            ],
          },
          aiRemediation: {
            beforeHtml: '<p class="text-slate-500 bg-slate-900">\n  Ideal for small teams starting automation\n</p>',
            afterHtml: '<p class="text-slate-300 bg-slate-900">\n  Ideal for small teams starting automation\n</p>',
            language: 'tailwind',
            explanation: 'Changed text color class from `text-slate-500` (3.2:1) to `text-slate-300` (7.8:1 ratio), satisfying WCAG 2.1 AA.',
          },
        },
        {
          id: 'issue_heading_order_demo',
          ruleId: 'heading-order',
          title: 'Heading levels should only increase by one',
          description: 'Ensures the order of headings is semantically sequential (e.g. <h1> to <h2>, not jumping to <h4>).',
          helpText: 'Skipping heading levels creates disorientation for screen reader users navigating by heading keys.',
          helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/heading-order',
          severity: 'moderate',
          category: 'accessibility',
          wcagRef: 'WCAG 2.1 Level A (1.3.1 Info and Relationships)',
          wcagLevel: 'A',
          tags: ['wcag2a', 'wcag131', 'best-practice'],
          occurrencesCount: 1,
          status: 'open',
          suggestedFix: 'Change <h4> to <h2> or <h3> to preserve sequential hierarchy.',
          affectedElements: [
            {
              id: 'elem_heading_1',
              targetSelector: 'section.features h4.feature-title',
              htmlSnippet: '<h4 class="feature-title">Real-Time Sync Engine</h4>',
              failureSummary: 'Heading level jumped from <h1> directly to <h4> without intermediate <h2> or <h3>.',
              pageUrl: 'https://acme-saas.com',
            },
          ],
          aiExplanation: {
            whatItMeans: 'The document structure contains an <h4> directly beneath an <h1>, bypassing <h2> and <h3> levels.',
            whyItMatters: 'Assistive tech users build a mental outline of the page using heading navigation shortcuts (e.g., H key).',
            affectedUsers: 'Screen reader users and cognitive navigation users.',
            remediationSteps: [
              'Use <h2> for the section container and style visually with CSS if a smaller font size is desired.',
            ],
          },
          aiRemediation: {
            beforeHtml: '<h4 class="feature-title text-base font-semibold">\n  Real-Time Sync Engine\n</h4>',
            afterHtml: '<h2 class="feature-title text-base font-semibold">\n  Real-Time Sync Engine\n</h2>',
            language: 'html',
            explanation: 'Updated semantic heading element to <h2> while retaining existing visual styling classes.',
          },
        },
      ],
      seoSummary: [
        { id: 's1', title: 'Page Title', status: 'pass', value: 'Optimal (58 chars)', detail: 'Title is descriptive and within 60 character threshold.', recommendation: 'Maintain consistency.' },
        { id: 's2', title: 'Meta Description', status: 'pass', value: '142 chars', detail: 'Meta description exists with strong call to action.', recommendation: 'Keep active.' },
        { id: 's3', title: 'H1 Primary Heading', status: 'pass', value: '1 H1 Tag', detail: 'Single authoritative H1 tag present.', recommendation: 'Maintain keywords.' },
        { id: 's4', title: 'Open Graph Metadata', status: 'pass', value: 'Configured', detail: 'og:title, og:image, and og:description defined.', recommendation: 'Ensure 1200x630 image dimensions.' },
        { id: 's5', title: 'Canonical URL Tag', status: 'pass', value: 'Declared', detail: 'Canonical points to authoritative HTTPS link.', recommendation: 'Verify across subdomains.' },
      ],
      perfSummary: [
        { id: 'p1', name: 'Server Response Time (TTFB)', value: 240, unit: 'ms', score: 96, rating: 'good', details: 'Fast edge response under 300 ms.' },
        { id: 'p2', name: 'HTML Document Weight', value: 48.2, unit: 'KB', score: 92, rating: 'good', details: 'Lean payload reduces initial parse delay.' },
        { id: 'p3', name: 'DOM Element Count', value: 684, unit: 'nodes', score: 88, rating: 'good', details: 'Optimal DOM tree under 1,000 nodes.' },
        { id: 'p4', name: 'Render-Blocking Scripts', value: 1, unit: 'scripts', score: 80, rating: 'good', details: 'Single script tagged for async execution.' },
      ],
      securitySummary: [
        { id: 'sec1', headerName: 'HTTPS Protocol', present: true, value: 'TLS 1.3 Active', status: 'pass', description: 'Strong transport encryption enabled.', recommendation: 'Enforce automatic cert renewal.' },
        { id: 'sec2', headerName: 'Strict-Transport-Security (HSTS)', present: true, value: 'max-age=31536000; includeSubDomains', status: 'pass', description: 'HSTS enforces HTTPS-only connections.', recommendation: 'Consider HSTS preload list submission.' },
        { id: 'sec3', headerName: 'Content-Security-Policy (CSP)', present: true, value: "default-src 'self'; script-src 'self' ...", status: 'pass', description: 'Restricts untrusted script origins.', recommendation: 'Review nonces for dynamic scripts.' },
        { id: 'sec4', headerName: 'X-Content-Type-Options', present: true, value: 'nosniff', status: 'pass', description: 'MIME sniffing prevention is active.', recommendation: 'Maintain header on all API routes.' },
      ],
      logs: [
        { timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), message: 'SSRF guard verified target domain "acme-saas.com"', type: 'success' },
        { timestamp: new Date(Date.now() - 2 * 86400000 + 2000).toISOString(), message: 'Deterministic axe-core accessibility engine inspected 2 pages', type: 'info' },
        { timestamp: new Date(Date.now() - 2 * 86400000 + 8000).toISOString(), message: 'Evaluated SEO tags, TTFB response timings, and TLS headers', type: 'info' },
        { timestamp: new Date(Date.now() - 2 * 86400000 + 12000).toISOString(), message: 'Audit completed. Overall Quality score: 86/100', type: 'success' },
      ],
      isDemo: true,
      limitationsNotice: 'Automated audit — manual testing and screen reader user verification may still be required for full WCAG compliance certification.',
    };

    this.scans.set(previousScanId, baselineScan);
    this.scans.set(demoScanId, currentScan);

    this.websites.set(demoSiteId, {
      id: demoSiteId,
      domain: 'acme-saas.com',
      rootUrl: 'https://acme-saas.com',
      firstScannedAt: baselineScan.createdAt,
      lastScannedAt: currentScan.createdAt,
      latestScore: 86,
      latestScanId: demoScanId,
      totalScansCount: 4,
      historicalScans: [
        {
          scanId: demoScanId,
          date: currentScan.createdAt,
          overallScore: 86,
          a11yScore: 83,
          perfScore: 88,
          seoScore: 92,
          secScore: 86,
          criticalCount: 2,
          seriousCount: 5,
        },
        {
          scanId: 'scan_demo_interim_02',
          date: new Date(Date.now() - 7 * 86400000).toISOString(),
          overallScore: 78,
          a11yScore: 75,
          perfScore: 82,
          seoScore: 86,
          secScore: 74,
          criticalCount: 4,
          seriousCount: 8,
        },
        {
          scanId: previousScanId,
          date: baselineScan.createdAt,
          overallScore: 70,
          a11yScore: 64,
          perfScore: 71,
          seoScore: 82,
          secScore: 68,
          criticalCount: 7,
          seriousCount: 11,
        },
      ],
    });

    this.scheduledMonitors.set('monitor_acme_prod', {
      id: 'monitor_acme_prod',
      websiteId: demoSiteId,
      domain: 'acme-saas.com',
      targetUrl: 'https://acme-saas.com',
      frequency: 'weekly',
      depth: 'standard',
      nextRun: new Date(Date.now() + 5 * 86400000).toISOString(),
      lastRun: currentScan.createdAt,
      notifyEmail: 'auditor@accessaudit.ai',
      alertThresholdScore: 80,
      active: true,
    });
  }
}

export const dbStore = new InMemoryStore();
