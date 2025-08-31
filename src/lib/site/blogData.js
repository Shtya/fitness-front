

export const POSTS = [
{
slug: 'hypertrophy-vs-strength',
title: 'Hypertrophy vs Strength: Which Should You Train First?',
excerpt: 'Understand the tradeoffs and how to periodize your training for both muscle and performance.',
cover: '/images/blog/hyp-vs-strength.jpg',
date: '2025-07-12',
readMins: 8,
author: { name: 'Ahmed Khaled', role: 'Head Coach' },
category: 'Training',
tags: ['programming', 'periodization', 'strength'],
content: [
{ type: 'p', text: 'Both hypertrophy and strength can coexist in a smart plan. The key is sequencing and managing fatigue.' },
{ type: 'h2', text: 'Start with a goal' },
{ type: 'p', text: 'If you care about muscle gain, spend more weeks in higher volumes (6–12 reps). For strength, prioritize low‑rep practice with adequate rest.' },
{ type: 'h2', text: 'Block periodization' },
{ type: 'p', text: 'Alternate 6–8 week blocks (hypertrophy → strength → power). Keep technique work year‑round.' },
{ type: 'quote', text: 'Technique before load. Consistency beats novelty.' },
{ type: 'ul', items: ['Track weekly volume', 'Use RPE/RIR to auto‑regulate', 'Deload every 4–6 weeks'] },
],
},
{
slug: 'protein-guide-egypt',
title: 'The Practical Protein Guide (Egypt Edition)',
excerpt: 'Affordable options, local picks, and quick meals to hit your macros without stress.',
cover: '/images/blog/protein-guide.jpg',
date: '2025-06-05',
readMins: 7,
author: { name: 'Sara Mostafa', role: 'Nutrition Coach' },
category: 'Nutrition',
tags: ['protein', 'meal-planning', 'grocery'],
content: [
{ type: 'p', text: 'Protein doesn’t have to be expensive. Here are local options and simple combos that work.' },
{ type: 'h2', text: 'Budget picks' },
{ type: 'ul', items: ['Eggs', 'Fava beans (ful)', 'Canned tuna', 'Frozen chicken'] },
{ type: 'h2', text: 'Protein timing' },
{ type: 'p', text: 'Aim for 3–5 servings per day, each 25–40g. Spread them across meals.' },
],
},
{
slug: 'beginner-running-checklist',
title: 'Beginner Running Checklist',
excerpt: 'From shoes to pacing: get started without injuries and keep it enjoyable.',
cover: '/images/blog/running-checklist.jpg',
date: '2025-05-01',
readMins: 5,
author: { name: 'Omar El‑Sayed', role: 'Conditioning Coach' },
category: 'Guides',
tags: ['running', 'injury‑prevention', 'cardio'],
content: [
{ type: 'p', text: 'Run‑walk intervals build capacity safely. Start with 1:2 minute run:walk for 20–30 minutes.' },
{ type: 'h2', text: 'Checklist' },
{ type: 'ul', items: ['Comfortable shoes', 'Easy pace', 'Warm‑up & cool‑down', 'Two rest days/week'] },
],
},
];


export const CATEGORIES = ['All', 'Training', 'Nutrition', 'Guides'];
export const TAGS = ['programming', 'periodization', 'strength', 'protein', 'meal-planning', 'grocery', 'running', 'injury‑prevention', 'cardio'];


export function getPost(slug){
return POSTS.find(p => p.slug === slug);
}


export function getRelated(slug){
const cur = getPost(slug); if (!cur) return [];
const tset = new Set(cur.tags);
return POSTS.filter(p => p.slug !== slug && p.tags.some(t=> tset.has(t))).slice(0,3);
}