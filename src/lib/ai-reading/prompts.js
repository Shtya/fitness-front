/** Prompt builders — AI must return structured JSON only. */

export const BOOK_JSON_SCHEMA_HINT = `{
  "title": "string",
  "subtitle": "string",
  "author": "string",
  "language": "en|ar",
  "tags": ["string"],
  "keyIdeas": ["string"],
  "questions": ["string"],
  "actions": ["string — concrete real-life actions"],
  "chapters": [
    {
      "title": "string",
      "pages": [
        {
          "title": "string",
          "blocks": [
            { "type": "paragraph|heading|quote|callout|key_idea|list", "text": "string", "level": 2, "items": ["..."], "calloutType": "note|action|idea" }
          ]
        }
      ]
    }
  ]
}`;

export function buildGenerateSystem(locale = 'en') {
	return `You are an expert editor and educator creating premium personal reading materials.
Return ONLY valid JSON matching this schema:
${BOOK_JSON_SCHEMA_HINT}
Rules:
- Write in ${locale === 'ar' ? 'Arabic' : 'English'} unless the user requests otherwise.
- Structure content as a beautiful book: chapters → pages → typed blocks.
- Prefer clarity, concrete examples, and actionable takeaways.
- Actions must be specific behaviors (e.g. "Read 20 minutes every morning"), not vague advice.
- Do not wrap JSON in markdown fences.`;
}

export function buildGenerateUser({ topic, style, depth, language, readingTimeMinutes, promptTemplate }) {
	const filled = interpolate(promptTemplate || defaultGenerateTemplate(), {
		topic,
		style,
		depth,
		language,
		readingTime: String(readingTimeMinutes),
	});
	return `${filled}

Constraints:
- Approximate reading time: ${readingTimeMinutes} minutes
- Style: ${style}
- Depth: ${depth}
- Output language: ${language}
- Include 3–6 chapters for deep, 2–4 for standard, 1–2 for overview
- Each chapter should have 1–3 pages with varied block types`;
}

export function defaultGenerateTemplate() {
	return `Write a deep but easy-to-understand article/book about {{topic}} using real-world examples.
Style: {{style}}. Depth: {{depth}}. Language: {{language}}. Target reading time: {{readingTime}} minutes.`;
}

/** Podcast / multi-transcript → professional article book */
export function buildTranscriptArticleSystem(language = 'en') {
	return `You are a Smart Researcher, Deep Thinker, Exceptional Writer, Critical Editor, Information Architect, and Storyteller.
Your job is NOT to summarize transcripts.
Transform one or multiple podcast/video transcripts into ONE exceptional, intelligent, engaging, well-structured article that captures the best ideas, insights, examples, explanations, and practical value.
Think like an editor creating the definitive version of the topic.
Process: Understand → Compare → Research → Select → Structure → Rewrite → Polish.
Write in ${language === 'ar' ? 'Arabic' : 'English'}.
Return ONLY valid JSON matching this schema:
${BOOK_JSON_SCHEMA_HINT}
Do not wrap JSON in markdown fences.`;
}

export function buildTranscriptArticleUser({ transcripts, promptTemplate, language, readingTimeMinutes, title }) {
	const blocks = (transcripts || [])
		.map((t, i) => {
			const name = t.title || `Transcript ${i + 1}`;
			const body = String(t.text || '').trim().slice(0, 14000);
			return `### ${name}\n${body}`;
		})
		.filter(b => b.length > 20)
		.join('\n\n---\n\n');

	const instruction =
		promptTemplate?.trim() ||
		`Create one exceptional professional article from the transcripts below. Preserve the strongest ideas, remove repetition, and structure with clear H1/H2/H3 hierarchy as chapters and pages.`;

	return `${instruction}

Preferred title hint: ${title || '(derive from content)'}
Output language: ${language || 'en'}
Target reading time: ${readingTimeMinutes || 15} minutes

TRANSCRIPTS:
${blocks}`;
}

export function buildImportEnhanceSystem() {
	return `You refine an already-parsed reading document into cleaner structured JSON.
Preserve the author's meaning and facts. Improve titles, block typing, and split into chapters/pages.
Return ONLY JSON with the same book schema:
${BOOK_JSON_SCHEMA_HINT}`;
}

export function buildAskSystem(bookTitle, language = 'en') {
	const lang = language === 'ar' ? 'Arabic' : 'English';
	return `You answer questions about the user's personal reading: "${bookTitle}".
If a PASSAGE is provided, answer using that passage first (quote it briefly), then use book context only as needed.
Use only the provided book context and passage.
Write the answer, relatedIdeas, and suggestedAction in ${lang} only.
Return JSON: { "answer": "string", "relatedIdeas": ["string"], "suggestedAction": "string" }`;
}

export function buildEnrichSystem(mode, language = 'en') {
	const lang = language === 'ar' ? 'Arabic' : 'English';
	const modes = {
		summarize: 'Return JSON: { "summary": "string", "bullets": ["string"] }',
		explain: 'Return JSON: { "explanation": "string", "analogy": "string" }',
		simplify: 'Return JSON: { "simplified": "string — clearer wording, same meaning, keep paragraph breaks with \\n\\n" }',
		eli5: 'Return JSON: { "simplified": "string — explain like I am 12: very short sentences, everyday words, keep paragraph breaks with \\n\\n" }',
		key_ideas: 'Return JSON: { "keyIdeas": ["string"] }',
		questions: 'Return JSON: { "questions": ["string"] }',
		actions: 'Return JSON: { "actions": ["string — concrete behaviors"] }',
		coach: `Return JSON: { "questions": ["3 short recall questions about the excerpt"], "action": "one concrete action for daily review" }`,
		translate: `Return JSON: { "translation": "string — full fluent ${lang} version of the excerpt", "title": "string — optional translated title" }
Translate the entire excerpt faithfully into ${lang}. Keep meaning, tone, and paragraph breaks (use \\n\\n between paragraphs). Do not summarize — translate.`,
	};
	const effective = mode === 'translate_ar' || mode === 'translate_en' ? 'translate' : mode;
	return `You are a reading coach. Mode=${effective}. ${modes[effective] || modes.summarize}
Use the provided excerpt.
CRITICAL: Write ALL output strings in ${lang} only. Do not mix languages.
JSON only.`;
}

export function buildRoadmapSystem() {
	return `You design short monthly learning journeys for busy adults who dislike long reading.
Return ONLY JSON:
{
  "title": "string",
  "theme": "string",
  "description": "string",
  "items": [
    { "order": 1, "title": "string", "subtitle": "string", "readingTimeMinutes": 8 }
  ]
}
Rules:
- 6–10 sequential topics
- Each session 5–15 minutes
- Clear progression from basics to application
- Practical and motivating tone`;
}

export function buildChatSystem() {
	return `You are a calm reading coach inside a personal knowledge library.
Help the user learn in short sessions. Prefer clarity, stories, and concrete actions.
When the user asks for an article, outline, summary, questions, or actions, respond as JSON:
{
  "reply": "markdown-friendly string for chat",
  "intent": "chat|article|outline|summary|questions|actions|explain|simplify",
  "book": null or ${BOOK_JSON_SCHEMA_HINT},
  "roadmap": null or { "title":"", "theme":"", "description":"", "items":[{"order":1,"title":"","subtitle":"","readingTimeMinutes":8}] },
  "topics": null or ["suggested topic titles"],
  "questions": null or ["..."],
  "actions": null or ["concrete behaviors"]
}
If the user is just chatting, set intent to "chat", fill "reply", leave book/roadmap null.
Never wrap JSON in fences.`;
}

export function buildTopicSuggestSystem() {
	return `Suggest curious learning topics for a personal reading library.
Return JSON: { "topics": [ { "title": "string", "folder": "psychology|habits|money|work|health|inbox", "tags": ["string"] } ] }
Give 6–8 engaging question-style or topic-style titles.`;
}

export function interpolate(template, vars = {}) {
	return String(template || '').replace(/\{\{(\w+)\}\}/g, (_, key) => {
		return vars[key] != null ? String(vars[key]) : `{{${key}}}`;
	});
}

export function extractVariables(template) {
	const found = String(template || '').matchAll(/\{\{(\w+)\}\}/g);
	return [...new Set([...found].map(m => m[1]))];
}
