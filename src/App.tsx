import { useState, useCallback, useEffect } from 'react';
import { OfficeTab } from './components/tabs/OfficeTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { useSettings } from './hooks/useSettings';
import { usePlanStartDate } from './hooks/usePlanStartDate';
import { clearCompletionsForPlan } from './hooks/useCompletion';
import { getPlan } from './plans';
import type { Session, Translation } from './engine/types';
import { todayStr } from './utils/date';

const TRANSLATION_SHORT: Record<Translation, string> = {
  'kjv': 'KJV',
  'asv': 'ASV',
  'lsv': 'LSV',
  'web-usa': 'WEB (US)',
  'web-brit': 'WEB (GB)',
  'web-updated': 'WEB (Updated)',
};
import { BookOpen, CalendarDays, Settings as SettingsIcon, type LucideIcon } from 'lucide-react';

type Tab = 'office' | 'history' | 'settings';

const BASE = import.meta.env.BASE_URL; // "/twice-daily/"

function tabFromPath(): Tab {
  const path = window.location.pathname.replace(BASE, '').replace(/^\/+|\/+$/g, '');
  if (path === 'history') return 'history';
  if (path === 'settings') return 'settings';
  return 'office';
}

function pathForTab(tab: Tab): string {
  if (tab === 'office') return BASE;
  return `${BASE}${tab}`;
}

function formatOfficeSubtext(dateStr: string, session: Session): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const shortDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (session === 'daily') return shortDate;
  const sessionAbbr = session === 'morning' ? 'MP' : 'EP';
  return `${shortDate} \u00B7 ${sessionAbbr}`;
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>(tabFromPath);
  const { settings, updateSetting, updateLastRead, loaded } = useSettings();
  const { startDate: planStartDate, updateStartDate, loaded: startDateLoaded } = usePlanStartDate(settings.planId);
  const planConfig = getPlan(settings.planId).config;

  // Auto-set start date to today when a sequential plan is first selected and no date exists
  useEffect(() => {
    if (startDateLoaded && planConfig.needsStartDate && !planStartDate) {
      updateStartDate(todayStr());
    }
  }, [startDateLoaded, planConfig.needsStartDate, planStartDate, updateStartDate]);

  const handleRestartPlan = useCallback(() => {
    clearCompletionsForPlan(settings.planId).then(() => {
      updateStartDate(todayStr());
    });
  }, [updateStartDate, settings.planId]);

  const handleStartDateChange = useCallback((newDate: string) => {
    clearCompletionsForPlan(settings.planId).then(() => {
      updateStartDate(newDate);
    });
  }, [updateStartDate, settings.planId]);

  // Navigation state: set by History tab to open a specific date+session in the Office tab
  const [navigateDate, setNavigateDate] = useState<string | undefined>();
  const [navigateSession, setNavigateSession] = useState<Session | undefined>();

  // Sync tab → URL
  const navigate = useCallback((tab: Tab) => {
    setActiveTab(tab);
    const url = pathForTab(tab) + window.location.search;
    history.pushState(null, '', url);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const onPopState = () => setActiveTab(tabFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleNavigateToOffice = useCallback((date: string, session: Session) => {
    setNavigateDate(date);
    setNavigateSession(session);
    navigate('office');
  }, [navigate]);

  const handleNavigateConsumed = useCallback(() => {
    setNavigateDate(undefined);
    setNavigateSession(undefined);
  }, []);

  if (!loaded || !startDateLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
      <main className={`flex-1 min-h-0 ${activeTab === 'history' ? 'overflow-hidden' : 'overflow-y-auto pb-20'}`}>
        {activeTab === 'office' && (
          <OfficeTab
            planId={settings.planId}
            translation={settings.translation}
            lastReadDate={settings.lastReadDate}
            lastReadSession={settings.lastReadSession}
            onLastReadChange={updateLastRead}
            navigateDate={navigateDate}
            navigateSession={navigateSession}
            onNavigateConsumed={handleNavigateConsumed}
            planStartDate={planStartDate}
            onRestartPlan={handleRestartPlan}
            readingWpm={settings.readingWpm}
            readingComprehension={settings.readingComprehension}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            planId={settings.planId}
            onNavigateToOffice={handleNavigateToOffice}
            planStartDate={planStartDate}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onUpdate={updateSetting}
            planStartDate={planStartDate}
            onStartDateChange={handleStartDateChange}
          />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-stretch h-[72px] bg-[var(--color-surface)]/95 backdrop-blur-sm"
        style={{ fontFamily: 'var(--font-ui)', borderColor: 'var(--color-border)' }}
      >
        <TabButton
          active={activeTab === 'office'}
          onClick={() => navigate('office')}
          label="Office"
          icon={BookOpen}
          subtext={formatOfficeSubtext(settings.lastReadDate, settings.lastReadSession)}
        />
        <TabButton active={activeTab === 'history'} onClick={() => navigate('history')} label="History" icon={CalendarDays} subtext={planConfig.name} />
        <TabButton active={activeTab === 'settings'} onClick={() => navigate('settings')} label="Settings" icon={SettingsIcon} subtext={TRANSLATION_SHORT[settings.translation]} />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label, icon: Icon, subtext }: { active: boolean; onClick: () => void; label: string; icon: LucideIcon; subtext?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 transition-colors ${
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
      }`}
    >
      <Icon size={20} strokeWidth={2} />
      <span className="text-xs font-medium leading-tight">{label}</span>
      <span className="text-[10px] leading-tight opacity-70 truncate max-w-full px-1 min-h-[14px]">
        {subtext || '\u00A0'}
      </span>
    </button>
  );
}
