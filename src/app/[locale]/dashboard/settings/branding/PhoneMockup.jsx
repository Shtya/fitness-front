'use client';

import React from 'react';
import { Dumbbell, MessageCircle, CalendarDays, UtensilsCrossed, Menu, Headphones, StickyNote, Check, Minus, Plus, Play } from 'lucide-react';
import { BRAND_LOGO_SRC } from '@/lib/brand';

function hexToRgb(hex) {
  const m = String(hex || '').replace('#', '').match(/.{1,2}/g);
  if (!m || m.length < 3) return [37, 99, 235];
  return m.slice(0, 3).map((x) => parseInt(x, 16));
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
// percent > 0 lightens toward white, < 0 darkens toward black
function shade(hex, percent) {
  const [r, g, b] = hexToRgb(hex);
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent);
  const mix = (c) => Math.round((t - c) * p) + c;
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function StatusBar() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        height: 30,
        fontSize: 11,
        fontWeight: 700,
        color: '#fff',
        flexShrink: 0,
      }}
    >
      <span>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="13" height="10" viewBox="0 0 17 12" fill="none">
          {[2, 5, 8, 12].map((hh, i) => (
            <rect key={i} x={i * 4.2} y={12 - hh} width="3" height={hh} rx="0.8" fill="#fff" opacity={i < 3 ? 1 : 0.5} />
          ))}
        </svg>
        <svg width="22" height="10" viewBox="0 0 28 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#fff" strokeOpacity="0.6" />
          <rect x="2" y="2" width="17" height="9" rx="2" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}

function GlassIcon({ children, size = 30 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        background: 'rgba(255,255,255,0.16)',
        border: '1px solid rgba(255,255,255,0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Live phone mockup modeled directly on the real app's default landing
 * screen (MyWorkoutsScreen) and its floating pill nav + FAB, so admins see
 * their branding colors applied to the actual product chrome.
 */
export default function PhoneMockup({ form, logoUrl, isAr = false }) {
  if (!form) return null;

  const t = (en, ar) => (isAr ? ar : en);
  const days = isAr ? ['سبت', 'أحد', 'إثن', 'ثلا', 'أرب'] : ['SAT', 'SUN', 'MON', 'TUE', 'WED'];
  const activeDay = 2;
  const darkHeader1 = shade(form.primaryColor, -0.55);
  const darkHeader2 = shade(form.primaryColor, -0.35);

  return (
    <div className="flex justify-center xl:justify-start">
      <div
        style={{
          width: 280,
          background: '#1a1a1a',
          borderRadius: 46,
          padding: 9,
          boxShadow: '0 25px 60px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)',
          position: 'relative',
        }}
      >
        {/* side buttons */}
        <div style={{ position: 'absolute', left: -3, top: 100, width: 3, height: 26, background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: -3, top: 134, width: 3, height: 40, background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', left: -3, top: 182, width: 3, height: 40, background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
        <div style={{ position: 'absolute', right: -3, top: 132, width: 3, height: 58, background: '#2a2a2a', borderRadius: '0 3px 3px 0' }} />

        <div
          style={{
            background: form.backgroundColor,
            borderRadius: 38,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            height: 572,
            transition: 'background 0.2s',
          }}
        >
          {/* Header — mirrors StaticHeader in MyWorkoutsScreen */}
          <div
            style={{
              background: `linear-gradient(135deg, ${darkHeader1}, ${darkHeader2}, ${form.secondaryColor})`,
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
              transition: 'background 0.2s',
            }}
          >
            <div style={{ position: 'absolute', top: -30, left: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
            <StatusBar />
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 9, padding: '2px 14px 12px' }}>
              <GlassIcon size={32}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl || BRAND_LOGO_SRC}
                  alt=""
                  style={{ width: '70%', height: '70%', objectFit: 'contain', borderRadius: 6 }}
                />
              </GlassIcon>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 14 }}>{t('My Workouts', 'تمارينـي')}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{t('Push day · Week 3', 'يوم الدفع · أسبوع 3')}</div>
              </div>
              <GlassIcon size={28}>
                <Headphones size={12} color="#fff" strokeWidth={2} />
              </GlassIcon>
              <GlassIcon size={28}>
                <StickyNote size={12} color="#fff" strokeWidth={2} />
              </GlassIcon>
            </div>

            <div style={{ position: 'relative', display: 'flex', gap: 5, padding: '0 12px 12px' }}>
              {days.map((d, i) => (
                <div
                  key={d}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '5px 0',
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 800,
                    background: i === activeDay ? 'rgba(255,255,255,0.95)' : 'transparent',
                    color: i === activeDay ? darkHeader2 : 'rgba(255,255,255,0.65)',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, paddingBottom: 78 }}>
            {/* exercise media card */}
            <div
              style={{
                borderRadius: form.cardRadius,
                border: `1px solid ${form.borderColor}`,
                background: form.cardColor,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 92,
                  background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Dumbbell size={30} color="#c7cdd6" strokeWidth={1.5} />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    padding: 8,
                    gap: 4,
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>{t('Incline Bench Press', 'ضغط بنش مائل')}</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: rgba(form.primaryColor, 0.85), padding: '2px 7px', borderRadius: 999 }}>
                      4 × 8-10
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: 999 }}>
                      3/1/1
                    </span>
                  </div>
                </div>
              </div>
              {/* thumbnail strip */}
              <div style={{ display: 'flex', gap: 6, padding: 8 }}>
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: i === 0 ? rgba(form.primaryColor, 0.12) : '#f1f5f9',
                      border: i === 0 ? `2px solid ${form.primaryColor}` : '2px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Dumbbell size={13} color={i === 0 ? form.primaryColor : '#94a3b8'} strokeWidth={2} />
                  </div>
                ))}
              </div>
            </div>

            {/* coach note */}
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: Math.min(form.cardRadius, 14),
                padding: 9,
                marginBottom: 10,
                display: 'flex',
                gap: 7,
                alignItems: 'flex-start',
              }}
            >
              <StickyNote size={12} color="#d97706" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 10, color: '#92400e', lineHeight: 1.35 }}>
                {t('Keep elbows tucked, control the negative.', 'حافظ على المرفقين للداخل، وتحكم في مرحلة الهبوط.')}
              </div>
            </div>

            {/* rest timer card */}
            <div
              style={{
                borderRadius: form.cardRadius,
                border: `1px solid ${form.borderColor}`,
                background: form.cardColor,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: form.textPrimaryColor }}>{t('Rest Timer', 'مؤقت الراحة')}</span>
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    color: form.primaryColor,
                    background: rgba(form.primaryColor, 0.1),
                    border: `1px solid ${rgba(form.primaryColor, 0.25)}`,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}
                >
                  {t('READY', 'جاهز')}
                </span>
              </div>
              <div style={{ textAlign: 'center', fontSize: 34, fontWeight: 800, letterSpacing: -1, color: form.textPrimaryColor, margin: '2px 0 8px' }}>
                01:00
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    border: `1px solid ${form.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Minus size={12} color={form.textSecondaryColor} />
                </div>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    height: 30,
                    border: 'none',
                    borderRadius: 999,
                    background: form.primaryColor,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                  }}
                >
                  <Play size={11} fill="#fff" /> {t('Start', 'ابدأ')}
                </button>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 9,
                    border: `1px solid ${form.borderColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Plus size={12} color={form.textSecondaryColor} />
                </div>
              </div>
            </div>

            {/* sets table */}
            <div
              style={{
                borderRadius: form.cardRadius,
                border: `1px solid ${form.borderColor}`,
                background: form.cardColor,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '34px 1fr 1fr 30px',
                  background: rgba(form.primaryColor, 0.07),
                  padding: '7px 8px',
                  fontSize: 8.5,
                  fontWeight: 800,
                  color: form.textSecondaryColor,
                  textAlign: 'center',
                }}
              >
                <div>{t('SET', 'مجـ')}</div>
                <div>{t('WEIGHT', 'وزن')}</div>
                <div>{t('REPS', 'عدد')}</div>
                <div />
              </div>
              {[1, 2, 3].map((setNo) => {
                const done = setNo === 1;
                return (
                  <div
                    key={setNo}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '34px 1fr 1fr 30px',
                      alignItems: 'center',
                      padding: '6px 8px',
                      borderTop: `1px solid ${form.borderColor}`,
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        color: form.primaryColor,
                        background: rgba(form.primaryColor, 0.1),
                        borderRadius: 8,
                        padding: '3px 0',
                        margin: '0 auto',
                        width: 20,
                      }}
                    >
                      {setNo}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: form.textPrimaryColor }}>60 kg</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: form.textPrimaryColor }}>10</div>
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        margin: '0 auto',
                        background: done ? form.successColor : 'transparent',
                        border: done ? 'none' : `1.5px solid ${form.borderColor}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {done && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Floating pill nav + FAB — mirrors AppNavigator's FloatingBar */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
            <div
              style={{
                width: 216,
                height: 46,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.78)',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${rgba(form.primaryColor, 0.18)}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 10px',
                boxShadow: '0 8px 20px rgba(15,23,42,0.12)',
              }}
            >
              <div style={{ display: 'flex', gap: 14 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${form.primaryColor}, ${shade(form.primaryColor, -0.3)})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 4px 10px ${rgba(form.primaryColor, 0.4)}`,
                  }}
                >
                  <Dumbbell size={13} color="#fff" strokeWidth={2.2} />
                </div>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: rgba(form.primaryColor, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={13} color={rgba(form.primaryColor, 0.55)} strokeWidth={1.8} />
                </div>
              </div>
              <div style={{ width: 44 }} />
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: rgba(form.primaryColor, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CalendarDays size={13} color={rgba(form.primaryColor, 0.55)} strokeWidth={1.8} />
                </div>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: rgba(form.primaryColor, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UtensilsCrossed size={13} color={rgba(form.primaryColor, 0.55)} strokeWidth={1.8} />
                </div>
              </div>
            </div>

            {/* FAB */}
            <div
              style={{
                position: 'absolute',
                top: -12,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${form.primaryColor}, ${shade(form.primaryColor, -0.35)})`,
                border: '2.5px solid rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 8px 18px ${rgba(form.primaryColor, 0.45)}`,
              }}
            >
              <Menu size={18} color="#fff" strokeWidth={2.4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
