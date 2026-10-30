import test from 'node:test';
import assert from 'node:assert/strict';
import {
	categoriesOf,
	continueCourse,
	courseStatus,
	filterCourses,
	filterLectures,
	libraryStats,
	moveId,
	orderBy,
	progressOf,
	shuffled,
	statsFromLectures,
} from './learn-model.js';

const courses = [
	{ id: 'a', title: 'Network Fundamentals', category: 'Networking', description: 'OSI, TCP/IP', lectures: 10, done: 4, revision: 1, lastStudiedAt: 200 },
	{ id: 'b', title: 'C++ Basics', category: 'Programming', description: '', lectures: 5, done: 5, revision: 0, lastStudiedAt: 300 },
	{ id: 'c', title: 'Linux', category: 'networking', description: 'shell', lectures: 0, done: 0, revision: 0, pinned: true },
	{ id: 'd', title: 'Algorithms', category: '', description: '', lectures: 3, done: 0, revision: 2 },
];

test('progressOf is the share of finished lectures, 0 for an empty course', () => {
	assert.equal(progressOf(courses[0]), 40);
	assert.equal(progressOf(courses[1]), 100);
	assert.equal(progressOf(courses[2]), 0);
	assert.equal(progressOf({ lectures: 3, done: 7 }), 100);
});

test('courseStatus separates empty, not started, in progress and completed', () => {
	assert.deepEqual(courses.map(courseStatus), ['progress', 'done', 'empty', 'new']);
});

test('categoriesOf lists each category once, ignoring case and blanks', () => {
	assert.deepEqual(categoriesOf(courses), ['Networking', 'Programming']);
});

test('filterCourses filters by text, category and status, pinned first', () => {
	assert.deepEqual(filterCourses(courses).map(c => c.id), ['c', 'a', 'b', 'd']);
	assert.deepEqual(filterCourses(courses, { query: 'tcp' }).map(c => c.id), ['a']);
	assert.deepEqual(filterCourses(courses, { category: 'NETWORKING' }).map(c => c.id), ['c', 'a']);
	assert.deepEqual(filterCourses(courses, { status: 'done' }).map(c => c.id), ['b']);
	// "Not started" includes courses that have no lectures yet.
	assert.deepEqual(filterCourses(courses, { status: 'new' }).map(c => c.id), ['c', 'd']);
	assert.deepEqual(filterCourses(courses, { status: 'progress' }).map(c => c.id), ['a']);
});

test('libraryStats sums the library', () => {
	assert.deepEqual(libraryStats(courses), { courses: 4, completed: 1, lectures: 18, done: 9, revision: 3, progress: 50 });
	assert.equal(libraryStats([]).progress, 0);
});

test('continueCourse prefers the latest course that still has lectures left', () => {
	assert.equal(continueCourse(courses).id, 'a');
	assert.equal(continueCourse([courses[1]]).id, 'b');
	assert.equal(continueCourse([courses[3]]), null);
});

test('lecture filters and stats', () => {
	const lectures = [
		{ id: '1', done: true, needsRevision: false },
		{ id: '2', done: false, needsRevision: true },
		{ id: '3', done: false, needsRevision: false },
	];
	assert.deepEqual(filterLectures(lectures, 'todo').map(l => l.id), ['2', '3']);
	assert.deepEqual(filterLectures(lectures, 'done').map(l => l.id), ['1']);
	assert.deepEqual(filterLectures(lectures, 'revision').map(l => l.id), ['2']);
	assert.equal(filterLectures(lectures, 'all').length, 3);
	assert.deepEqual(statsFromLectures(lectures), { lectures: 3, done: 1, revision: 1 });
});

test('moveId and orderBy reorder without losing items', () => {
	assert.deepEqual(moveId(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
	assert.equal(moveId(['a', 'b'], 'a', -1), null);
	assert.deepEqual(orderBy([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ['c', 'a']).map(x => x.id), ['c', 'a', 'b']);
});

test('shuffled keeps every card and leaves the original alone', () => {
	const cards = [1, 2, 3, 4, 5];
	const out = shuffled(cards, () => 0);
	assert.deepEqual([...out].sort(), cards);
	assert.deepEqual(cards, [1, 2, 3, 4, 5]);
});
