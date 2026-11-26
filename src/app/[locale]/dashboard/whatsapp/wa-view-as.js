'use client';

import toast from 'react-hot-toast';
import api from '@/utils/axios';
import { notifyImpersonationChanged } from '@/lib/impersonation';
import { setStoredUser } from '@/app/role-access';

/**
 * "View as" a teammate from the WhatsApp page: the same impersonation session the super-admin
 * Users page starts (POST /auth/super-admin/impersonate/:id — super admin: anyone but another
 * super admin; admin: only their own coaches; enforced by the API), opened straight on WhatsApp. The current session is kept with the page to come back
 * to, so the global "Viewing as … / Back" bar returns here instead of the Users page.
 */
export async function startViewAs(member, { locale = 'en', ar = false } = {}) {
	const userId = String(member?.userId || member?.id || '').trim();
	if (!userId) return false;
	const toastId = toast.loading(ar ? 'بنفتح حسابه…' : 'Opening their account…');
	try {
		const prev = {
			accessToken: localStorage.getItem('accessToken'),
			refreshToken: localStorage.getItem('refreshToken'),
			user: localStorage.getItem('user'),
			returnTo: `${window.location.pathname}${window.location.search}`,
		};
		localStorage.setItem('super_admin_prev_session', JSON.stringify(prev));

		const { data: session } = await api.post(`/auth/super-admin/impersonate/${encodeURIComponent(userId)}`);
		const { accessToken, refreshToken, user } = session || {};
		if (!accessToken || !user) throw new Error('No session');

		localStorage.setItem('accessToken', accessToken);
		localStorage.setItem('refreshToken', refreshToken);
		setStoredUser(user);
		localStorage.setItem('impersonated_user', JSON.stringify(user));
		notifyImpersonationChanged();

		await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ accessToken, refreshToken, user }),
		});

		toast.success(ar ? `بتشوف دلوقتي كـ ${user.name || ''}` : `Now viewing as ${user.name || ''}`, { id: toastId });
		// A full load, so every cached list (chats, accounts, presence) is theirs, not ours.
		window.location.assign(`/${locale}/dashboard/whatsapp?tab=chats`);
		return true;
	} catch (error) {
		localStorage.removeItem('super_admin_prev_session');
		localStorage.removeItem('impersonated_user');
		notifyImpersonationChanged();
		toast.error(
			error?.response?.data?.message || (ar ? 'مقدرناش نفتح حسابه' : 'Could not open their account'),
			{ id: toastId },
		);
		return false;
	}
}
