'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { FieldLabel, TextInput, SelectBox } from './studio-ui';

const DEFAULT_BRAND = '#6366f1';

export function DesignPreview({ imageUrl, design, headline, topic }) {
  const t = useTranslations('aiContentStudio');
  const canvasRef = useRef(null);
  const text = design?.headline || headline || topic || '';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      if (!design?.enabled || design?.mode === 'off') return;
      const overlay = Math.min(Math.max(Number(design.backgroundOverlay ?? 0.4), 0), 0.85);
      const brand = design.brandColor || DEFAULT_BRAND;
      const yBase = design.position === 'top' ? 120 : design.position === 'center' ? 480 : 860;
      ctx.fillStyle = hexToRgba(brand, overlay);
      ctx.fillRect(40, yBase - 70, 944, 150);
      ctx.fillStyle = design.textColor || '#ffffff';
      ctx.font = `${design.fontWeight || 700} ${design.fontSize || 48}px ${design.font || 'Tahoma'}`;
      ctx.direction = 'rtl';
      ctx.textAlign = design.alignment === 'left' ? 'left' : design.alignment === 'center' ? 'center' : 'right';
      const x = design.alignment === 'left' ? 70 : design.alignment === 'center' ? 512 : 954;
      wrapText(ctx, text, x, yBase, 880, (design.fontSize || 48) * 1.2);
    };
    img.src = imageUrl;
  }, [imageUrl, design, text]);

  if (!imageUrl) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--color-primary-200)_60%,transparent)] bg-[color-mix(in_srgb,var(--color-primary-50)_50%,white)] text-sm text-slate-500">
        {t('design.noImage')}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
      <canvas ref={canvasRef} className="h-auto w-full" />
    </div>
  );
}

export function DesignControls({ design, onChange }) {
  const t = useTranslations('aiContentStudio');
  const set = (patch) => onChange({ ...design, ...patch });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <FieldLabel>{t('design.mode')}</FieldLabel>
        <SelectBox
          value={design.mode || 'canvas'}
          onChange={(mode) => set({ mode, enabled: mode !== 'off' })}
          options={[
            { value: 'off', label: t('design.modeOff') },
            { value: 'html', label: t('design.modeHtml') },
            { value: 'canvas', label: t('design.modeCanvas') },
            { value: 'svg', label: t('design.modeSvg') },
            { value: 'custom', label: t('design.modeCustom') },
          ]}
        />
      </div>
      <div>
        <FieldLabel>{t('design.template')}</FieldLabel>
        <SelectBox
          value={design.template || 'arabic-social-1'}
          onChange={(template) => set({ template })}
          options={[
            { value: 'arabic-social-1', label: 'Arabic Social Post 1' },
            { value: 'arabic-social-2', label: 'Arabic Social Post 2' },
          ]}
        />
      </div>
      <div className="sm:col-span-2">
        <FieldLabel>{t('design.headline')}</FieldLabel>
        <TextInput
          dir="auto"
          value={design.headline || ''}
          onChange={(e) => set({ headline: e.target.value })}
          placeholder={t('design.headlinePlaceholder')}
        />
      </div>
      <div>
        <FieldLabel>{t('design.font')}</FieldLabel>
        <TextInput value={design.font || 'Tahoma'} onChange={(e) => set({ font: e.target.value })} />
      </div>
      <div>
        <FieldLabel>{t('design.fontSize')}</FieldLabel>
        <TextInput
          type="number"
          value={design.fontSize || 48}
          onChange={(e) => set({ fontSize: Number(e.target.value) })}
        />
      </div>
      <div>
        <FieldLabel>{t('design.fontWeight')}</FieldLabel>
        <TextInput
          value={design.fontWeight || 700}
          onChange={(e) => set({ fontWeight: e.target.value })}
        />
      </div>
      <div>
        <FieldLabel>{t('design.position')}</FieldLabel>
        <SelectBox
          value={design.position || 'bottom'}
          onChange={(position) => set({ position })}
          options={[
            { value: 'top', label: t('design.posTop') },
            { value: 'center', label: t('design.posCenter') },
            { value: 'bottom', label: t('design.posBottom') },
          ]}
        />
      </div>
      <div>
        <FieldLabel>{t('design.alignment')}</FieldLabel>
        <SelectBox
          value={design.alignment || 'right'}
          onChange={(alignment) => set({ alignment })}
          options={[
            { value: 'right', label: t('design.alignRight') },
            { value: 'center', label: t('design.alignCenter') },
            { value: 'left', label: t('design.alignLeft') },
          ]}
        />
      </div>
      <div>
        <FieldLabel>{t('design.overlay')}</FieldLabel>
        <TextInput
          type="number"
          step="0.05"
          min="0"
          max="1"
          value={design.backgroundOverlay ?? 0.4}
          onChange={(e) => set({ backgroundOverlay: Number(e.target.value) })}
        />
      </div>
      <div>
        <FieldLabel>{t('design.brandColor')}</FieldLabel>
        <TextInput type="color" value={design.brandColor || DEFAULT_BRAND} onChange={(e) => set({ brandColor: e.target.value })} />
      </div>
      <div>
        <FieldLabel>{t('design.textColor')}</FieldLabel>
        <TextInput type="color" value={design.textColor || '#ffffff'} onChange={(e) => set({ textColor: e.target.value })} />
      </div>
    </div>
  );
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let yy = y;
  let lines = 0;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
      lines += 1;
      if (lines >= 3) break;
    } else {
      line = test;
    }
  }
  if (line && lines < 3) ctx.fillText(line, x, yy);
}

function hexToRgba(hex, alpha) {
  const h = String(hex || '#000000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
