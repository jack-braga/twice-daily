import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/schema';
import type { PlanId, Translation, Session } from '../engine/types';
import { applyTheme, type ThemeSetting } from '../utils/theme';

export interface AppSettings {
  planId: PlanId;
  translation: Translation;
  textSize: 'small' | 'medium' | 'large';
  theme: ThemeSetting;
  lastReadDate: string;     // "YYYY-MM-DD", empty = first launch
  lastReadSession: Session; // "morning" | "evening"
}

const DEFAULTS: AppSettings = {
  planId: '1662-original',
  translation: 'kjv',
  textSize: 'medium',
  theme: 'system',
  lastReadDate: '',
  lastReadSession: 'morning',
};

const TEXT_SIZE_MAP = { small: '16px', medium: '18px', large: '21px' } as const;

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const records = await db.settings.toArray();
      const map = new Map(records.map(r => [r.key, r.value]));
      setSettings({
        planId: (map.get('planId') as PlanId) ?? DEFAULTS.planId,
        translation: (map.get('translation') as Translation) ?? DEFAULTS.translation,
        textSize: (map.get('textSize') as AppSettings['textSize']) ?? DEFAULTS.textSize,
        theme: (map.get('theme') as ThemeSetting) ?? DEFAULTS.theme,
        lastReadDate: map.get('lastReadDate') ?? DEFAULTS.lastReadDate,
        lastReadSession: (map.get('lastReadSession') as Session) ?? DEFAULTS.lastReadSession,
      });
      setLoaded(true);
    })();
  }, []);

  // Apply text size to CSS
  useEffect(() => {
    document.documentElement.style.setProperty('--text-base', TEXT_SIZE_MAP[settings.textSize]);
  }, [settings.textSize]);

  // Apply theme
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for OS dark mode changes when in "system" mode
  useEffect(() => {
    if (settings.theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [settings.theme]);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await db.settings.put({ key, value: String(value) });
  }, []);

  const updateLastRead = useCallback(async (date: string, session: Session) => {
    setSettings(prev => ({ ...prev, lastReadDate: date, lastReadSession: session }));
    await db.settings.put({ key: 'lastReadDate', value: date });
    await db.settings.put({ key: 'lastReadSession', value: session });
  }, []);

  return { settings, updateSetting, updateLastRead, loaded };
}
