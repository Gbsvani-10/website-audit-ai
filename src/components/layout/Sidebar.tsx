import React from 'react';
import {
  LayoutDashboard,
  Globe,
  ListOrdered,
  AlertOctagon,
  Sparkles,
  GitCompare,
  FileText,
  Clock,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type TabKey =
  | 'overview'
  | 'websites'
  | 'scans'
  | 'issues'
  | 'assistant'
  | 'compare'
  | 'reports'
  | 'monitoring'
  | 'settings';

interface SidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  issuesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  issuesCount = 0,
}) => {
  interface NavItem {
    key: TabKey;
    label: string;
    icon: any;
    badge?: number;
    highlight?: boolean;
  }

  const navItems: NavItem[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'websites', label: 'Websites', icon: Globe },
    { key: 'scans', label: 'Scan History', icon: ListOrdered },
    { key: 'issues', label: 'Issue Explorer', icon: AlertOctagon, badge: issuesCount > 0 ? issuesCount : undefined },
    { key: 'assistant', label: 'AI Remediation', icon: Sparkles, highlight: true },
    { key: 'compare', label: 'Scan Compare', icon: GitCompare },
    { key: 'reports', label: 'Audit Reports', icon: FileText },
    { key: 'monitoring', label: 'Monitoring', icon: Clock },
    { key: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      id="dashboard-sidebar"
      aria-label="Main Navigation"
      className={`relative bg-slate-900/95 border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="py-4">
        <nav className="space-y-1 px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                id={`sidebar-nav-${item.key}`}
                onClick={() => onSelectTab(item.key as TabKey)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                } ${item.highlight && !isActive ? 'text-indigo-300 hover:text-indigo-200' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-emerald-400'
                      : item.highlight
                      ? 'text-indigo-400'
                      : 'text-slate-400'
                  }`}
                  aria-hidden="true"
                />

                {!collapsed && (
                  <div className="flex-1 flex items-center justify-between truncate text-left">
                    <span>{item.label}</span>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Collapse toggle & compliance indicator */}
      <div className="p-3 border-t border-slate-800/80">
        {!collapsed && (
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>WCAG 2.1 AA Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Deterministic axe-core rules + AI remediation
            </p>
          </div>
        )}

        <button
          type="button"
          id="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Collapse Menu</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
