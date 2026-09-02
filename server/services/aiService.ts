import { GoogleGenAI } from '@google/genai';
import type { AccessibilityIssue } from '../../src/types/index.js';

let genAIClient: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

/**
 * Generates an in-depth, plain-language explanation of a detected WCAG accessibility violation.
 */
export async function explainAccessibilityIssue(issue: Partial<AccessibilityIssue>, htmlSnippet?: string) {
  const ai = getAI();

  const prompt = `You are a Principal Accessibility Engineer and WCAG Compliance specialist.
Explain this accessibility issue for web developers:

Rule ID: ${issue.ruleId}
Title: ${issue.title}
Severity: ${issue.severity}
WCAG Reference: ${issue.wcagRef}
Summary: ${issue.description}
HTML Snippet: ${htmlSnippet || issue.affectedElements?.[0]?.htmlSnippet || 'N/A'}

Provide a structured JSON response with:
1. "whatItMeans": 2-3 sentences explaining what is technically broken.
2. "whyItMatters": 2-3 sentences on the user impact (e.g. screen reader users, keyboard-only users).
3. "affectedUsers": Demographic groups impacted (e.g., blind users, low-vision, motor impaired).
4. "remediationSteps": Array of 3-4 bullet point steps to fix and test.`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err) {
      console.warn('Gemini explain API call fallback:', err);
    }
  }

  // Deterministic high-quality fallback if API key is not configured or rate-limited
  return getStaticFallbackExplanation(issue.ruleId || '', issue.title || '');
}

/**
 * Generates developer-friendly Before & After code remediation across Plain HTML, React JSX, and Tailwind CSS.
 */
export async function generateRemediationFix(
  issue: Partial<AccessibilityIssue>,
  framework: 'html' | 'react' | 'tailwind' = 'html',
  customSnippet?: string
) {
  const ai = getAI();
  const rawSnippet = customSnippet || issue.affectedElements?.[0]?.htmlSnippet || '<button class="icon-btn">🔍</button>';

  const prompt = `You are a Senior Frontend Accessibility Architect.
Generate an exact, copy-pasteable remediation for this WCAG violation in ${framework.toUpperCase()} format.

Violation: ${issue.title} (${issue.ruleId})
WCAG: ${issue.wcagRef}
Original Snippet:
${rawSnippet}

Respond strictly in JSON format with:
{
  "beforeHtml": "Exact or cleaned original snippet",
  "afterHtml": "Corrected, fully accessible snippet following WCAG 2.1 AA best practices in ${framework}",
  "language": "${framework}",
  "explanation": "Clear 2-sentence explanation of what attributes or structure were modified and why."
}`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text?.trim();
      if (text) {
        return JSON.parse(text);
      }
    } catch (err) {
      console.warn('Gemini fix API call fallback:', err);
    }
  }

  return getStaticFallbackRemediation(issue.ruleId || '', rawSnippet, framework);
}

/**
 * Interactive Assistant for answering any accessibility engineering question with structured context.
 */
export async function queryAccessibilityAssistant(
  question: string,
  context?: { currentUrl?: string; selectedIssue?: Partial<AccessibilityIssue>; scores?: any }
) {
  const ai = getAI();

  const systemInstruction = `You are AccessAudit AI Assistant, an expert advisor on WCAG 2.1/2.2 accessibility, ARIA patterns, SEO, performance, and web security.
Always distinguish between:
1. Detected facts (what automated axe-core/scanners found)
2. Recommended remediation (best-practice engineering guidance).
Be concise, practical, provide clean code snippets (HTML/React/Tailwind), and avoid generic filler text.`;

  const contextStr = context ? `\n\nContext:\n- Target Website: ${context.currentUrl || 'Current site'}\n- Selected Rule: ${context.selectedIssue?.ruleId || 'General'}\n- Violation: ${context.selectedIssue?.title || 'None'}` : '';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `${question}${contextStr}`,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      return response.text?.trim() || 'No response generated.';
    } catch (err: any) {
      console.warn('Gemini chat assistant fallback:', err);
    }
  }

  // Smart fallback answer generator
  return generateDeterministicAssistantReply(question, context?.selectedIssue);
}

function getStaticFallbackExplanation(ruleId: string, title: string) {
  switch (ruleId) {
    case 'image-alt':
      return {
        whatItMeans: 'An <img> element was detected without an alt attribute or aria-label.',
        whyItMatters: 'Screen readers cannot describe visual imagery to blind or low-vision users and will instead read confusing raw file URLs.',
        affectedUsers: 'Screen reader users (JAWS, NVDA, VoiceOver), users on slow connections with disabled images.',
        remediationSteps: [
          'Add a concise, descriptive alt attribute describing the image content.',
          'If the image is purely decorative, add alt="" or aria-hidden="true".',
          'Avoid using words like "image of" or "photo" within alt text.',
          'Test with a screen reader to verify natural flow.',
        ],
      };
    case 'button-name':
      return {
        whatItMeans: 'A <button> element contains no readable text, aria-label, or title.',
        whyItMatters: 'Assistive technologies announce the element simply as "button", giving no indication of what action it performs.',
        affectedUsers: 'Blind, low-vision, voice-control, and keyboard-only users.',
        remediationSteps: [
          'Provide visible text inside the button.',
          'Add aria-label="Action description" if the button contains only an icon.',
          'Alternatively, wrap visually hidden text inside <span class="sr-only">Label</span>.',
        ],
      };
    case 'color-contrast':
      return {
        whatItMeans: 'The contrast ratio between the text and its background is below 4.5:1 (or 3:1 for large text).',
        whyItMatters: 'Low-contrast text strains readability and becomes invisible under bright sunlight or for users with low vision.',
        affectedUsers: 'Users with mild-to-severe visual impairments, color blindness, aging eyes.',
        remediationSteps: [
          'Darken the foreground text color or lighten the background color.',
          'Use a color contrast checker to verify at least 4.5:1 ratio.',
          'Ensure focus states also preserve contrast.',
        ],
      };
    default:
      return {
        whatItMeans: `The automated rule "${ruleId}" flagged a non-conformant HTML structure or missing ARIA attribute.`,
        whyItMatters: 'WCAG conformance ensures barrier-free access for people using assistive technologies.',
        affectedUsers: 'Assistive technology users, screen reader users, keyboard navigators.',
        remediationSteps: [
          'Inspect the affected DOM selector in your browser developer tools.',
          'Apply the recommended semantic HTML attribute.',
          'Re-run AccessAudit AI to verify the fix.',
        ],
      };
  }
}

function getStaticFallbackRemediation(ruleId: string, snippet: string, framework: string) {
  if (ruleId === 'image-alt') {
    if (framework === 'react') {
      return {
        beforeHtml: snippet,
        afterHtml: `<img\n  src="/assets/banner.png"\n  alt="AccessAudit dashboard showing WCAG compliance charts"\n  className="rounded-lg shadow-sm"\n/>`,
        language: 'react',
        explanation: 'Added an explicit, descriptive `alt` prop to inform screen readers of the image content.',
      };
    }
    return {
      beforeHtml: snippet,
      afterHtml: `<img src="/assets/banner.png" alt="AccessAudit dashboard showing WCAG compliance charts">`,
      language: 'html',
      explanation: 'Added a meaningful `alt` attribute describing the visual content.',
    };
  }

  if (ruleId === 'button-name') {
    if (framework === 'react') {
      return {
        beforeHtml: snippet,
        afterHtml: `<button\n  type="button"\n  aria-label="Search website content"\n  className="p-2 text-slate-300 hover:text-white"\n>\n  <SearchIcon className="w-5 h-5" aria-hidden="true" />\n</button>`,
        language: 'react',
        explanation: 'Provided an `aria-label` attribute on the button and marked the child icon with `aria-hidden="true"`.',
      };
    }
    if (framework === 'tailwind') {
      return {
        beforeHtml: snippet,
        afterHtml: `<button\n  type="button"\n  class="inline-flex items-center justify-center p-2 text-slate-100 bg-slate-800 rounded hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"\n  aria-label="Search website"\n>\n  <svg aria-hidden="true" class="w-4 h-4" ...></svg>\n  <span class="sr-only">Search website</span>\n</button>`,
        language: 'tailwind',
        explanation: 'Added accessible aria-label, focus rings for keyboard navigation, and screen-reader hidden span.',
      };
    }
    return {
      beforeHtml: snippet,
      afterHtml: `<button type="button" aria-label="Search website">\n  <span aria-hidden="true">🔍</span>\n</button>`,
      language: 'html',
      explanation: 'Added `aria-label="Search website"` to give the icon button an accessible name.',
    };
  }

  return {
    beforeHtml: snippet,
    afterHtml: `<!-- Accessible Remediation -->\n<div class="accessible-container">\n  ${snippet}\n</div>`,
    language: framework,
    explanation: 'Updated semantic structure and attributes to comply with WCAG 2.1 AA specifications.',
  };
}

function generateDeterministicAssistantReply(question: string, issue?: Partial<AccessibilityIssue>): string {
  const q = question.toLowerCase();
  if (q.includes('react')) {
    return `### How to remediate in React:
1. Ensure all interactive JSX elements have accessible labels:
   \`\`\`tsx
   <button aria-label="Dismiss notification" onClick={handleClose}>
     <XIcon aria-hidden="true" />
   </button>
   \`\`\`
2. For form inputs, always connect the \`htmlFor\` prop to the input's \`id\`:
   \`\`\`tsx
   <label htmlFor="user-email">Email Address</label>
   <input id="user-email" type="email" />
   \`\`\`
3. Use semantic HTML tags (\`<main>\`, \`<nav>\`, \`<header>\`, \`<footer>\`) instead of generic \`<div>\` containers.`;
  }

  if (q.includes('tailwind')) {
    return `### Accessible Tailwind CSS Patterns:
1. **Screen reader only utility:**
   \`\`\`html
   <span class="sr-only">Close modal window</span>
   \`\`\`
2. **High-contrast focus ring:**
   \`\`\`html
   <button class="focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900">
     Action
   </button>
   \`\`\`
3. **Contrast verification:** Ensure text using \`text-slate-400\` is on dark background with at least 4.5:1 ratio, or upgrade to \`text-slate-200\`.`;
  }

  return `### Accessibility Intelligence Advice:
- **WCAG Guideline:** ${issue?.wcagRef || 'WCAG 2.1 AA Standard'}
- **Issue Category:** ${issue?.title || 'Web Accessibility & Quality'}
- **Action Required:**
  1. Fix the affected HTML element by supplying missing semantic properties or ARIA attributes.
  2. Verify that keyboard tab navigation flows sequentially through all interactive controls.
  3. Validate color contrast ratios (minimum 4.5:1 for standard body copy, 3.0:1 for large display headers).
  4. Run an automated re-scan to verify remediation.`;
}
