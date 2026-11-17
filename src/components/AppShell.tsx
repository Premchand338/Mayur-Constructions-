import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  IndianRupee,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Presentation,
  Settings,
  Truck,
  X,
} from 'lucide-react';
import { Button, SelectField, ToastViewport } from '@/src/components/ui/primitives';
import { NAV_LABELS, ROLE_META, t } from '@/src/lib/i18n';
import { cn } from '@/src/lib/utils';
import { useDemoStore } from '@/src/store/demoStore';
import { AppSection, LanguageMode, RoleType } from '@/src/types/domain';

const NAV_ICONS: Record<AppSection, React.ComponentType<{ className?: string }>> = {
  overview: LayoutDashboard,
  projects: Building2,
  vehicles: Truck,
  materials: Package,
  finance: IndianRupee,
  documents: FileText,
  reports: BarChart3,
  notifications: Bell,
  activity: Activity,
  settings: Settings,
};

const ROLE_ALLOWED_SECTIONS: Record<RoleType, AppSection[]> = {
  owner: [
    'overview',
    'projects',
    'vehicles',
    'materials',
    'finance',
    'documents',
    'reports',
    'notifications',
    'activity',
    'settings',
  ],
  supervisor: [
    'overview',
    'projects',
    'vehicles',
    'materials',
    'finance',
    'documents',
    'notifications',
    'activity',
    'settings',
  ],
  office_admin: [
    'overview',
    'projects',
    'vehicles',
    'materials',
    'finance',
    'documents',
    'reports',
    'notifications',
    'activity',
    'settings',
  ],
  accountant: [
    'overview',
    'projects',
    'finance',
    'documents',
    'reports',
    'notifications',
    'activity',
    'settings',
  ],
  driver: ['overview', 'vehicles', 'documents', 'settings'],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    activeRole,
    language,
    activeSection,
    globalProjectFilter,
    guidedTourOpen,
    toasts,
    dismissToast,
    setActiveSection,
    setGlobalProjectFilter,
    switchRole,
    setLanguage,
    setGuidedTourOpen,
    setGuidedTourStep,
    getVisibleProjects,
    getBusinessTotals,
  } = useDemoStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  const allowedSections = ROLE_ALLOWED_SECTIONS[activeRole];
  const primarySections = (
    ['overview', 'projects', 'vehicles', 'materials', 'finance', 'documents'] as AppSection[]
  ).filter((s) => allowedSections.includes(s));
  const secondarySections = (
    ['reports', 'notifications', 'activity', 'settings'] as AppSection[]
  ).filter((s) => allowedSections.includes(s));

  const visibleProjects = getVisibleProjects();
  const totals = getBusinessTotals(globalProjectFilter);

  const mobileTabs: AppSection[] = (
    ['overview', 'projects', 'vehicles', 'materials'] as AppSection[]
  ).filter((s) => allowedSections.includes(s));

  const handleNavClick = (section: AppSection) => {
    setActiveSection(section);
    setMobileMoreOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#171717] flex">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-[#E5E2DC] bg-white shrink-0 transition-[width] duration-150 sticky top-0 h-screen',
          sidebarCollapsed ? 'w-[76px]' : 'w-[256px]'
        )}
      >
        <div className="h-16 px-4 border-b border-[#E5E2DC] flex items-center justify-between gap-2">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => handleNavClick('overview')}
              className="text-left min-w-0 cursor-pointer"
            >
              <span className="block text-sm font-bold tracking-tight text-[#171717] truncate">
                MAYUR COMMAND
              </span>
              <span className="block text-[11px] text-[#52524E] truncate">
                Constructions · Demo
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-[#E5E2DC] text-[#52524E] hover:bg-[#FAF9F6] hover:text-[#171717] cursor-pointer mx-auto"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-5">
          <div className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-2.5 pb-1 text-[11px] font-medium text-[#73726C]">
                Operations & Finance
              </p>
            )}
            {primarySections.map((sec) => {
              const Icon = NAV_ICONS[sec];
              const active = activeSection === sec;
              const label = NAV_LABELS[sec][language];
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleNavClick(sec)}
                  title={label.title}
                  className={cn(
                    'w-full min-h-[44px] px-3 py-2 rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer',
                    active
                      ? 'bg-[#245BFF] text-white'
                      : 'text-[#171717] hover:bg-[#F3F1EC]'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-tight truncate">
                        {label.title}
                      </span>
                      <span
                        className={cn(
                          'block text-[11px] truncate',
                          active ? 'text-white/80' : 'text-[#73726C]'
                        )}
                      >
                        {label.subtitle}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[#E5E2DC] space-y-1">
            {!sidebarCollapsed && (
              <p className="px-2.5 pb-1 text-[11px] font-medium text-[#73726C]">
                Control & Governance
              </p>
            )}
            {secondarySections.map((sec) => {
              const Icon = NAV_ICONS[sec];
              const active = activeSection === sec;
              const label = NAV_LABELS[sec][language];
              const badgeCount = sec === 'notifications' ? totals.pendingApprovalCount : 0;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleNavClick(sec)}
                  title={label.title}
                  className={cn(
                    'w-full min-h-[42px] px-3 py-2 rounded-xl flex items-center gap-3 text-left transition-colors cursor-pointer',
                    active
                      ? 'bg-[#171717] text-white'
                      : 'text-[#52524E] hover:bg-[#F3F1EC] hover:text-[#171717]'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="flex-1 text-xs font-medium truncate">{label.title}</span>
                  )}
                  {!sidebarCollapsed && badgeCount > 0 && (
                    <span
                      className={cn(
                        'font-mono text-[11px] tabular-nums',
                        active ? 'text-[#F5CB54]' : 'text-[#B45309]'
                      )}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Desktop Top Workspace Bar */}
        <header className="hidden md:flex h-16 bg-white border-b border-[#E5E2DC] px-6 items-center justify-between gap-6 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-sm font-semibold text-[#171717] whitespace-nowrap">
              {NAV_LABELS[activeSection][language].title}
            </span>
            <span className="text-[#D8D4CB]" aria-hidden="true">
              /
            </span>
            <div className="w-56">
              <SelectField
                value={globalProjectFilter}
                onValueChange={setGlobalProjectFilter}
                options={[
                  { value: 'ALL', label: 'All Projects (5 Regions)' },
                  ...visibleProjects.map((p) => ({
                    value: p.id,
                    label: `${p.region} · ${p.code}`,
                  })),
                ]}
                className="min-h-[38px] text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-36">
              <SelectField
                value={language}
                onValueChange={(v) => setLanguage(v as LanguageMode)}
                options={[
                  { value: 'hinglish', label: 'Hinglish + EN' },
                  { value: 'english', label: 'English' },
                  { value: 'devanagari', label: 'हिंदी / मराठी' },
                ]}
                className="min-h-[38px] text-xs"
              />
            </div>

            <div className="w-48">
              <SelectField
                value={activeRole}
                onValueChange={(v) => switchRole(v as RoleType)}
                options={[
                  { value: 'owner', label: ROLE_META.owner.label[language] },
                  { value: 'supervisor', label: ROLE_META.supervisor.label[language] },
                  { value: 'office_admin', label: ROLE_META.office_admin.label[language] },
                  { value: 'accountant', label: ROLE_META.accountant.label[language] },
                  { value: 'driver', label: ROLE_META.driver.label[language] },
                ]}
                className="min-h-[38px] text-xs"
              />
            </div>

            <Button
              size="sm"
              variant={guidedTourOpen ? 'secondary' : 'primary'}
              onClick={() => {
                if (!guidedTourOpen) {
                  setGuidedTourStep(0);
                  setGuidedTourOpen(true);
                } else {
                  setGuidedTourOpen(false);
                }
              }}
            >
              <Presentation className="h-3.5 w-3.5" />
              {guidedTourOpen ? 'Hide Tour' : t('guidedTour', language)}
            </Button>
          </div>
        </header>

        {/* Mobile Compact Top Header (<= 52px) */}
        <header className="md:hidden h-[52px] bg-white border-b border-[#E5E2DC] px-4 flex items-center justify-between gap-2 sticky top-0 z-30">
          <button
            type="button"
            onClick={() => handleNavClick('overview')}
            className="text-sm font-bold tracking-tight text-[#171717] truncate"
          >
            Mayur Command
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label="Switch Role"
              value={activeRole}
              onChange={(e) => switchRole(e.target.value as RoleType)}
              className="h-9 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] px-2 text-xs font-medium text-[#171717]"
            >
              <option value="owner">Owner</option>
              <option value="supervisor">Supervisor</option>
              <option value="office_admin">Office Admin</option>
              <option value="accountant">Accountant</option>
              <option value="driver">Driver</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setGuidedTourStep(0);
                setGuidedTourOpen(!guidedTourOpen);
              }}
              className="min-h-[36px] px-2.5 rounded-lg bg-[#245BFF] text-white text-xs font-medium flex items-center gap-1"
            >
              <Presentation className="h-3.5 w-3.5" />
              Tour
            </button>
          </div>
        </header>

        {/* Honest Demo Data Label (Non-Sticky, Clean) */}
        <div className="bg-[#F3F1EC] border-b border-[#E5E2DC] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52524E]">
          <span>{t('demoBanner', language)}</span>
          <span className="font-mono">
            Role: <strong className="text-[#171717]">{ROLE_META[activeRole].label[language]}</strong>
          </span>
        </div>

        {/* Main Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-12 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Fixed Bottom Tab Bar (<= 56px) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-white border-t border-[#E5E2DC] flex items-center justify-around px-1"
      >
        {mobileTabs.map((sec) => {
          const Icon = NAV_ICONS[sec];
          const active = activeSection === sec;
          return (
            <button
              key={sec}
              type="button"
              onClick={() => handleNavClick(sec)}
              className={cn(
                'min-h-[44px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 rounded-lg px-2',
                active ? 'text-[#245BFF]' : 'text-[#52524E]'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[10px] font-medium leading-none">
                {NAV_LABELS[sec][language].title}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMoreOpen(true)}
          className={cn(
            'min-h-[44px] min-w-[54px] flex flex-col items-center justify-center gap-0.5 rounded-lg px-2',
            mobileMoreOpen ? 'text-[#245BFF]' : 'text-[#52524E]'
          )}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="text-[10px] font-medium leading-none">More</span>
        </button>
      </nav>

      {/* Mobile More Menu Sheet */}
      {mobileMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/40 flex items-end">
          <div className="w-full bg-white rounded-t-3xl border-t border-[#E5E2DC] p-5 space-y-4 max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DC]">
              <p className="text-base font-semibold text-[#171717]">All Modules & Controls</p>
              <button
                type="button"
                onClick={() => setMobileMoreOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-[#E5E2DC]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#52524E]">Project Filter</p>
              <SelectField
                value={globalProjectFilter}
                onValueChange={setGlobalProjectFilter}
                options={[
                  { value: 'ALL', label: 'All Projects (5 Regions)' },
                  ...visibleProjects.map((p) => ({
                    value: p.id,
                    label: `${p.region} · ${p.name}`,
                  })),
                ]}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[#52524E]">Language</p>
              <div className="grid grid-cols-3 gap-2">
                {(['hinglish', 'english', 'devanagari'] as LanguageMode[]).map((l) => (
                  <Button
                    key={l}
                    size="sm"
                    variant={language === l ? 'primary' : 'outline'}
                    onClick={() => setLanguage(l)}
                  >
                    {l === 'hinglish' ? 'Hinglish' : l === 'english' ? 'English' : 'हिंदी/मराठी'}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {allowedSections.map((sec) => {
                const Icon = NAV_ICONS[sec];
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleNavClick(sec)}
                    className={cn(
                      'min-h-[48px] px-3 rounded-xl border text-left flex items-center gap-2.5 text-xs font-medium',
                      activeSection === sec
                        ? 'border-[#245BFF] bg-[#245BFF]/5 text-[#245BFF]'
                        : 'border-[#E5E2DC] text-[#171717]'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{NAV_LABELS[sec][language].title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
