import { Sparkle } from "lucide-react";

export const STUDIO = {
  gradient: 'linear-gradient(90deg, #6366F1 0%, #3B82F6 100%)',
  gradientBr: 'linear-gradient(135deg, #6366F1 0%, #A855F7 100%)',
  purple: '#6366F1',
  blue: '#3B82F6',
  accent: '#818CF8',
  text: '#111827',
  muted: '#9CA3AF',
  sub: '#6B7280',
  border: '#E5E7EB',
  page: '#F3F4F8',
  green: '#10B981',
  greenBg: '#ECFDF5',
  greenBorder: '#A7F3D0',
  greenText: '#047857',
  shadow: '0 10px 25px -12px rgba(15, 23, 42, 0.12), 0 4px 8px -4px rgba(15, 23, 42, 0.06)',
  shadowCard: '0 10px 20px -10px rgba(15, 23, 42, 0.10), 0 4px 6px -4px rgba(15, 23, 42, 0.05)',
  btnRadius: 10,
  shadow3d:
    'inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 0 #e5e7eb, 0 3px 0 #d1d5db, 0 8px 14px -8px rgba(15,23,42,0.28)',
  shadow3dPrimary:
    'inset 0 1px 0 rgba(255,255,255,0.28), 0 1px 0 #4f46e5, 0 3px 0 #3730a3, 0 10px 18px -8px rgba(79,70,229,0.7)',
};

export function FourPointStar({ className, size = 8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M6 0c.28 2.2 1.4 3.32 3.6 3.6C7.4 4.88 6.28 6 6 8.2 5.72 6 4.6 4.88 2.4 4.6 4.6 3.32 5.72 2.2 6 0Z" />
    </svg>
  );
}

export function StudioSparkleLogo({ size = 40 }) {
  const font = Math.max(11, Math.round(size * 0.34));
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center text-white"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: STUDIO.gradientBr,
        boxShadow: STUDIO.shadow3dPrimary,
      }}
    >
      <span className="leading-none font-black tracking-tight" style={{ fontSize: font }}>
        <Sparkle />
      </span>
    </span>
  );
}

export function ReadyCheck({ size = 18 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white"
      style={{ width: size, height: size, background: STUDIO.green }}
    >
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M2.2 6.2 4.7 8.7 9.8 3.4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
