import { createPrompt } from './schemas.js';

/** Stable id so we can upsert once and keep it favorite by default. */
export const DEFAULT_MEMORIZE_PROMPT_ID = 'prompt_so7ba_memorize_default';
export const DEFAULT_POLISH_PROMPT_ID = 'prompt_so7ba_polish_default';

export function buildDefaultMemorizePrompt() {
	return createPrompt({
		id: DEFAULT_MEMORIZE_PROMPT_ID,
		title: 'Memorize — clear recall note',
		category: 'custom',
		favorite: true,
		body: `حول المقطع التالي إلى مذكرة حفظ واضحة أقدر أرجع لها بعدين.

القواعد:
- احتفظ بالأفكار اللي بتغيّر طريقة التفكير، والأمثلة، والأرقام، والعلاقات السببية.
- احذف الحشو والتكرار والجمل الفارغة.
- اكتب فقرات قصيرة مرتبة، سهلة القراءة.
- لو فيه أفعال عملية في النص، خلّيها واضحة في الآخر.
- اكتب بنفس لغة المقطع (عربي أو إنجليزي).
- لا تخترع معلومات مش موجودة في النص.

الناتج المطلوب:
1) ملخص متماسك للحفظ
2) نقاط سريعة (bullet points) للأهم`,
	});
}

export function buildDefaultPolishPrompt() {
	return createPrompt({
		id: DEFAULT_POLISH_PROMPT_ID,
		title: 'Polish — audit & strengthen page',
		category: 'custom',
		favorite: true,
		body: `أنت محرر ومدقق قوي. اقرأ الصفحة التالية بتركيز، ثم حسّنها كمحرر محترف — مش تلخيص.

المطلوب (تدقيق + تحسين):
1) احذف الحشو والكلام العشوائي والجمل اللي مالهاش قيمة.
2) اكشف الجمل الضعيفة أو الغامضة وأعد كتابتها أوضح وأقوى.
3) رتّب التدفق المنطقي بين الفقرات.
4) لو فيه فكرة ناقصة أو معلومة مهمة واضحة من السياق وتكمّل المعنى — أضفها باختصار وبدقة (بدون اختراع حقائق خارج الموضوع).
5) حافظ على صوت الكاتب ونبرة النص، ونفس اللغة (عربي أو إنجليزي).
6) لا تختصر لمجرد الاختصار — الهدف جودة أعلى، مش نسخة أقصر بس.

أرجع:
- نسخة محسّنة كاملة جاهزة للاستبدال
- ملاحظات تدقيق قصيرة: إيه اتشال، إيه اتقوّى، إيه اتضاف`,
	});
}
