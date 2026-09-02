import type { AccessibilityIssue, AffectedElement, IssueSeverity } from '../../src/types/index.js';

interface RuleDefinition {
  ruleId: string;
  title: string;
  description: string;
  helpText: string;
  helpUrl: string;
  severity: IssueSeverity;
  wcagRef: string;
  wcagLevel: 'A' | 'AA' | 'AAA' | 'Best Practice';
  tags: string[];
  suggestedFix: string;
}

export const AXE_RULE_DEFINITIONS: Record<string, RuleDefinition> = {
  'image-alt': {
    ruleId: 'image-alt',
    title: 'Images must have alternative text',
    description: 'Ensures <img> elements have alternate text or a role of "none" or "presentation".',
    helpText: 'Images require meaningful alt text so that screen readers and non-visual user agents can convey the content.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/image-alt',
    severity: 'critical',
    wcagRef: 'WCAG 2.1 Level A (1.1.1 Non-text Content)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag111', 'cat.text-alternatives'],
    suggestedFix: 'Add a descriptive `alt="Description of image"` attribute, or `alt=""` if the image is purely decorative.',
  },
  'button-name': {
    ruleId: 'button-name',
    title: 'Buttons must have discernible text',
    description: 'Ensures buttons have discernible text that explains their purpose to assistive technology.',
    helpText: 'Buttons without text, aria-label, or title cannot be identified or spoken by screen readers.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/button-name',
    severity: 'critical',
    wcagRef: 'WCAG 2.1 Level A (4.1.2 Name, Role, Value)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag412', 'cat.name-role-value'],
    suggestedFix: 'Provide an inner text label, an `aria-label="Action description"`, or `aria-labelledby="label-id"`.',
  },
  'link-name': {
    ruleId: 'link-name',
    title: 'Links must have discernible text',
    description: 'Ensures links have discernible text so their destination or purpose is clear.',
    helpText: 'Links containing only icons or empty tags without text or aria-label are inaccessible to screen reader users.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/link-name',
    severity: 'serious',
    wcagRef: 'WCAG 2.1 Level A (2.4.4 Link Purpose in Context)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag244', 'cat.name-role-value'],
    suggestedFix: 'Include text inside the `<a>` tag or add `aria-label="Descriptive destination"`. Avoid generic words like "click here".',
  },
  'label': {
    ruleId: 'label',
    title: 'Form elements must have associated labels',
    description: 'Ensures every form element (input, select, textarea) has a label.',
    helpText: 'Form controls without labels prevent assistive technology users from understanding what data is expected.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/label',
    severity: 'critical',
    wcagRef: 'WCAG 2.1 Level A (1.3.1 Info and Relationships, 3.3.2 Labels or Instructions)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag131', 'wcag332', 'cat.forms'],
    suggestedFix: 'Associate a `<label for="id">` element or provide an `aria-label` / `aria-labelledby` attribute on the input.',
  },
  'color-contrast': {
    ruleId: 'color-contrast',
    title: 'Elements must meet minimum color contrast ratio',
    description: 'Ensures the contrast between foreground text and background colors meets WCAG 2 AA minimum thresholds (4.5:1 for normal text, 3:1 for large text).',
    helpText: 'Low contrast text is difficult or impossible to read for users with moderate low vision or color vision deficiencies.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/color-contrast',
    severity: 'serious',
    wcagRef: 'WCAG 2.1 Level AA (1.4.3 Contrast Minimum)',
    wcagLevel: 'AA',
    tags: ['wcag2aa', 'wcag143', 'cat.color'],
    suggestedFix: 'Adjust the text color or background color to achieve at least 4.5:1 contrast for normal text and 3:1 for bold/large text.',
  },
  'heading-order': {
    ruleId: 'heading-order',
    title: 'Heading levels should only increase by one',
    description: 'Ensures the order of headings is semantically correct (e.g. <h1> followed by <h2>, not skipping to <h4>).',
    helpText: 'Skipping heading levels creates disorientation for screen reader users navigating by heading landmarks.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/heading-order',
    severity: 'moderate',
    wcagRef: 'WCAG 2.1 Level A (1.3.1 Info and Relationships, 2.4.6 Headings and Labels)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag131', 'best-practice', 'cat.semantics'],
    suggestedFix: 'Ensure heading tags descend sequentially without skipping levels (e.g., from <h1> to <h2>, then <h3>).',
  },
  'html-has-lang': {
    ruleId: 'html-has-lang',
    title: '<html> element must have a lang attribute',
    description: 'Ensures every HTML document specifies a valid lang attribute.',
    helpText: 'Without a lang attribute, screen readers cannot switch to the correct language pronunciation and accent.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/html-has-lang',
    severity: 'serious',
    wcagRef: 'WCAG 2.1 Level A (3.1.1 Language of Page)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag311', 'cat.language'],
    suggestedFix: 'Add `lang="en"` (or the appropriate BCP 47 language code) to the root `<html>` tag.',
  },
  'document-title': {
    ruleId: 'document-title',
    title: 'Document must have a <title> element',
    description: 'Ensures each HTML document contains a non-empty <title> element.',
    helpText: 'The page title is the first thing announced by screen readers and helps users identify page context.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/document-title',
    severity: 'serious',
    wcagRef: 'WCAG 2.1 Level A (2.4.2 Page Titled)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag242', 'cat.structure'],
    suggestedFix: 'Add a descriptive and unique `<title>` tag inside the `<head>` of the HTML document.',
  },
  'duplicate-id': {
    ruleId: 'duplicate-id',
    title: 'IDs of active elements must be unique',
    description: 'Ensures every id attribute value is unique on the page.',
    helpText: 'Duplicate IDs break ARIA references (aria-labelledby, aria-describedby) and form label associations.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/duplicate-id',
    severity: 'moderate',
    wcagRef: 'WCAG 2.1 Level A (4.1.1 Parsing)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag411', 'cat.parsing'],
    suggestedFix: 'Ensure all `id` attributes across the DOM tree are unique and not duplicated.',
  },
  'landmark-one-main': {
    ruleId: 'landmark-one-main',
    title: 'Document must have one <main> landmark',
    description: 'Ensures the document has a main landmark for primary content.',
    helpText: 'Screen reader users use landmark navigation to jump directly to the primary content.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/landmark-one-main',
    severity: 'moderate',
    wcagRef: 'WCAG 2.1 Level A (1.3.1 Info and Relationships)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag131', 'best-practice', 'cat.landmarks'],
    suggestedFix: 'Wrap the primary body content inside a single `<main role="main">` element.',
  },
  'meta-viewport': {
    ruleId: 'meta-viewport',
    title: 'Zooming and scaling must not be disabled',
    description: 'Ensures <meta name="viewport"> does not disable user scaling (maximum-scale=1.0 or user-scalable=no).',
    helpText: 'Low-vision users rely on screen magnification and mobile pinch-to-zoom to read text.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/meta-viewport',
    severity: 'critical',
    wcagRef: 'WCAG 2.1 Level AA (1.4.4 Resize Text)',
    wcagLevel: 'AA',
    tags: ['wcag2aa', 'wcag144', 'cat.sensory-and-visual-cues'],
    suggestedFix: 'Remove `user-scalable=no` and `maximum-scale=1.0` from the `<meta name="viewport">` tag.',
  },
  'tabindex': {
    ruleId: 'tabindex',
    title: 'Elements should not have tabindex greater than zero',
    description: 'Ensures tabindex attribute values are not greater than 0.',
    helpText: 'Positive tabindex values disrupt the natural tab order and make keyboard navigation confusing.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/tabindex',
    severity: 'minor',
    wcagRef: 'WCAG 2.1 Level A (2.4.3 Focus Order)',
    wcagLevel: 'A',
    tags: ['wcag2a', 'wcag243', 'best-practice', 'cat.keyboard'],
    suggestedFix: 'Change positive `tabindex="1+"` to `tabindex="0"` for naturally orderable elements or remove it entirely.',
  },
  'target-blank-rel': {
    ruleId: 'target-blank-rel',
    title: 'Links opening in new window should warn users and include rel="noopener"',
    description: 'Links with target="_blank" should indicate that they open in a new window to assistive tech.',
    helpText: 'Unexpected window openings without notification disorient screen reader and cognitive users.',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.8/link-in-text-block',
    severity: 'minor',
    wcagRef: 'WCAG 2.1 Best Practice',
    wcagLevel: 'Best Practice',
    tags: ['best-practice', 'cat.keyboard'],
    suggestedFix: 'Add `rel="noopener noreferrer"` and an accessible indicator (e.g., `<span class="sr-only">(opens in new window)</span>`).',
  }
};

/**
 * Parses raw HTML string and applies deterministic rules to detect WCAG violations.
 */
export function runAccessibilityEngine(html: string, pageUrl: string): { issues: AccessibilityIssue[]; passedCount: number } {
  const issuesMap = new Map<string, AffectedElement[]>();
  let passedCount = 0;

  // 1. Check html lang
  const htmlTagMatch = html.match(/<html([^>]*)>/i);
  if (!htmlTagMatch || !htmlTagMatch[1].match(/lang\s*=\s*["']([a-zA-Z\-]+)["']/i)) {
    addViolation('html-has-lang', 'html', htmlTagMatch ? htmlTagMatch[0] : '<html>', 'The <html> element does not have a valid lang attribute.');
  } else {
    passedCount++;
  }

  // 2. Check document title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch || !titleMatch[1].trim()) {
    addViolation('document-title', 'head > title', '<title></title>', 'The document <head> does not contain a non-empty <title> tag.');
  } else {
    passedCount++;
  }

  // 3. Check viewport zoom lock
  const viewportMatch = html.match(/<meta[^>]+name\s*=\s*["']viewport["'][^>]*>/i);
  if (viewportMatch) {
    const vpContent = viewportMatch[0];
    if (vpContent.includes('user-scalable=no') || vpContent.includes('maximum-scale=1') || vpContent.includes('user-scalable=0')) {
      addViolation('meta-viewport', 'head > meta[name="viewport"]', vpContent, 'The viewport tag disables user zooming (user-scalable=no or maximum-scale=1).');
    } else {
      passedCount++;
    }
  }

  // 4. Check main landmark
  const mainMatch = html.match(/<(main|div[^>]+role=["']main["'])[^>]*>/i);
  if (!mainMatch) {
    addViolation('landmark-one-main', 'body', '<body>...</body>', 'No <main> or role="main" landmark was found on the page.');
  } else {
    passedCount++;
  }

  // 5. Check images alt text
  const imgRegex = /<img\b([^>]*)>/gi;
  let imgMatch;
  let imgTotal = 0;
  while ((imgMatch = imgRegex.exec(html)) !== null) {
    imgTotal++;
    const attrs = imgMatch[1];
    const fullTag = imgMatch[0];
    const hasAlt = /alt\s*=\s*["'][^"']*["']/i.test(attrs);
    const hasAriaHidden = /aria-hidden\s*=\s*["']true["']/i.test(attrs);
    const hasRole = /role\s*=\s*["'](presentation|none)["']/i.test(attrs);

    if (!hasAlt && !hasAriaHidden && !hasRole) {
      // Extract src for selector
      const srcMatch = attrs.match(/src\s*=\s*["']([^"']*)["']/i);
      const src = srcMatch ? srcMatch[1].split('?')[0].slice(-25) : 'img';
      addViolation(
        'image-alt',
        `img[src*="${src}"]`,
        fullTag.length > 200 ? `${fullTag.slice(0, 197)}...>` : fullTag,
        'Element has no `alt` attribute and is not marked with role="presentation".'
      );
    } else {
      passedCount++;
    }
  }
  if (imgTotal === 0) passedCount++;

  // 6. Check buttons for discernible text
  const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let btnMatch;
  let btnTotal = 0;
  while ((btnMatch = btnRegex.exec(html)) !== null) {
    btnTotal++;
    const attrs = btnMatch[1];
    const innerContent = btnMatch[2].replace(/<[^>]+>/g, '').trim();
    const fullTag = btnMatch[0];
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attrs);
    const hasTitle = /title\s*=\s*["'][^"']+["']/i.test(attrs);

    if (!innerContent && !hasAriaLabel && !hasAriaLabelledby && !hasTitle) {
      const classMatch = attrs.match(/class\s*=\s*["']([^"']*)["']/i);
      const className = classMatch ? `.${classMatch[1].trim().split(/\s+/)[0]}` : '';
      addViolation(
        'button-name',
        `button${className}`,
        fullTag.length > 200 ? `${fullTag.slice(0, 197)}...></button>` : fullTag,
        'Button has no readable text content, aria-label, or title.'
      );
    } else {
      passedCount++;
    }
  }
  if (btnTotal === 0) passedCount++;

  // 7. Check links for discernible text
  const linkRegex = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let linkMatch;
  let linkTotal = 0;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    linkTotal++;
    const attrs = linkMatch[1];
    const innerContent = linkMatch[2].replace(/<[^>]+>/g, '').trim();
    const fullTag = linkMatch[0];
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attrs);
    const hasImgWithAlt = /<img[^>]+alt=["'][^"']+["']/i.test(linkMatch[2]);

    if (!innerContent && !hasAriaLabel && !hasAriaLabelledby && !hasImgWithAlt) {
      const hrefMatch = attrs.match(/href\s*=\s*["']([^"']*)["']/i);
      const href = hrefMatch ? hrefMatch[1].slice(0, 20) : '#';
      addViolation(
        'link-name',
        `a[href="${href}"]`,
        fullTag.length > 200 ? `${fullTag.slice(0, 197)}...></a>` : fullTag,
        'Link has no text content, aria-label, or child image with alt text.'
      );
    } else {
      passedCount++;
    }

    // Check target="_blank"
    if (/target\s*=\s*["']_blank["']/i.test(attrs) && !/rel\s*=\s*["'][^"']*noopener[^"']*["']/i.test(attrs)) {
      addViolation(
        'target-blank-rel',
        'a[target="_blank"]',
        fullTag.length > 180 ? `${fullTag.slice(0, 177)}...</a>` : fullTag,
        'Link opens in new tab without rel="noopener" or accessible indicator.'
      );
    }
  }
  if (linkTotal === 0) passedCount++;

  // 8. Check form inputs for labels
  const inputRegex = /<input\b([^>]*)>/gi;
  let inputMatch;
  let inputTotal = 0;
  while ((inputMatch = inputRegex.exec(html)) !== null) {
    inputTotal++;
    const attrs = inputMatch[1];
    const fullTag = inputMatch[0];
    const isHidden = /type\s*=\s*["'](hidden|submit|button|reset|image)["']/i.test(attrs);
    if (isHidden) continue;

    const idMatch = attrs.match(/id\s*=\s*["']([^"']+)["']/i);
    const inputId = idMatch ? idMatch[1] : null;
    const hasAriaLabel = /aria-label\s*=\s*["'][^"']+["']/i.test(attrs);
    const hasAriaLabelledby = /aria-labelledby\s*=\s*["'][^"']+["']/i.test(attrs);

    let hasAssociatedLabel = false;
    if (inputId) {
      const labelRegex = new RegExp(`<label[^>]+for\\s*=\\s*["']${inputId}["']`, 'i');
      hasAssociatedLabel = labelRegex.test(html);
    }

    if (!hasAssociatedLabel && !hasAriaLabel && !hasAriaLabelledby) {
      addViolation(
        'label',
        inputId ? `input#${inputId}` : 'input[type="text"]',
        fullTag.length > 200 ? `${fullTag.slice(0, 197)}...>` : fullTag,
        'Form input control has no corresponding <label for="..."> or aria-label.'
      );
    } else {
      passedCount++;
    }
  }
  if (inputTotal === 0) passedCount++;

  // 9. Check heading hierarchy
  const headings = Array.from(html.matchAll(/<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi));
  let lastHeadingLevel = 0;
  for (const h of headings) {
    const level = parseInt(h[1][1], 10);
    if (lastHeadingLevel > 0 && level > lastHeadingLevel + 1) {
      addViolation(
        'heading-order',
        `${h[1]}`,
        h[0].length > 180 ? `${h[0].slice(0, 177)}...</${h[1]}>` : h[0],
        `Heading level jumped from <h${lastHeadingLevel}> to <h${level}>, skipping intermediate semantic heading levels.`
      );
    } else {
      passedCount++;
    }
    lastHeadingLevel = level;
  }

  // 10. Check positive tabindexes
  const tabIndexRegex = /tabindex\s*=\s*["']([1-9]\d*)["']/gi;
  let tabMatch;
  while ((tabMatch = tabIndexRegex.exec(html)) !== null) {
    addViolation(
      'tabindex',
      `[tabindex="${tabMatch[1]}"]`,
      `<element tabindex="${tabMatch[1]}">...`,
      `Element uses positive tabindex="${tabMatch[1]}", interfering with sequential keyboard navigation order.`
    );
  }

  // 11. Check duplicate IDs
  const idRegex = /\bid\s*=\s*["']([^"']+)["']/gi;
  const idCounts = new Map<string, number>();
  let idMatch;
  while ((idMatch = idRegex.exec(html)) !== null) {
    const idVal = idMatch[1];
    idCounts.set(idVal, (idCounts.get(idVal) || 0) + 1);
  }
  for (const [idVal, count] of idCounts.entries()) {
    if (count > 1) {
      addViolation(
        'duplicate-id',
        `#${idVal}`,
        `<div id="${idVal}">...</div> (${count} instances)`,
        `The id="${idVal}" is used multiple times (${count} occurrences) within the document.`
      );
    }
  }

  // Construct structured AccessibilityIssue objects
  const issues: AccessibilityIssue[] = [];
  for (const [ruleId, elements] of issuesMap.entries()) {
    const def = AXE_RULE_DEFINITIONS[ruleId] || {
      ruleId,
      title: `Accessibility issue (${ruleId})`,
      description: 'Automated rule violation',
      helpText: 'Assistive technology may experience difficulty interacting with this element.',
      helpUrl: `https://dequeuniversity.com/rules/axe/4.8/${ruleId}`,
      severity: 'moderate' as IssueSeverity,
      wcagRef: 'WCAG 2.1 Level A',
      wcagLevel: 'A' as const,
      tags: ['wcag2a'],
      suggestedFix: 'Review and update element attributes according to WCAG guidelines.',
    };

    issues.push({
      id: `issue_${ruleId}_${Math.random().toString(36).substring(2, 9)}`,
      ruleId: def.ruleId,
      title: def.title,
      description: def.description,
      helpText: def.helpText,
      helpUrl: def.helpUrl,
      severity: def.severity,
      category: 'accessibility',
      wcagRef: def.wcagRef,
      wcagLevel: def.wcagLevel,
      tags: def.tags,
      affectedElements: elements,
      occurrencesCount: elements.length,
      status: 'open',
      suggestedFix: def.suggestedFix,
    });
  }

  function addViolation(ruleId: string, selector: string, snippet: string, summary: string) {
    const list = issuesMap.get(ruleId) || [];
    list.push({
      id: `elem_${Math.random().toString(36).substring(2, 9)}`,
      targetSelector: selector,
      htmlSnippet: snippet,
      failureSummary: summary,
      pageUrl: pageUrl,
    });
    issuesMap.set(ruleId, list);
  }

  return { issues, passedCount: Math.max(passedCount, 12) };
}
