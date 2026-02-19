import { useState } from 'react';
import type { AppSettings } from '../../hooks/useSettings';
import type { PlanId, Translation } from '../../engine/types';
import type { ThemeSetting } from '../../utils/theme';
import { FONT_PRESETS, BODY_FONTS, UI_FONTS, resolvePreset, getBodyFontStack, getUiFontStack } from '../../utils/fonts';
import { getPlan } from '../../plans';
import { todayStr } from '../../utils/date';
import { computePlanDay } from '../../utils/plan-day';

interface Props {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  planStartDate?: string | null;
  onStartDateChange?: (date: string) => void;
}

const PLANS: { id: PlanId; label: string; description: string }[] = [
  { id: '1662-original', label: '1662 Original', description: 'Civil calendar lectionary' },
  { id: '1662-revised', label: '1662 Revised (1922)', description: 'Liturgical calendar lectionary' },
  { id: 'mcheyne', label: "M'Cheyne", description: 'Bible in a year (no liturgy)' },
  { id: 'bibleproject', label: 'BibleProject: One Story', description: '358-day whole Bible plan' },
];

const TRANSLATIONS: { id: Translation; label: string }[] = [
  { id: 'kjv', label: 'King James Version' },
  { id: 'asv', label: 'American Standard Version' },
  { id: 'lsv', label: 'Literal Standard Version' },
  { id: 'web-usa', label: 'World English Bible (US)' },
  { id: 'web-brit', label: 'World English Bible (British)' },
  { id: 'web-updated', label: 'World English Bible (Updated)' },
];

const TEXT_SIZES: { id: AppSettings['textSize']; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

const THEMES: { id: ThemeSetting; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

export function SettingsTab({ settings, onUpdate, planStartDate, onStartDateChange }: Props) {
  const [forceCustom, setForceCustom] = useState(false);
  const [dateLocked, setDateLocked] = useState(true);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const derivedPreset = resolvePreset(settings.fontBody, settings.fontUi);
  const isCustom = forceCustom || derivedPreset === 'custom';

  const activePlan = getPlan(settings.planId);
  const showStartDate = activePlan.config.needsStartDate;
  const today = todayStr();
  const planDay = (showStartDate && planStartDate)
    ? computePlanDay(planStartDate, today, activePlan.config.totalDays ?? Infinity)
    : null;

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6" style={{ fontFamily: 'var(--font-ui)' }}>
        Settings
      </h1>

      {/* Reading Plan */}
      <SettingGroup label="Reading Plan">
        {PLANS.map(p => (
          <RadioOption
            key={p.id}
            selected={settings.planId === p.id}
            onSelect={() => onUpdate('planId', p.id)}
            label={p.label}
            description={p.description}
          />
        ))}

        {showStartDate && (
          <div className="mt-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'var(--color-border)', fontFamily: 'var(--font-ui)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                Start Date
              </label>
              <button
                onClick={() => setDateLocked(l => !l)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors"
                style={{
                  color: dateLocked ? 'var(--color-text-muted)' : 'var(--color-accent)',
                  backgroundColor: dateLocked ? 'transparent' : 'var(--color-accent)/10',
                }}
                aria-label={dateLocked ? 'Unlock start date' : 'Lock start date'}
              >
                {dateLocked ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 019.9-1" />
                  </svg>
                )}
                {dateLocked ? 'Locked' : 'Editing'}
              </button>
            </div>
            <div className="relative">
              <input
                type="date"
                value={planStartDate ?? today}
                onChange={e => {
                  const newDate = e.target.value;
                  if (newDate && newDate !== planStartDate) {
                    setPendingDate(newDate);
                  }
                }}
                disabled={dateLocked}
                className={`w-full px-3 py-1.5 rounded-md text-sm border transition-opacity ${dateLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  borderColor: dateLocked ? 'var(--color-border)' : 'var(--color-accent)',
                  fontFamily: 'var(--font-ui)',
                }}
              />
            </div>
            {planDay != null && (
              <div className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Day {planDay} of {activePlan.config.totalDays}
              </div>
            )}
            {planDay == null && planStartDate && planStartDate <= today && (
              <div className="text-xs mt-1.5" style={{ color: 'var(--color-accent)' }}>
                Plan complete
              </div>
            )}
          </div>
        )}
      </SettingGroup>

      {/* Translation */}
      <SettingGroup label="Bible Translation">
        {TRANSLATIONS.map(t => (
          <RadioOption
            key={t.id}
            selected={settings.translation === t.id}
            onSelect={() => onUpdate('translation', t.id)}
            label={t.label}
          />
        ))}
      </SettingGroup>

      {/* Text Size */}
      <SettingGroup label="Text Size">
        <div className="flex gap-2">
          {TEXT_SIZES.map(s => (
            <button
              key={s.id}
              onClick={() => onUpdate('textSize', s.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.textSize === s.id
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </SettingGroup>

      {/* Appearance */}
      <SettingGroup label="Appearance">
        <div className="flex gap-2">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => onUpdate('theme', t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                settings.theme === t.id
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                  : 'bg-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </SettingGroup>

      {/* Font */}
      <SettingGroup label="Font">
        {FONT_PRESETS.map(p => (
          <RadioOption
            key={p.id}
            selected={!isCustom && derivedPreset === p.id}
            onSelect={() => {
              setForceCustom(false);
              onUpdate('fontBody', p.body);
              onUpdate('fontUi', p.ui);
            }}
            label={p.label}
            description={p.description}
          />
        ))}
        <RadioOption
          selected={isCustom}
          onSelect={() => setForceCustom(true)}
          label="Custom"
          description="Choose reading and interface fonts independently"
        />

        {isCustom && (
          <div className="mt-3 ml-4 border-l-2 pl-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="mb-4">
              <div className="text-xs font-medium mb-2"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-muted)' }}>
                Reading Font
              </div>
              <div className="flex flex-wrap gap-2">
                {BODY_FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onUpdate('fontBody', f.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      settings.fontBody === f.id
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                        : 'bg-[var(--color-border)] text-[var(--color-text)]'
                    }`}
                    style={{ fontFamily: getBodyFontStack(f.id) }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium mb-2"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-muted)' }}>
                Interface Font
              </div>
              <div className="flex flex-wrap gap-2">
                {UI_FONTS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onUpdate('fontUi', f.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      settings.fontUi === f.id
                        ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]'
                        : 'bg-[var(--color-border)] text-[var(--color-text)]'
                    }`}
                    style={{ fontFamily: getUiFontStack(f.id) }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </SettingGroup>

      {/* Reading Speed */}
      <SettingGroup label="Reading Speed">
        <p className="text-sm mb-3" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
          Configure your reading speed to see time estimates on the Office tab.
        </p>
        <a
          href="https://readingspeedtest.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium mb-4 underline"
          style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-ui)' }}
        >
          Measure your reading speed ↗
        </a>

        <div className="mb-3">
          <label className="text-xs font-medium block mb-1"
            style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-muted)' }}>
            Words per minute (WPM)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={1000}
            value={settings.readingWpm || ''}
            placeholder="e.g. 238"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onUpdate('readingWpm', isNaN(v) ? 0 : Math.max(0, Math.min(1000, v)));
            }}
            className="w-32 px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
            }}
          />
        </div>

        <div className="mb-1">
          <label className="text-xs font-medium block mb-1"
            style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-muted)' }}>
            Comprehension rate (%)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={settings.readingComprehension > 0 ? Math.round(settings.readingComprehension * 100) : ''}
            placeholder="e.g. 85"
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (isNaN(v) || v <= 0) {
                onUpdate('readingComprehension', 0);
              } else {
                onUpdate('readingComprehension', Math.min(100, v) / 100);
              }
            }}
            className="w-32 px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-ui)',
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}>
            From your reading speed test results
          </p>
        </div>

        {(settings.readingWpm > 0 || settings.readingComprehension > 0) && (
          <button
            onClick={() => {
              onUpdate('readingWpm', 0);
              onUpdate('readingComprehension', 0);
            }}
            className="text-xs mt-2 underline"
            style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-ui)' }}
          >
            Clear reading speed
          </button>
        )}
      </SettingGroup>

      {/* Confirmation modal for start date change */}
      {pendingDate && (
        <ConfirmModal
          title="Change start date?"
          message="This will clear all your progress for this plan."
          confirmLabel="Clear & Update"
          onConfirm={() => {
            onStartDateChange?.(pendingDate);
            setPendingDate(null);
            setDateLocked(true);
          }}
          onCancel={() => setPendingDate(null)}
        />
      )}
    </div>
  );
}

function ConfirmModal({
  title, message, confirmLabel, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl p-5 shadow-lg"
        style={{ backgroundColor: 'var(--color-surface)', fontFamily: 'var(--font-ui)' }}
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          {title}
        </h3>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-[var(--color-accent)] text-[var(--color-accent-contrast)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wider mb-3"
        style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-muted)' }}>
        {label}
      </h2>
      {children}
    </div>
  );
}

function RadioOption({
  selected,
  onSelect,
  label,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors flex items-center gap-3"
      style={{
        backgroundColor: selected ? 'var(--color-accent)' : 'transparent',
        color: selected ? 'var(--color-accent-contrast)' : 'var(--color-text)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-[var(--color-accent-contrast)]' : 'border-[var(--color-border)]'
        }`}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-contrast)]" />}
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        {description && (
          <div className="text-xs mt-0.5" style={{ opacity: selected ? 0.8 : 0.6 }}>
            {description}
          </div>
        )}
      </div>
    </button>
  );
}
