/**
 * Header (clean user-only):
 * - Only user info + notifications (no search, no brand).
 * - Notification button raised slightly; popover at top-10.
 * - Role shown as a subtle outlined badge (no gradient pill).
 * - Action icons (Profile / Settings / Sign out) beside user info (no dropdown).
 * - No points displayed.
 * - Optional handlers: onProfile, onSettings, onSignOut (fallback to console.log).
 */

'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Bell, User as UserIcon, UserRound, Settings, LogOut, Sparkles, ShieldCheck } from 'lucide-react';
import { useUser } from '@/hooks/useUser';
import { Link, useRouter } from '@/i18n/navigation';

/* ----------------------------- helpers ---------------------------------- */
function initialsFrom(name, email) {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || 'G';
  const parts = src.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}
function fmtRole(role) {
  if (!role) return 'Guest';
  return role[0].toUpperCase() + role.slice(1);
}
function timeAgo(iso) {
  try {
    const then = new Date(iso);
    const diff = Math.max(0, Date.now() - then.getTime());
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  } catch {
    return '—';
  }
}
const roleStyles = role => {
  const r = (role || '').toLowerCase();
  if (r === 'admin') return 'text-rose-700 border-rose-200 bg-rose-50/70';
  if (r === 'coach') return 'text-indigo-700 border-indigo-200 bg-indigo-50/70';
  if (r === 'client') return 'text-emerald-700 border-emerald-200 bg-emerald-50/70';
  return 'text-slate-700 border-slate-200 bg-slate-50/70';
};

/* ------------------------- Notifications Popover ------------------------- */
function Notifications({ open, onClose, items = [] }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className='fixed inset-0 z-[60]' initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role='dialog' aria-label='Notifications' className='absolute right-0 top-10 z-[70] w-[360px] max-w-[94vw] rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl' initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}>
            <div className='px-4 py-3 border-b border-slate-100 flex items-center justify-between'>
              <div className='flex items-center gap-2 font-semibold'>
                <Bell className='size-4 text-emerald-700' />
                <span>Notifications</span>
              </div>
              <button onClick={onClose} className='text-xs px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50'>
                Close
              </button>
            </div>

            <div className='max-h-[60vh] overflow-auto'>
              {items.length === 0 ? (
                <div className='px-5 py-8 text-center text-slate-500'>No notifications yet.</div>
              ) : (
                <ul className='divide-y divide-slate-100'>
                  {items.map(n => (
                    <li key={n.id} className='p-4 hover:bg-slate-50/70 transition'>
                      <div className='flex items-start gap-3'>
                        <div className='mt-0.5'>{n.icon || <Sparkles className='size-4 text-slate-500' />}</div>
                        <div className='flex-1'>
                          <div className='text-sm font-medium text-slate-800'>{n.title}</div>
                          <div className='text-xs text-slate-500'>{n.body}</div>
                          <div className='text-[11px] text-slate-400 mt-1'>{n.when}</div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* -------------------------------- Header --------------------------------- */
export default function Header({ onMenu, onProfile = () => console.log('profile'), onSettings = () => console.log('settings') }) {
  const user = useUser?.();

  const router = useRouter();
  const handleLogout = () => {
    localStorage.clear('user');
    router.push('/auth');
  };
  const [notifOpen, setNotifOpen] = useState(false);
  const toggleNotif = () => setNotifOpen(o => !o);

  // sample notifications
  const notifications = useMemo(
    () => [
      {
        id: 'n1',
        title: 'Welcome back!',
        body: 'Your dashboard is synced and ready.',
        when: timeAgo(user?.lastLogin),
        icon: <ShieldCheck className='size-4 text-emerald-600' />,
      },
      {
        id: 'n2',
        title: 'Security check',
        body: 'We noticed a login from a new device.',
        when: '2h ago',
        icon: <ShieldCheck className='size-4 text-indigo-600' />,
      },
    ],
    [user?.lastLogin],
  );

  const avatarText = initialsFrom(user?.name, user?.email);
  const role = fmtRole(user?.role);
  const isActive = (user?.status || '').toLowerCase() === 'active';

  return (
    <div className='sticky top-0 z-40'>
      {/* glass + subtle shadow */}
      <div className='absolute inset-0 bg-gradient-to-b from-white/85 to-white/60 backdrop-blur-xl border-b border-slate-200/70' />
      <div className='absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent' />

      <div className='relative'>
        <div className='container px-3 sm:px-4'>
          <div className='h-16 grid grid-cols-[auto_1fr_auto] items-center gap-2'>
            {/* left: menu only */}
            <div className='flex items-center gap-2'>
              <button onClick={onMenu} className='lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-slate-200 bg-white hover:shadow-sm active:scale-95 transition' aria-label='Open menu' title='Open menu'>
                <Menu className='w-5 h-5' />
              </button>
              {/* user block */}
              <div className='flex items-center gap-3'>
                <div className='relative'>
                  <div className='size-11 rounded-lg grid place-content-center font-semibold bg-indigo-600 text-white shadow-sm'>{avatarText}</div>
                  <span className={`absolute -right-0 -bottom-0 size-2.5 rounded-full ring-2 ring-white ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isActive ? 'Online' : 'Offline'} />
                </div>

                <div className='hidden sm:flex flex-col items-start'>
                  <span className='text-sm font-medium leading-4 text-slate-800 max-w-[180px] truncate'>{user?.name || user?.email || 'Guest'}</span>
                  <div className='flex items-center gap-2 mt-[2px]'>
                    {/* role badge (subtle, outlined) */}
                    <span className={`inline-flex items-center gap-1 text-[11px] leading-5 px-1.5 py-0.5 rounded-md border ${roleStyles(role)}`} title={`Role: ${role}`}>
                      <UserIcon className='size-3.5' />
                      {role}
                    </span>
                    <span className='text-[11px] text-slate-500'>Last login: {user?.lastLogin ? timeAgo(user.lastLogin) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div />

            <div className='relative flex items-center gap-2'>
              {/* notifications (raised a bit) */}
              <div className='relative -mt-0.5'>
                <button className='relative inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' onClick={toggleNotif} aria-haspopup='dialog' aria-expanded={notifOpen} aria-label='Open notifications' title='Notifications'>
                  <Bell className='size-5 text-slate-700' />
                  <span className={`absolute -right-1 -top-1 size-2.5 rounded-full ${notifications.length ? 'bg-rose-500' : 'bg-slate-300'}`} />
                </button>

                <div className='relative'>
                  <Notifications open={notifOpen} onClose={() => setNotifOpen(false)} items={notifications} />
                </div>
              </div>
              <div className='flex items-center'>
                <button onClick={onProfile} className='inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' aria-label='Profile' title='Profile'>
                  <UserRound className='size-5 text-slate-700' />
                </button>
                <button onClick={onSettings} className='ml-1 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition' aria-label='Settings' title='Settings'>
                  <Settings className='size-5 text-slate-700' />
                </button>
                <button onClick={handleLogout} className='ml-1 inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 active:scale-95 transition' aria-label='Sign out' title='Sign out'>
                  <LogOut className='size-5 text-rose-600' />
                </button>
              </div>

              {/* if absolutely no user object, show Sign in (kept minimal) */}
              {!user && (
                <Link href={'/auth'} onClick={handleLogout} className='ml-2 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50'>
                  <LogOut className='size-4 rotate-180' />
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
