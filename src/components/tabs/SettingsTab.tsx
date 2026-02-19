import type { AppSettings } from '../../hooks/useSettings';
import type { PlanId, Translation } from '../../engine/types';

interface Props {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const PLANS: { id: PlanId; label: string; description: string }[] = [
  { id: '1662-original', label: '1662 Original', description: 'Civil calendar lectionary' },
  { id: '1662-revised', label: '1662 Revised (1922)', description: 'Liturgical calendar lectionary' },
  { id: 'mcheyne', label: "M'Cheyne", description: 'Bible in a year (no liturgy)' },
];

const TRANSLATIONS: { id: Translation; label: string }[] = [
  { id: 'kjv', label: 'King James Version' },
  { id: 'web-usa', label: 'World English Bible (US)' },
  { id: 'web-brit', label: 'World English Bible (British)' },
];

const TEXT_SIZES: { id: AppSettings['textSize']; label: string }[] = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
];

export function SettingsTab({ settings, onUpdate }: Props) {
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
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </SettingGroup>

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
        color: selected ? 'white' : 'var(--color-text)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
          selected ? 'border-white' : 'border-[var(--color-border)]'
        }`}
      >
        {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
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
