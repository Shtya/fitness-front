'use client';

const SESSION_STORAGE_KEYS = ['user', 'accessToken', 'refreshToken', 'impersonated_user'];

/**
 * Clears everything a signed-out user should no longer be able to read on this
 * device. The WhatsApp message cache lives in IndexedDB, so clearing tokens
 * alone would leave real conversations readable by the next person to sign in.
 */
export async function clearClientSession() {
	SESSION_STORAGE_KEYS.forEach(key => {
		try {
			window.localStorage.removeItem(key);
		} catch {
			/* storage disabled or full */
		}
	});
	try {
		const { clearCachedMessagePages } = await import(
			'@/app/[locale]/dashboard/whatsapp/whatsapp-idb-cache'
		);
		await clearCachedMessagePages();
	} catch {
		/* cache is best-effort; never block sign-out on it */
	}
}
