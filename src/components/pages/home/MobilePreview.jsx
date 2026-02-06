"use client";
import React, { useMemo, useState } from 'react';
import { useTranslations } from "next-intl";

// ─── Status bar ──────────────────────────────────────────────
function StatusBar() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 24px',
        height: 44,
        fontSize: 12,
        fontWeight: 600,
        color: '#1a1a1a',
        flexShrink: 0,
      }}
    >
      <span style={{ letterSpacing: '-0.3px' }}>
        {h}:{m}
      </span>

      <div
        style={{
          width: 126,
          height: 36,
          background: '#000',
          borderRadius: 20,
          position: 'absolute',
          left: '50%',
          top: 10,
          transform: 'translateX(-50%)',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
          {[2, 5, 8, 12].map((hh, i) => (
            <rect key={i} x={i * 4.2} y={12 - hh} width="3" height={hh} rx="0.8" fill={i < 3 ? '#1a1a1a' : '#C7C7CC'} />
          ))}
        </svg>

        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="#1a1a1a" />
          <path d="M5.5 8a3.5 3.5 0 015 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M3 5.5a6.5 6.5 0 0110 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          <path d="M0.5 3a9.5 9.5 0 0115 0" stroke="#C7C7CC" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        </svg>

        <svg width="28" height="13" viewBox="0 0 28 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#1a1a1a" strokeOpacity="0.35" />
          <rect x="2" y="2" width="17" height="9" rx="2" fill="#1a1a1a" />
          <path d="M25 4.5v4a2 2 0 000-4z" fill="#1a1a1a" fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

// ─── App header with tabs ──────────────────────────────────────────────
function AppHeader({ locale }) {
  const t = useTranslations("mobile.exercise");
  const isRTL = locale === 'ar';

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
        padding: '16px 20px',
        flexShrink: 0,
      }}
    >
      {/* Top bar with section title and icons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ 
          flex: 1, 
          textAlign: 'center',
          direction: isRTL ? 'rtl' : 'ltr'
        }}>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>
            {t("title")}
          </span>
        </div>
        
        <div style={{ position: 'absolute', [isRTL ? 'left' : 'right']: 20, display: 'flex', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16z" fill="none" stroke="#fff" strokeWidth="2"/>
              <path d="M10 6v4l3 2" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M14 7l-4-4-4 4M10 3v10M3 13v3a2 2 0 002 2h10a2 2 0 002-2v-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        background: 'rgba(255,255,255,0.1)',
        padding: 4,
        borderRadius: 14,
        direction: isRTL ? 'rtl' : 'ltr'
      }}>
        {[t("tabs.exercises"), t("tabs.reps"), t("tabs.cardio")].map((tab, i) => (
          <button
            key={i}
            style={{
              flex: 1,
              padding: '10px 0',
              borderRadius: 10,
              background: i === 1 ? '#fff' : 'transparent',
              border: 'none',
              color: i === 1 ? '#4f46e5' : '#fff',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Exercise Detail Card ─
function ExerciseDetailCard({ exercise, locale }) {
  const isRTL = locale === 'ar';
  const t = useTranslations("mobile.exercise");
  
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* Exercise Image */}
      <div style={{ 
        position: 'relative',
        height: 200,
        background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Placeholder for exercise illustration */}
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="50" fill="#e0e7ff" opacity="0.5"/>
          <path d="M40 60h40M60 40v40" stroke="#6366f1" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        
        {/* Video/Photo buttons */}
        <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 8 }}>
          <button style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="2" width="16" height="16" rx="3" stroke="#6366f1" strokeWidth="2"/>
              <circle cx="10" cy="10" r="3" fill="#6366f1"/>
            </svg>
          </button>
          <button style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M6 4l10 6-10 6V4z" fill="#6366f1"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Exercise Info */}
      <div style={{ padding: '20px', direction: isRTL ? 'rtl' : 'ltr' }}>
        {/* Timer and Controls */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <button style={{
            padding: '12px 24px',
            borderRadius: 12,
            background: 'transparent',
            border: '2px solid #e5e7eb',
            color: '#6366f1',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 2l8 6-8 6V2z" fill="#6366f1"/>
            </svg>
            {t("start")}
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#f3f4f6',
            padding: '8px 16px',
            borderRadius: 12,
          }}>
            <button style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>+</span>
            </button>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1f2937', minWidth: 40, textAlign: 'center' }}>
              1:00
            </span>
            <button style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#fff',
              border: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#6b7280' }}>−</span>
            </button>
          </div>

          <div style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#6b7280',
          }}>
            1:00
          </div>
        </div>

        {/* Sets Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '50px 1fr 1fr 1fr',
          gap: 12,
          padding: '12px 16px',
          background: '#f9fafb',
          borderRadius: 12,
          marginBottom: 12,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: '#6b7280',
        }}>
          <div>{t("table.done")}</div>
          <div>{t("table.weight")}</div>
          <div>{t("table.reps")}</div>
          <div></div>
        </div>

        {/* Sets Rows */}
        {[1, 2, 3].map((set) => (
          <div
            key={set}
            style={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 1fr 1fr',
              gap: 12,
              padding: '12px 8px',
              alignItems: 'center',
              borderBottom: set < 3 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            {/* Checkbox */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                border: '2px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
              }} />
            </div>

            {/* Weight Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#f9fafb',
              padding: '8px 12px',
              borderRadius: 10,
            }}>
              <button style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#fff',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                color: '#6b7280',
              }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', minWidth: 24, textAlign: 'center' }}>
                0
              </span>
              <button style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#fff',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                color: '#6b7280',
              }}>+</button>
            </div>

            {/* Reps Counter */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#f9fafb',
              padding: '8px 12px',
              borderRadius: 10,
            }}>
              <button style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#fff',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                color: '#6b7280',
              }}>−</button>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', minWidth: 24, textAlign: 'center' }}>
                0
              </span>
              <button style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: '#fff',
                border: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 700,
                color: '#6b7280',
              }}>+</button>
            </div>

            {/* Empty column for alignment */}
            <div></div>
          </div>
        ))}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: 12,
          marginTop: 20,
          direction: isRTL ? 'rtl' : 'ltr'
        }}>
          <button style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 14,
            background: 'transparent',
            border: '2px solid #e5e7eb',
            color: '#6b7280',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {t("buttons.add")}
          </button>
          <button style={{
            flex: 2,
            padding: '14px 0',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: 'none',
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
          }}>
            {t("buttons.addSet")}
          </button>
          <button style={{
            flex: 1,
            padding: '14px 0',
            borderRadius: 14,
            background: 'transparent',
            border: '2px solid #e5e7eb',
            color: '#6b7280',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 5v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {t("buttons.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeIndicator() {
  return (
    <div style={{ height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: '#f9fafb' }}>
      <div style={{ width: 134, height: 5, background: '#000', borderRadius: 3, opacity: 0.25 }} />
    </div>
  );
}

// ============================================================
// Main Mobile Preview Component
// ============================================================
export default function MobilePreview({ locale = 'en' }) {
  const exercise = {
    name: locale === 'ar' ? 'تمرين الصدر' : 'Bench Press',
    sets: 3,
    weight: 0,
    reps: 0,
  };

  return (
    <div
      style={{
        width: 340,
        background: '#1a1a1a',
        borderRadius: 52,
        padding: 10,
        boxShadow: '0 25px 70px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
        position: 'relative',
      }}
    >
      {/* iPhone buttons */}
      <div style={{ position: 'absolute', left: -3, top: 120, width: 3, height: 32, background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', left: -3, top: 162, width: 3, height: 48, background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', left: -3, top: 220, width: 3, height: 48, background: '#2a2a2a', borderRadius: '3px 0 0 3px' }} />
      <div style={{ position: 'absolute', right: -3, top: 160, width: 3, height: 72, background: '#2a2a2a', borderRadius: '0 3px 3px 0' }} />

      <div
        style={{
          background: '#f9fafb',
          borderRadius: 44,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: 680,
        }}
      >
        <StatusBar />
        <AppHeader locale={locale} />

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          className="hide-scrollbar"
        >
          <style jsx>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          <ExerciseDetailCard exercise={exercise} locale={locale} />
        </div>

        <HomeIndicator />
      </div>
    </div>
  );
}