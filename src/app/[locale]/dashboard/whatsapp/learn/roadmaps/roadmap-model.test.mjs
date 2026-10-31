import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { journeyMonths, courseProgress, levelProgress, nextCourse, precheckRoadmapJson, roadmapProgress, topicKey } from './roadmap-model.js';

const preset = readFileSync(new URL('./presets/cybersecurity-ethical-hacking.json', import.meta.url), 'utf8');
const data = JSON.parse(preset).roadmap;

test('the bundled Cybersecurity roadmap passes the precheck', () => {
	const r = precheckRoadmapJson(preset);
	assert.equal(r.ok, true);
	assert.equal(r.levels, 7);
	assert.equal(r.courses, 22);
	assert.ok(r.topics > 200);
});

test('precheck explains bad input', () => {
	assert.equal(precheckRoadmapJson('{').ok, false);
	assert.match(precheckRoadmapJson('{"roadmap":{"levels":[]}}').error, /title/);
	assert.match(precheckRoadmapJson('{"roadmap":{"title":"x","levels":[]}}').error, /levels/);
});

test('progress adds up from topics to the whole roadmap', () => {
	const ccna = data.levels[0].courses[0];
	const progress = Object.fromEntries(ccna.topics.slice(0, 3).map(t => [topicKey(ccna.id, t), '2026-10-31']));
	assert.deepEqual(courseProgress(ccna, progress), { done: 3, total: 13, percent: 23 });
	assert.equal(levelProgress(data.levels[0], progress).done, 3);
	const all = roadmapProgress(data, progress);
	assert.equal(all.done, 3);
	assert.ok(all.total > 200);
	assert.equal(nextCourse(data, progress).course.id, 'course_01');
});

test('nextCourse moves on once a course is finished', () => {
	const ccna = data.levels[0].courses[0];
	const progress = Object.fromEntries(ccna.topics.map(t => [topicKey(ccna.id, t), 'x']));
	assert.equal(nextCourse(data, progress).course.id, 'course_02');
	assert.equal(levelProgress(data.levels[0], progress).coursesDone, 1);
});

test('journeyMonths reads the length of the trip from the timeline', () => {
	assert.equal(journeyMonths(data.recommended_timeline), 12);
	assert.equal(journeyMonths([{ period: 'الشهر 3' }, { period: 'أشهر 4-6' }]), 6);
	assert.equal(journeyMonths([{ period: 'Week 2' }]), null);
	assert.equal(journeyMonths(undefined), null);
});

test('the bundled topics index is recognised and its new courses are listed', async () => {
	const { precheckTopicsIndex, precheckRoadmapJson: precheck, explainedCount } = await import('./roadmap-model.js');
	const indexText = readFileSync(new URL('./presets/cybersecurity-topics-index.json', import.meta.url), 'utf8');
	const r = precheckTopicsIndex(indexText, data);
	assert.equal(r.ok, true);
	assert.equal(r.courses, 28);
	assert.deepEqual(r.added, ['أساسيات Git وGitHub', 'القانون السيبراني وأخلاقيات المهنة', 'جمع المعلومات مفتوحة المصدر والهندسة الاجتماعية', 'اختبار اختراق الشبكات اللاسلكية (واي فاي)', 'تصعيد الصلاحيات وما بعد الاختراق', 'اختراق البلوتوث والترددات اللاسلكية']);
	assert.ok(r.benefits > 250);
	// pasted as a new roadmap, an index on its own is explained instead of failing on "title"
	assert.equal(precheck(indexText).indexOnly, true);
	// roadmap + index in one file is a valid roadmap
	assert.equal(precheck(JSON.stringify({ ...JSON.parse(preset), ...JSON.parse(indexText) })).ok, true);
	assert.equal(explainedCount({ levels: [{ courses: [{ topics: ['a', 'b'], topic_benefits: { a: 'x', z: 'y' } }] }] }), 1);
	assert.equal(precheckTopicsIndex(preset, data).ok, false);
});
