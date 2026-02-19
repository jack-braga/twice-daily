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
        className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-center h-16 bg-white/95 backdrop-blur-sm"
        style={{ fontFamily: 'var(--font-ui)', borderColor: 'var(--color-border)' }}
      >
        <TabButton active={activeTab === 'office'} onClick={() => navigate('office')} label="Office" />
        <TabButton active={activeTab === 'history'} onClick={() => navigate('history')} label="History" />
        <TabButton active={activeTab === 'settings'} onClick={() => navigate('settings')} label="Settings" />
      </nav>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 h-full flex items-center justify-center text-sm font-medium transition-colors ${
        active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'
      }`}
    >
      {label}
    </button>
  );
}
