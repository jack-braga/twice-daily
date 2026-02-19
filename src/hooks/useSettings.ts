import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/schema';
import type { PlanId, Translation } from '../engine/types';

export interface AppSettings {
  planId: PlanId;
  translation: Translation;
  textSize: 'small' | 'medium' | 'large';
  cutoffHour: number; // 0-23, default 12
}

const DEFAULTS: AppSettings = {
  planId: '1662-original',
  translation: 'kjv',
  textSize: 'medium',
  cutoffHour: 12,
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
        cutoffHour: parseInt(map.get('cutoffHour') ?? String(DEFAULTS.cutoffHour), 10),
      });
      setLoaded(true);
    })();
  }, []);

  // Apply text size to CSS
  useEffect(() => {
    document.documentElement.style.setProperty('--text-base', TEXT_SIZE_MAP[settings.textSize]);
  }, [settings.textSize]);

  const updateSetting = useCallback(async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await db.settings.put({ key, value: String(value) });
  }, []);

  return { settings, updateSetting, loaded };
}
