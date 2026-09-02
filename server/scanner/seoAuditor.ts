import type { SeoCheckItem } from '../../src/types/index.js';

export function runSeoAudit(html: string, pageUrl: string): { seoChecks: SeoCheckItem[]; seoScore: number } {
  const checks: SeoCheckItem[] = [];
  let score = 100;

  // 1. Title check
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titleText = titleMatch ? titleMatch[1].trim() : '';
  if (!titleText) {
    checks.push({
      id: 'seo_title_missing',
      title: 'Page Title',
      status: 'fail',
      value: 'Missing',
      detail: 'The page lacks a <title> tag, which is essential for search engines and social shares.',
      recommendation: 'Add a concise title between 50 and 60 characters describing the page content.',
    });
    score -= 20;
  } else if (titleText.length < 20 || titleText.length > 70) {
    checks.push({
      id: 'seo_title_length',
      title: 'Page Title Length',
      status: 'warn',
      value: `"${titleText.slice(0, 40)}..." (${titleText.length} chars)`,
      detail: `Title length is ${titleText.length} characters. Search engines recommend between 30 and 60 characters.`,
      recommendation: 'Optimize page title length to avoid truncation in SERPs.',
    });
    score -= 8;
  } else {
    checks.push({
      id: 'seo_title_ok',
      title: 'Page Title',
      status: 'pass',
      value: `"${titleText}" (${titleText.length} chars)`,
      detail: 'Page title is present and has optimal length.',
      recommendation: 'Maintain unique, descriptive titles across all pages.',
    });
  }

  // 2. Meta description check
  const descMatch = html.match(/<meta[^>]+name\s*=\s*["']description["'][^>]+content\s*=\s*["']([^"']*)["']/i) ||
                    html.match(/<meta[^>]+content\s*=\s*["']([^"']*)["'][^>]+name\s*=\s*["']description["']/i);
  const descText = descMatch ? descMatch[1].trim() : '';
  if (!descText) {
    checks.push({
      id: 'seo_desc_missing',
      title: 'Meta Description',
      status: 'fail',
      value: 'Missing',
      detail: 'No meta description was detected in the document <head>.',
      recommendation: 'Provide a meta description between 120 and 160 characters summarizing the page.',
    });
    score -= 15;
  } else if (descText.length < 70 || descText.length > 180) {
    checks.push({
      id: 'seo_desc_length',
      title: 'Meta Description Length',
      status: 'warn',
      value: `${descText.length} characters`,
      detail: `Meta description length is ${descText.length} characters (optimal is 120–160).`,
      recommendation: 'Adjust description length to prevent snippet clipping in search results.',
    });
    score -= 6;
  } else {
    checks.push({
      id: 'seo_desc_ok',
      title: 'Meta Description',
      status: 'pass',
      value: `${descText.slice(0, 50)}... (${descText.length} chars)`,
      detail: 'Meta description is present with good length.',
      recommendation: 'Keep descriptions compelling with a clear call-to-action.',
    });
  }

  // 3. H1 Heading check
  const h1Matches = Array.from(html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi));
  if (h1Matches.length === 0) {
    checks.push({
      id: 'seo_h1_missing',
      title: 'H1 Primary Heading',
      status: 'fail',
      value: '0 H1 tags',
      detail: 'The page does not contain any <h1> heading tag.',
      recommendation: 'Include exactly one <h1> tag representing the main topic of the page.',
    });
    score -= 15;
  } else if (h1Matches.length > 1) {
    checks.push({
      id: 'seo_h1_multiple',
      title: 'H1 Primary Heading',
      status: 'warn',
      value: `${h1Matches.length} H1 tags detected`,
      detail: 'Multiple <h1> tags were found. While HTML5 permits this, having one primary <h1> is best practice.',
      recommendation: 'Consider structuring the page with a single top-level <h1> and using <h2> for sub-topics.',
    });
    score -= 5;
  } else {
    checks.push({
      id: 'seo_h1_ok',
      title: 'H1 Primary Heading',
      status: 'pass',
      value: '1 H1 tag',
      detail: 'Single primary <h1> heading detected.',
      recommendation: 'Ensure your H1 contains your primary target keywords naturally.',
    });
  }

  // 4. Viewport check
  const hasViewport = /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html);
  if (!hasViewport) {
    checks.push({
      id: 'seo_viewport_missing',
      title: 'Mobile Viewport Tag',
      status: 'fail',
      value: 'Missing',
      detail: 'Missing mobile viewport tag prevents mobile-friendly rendering in search indexers.',
      recommendation: 'Add `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.',
    });
    score -= 15;
  } else {
    checks.push({
      id: 'seo_viewport_ok',
      title: 'Mobile Viewport Tag',
      status: 'pass',
      value: 'Configured',
      detail: 'Mobile viewport tag is properly defined.',
      recommendation: 'Mobile responsiveness aligns with Google mobile-first indexing.',
    });
  }

  // 5. OpenGraph metadata check
  const hasOgTitle = /<meta[^>]+property\s*=\s*["']og:title["']/i.test(html);
  const hasOgImage = /<meta[^>]+property\s*=\s*["']og:image["']/i.test(html);
  if (!hasOgTitle || !hasOgImage) {
    checks.push({
      id: 'seo_og_tags',
      title: 'Open Graph Social Metadata',
      status: 'warn',
      value: hasOgTitle ? 'og:title only' : 'Incomplete',
      detail: 'Incomplete Open Graph tags (missing og:title or og:image) reduce social link preview engagement.',
      recommendation: 'Add `og:title`, `og:description`, `og:image`, and `og:url` tags to your <head>.',
    });
    score -= 8;
  } else {
    checks.push({
      id: 'seo_og_ok',
      title: 'Open Graph Social Metadata',
      status: 'pass',
      value: 'Configured',
      detail: 'Social sharing Open Graph meta tags are configured.',
      recommendation: 'Ensure high-resolution images (1200x630px) for og:image.',
    });
  }

  // 6. Canonical link check
  const hasCanonical = /<link[^>]+rel\s*=\s*["']canonical["']/i.test(html);
  if (!hasCanonical) {
    checks.push({
      id: 'seo_canonical_missing',
      title: 'Canonical URL Tag',
      status: 'warn',
      value: 'Not declared',
      detail: 'No canonical URL tag declared to prevent duplicate content indexing issues.',
      recommendation: 'Add `<link rel="canonical" href="...">` pointing to the authoritative URL.',
    });
    score -= 7;
  } else {
    checks.push({
      id: 'seo_canonical_ok',
      title: 'Canonical URL Tag',
      status: 'pass',
      value: 'Declared',
      detail: 'Canonical link tag is present.',
      recommendation: 'Verify canonical URL matches the production HTTPS scheme.',
    });
  }

  // 7. Robots meta check
  const robotsMatch = html.match(/<meta[^>]+name\s*=\s*["']robots["'][^>]+content\s*=\s*["']([^"']*)["']/i);
  if (robotsMatch && /noindex/i.test(robotsMatch[1])) {
    checks.push({
      id: 'seo_robots_noindex',
      title: 'Robots Meta Directive',
      status: 'warn',
      value: 'noindex directive active',
      detail: 'Page specifies `noindex`, telling search engines not to index this page.',
      recommendation: 'Remove `noindex` if this page is intended for public discovery.',
    });
    score -= 10;
  } else {
    checks.push({
      id: 'seo_robots_ok',
      title: 'Robots Meta Directive',
      status: 'pass',
      value: 'Indexable',
      detail: 'No blocking noindex directives detected.',
      recommendation: 'Use robots.txt or meta robots tags for non-public staging environments.',
    });
  }

  return { seoChecks: checks, seoScore: Math.max(0, Math.min(100, score)) };
}
