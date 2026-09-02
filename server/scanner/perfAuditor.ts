import type { PerformanceMetric } from '../../src/types/index.js';

export function runPerformanceAudit(
  html: string,
  fetchDurationMs: number,
  contentSizeBytes: number
): { perfMetrics: PerformanceMetric[]; perfScore: number } {
  const metrics: PerformanceMetric[] = [];
  let score = 100;

  // 1. Server Response & Transfer Time (TTFB estimate)
  const ttfbScore = fetchDurationMs < 400 ? 100 : fetchDurationMs < 1200 ? 80 : fetchDurationMs < 2500 ? 55 : 30;
  metrics.push({
    id: 'perf_ttfb',
    name: 'Server Response Time (TTFB)',
    value: Math.round(fetchDurationMs),
    unit: 'ms',
    score: ttfbScore,
    rating: ttfbScore >= 80 ? 'good' : ttfbScore >= 55 ? 'needs-improvement' : 'poor',
    details: `Initial page response took ${fetchDurationMs.toFixed(0)} ms. (Google threshold: < 800 ms).`,
  });

  // 2. HTML Document Weight
  const sizeKb = contentSizeBytes / 1024;
  const sizeScore = sizeKb < 80 ? 100 : sizeKb < 250 ? 85 : sizeKb < 600 ? 60 : 35;
  metrics.push({
    id: 'perf_doc_size',
    name: 'HTML Document Size',
    value: parseFloat(sizeKb.toFixed(1)),
    unit: 'KB',
    score: sizeScore,
    rating: sizeScore >= 80 ? 'good' : sizeScore >= 60 ? 'needs-improvement' : 'poor',
    details: `Raw HTML payload size is ${sizeKb.toFixed(1)} KB. Lean payloads accelerate parse & DOM construction.`,
  });

  // 3. DOM Element Count
  const tagMatches = html.match(/<[a-zA-Z][a-zA-Z0-9:-]*\b/g) || [];
  const domNodeCount = tagMatches.length;
  const domScore = domNodeCount < 800 ? 100 : domNodeCount < 1500 ? 80 : domNodeCount < 2500 ? 60 : 35;
  metrics.push({
    id: 'perf_dom_nodes',
    name: 'DOM Elements Count',
    value: domNodeCount,
    unit: 'nodes',
    score: domScore,
    rating: domScore >= 80 ? 'good' : domScore >= 60 ? 'needs-improvement' : 'poor',
    details: `Total DOM elements detected: ${domNodeCount}. Optimal is under 1,000 to prevent layout thrashing.`,
  });

  // 4. External Script Tags & Render Blocking Check
  const scriptTags = Array.from(html.matchAll(/<script\b([^>]*)>/gi));
  const syncScripts = scriptTags.filter(
    (s) => !/async/i.test(s[1]) && !/defer/i.test(s[1]) && !/type=["']module["']/i.test(s[1]) && /src=/i.test(s[1])
  );
  const scriptScore = syncScripts.length === 0 ? 100 : syncScripts.length <= 2 ? 75 : 45;
  metrics.push({
    id: 'perf_render_blocking_scripts',
    name: 'Render-Blocking Scripts',
    value: syncScripts.length,
    unit: 'scripts',
    score: scriptScore,
    rating: scriptScore >= 80 ? 'good' : scriptScore >= 60 ? 'needs-improvement' : 'poor',
    details: `${syncScripts.length} synchronous blocking scripts detected in document. Use 'defer' or 'async'.`,
  });

  // 5. Image Count & Lazy Loading Check
  const imgTags = Array.from(html.matchAll(/<img\b([^>]*)>/gi));
  const lazyImages = imgTags.filter((i) => /loading=["']lazy["']/i.test(i[1]));
  const lazyRatio = imgTags.length > 0 ? (lazyImages.length / imgTags.length) * 100 : 100;
  const imgScore = imgTags.length <= 3 || lazyRatio >= 50 ? 95 : 65;
  metrics.push({
    id: 'perf_image_lazy_loading',
    name: 'Image Lazy-Loading Ratio',
    value: Math.round(lazyRatio),
    unit: '%',
    score: imgScore,
    rating: imgScore >= 80 ? 'good' : 'needs-improvement',
    details: `${lazyImages.length} of ${imgTags.length} images specify loading="lazy" for deferred offscreen loading.`,
  });

  // Weighted score computation
  score = Math.round(
    ttfbScore * 0.35 +
    sizeScore * 0.20 +
    domScore * 0.20 +
    scriptScore * 0.15 +
    imgScore * 0.10
  );

  return { perfMetrics: metrics, perfScore: Math.max(20, Math.min(100, score)) };
}
