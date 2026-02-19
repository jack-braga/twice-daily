import { useState, useCallback, useEffect } from 'react';
import { OfficeTab } from './components/tabs/OfficeTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { useSettings } from './hooks/useSettings';
import type { Session } from './engine/types';

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
  const sessionAbbr = session === 'morning' ? 'MP' : 'EP';
  return `${shortDate} \u00B7 ${sessionAbbr}`;
}

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>(tabFromPath);
  const { settings, updateSetting, updateLastRead, loaded } = useSettings();

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

  if (!loaded) {
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
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab
            planId={settings.planId}
            onNavigateToOffice={handleNavigateToOffice}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab settings={settings} onUpdate={updateSetting} />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-center h-16 bg-[var(--color-surface)]/95 backdrop-blur-sm"
        style={{ fontFamily: 'var(--font-ui)', borderColor: 'var(--color-border)' }}
      >
        <TabButton
          active={activeTab === 'office'}
          onClick={() => navigate('office')}
          label="Office"
          subtext={formatOfficeSubtext(settings.lastReadDate, settings.lastReadSession)}
        />
        <TabButton active={activeTab === 'history'} onClick={() => navigate('history')} label="History" />
        <TabButton active={activeTab === 'settings'} onClick={() => navigate('settings')} label="Settings" />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label, subtext }: { active: boolean; onClick: () => void; label: string; subtext?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-full flex flex-col items-center justify-center transition-colors ${
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      {subtext && (
        <span className="text-[10px] leading-tight mt-0.5 opacity-70 truncate max-w-full px-1">
          {subtext}
        </span>
      )}
    </button>
  );
}
