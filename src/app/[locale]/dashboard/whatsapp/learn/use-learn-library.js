'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/utils/axios';
import { orderBy, statsFromLectures } from './learn-model';

/**
 * The Learn library as the server keeps it. Every change goes through its own small request
 * (one course, one lecture field), so nothing ever rewrites the whole library at once.
 */
export function useLearnLibrary() {
	const [courses, setCourses] = useState([]);
	const [status, setStatus] = useState('loading'); // loading | ready | error
	// courseId → lecture summaries (no long text), filled when a course is opened
	const [lectures, setLectures] = useState({});
	const coursesRef = useRef(courses);
	coursesRef.current = courses;
	const lecturesRef = useRef(lectures);
	lecturesRef.current = lectures;

	const reload = useCallback(async () => {
		setStatus(current => (current === 'ready' ? current : 'loading'));
		try {
			const { data } = await api.get('/learn/courses');
			setCourses(Array.isArray(data?.courses) ? data.courses : []);
			setStatus('ready');
		} catch {
			setStatus(current => (current === 'ready' ? current : 'error'));
		}
	}, []);

	useEffect(() => {
		void reload();
	}, [reload]);

	const patchCourse = useCallback((id, patch) => {
		setCourses(current => current.map(c => (c.id === id ? { ...c, ...(typeof patch === 'function' ? patch(c) : patch) } : c)));
	}, []);

	const createCourse = useCallback(async fields => {
		const { data } = await api.post('/learn/courses', fields);
		setCourses(current => [...current, data]);
		setLectures(current => ({ ...current, [data.id]: [] }));
		return data;
	}, []);

	const updateCourse = useCallback(async (id, fields) => {
		const { data } = await api.patch(`/learn/courses/${id}`, fields);
		patchCourse(id, data);
		return data;
	}, [patchCourse]);

	const removeCourse = useCallback(async id => {
		await api.delete(`/learn/courses/${id}`);
		setCourses(current => current.filter(c => c.id !== id));
		setLectures(current => {
			const next = { ...current };
			delete next[id];
			return next;
		});
	}, []);

	const reorderCourses = useCallback(async ids => {
		const previous = coursesRef.current;
		setCourses(current => orderBy(current, ids));
		try {
			await api.put('/learn/courses/order', { ids });
		} catch (error) {
			setCourses(previous);
			throw error;
		}
	}, []);

	const loadLectures = useCallback(async courseId => {
		const { data } = await api.get(`/learn/courses/${courseId}/lectures`);
		const list = Array.isArray(data?.lectures) ? data.lectures : [];
		lecturesRef.current = { ...lecturesRef.current, [courseId]: list };
		setLectures(current => ({ ...current, [courseId]: list }));
		if (data?.course) patchCourse(courseId, data.course);
		return list;
	}, [patchCourse]);

	/** Keeps a course's counters in step with its loaded lecture list. */
	const setCourseLectures = useCallback((courseId, updater) => {
		const list = typeof updater === 'function' ? updater(lecturesRef.current[courseId] || []) : updater;
		lecturesRef.current = { ...lecturesRef.current, [courseId]: list };
		setLectures(current => ({ ...current, [courseId]: list }));
		patchCourse(courseId, statsFromLectures(list));
	}, [patchCourse]);

	const createLecture = useCallback(async (courseId, fields) => {
		const { data } = await api.post(`/learn/courses/${courseId}/lectures`, fields);
		setCourseLectures(courseId, list => [...list, data]);
		patchCourse(courseId, { lastStudiedAt: Date.now() });
		return data;
	}, [patchCourse, setCourseLectures]);

	/** A lecture's list row changed (title, done, revision, …) — from a save response or locally. */
	const applyLectureSummary = useCallback((courseId, lecture) => {
		setCourseLectures(courseId, list => list.map(l => (l.id === lecture.id ? { ...l, ...pickSummary(lecture) } : l)));
	}, [setCourseLectures]);

	const removeLecture = useCallback(async (courseId, id) => {
		await api.delete(`/learn/lectures/${id}`);
		setCourseLectures(courseId, list => list.filter(l => l.id !== id));
	}, [setCourseLectures]);

	const reorderLectures = useCallback(async (courseId, ids) => {
		const previous = lecturesRef.current[courseId] || [];
		setCourseLectures(courseId, orderBy(previous, ids));
		try {
			await api.put(`/learn/courses/${courseId}/lectures/order`, { ids });
		} catch (error) {
			setCourseLectures(courseId, previous);
			throw error;
		}
	}, [setCourseLectures]);

	return {
		courses,
		status,
		lectures,
		reload,
		createCourse,
		updateCourse,
		removeCourse,
		reorderCourses,
		loadLectures,
		createLecture,
		applyLectureSummary,
		removeLecture,
		reorderLectures,
		touchCourse: id => patchCourse(id, { lastStudiedAt: Date.now() }),
	};
}

const SUMMARY_KEYS = ['id', 'courseId', 'title', 'description', 'done', 'doneAt', 'needsRevision', 'qaCount', 'hasContent', 'updatedAt'];

function pickSummary(lecture) {
	const out = {};
	for (const key of SUMMARY_KEYS) if (lecture[key] !== undefined) out[key] = lecture[key];
	if (Array.isArray(lecture.qa)) out.qaCount = lecture.qa.length;
	if (typeof lecture.content === 'string') out.hasContent = Boolean(lecture.content.trim());
	return out;
}

const SAVE_DEBOUNCE_MS = 700;

/**
 * Saves one lecture's edits: changed fields are merged, debounced and sent one PATCH at a time
 * (in order), only with the fields that changed. A failed save keeps its fields pending so
 * "Retry" (or the next edit) sends them again, and leaving the page warns while anything is
 * unsaved.
 */
export function useLectureSaver(lectureId, onSaved) {
	const [state, setState] = useState('idle'); // idle | pending | saving | saved | error
	const pending = useRef({});
	const timer = useRef(0);
	const chain = useRef(Promise.resolve());
	const onSavedRef = useRef(onSaved);
	onSavedRef.current = onSaved;

	const flush = useCallback(() => {
		window.clearTimeout(timer.current);
		const fields = pending.current;
		if (!Object.keys(fields).length) return chain.current;
		pending.current = {};
		setState('saving');
		chain.current = chain.current
			.catch(() => undefined)
			.then(async () => {
				try {
					const { data } = await api.patch(`/learn/lectures/${lectureId}`, fields);
					onSavedRef.current?.(data);
					setState(Object.keys(pending.current).length ? 'pending' : 'saved');
				} catch (error) {
					// Newer edits of the same field win over the failed ones.
					pending.current = { ...fields, ...pending.current };
					setState('error');
					throw error;
				}
			});
		return chain.current;
	}, [lectureId]);

	const save = useCallback(
		(fields, { immediate = false } = {}) => {
			pending.current = { ...pending.current, ...fields };
			setState('pending');
			window.clearTimeout(timer.current);
			if (immediate) void flush().catch(() => undefined);
			else timer.current = window.setTimeout(() => void flush().catch(() => undefined), SAVE_DEBOUNCE_MS);
		},
		[flush],
	);

	useEffect(() => {
		const hasUnsaved = () => Object.keys(pending.current).length > 0;
		const onBeforeUnload = event => {
			if (!hasUnsaved()) return;
			void flush().catch(() => undefined);
			event.preventDefault();
			event.returnValue = '';
		};
		const onHide = () => {
			if (document.visibilityState === 'hidden' && hasUnsaved()) void flush().catch(() => undefined);
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		document.addEventListener('visibilitychange', onHide);
		return () => {
			window.removeEventListener('beforeunload', onBeforeUnload);
			document.removeEventListener('visibilitychange', onHide);
			// Leaving the lecture: send what is still waiting.
			if (hasUnsaved()) void flush().catch(() => undefined);
		};
	}, [flush]);

	return { state, save, flush, retry: () => void flush().catch(() => undefined) };
}
