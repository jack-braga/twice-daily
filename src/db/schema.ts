import Dexie, { type EntityTable } from 'dexie';

export interface CompletionRecord {
  id?: number;
  date: string;       // ISO date YYYY-MM-DD
  session: 'morning' | 'evening';
  planId: string;
  completedAt: string; // ISO timestamp
  sectionsCompleted: string[]; // section IDs
}

export interface SettingRecord {
  key: string;
  value: string;
}

class TwiceDailyDB extends Dexie {
  completions!: EntityTable<CompletionRecord, 'id'>;
  settings!: EntityTable<SettingRecord, 'key'>;

  constructor() {
    super('twice-daily');
    this.version(1).stores({
      completions: '++id, [date+session+planId], date',
      settings: 'key',
    });
  }
}

export const db = new TwiceDailyDB();
