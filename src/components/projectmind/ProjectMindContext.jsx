'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pmApi } from './api';

const Ctx = createContext(null);
const KEY = 'projectmind.projectId';

/** Holds the active ProjectMind project (persisted per browser) and exposes the project list. */
export function ProjectMindProvider({ children }) {
	const qc = useQueryClient();
	const [projectId, setProjectIdState] = useState(null);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		try {
			setProjectIdState(localStorage.getItem(KEY) || null);
		} catch {
			/* storage blocked */
		}
		setHydrated(true);
	}, []);

	const projectsQ = useQuery({ queryKey: ['pm', 'projects'], queryFn: pmApi.listProjects, staleTime: 15_000 });
	const projects = projectsQ.data || [];

	// Poll while any project is being imported/analyzed.
	const busy = projects.some((p) => p.status === 'importing' || p.status === 'analyzing');
	useEffect(() => {
		if (!busy) return undefined;
		const t = setInterval(() => qc.invalidateQueries({ queryKey: ['pm'] }), 2500);
		return () => clearInterval(t);
	}, [busy, qc]);

	const setProjectId = useCallback((id) => {
		setProjectIdState(id);
		try {
			if (id) localStorage.setItem(KEY, id);
			else localStorage.removeItem(KEY);
		} catch {
			/* ignore */
		}
	}, []);

	// Stored project if it still exists; otherwise the most recently analyzed READY project (never a failed one by default).
	const current = useMemo(() => {
		if (!hydrated || projectsQ.isLoading) return null;
		const stored = projects.find((p) => p.id === projectId);
		if (stored) return stored;
		const ready = projects.filter((p) => p.status === 'ready').sort((a, b) => new Date(b.analyzedAt || 0) - new Date(a.analyzedAt || 0));
		return ready[0] || projects[0] || null;
	}, [hydrated, projectsQ.isLoading, projects, projectId]);

	const value = useMemo(
		() => ({ projects, project: current, projectId: current?.id || null, setProjectId, loading: !hydrated || projectsQ.isLoading, error: projectsQ.error, refetch: projectsQ.refetch }),
		[projects, current, setProjectId, hydrated, projectsQ.isLoading, projectsQ.error, projectsQ.refetch],
	);
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProjectMind() {
	const v = useContext(Ctx);
	if (!v) throw new Error('useProjectMind must be used inside <ProjectMindProvider>');
	return v;
}
