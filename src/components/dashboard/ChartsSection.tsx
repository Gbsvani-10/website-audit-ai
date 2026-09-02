import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import type { AuditScores, WebsiteProfile } from '../../types/index.js';

interface ChartsSectionProps {
  scores: AuditScores;
  websiteProfile?: WebsiteProfile;
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({
  scores,
  websiteProfile,
}) => {
  // Severity data for pie chart
  const severityData = [
    { name: 'Critical', value: scores.breakdown.critical, color: '#f43f5e' },
    { name: 'Serious', value: scores.breakdown.serious, color: '#fbbf24' },
    { name: 'Moderate', value: scores.breakdown.moderate, color: '#38bdf8' },
    { name: 'Minor', value: scores.breakdown.minor, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  // Scores breakdown comparison
  const qualityScoresData = [
    { name: 'Accessibility', score: scores.accessibility, target: 90 },
    { name: 'Performance', score: scores.performance, target: 85 },
    { name: 'SEO Health', score: scores.seo, target: 90 },
    { name: 'Security Health', score: scores.security, target: 85 },
  ];

  // Historical trend data
  const historicalData = (websiteProfile?.historicalScans || [
    { date: 'Baseline', overallScore: 70, a11yScore: 64 },
    { date: 'Interim', overallScore: 78, a11yScore: 75 },
    { date: 'Latest', overallScore: scores.overallQuality, a11yScore: scores.accessibility },
  ]).map((h, i) => ({
    name: h.date.includes('T') ? new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Scan ${i + 1}`,
    'Overall Quality': h.overallScore,
    'Accessibility': h.a11yScore,
  })).reverse();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* 1. Issue Severity Pie Chart */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Issue Severity Breakdown</h3>
          <p className="text-xs text-slate-400 mt-0.5">Distribution of WCAG violations</p>
        </div>

        <div className="h-56 mt-2 relative">
          {severityData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No violations recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 2. Quality Pillars Bar Chart */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Core Quality Pillars</h3>
          <p className="text-xs text-slate-400 mt-0.5">Audit scores across all 4 categories</p>
        </div>

        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={qualityScoresData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Bar dataKey="score" name="Score (/100)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Trend Over Time Line Chart */}
      <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Compliance & Quality Trend</h3>
          <p className="text-xs text-slate-400 mt-0.5">Historical trajectory over time</p>
        </div>

        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis domain={[40, 100]} stroke="#64748b" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
              />
              <Line type="monotone" dataKey="Overall Quality" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Accessibility" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
