"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Image as ImageIcon, 
  Video, 
  Plus, 
  Minus, 
  Check, 
  Play, 
  Heart, 
  Activity, 
  Zap, 
  Flame, 
  User 
} from "lucide-react";

// ─── Glow Variants ──────────────────────────────────────────
export const glowVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: {
    opacity: [0.2, 0.4, 0.2],
    scale: [0.8, 1.2, 0.8],
    transition: {
      duration: 5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// ─── iPhone Mockup Component - Responsive ──────────────────────────────────────────
function IPhoneMockup({ children, className = "" }) {
  return (
    <div className={`relative ${className}`} style={{ 
      width: '100%', 
      maxWidth: '360px',
      margin: '0 auto'
    }}>
      {/* iPhone Frame */}
      <div className="bg-[#1a1a1a] rounded-[36px] sm:rounded-[44px] md:rounded-[52px] p-[8px] sm:p-[10px] shadow-[0_15px_40px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] sm:shadow-[0_25px_70px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* Physical Buttons - Responsive */}
        <div className="absolute left-[-2px] sm:left-[-3px] top-[100px] sm:top-[120px] w-[2px] sm:w-[3px] h-[28px] sm:h-[32px] bg-[#2a2a2a] rounded-l-[2px] sm:rounded-l-[3px]" />
        <div className="absolute left-[-2px] sm:left-[-3px] top-[138px] sm:top-[162px] w-[2px] sm:w-[3px] h-[40px] sm:h-[48px] bg-[#2a2a2a] rounded-l-[2px] sm:rounded-l-[3px]" />
        <div className="absolute left-[-2px] sm:left-[-3px] top-[188px] sm:top-[220px] w-[2px] sm:w-[3px] h-[40px] sm:h-[48px] bg-[#2a2a2a] rounded-l-[2px] sm:rounded-l-[3px]" />
        <div className="absolute right-[-2px] sm:right-[-3px] top-[136px] sm:top-[160px] w-[2px] sm:w-[3px] h-[60px] sm:h-[72px] bg-[#2a2a2a] rounded-r-[2px] sm:rounded-r-[3px]" />

        {/* Screen Container - Responsive height */}
        <div className="bg-gray-50 rounded-[30px] sm:rounded-[38px] md:rounded-[44px] overflow-hidden flex flex-col h-[580px] sm:h-[640px] md:h-[700px]">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Status Bar Component - Responsive ──────────────────────────────────────────
function StatusBar() {
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="flex justify-between items-center px-4 sm:px-6 h-9 sm:h-11 text-[10px] sm:text-xs font-semibold text-gray-900 flex-shrink-0 bg-gray-50">
      <span className="tracking-tight">{time}</span>
      
      {/* Dynamic Island - Responsive */}
      <div className="absolute left-1/2 top-[10px] sm:top-[14px] -translate-x-1/2 w-[100px] sm:w-[126px] h-7 sm:h-9 bg-black rounded-[16px] sm:rounded-[20px]" />

      {/* Status Icons - Responsive */}
      <div className="flex items-center gap-1 sm:gap-1.5 scale-90 sm:scale-100">
        <SignalIcon />
        <WiFiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 17 12" fill="none" className="sm:w-[17px] sm:h-[12px]">
      {[2, 5, 8, 12].map((h, i) => (
        <rect 
          key={i} 
          x={i * 4.2} 
          y={12 - h} 
          width="3" 
          height={h} 
          rx="0.8" 
          fill={i < 3 ? '#1a1a1a' : '#C7C7CC'} 
        />
      ))}
    </svg>
  );
}

function WiFiIcon() {
  return (
    <svg width="13" height="10" viewBox="0 0 16 12" fill="none" className="sm:w-[16px] sm:h-[12px]">
      <path d="M8 9.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="#1a1a1a" />
      <path d="M5.5 8a3.5 3.5 0 015 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 5.5a6.5 6.5 0 0110 0" stroke="#1a1a1a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M0.5 3a9.5 9.5 0 0115 0" stroke="#C7C7CC" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="24" height="11" viewBox="0 0 28 13" fill="none" className="sm:w-[28px] sm:h-[13px]">
      <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="#1a1a1a" strokeOpacity="0.35" />
      <rect x="2" y="2" width="17" height="9" rx="2" fill="#1a1a1a" />
      <path d="M25 4.5v4a2 2 0 000-4z" fill="#1a1a1a" fillOpacity="0.4" />
    </svg>
  );
}

// ─── Home Indicator Component ──────────────────────────────────────────
function HomeIndicator() {
  return (
    <div className="h-[28px] sm:h-[34px] flex items-center justify-center flex-shrink-0 bg-gray-50">
      <div className="w-[110px] sm:w-[134px] h-[4px] sm:h-[5px] bg-black rounded-[2.5px] sm:rounded-[3px] opacity-25" />
    </div>
  );
}

// ─── App Header with Tabs - Responsive ──────────────────────────────────────────
function AppHeader({ locale }) {
  const t = useTranslations("mobile.exercise");
  const isRTL = locale === 'ar';

  return (
    <div className="theme-gradient-bg p-3 sm:p-4 pb-4 sm:pb-5 flex-shrink-0" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Title */}
      <div className="flex items-center justify-center mb-3 sm:mb-4">
        <h1 className="text-white text-base sm:text-lg font-bold tracking-tight">
          {t("title")}
        </h1>
      </div>

      {/* Tabs - Responsive */}
      <div className="flex gap-1.5 sm:gap-2 bg-white/10 p-1 sm:p-1.5 rounded-[12px] sm:rounded-[14px]">
        {[t("tabs.exercises"), t("tabs.reps"), t("tabs.cardio")].map((tab, i) => (
          <button
            key={i}
            className={`
              flex-1 py-2 sm:py-2.5 rounded-[8px] sm:rounded-[10px] text-[11px] sm:text-[13px] font-bold transition-all duration-300
              active:scale-95
              ${i === 1 
                ? 'bg-white text-[var(--color-primary-600)] shadow-sm' 
                : 'bg-transparent text-white'
              }
            `}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Enhanced Exercise Card - Responsive ──────────────────────────────────────────
function EnhancedExerciseCard({ exercise, locale }) {
  const isRTL = locale === 'ar';
  const t = useTranslations("mobile.exercise");
  const [sets, setSets] = useState([
    { done: false, weight: 0, reps: 0 },
    { done: false, weight: 0, reps: 0 },
    { done: false, weight: 0, reps: 0 },
  ]);

  const updateSet = (index, field, value) => {
    const newSets = [...sets];
    newSets[index][field] = value;
    setSets(newSets);
  };

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl overflow-hidden mb-3 sm:mb-4 shadow-xl animate-fade-in">
      {/* Exercise Image - Responsive */}
      <div className="relative h-[180px] sm:h-[200px] md:h-[220px] bg-gradient-to-br from-[var(--color-primary-100)] to-[var(--color-primary-200)] flex items-center justify-center">
        {/* Exercise Illustration - Responsive size */}
        <div className="relative w-[100px] sm:w-[120px] md:w-[140px] h-[100px] sm:h-[120px] md:h-[140px] animate-pulse-slow">
          <svg width="100%" height="100%" viewBox="0 0 140 140" fill="none">
            <circle cx="70" cy="70" r="60" fill="var(--color-primary-500)" opacity="0.1" />
            <circle cx="70" cy="70" r="45" fill="var(--color-primary-500)" opacity="0.2" />
            <path d="M50 70h40M70 50v40" stroke="var(--color-primary-500)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="50" cy="70" r="8" fill="var(--color-primary-500)" />
            <circle cx="90" cy="70" r="8" fill="var(--color-primary-500)" />
            <circle cx="70" cy="50" r="8" fill="var(--color-primary-500)" />
            <circle cx="70" cy="90" r="8" fill="var(--color-primary-500)" />
          </svg>
        </div>

        {/* Media Buttons - Responsive */}
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4 flex gap-2">
          <button className="w-9 h-9 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] bg-white/95 backdrop-blur-md border-none flex items-center justify-center shadow-lg transition-transform active:scale-90">
            <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 theme-primary-text" />
          </button>
          <button className="w-9 h-9 sm:w-11 sm:h-11 rounded-[12px] sm:rounded-[14px] bg-white/95 backdrop-blur-md border-none flex items-center justify-center shadow-lg transition-transform active:scale-90">
            <Video className="w-4 h-4 sm:w-5 sm:h-5 theme-primary-text" />
          </button>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-t from-white/90 to-transparent" />
      </div>

      {/* Exercise Info - Responsive padding */}
      <div className="p-3" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        {/* Timer Controls - Responsive */}
        <div className="flex items-center justify-between mb-5 sm:mb-6 md:mb-7 gap-2">
          <button className="theme-gradient-bg text-white px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-[12px] sm:rounded-[14px] font-bold text-[13px] sm:text-[15px] flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-[var(--color-primary-500)]/30 transition-transform active:scale-95">
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="white" />
            <span className="hidden sm:inline">{t("start")}</span>
            <span className="sm:hidden">▶</span>
          </button>

          <div className="flex items-center gap-1 bg-gray-100 px-2 sm:px-2.5 py-2 sm:py-2.5 rounded-[12px] sm:rounded-[14px]">
            <button className="w-[28px] h-[28px] sm:w-[34px] sm:h-[34px] rounded-[8px] sm:rounded-[10px] bg-white border-none flex items-center justify-center shadow-sm transition-transform active:scale-90">
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
            <span className="text-[15px] sm:text-[17px] font-bold text-gray-800 min-w-[40px] sm:min-w-[50px] text-center">
              1:00
            </span>
            <button className="w-[28px] h-[28px] sm:w-[34px] sm:h-[34px] rounded-[8px] sm:rounded-[10px] bg-white border-none flex items-center justify-center shadow-sm transition-transform active:scale-90">
              <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            </button>
          </div>

          <div className=" flex-none w-[50px] h-[50px] sm:w-[60px] sm:h-[60px] rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs sm:text-sm font-bold text-gray-500 border-2 sm:border-3 border-white shadow-md">
            1:00
          </div>
        </div>

        {/* Sets Table - Responsive */}
        <div className="bg-gray-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-4 sm:mb-5">
          {/* Table Header */}
          <div className="grid grid-cols-[40px_1fr_1fr] sm:grid-cols-[50px_1fr_1fr] gap-0.5 pb-2 sm:pb-3 mb-2 sm:mb-3 border-b-2 border-gray-200 text-center text-[11px] sm:text-[13px] font-bold text-gray-500">
            <div>{t("table.done")}</div>
            <div>{t("table.weight")}</div>
            <div>{t("table.reps")}</div>
          </div>

          {/* Sets Rows */}
          {sets.map((set, index) => (
            <div
              key={index}
              className={`grid grid-cols-[30px_1fr_1fr] gap-1 sm:gap-1.5 py-1 items-center ${
                index < sets.length - 1 ? 'border-b border-gray-200' : ''
              } animate-slide-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Checkbox */}
              <div className="flex justify-center">
                <button
                  onClick={() => updateSet(index, 'done', !set.done)}
                  className={`
                    w-4 h-4 sm:w-5 sm:h-5 rounded-md sm:rounded-lg border-0 flex items-center justify-center transition-all
                    ${set.done 
                      ? 'theme-gradient-bg shadow-md shadow-[var(--color-primary-500)]/30' 
                      : 'bg-white border-[2px] sm:border-[2.5px] border-gray-300'
                    }
                  `}
                >
                  {set.done && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" strokeWidth={3} />}
                </button>
              </div>

              {/* Weight Counter */}
              <CounterControl
                value={set.weight}
                onIncrement={() => updateSet(index, 'weight', set.weight + 5)}
                onDecrement={() => updateSet(index, 'weight', Math.max(0, set.weight - 5))}
              />

              {/* Reps Counter */}
              <CounterControl
                value={set.reps}
                onIncrement={() => updateSet(index, 'reps', set.reps + 1)}
                onDecrement={() => updateSet(index, 'reps', Math.max(0, set.reps - 1))}
              />
            </div>
          ))}
        </div>

        {/* Action Buttons - Responsive */}
        <div className="flex gap-2 sm:gap-3">
          <button className="flex-1 py-3 sm:py-4 rounded-[12px] sm:rounded-[14px] theme-gradient-bg border-none text-white text-[13px] sm:text-[15px] font-bold shadow-lg shadow-[var(--color-primary-500)]/30 transition-transform active:scale-98">
            {t("buttons.addSet")}
          </button>
          <button className="px-4 sm:px-5 py-3 sm:py-4 rounded-[12px] sm:rounded-[14px] bg-gray-100 border-none text-gray-500 text-[13px] sm:text-[15px] font-bold transition-transform active:scale-98">
            {t("buttons.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Counter Control Component - Responsive ──────────────────────────────────────────
function CounterControl({ value, onIncrement, onDecrement }) {
  return (
    <div className="flex items-center justify-center gap-0.5 bg-white px-1 sm:px-1.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl shadow-sm">
      <button
        onClick={onDecrement}
        className="w-[22px] h-[22px] sm:w-[25px] sm:h-[25px] rounded-md sm:rounded-lg bg-gray-100 border-none flex items-center justify-center transition-transform active:scale-90"
      >
        <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
      </button>
      <span className="text-sm sm:text-base font-bold text-gray-800 min-w-[25px] sm:min-w-[30px] text-center">
        {value}
      </span>
      <button
        onClick={onIncrement}
        className="w-[22px] h-[22px] sm:w-[25px] sm:h-[25px] rounded-md sm:rounded-lg bg-gray-100 border-none flex items-center justify-center transition-transform active:scale-90"
      >
        <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
      </button>
    </div>
  );
}

// ─── Exercise Screen Content ──────────────────────────────────────────
function ExerciseScreenContent({ locale }) {
  const exercise = {
    name: locale === 'ar' ? 'تمرين الصدر' : 'Bench Press',
  };

  return (
    <>
      <AppHeader locale={locale} />
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300">
        <EnhancedExerciseCard exercise={exercise} locale={locale} />
      </div>
    </>
  );
}

// ─── Main Hero Component - Fully Responsive ──────────────────────────────────────────
export default function ResponsiveHero() {
  const t = useTranslations("home.hero");
  const locale = useLocale();
  const isRTL = locale === 'ar';

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col pt-16 max-md:pt-[120px] " >
      {/* Background Effects - Responsive */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Gradient Orbs - Responsive sizes */}
        <motion.div
          variants={glowVariants}
          initial="initial"
          animate="animate"
          className="absolute top-10 sm:top-20 ltr:right-5 rtl:left-5 sm:ltr:right-10 sm:rtl:left-10 md:ltr:right-20 md:rtl:left-20 w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96 rounded-full blur-2xl sm:blur-3xl"
          style={{
            background: `radial-gradient(circle, var(--color-primary-500) 0%, transparent 70%)`,
            opacity: 0.2,
          }}
        />
        <motion.div
          variants={glowVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.5 }}
          className="absolute bottom-10 sm:bottom-20 ltr:left-5 rtl:right-5 sm:ltr:left-10 sm:rtl:right-10 md:ltr:left-20 md:rtl:right-20 w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96 rounded-full blur-2xl sm:blur-3xl"
          style={{
            background: `radial-gradient(circle, var(--color-secondary-500) 0%, transparent 70%)`,
            opacity: 0.2,
          }}
        />

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] sm:bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />

        {/* Floating Particles - Responsive */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `var(--color-primary-400)`,
              opacity: 0.3,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Hero Content - Responsive */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 flex-1 flex items-center justify-center py-8 sm:py-12">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center w-full">
          {/* Left Content - Responsive */}
          <div className="space-y-6 sm:space-y-8 md:space-y-10 animate-fade-in-up text-center lg:text-left">
            {/* Headlines - Responsive text sizes */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <h1 className="rtl:md:text-right font-black text-white leading-tight tracking-tight">
                <span className=" rtl:md:text-right block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-1 sm:mb-2 animate-slide-in-right">
                  {t("headline.transform")}
                </span>
                <span className="xl:leading-[130px] rtl:md:text-right block text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl theme-gradient-text animate-slide-in-right" style={{ animationDelay: '100ms', textShadow: '0 0 60px var(--color-primary-500)' }}>
                  {t("headline.journey")}
                </span>
                <span className=" rtl:md:text-right block text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl mt-1 sm:mt-2 text-gray-300 animate-slide-in-right" style={{ animationDelay: '200ms' }}>
                  {t("headline.withScience")}
                </span>
              </h1>

              <p className="rtl:md:text-right text-base sm:text-lg md:text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium animate-fade-in px-4 sm:px-0" style={{ animationDelay: '300ms' }}>
                {t("description")}
              </p>
            </div>

						<div className="md:hidden">
            <MobileShowcase locale={locale} t={t} />
          </div>

            {/* CTA Buttons - Responsive */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 animate-fade-in justify-center lg:justify-start" style={{ animationDelay: '400ms' }}>
              <button className="group relative theme-gradient-bg text-white px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all shadow-2xl shadow-[var(--color-primary-500)]/50 hover:shadow-[var(--color-primary-500)]/70 hover:scale-105 overflow-hidden w-full sm:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <span className="relative flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                  {t("cta.getStarted")}
                  <svg className="rtl:scale-x-[-1] w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
              
              <button className="relative bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:bg-white/20 hover:border-white/50 transition-all group w-full sm:w-auto">
                <span className="flex items-center justify-center gap-2">
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 group-hover:scale-110 transition-transform" />
                  {t("cta.watchDemo")}
                </span>
              </button>
            </div>

            {/* Trust Indicators - Responsive */}
            <TrustIndicators t={t} />
          </div>

          <div className="max-md:hidden">
            <MobileShowcase locale={locale} t={t} />
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Trust Indicators Component - Responsive ──────────────────────────────────────────
function TrustIndicators({ t }) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-4 sm:pt-6 animate-fade-in" style={{ animationDelay: '500ms' }}>
      {/* Active Users Card - Responsive */}
      <div className="group relative w-full sm:w-auto">
        <div className="absolute -inset-1 bg-gradient-to-r from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-pink-500 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-75 blur-lg transition-all duration-500 animate-pulse" />
        
        <div className="relative flex items-center gap-3 sm:gap-4 bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-slate-700/50 group-hover:border-[var(--color-primary-500)]/50 transition-all duration-300 shadow-lg">
          <div className="flex -space-x-4 sm:-space-x-6">
            {[
              { color: 'from-[var(--color-primary-400)] to-[var(--color-primary-600)]' },
              { color: 'from-[var(--color-secondary-400)] to-[var(--color-secondary-600)]' },
              { color: 'from-pink-400 to-pink-600' },
              { color: 'from-blue-400 to-blue-600' }
            ].map((avatar, i) => (
              <div
                key={i}
                className={`z-[10] w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${avatar.color} border-2 sm:border-3 border-slate-800 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300`}
              >
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-pulse" />
              </div>
            ))}
          </div>

          <div>
            <p className="text-white font-black text-xl sm:text-2xl bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent group-hover:from-[var(--color-primary-400)] group-hover:to-[var(--color-secondary-400)] transition-all duration-300">
              50,000+
            </p>
            <p className="text-gray-400 text-xs sm:text-sm font-semibold group-hover:text-gray-300 transition-colors">
              {t("trust.activeUsers")}
            </p>
          </div>

          <div className="absolute -top-2 -right-2 w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" strokeWidth={3} />
          </div>
        </div>
      </div>

      {/* Divider - Hidden on mobile */}
      <div className="hidden sm:block relative h-12 sm:h-16 w-px">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-600 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary-500)] via-[var(--color-secondary-500)] to-pink-500 animate-pulse opacity-50 blur-sm" />
      </div>

      {/* Rating Card - Responsive */}
      <RatingCard t={t} />
    </div>
  );
}

// ─── Rating Card Component - Responsive ──────────────────────────────────────────
function RatingCard({ t }) {
  return (
    <div className="group relative w-full sm:w-auto">
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-75 blur-lg transition-all duration-500" />
      
      <div className="relative flex items-center gap-2 sm:gap-3 bg-slate-800/80 backdrop-blur-xl rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 border border-slate-700/50 group-hover:border-yellow-500/50 transition-all duration-300 shadow-lg">
        <div className="flex gap-0">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="transform group-hover:scale-110 transition-all duration-300"
              style={{ 
                animationDelay: `${i * 100}ms`,
                filter: 'drop-shadow(0 2px 4px rgba(251, 191, 36, 0.5))'
              }}
            >
              <svg className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" viewBox="0 0 24 24" style={{ animationDelay: `${i * 200}ms` }}>
                <defs>
                  <linearGradient id={`star-gradient-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <path fill={`url(#star-gradient-${i})`} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
          ))}
        </div>

        <div>
          <p className="text-white font-black text-xl sm:text-2xl bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
            4.9/5
          </p>
          <p className="text-gray-400 text-xs sm:text-sm font-semibold group-hover:text-gray-300 transition-colors">
            {t("trust.rating")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Showcase Component - Responsive ──────────────────────────────────────────
function MobileShowcase({ locale, t }) {
  return (
    <div className="relative animate-fade-in-up" style={{ animationDelay: '200ms' }}>
      {/* Decorative Rings - Responsive sizes */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-[400px] sm:w-[450px] md:w-[550px] h-[400px] sm:h-[450px] md:h-[550px] rounded-full border-2 sm:border-3 md:border-4 border-[var(--color-primary-500)]/30 animate-spin-slow shadow-xl sm:shadow-2xl shadow-[var(--color-primary-500)]/20" style={{ animationDuration: '20s' }} />
        <div className="absolute w-[380px] sm:w-[420px] md:w-[520px] h-[380px] sm:h-[420px] md:h-[520px] rounded-full border-2 sm:border-3 md:border-4 border-[var(--color-secondary-500)]/30 animate-spin-slow shadow-xl sm:shadow-2xl shadow-[var(--color-secondary-500)]/20" style={{ animationDuration: '25s', animationDirection: 'reverse' }} />
        <div className="absolute w-[360px] sm:w-[390px] md:w-[490px] h-[360px] sm:h-[390px] md:h-[490px] rounded-full border-2 sm:border-3 md:border-4 border-pink-500/30 animate-spin-slow shadow-xl sm:shadow-2xl shadow-pink-500/20" style={{ animationDuration: '30s' }} />

        {/* Background blur */}
        <div className="absolute w-[300px] sm:w-[350px] md:w-[450px] h-[300px] sm:h-[350px] md:h-[450px] rounded-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm" />
      </div>

      {/* Central Mobile Mockup */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="transform hover:scale-105 transition-transform duration-500">
          <IPhoneMockup>
            <StatusBar />
            <ExerciseScreenContent locale={locale} />
            <HomeIndicator />
          </IPhoneMockup>
        </div>
      </div>

      {/* Floating Stats - Responsive */}
      <FloatingStats t={t} />
    </div>
  );
}

// ─── Floating Stats Component - Responsive ──────────────────────────────────────────
function FloatingStats({ t }) {
  const stats = [
    {
      icon: Activity,
      value: t("floatingStats.exercises.value"),
      label: t("floatingStats.exercises.label"),
      gradient: 'from-[var(--color-primary-500)] to-[var(--color-primary-600)]',
      position: 'absolute -top-2 sm:-top-4 left-[30px] sm:left-[50px]',
      delay: '0s'
    },
    {
      icon: Flame,
      value: t("floatingStats.calories.value"),
      label: t("floatingStats.calories.label"),
      gradient: 'from-[var(--color-secondary-500)] to-[var(--color-secondary-600)]',
      position: 'absolute -bottom-2 sm:-bottom-4 right-0',
      delay: '1s'
    },
    {
      icon: Heart,
      value: t("floatingStats.heartRate.value"),
      label: t("floatingStats.heartRate.label"),
      gradient: 'from-pink-500 to-pink-600',
      position: 'absolute top-1/2 left-4 sm:left-8',
      delay: '2s',
      fill: true
    }
  ];

  return (
    <>
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.position} max-md:hidden bg-gradient-to-br ${stat.gradient} rounded-xl sm:rounded-2xl p-2.5 sm:p-3 md:p-4 cursor-pointer transform hover:scale-110 transition-all animate-float shadow-xl sm:shadow-2xl`}
            style={{ animationDelay: stat.delay }}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-0.5 sm:px-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Icon className={`w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-white ${stat.fill ? 'fill-white' : ''} animate-pulse`} />
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <p className="text-lg sm:text-xl md:text-2xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-white/90 font-semibold max-w-[40px] sm:max-w-none">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
      
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @media (min-width: 640px) {
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow linear infinite; }
      `}</style>
    </>
  );
}