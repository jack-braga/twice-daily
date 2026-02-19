import { useState } from 'react';
import { NowTab } from './components/tabs/NowTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { useSettings } from './hooks/useSettings';

type Tab = 'now' | 'history' | 'settings';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('now');
  const { settings, updateSetting, loaded } = useSettings();

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: 'var(--color-text-muted)' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-body)' }}>
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'now' && (
          <NowTab
            planId={settings.planId}
            translation={settings.translation}
            cutoffHour={settings.cutoffHour}
          />
        )}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'settings' && (
          <SettingsTab settings={settings} onUpdate={updateSetting} />
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t flex justify-around items-center h-16 bg-white/95 backdrop-blur-sm"
        style={{ fontFamily: 'var(--font-ui)', borderColor: 'var(--color-border)' }}
      >
        <TabButton active={activeTab === 'now'} onClick={() => setActiveTab('now')} label="Now" />
        <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="History" />
        <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Settings" />
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
