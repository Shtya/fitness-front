'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';

/*
 * Where "open this book" goes. On its own pages the reading room navigates to /ai-studio/read/:id;
 * embedded somewhere else (the WhatsApp Reading tab) it opens the book in place instead, so the
 * user never leaves the page they are on.
 */
const ReadingNavContext = createContext(null);

export function ReadingNavProvider({ openBook, openJourney, goTab, children }) {
	const value = useMemo(() => ({ openBook, openJourney, goTab }), [openBook, openJourney, goTab]);
	return <ReadingNavContext.Provider value={value}>{children}</ReadingNavContext.Provider>;
}

export function useReadingNav() {
	const ctx = useContext(ReadingNavContext);
	const router = useRouter();
	const openBook = useCallback(
		id => {
			if (!id) return;
			if (ctx?.openBook) ctx.openBook(String(id));
			else router.push(`/ai-studio/read/${id}`);
		},
		[ctx, router],
	);
	const openJourney = useCallback(
		id => {
			if (!id) return;
			if (ctx?.openJourney) ctx.openJourney(String(id));
			else router.push(`/ai-studio/journeys/${id}`);
		},
		[ctx, router],
	);
	return { openBook, openJourney, embedded: Boolean(ctx), goTab: ctx?.goTab || null };
}
