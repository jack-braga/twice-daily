export type FontPresetId = 'traditional' | 'classic' | 'modern' | 'book' | 'custom';
export type BodyFontId = 'georgia' | 'eb-garamond' | 'crimson-pro' | 'system-serif' | 'system-sans';
export type UiFontId = 'system-sans' | 'inter' | 'system-serif';

export interface FontPreset {
  id: FontPresetId;
  label: string;
  description: string;
  body: BodyFontId;
  ui: UiFontId;
}

export const FONT_PRESETS: FontPreset[] = [
  { id: 'traditional', label: 'Traditional', description: 'Georgia body, system sans UI', body: 'georgia', ui: 'system-sans' },
  { id: 'classic', label: 'Classic', description: 'EB Garamond body, system sans UI', body: 'eb-garamond', ui: 'system-sans' },
  { id: 'book', label: 'Book', description: 'Crimson Pro body, system sans UI', body: 'crimson-pro', ui: 'system-sans' },
  { id: 'modern', label: 'Modern', description: 'System sans body, Inter UI', body: 'system-sans', ui: 'inter' },
];

export const BODY_FONTS: { id: BodyFontId; label: string; stack: string }[] = [
  { id: 'georgia', label: 'Georgia', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'eb-garamond', label: 'EB Garamond', stack: '"EB Garamond", Georgia, serif' },
  { id: 'crimson-pro', label: 'Crimson Pro', stack: '"Crimson Pro", Georgia, serif' },
  { id: 'system-serif', label: 'System Serif', stack: 'serif' },
  { id: 'system-sans', label: 'System Sans', stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
];

export const UI_FONTS: { id: UiFontId; label: string; stack: string }[] = [
  { id: 'system-sans', label: 'System Sans', stack: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'inter', label: 'Inter', stack: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { id: 'system-serif', label: 'System Serif', stack: 'Georgia, "Times New Roman", serif' },
];

export function getBodyFontStack(id: BodyFontId): string {
  return BODY_FONTS.find(f => f.id === id)?.stack ?? BODY_FONTS[0]!.stack;
}

export function getUiFontStack(id: UiFontId): string {
  return UI_FONTS.find(f => f.id === id)?.stack ?? UI_FONTS[0]!.stack;
}

export function applyFonts(body: BodyFontId, ui: UiFontId): void {
  const bodyStack = getBodyFontStack(body);
  const uiStack = getUiFontStack(ui);
  document.documentElement.style.setProperty('--font-body', bodyStack);
  document.documentElement.style.setProperty('--font-ui', uiStack);
  localStorage.setItem('td-font-body', bodyStack);
  localStorage.setItem('td-font-ui', uiStack);
}

export function resolvePreset(body: BodyFontId, ui: UiFontId): FontPresetId {
  const match = FONT_PRESETS.find(p => p.body === body && p.ui === ui);
  return match?.id ?? 'custom';
}
