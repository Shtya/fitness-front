/**
 * Client-side extractors for PDF / DOCX → plain text for AI Reading import.
 */

function normalizeExtracted(text) {
	return String(text || '')
		.replace(/\r\n/g, '\n')
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/** Extract text from every page of a PDF File. */
export async function extractPdfText(file) {
	const pdfjs = await import('pdfjs-dist');
	const { getDocument, GlobalWorkerOptions } = pdfjs;

	if (!GlobalWorkerOptions.workerSrc) {
		GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
	}

	const data = new Uint8Array(await file.arrayBuffer());
	const doc = await getDocument({ data, useSystemFonts: true }).promise;
	const parts = [];

	for (let i = 1; i <= doc.numPages; i += 1) {
		const page = await doc.getPage(i);
		const content = await page.getTextContent();
		const line = (content.items || [])
			.map(it => (typeof it?.str === 'string' ? it.str : ''))
			.filter(Boolean)
			.join(' ');
		if (line.trim()) parts.push(line.trim());
	}

	const text = normalizeExtracted(parts.join('\n\n'));
	if (!text || text.length < 40) {
		throw new Error('PDF_EMPTY');
	}
	return { text, pages: doc.numPages };
}

/** Extract raw text from a DOCX File (mammoth). */
export async function extractDocxText(file) {
	const mammoth = await import('mammoth');
	const arrayBuffer = await file.arrayBuffer();
	const result = await mammoth.extractRawText({ arrayBuffer });
	const text = normalizeExtracted(result?.value);
	if (!text || text.length < 40) {
		throw new Error('DOCX_EMPTY');
	}
	return { text };
}

export async function extractBookFile(file) {
	const name = String(file?.name || '').toLowerCase();
	const type = String(file?.type || '').toLowerCase();

	if (name.endsWith('.pdf') || type.includes('pdf')) {
		return { ...(await extractPdfText(file)), kind: 'pdf' };
	}
	if (name.endsWith('.docx') || type.includes('wordprocessingml') || type.includes('docx')) {
		return { ...(await extractDocxText(file)), kind: 'docx' };
	}
	throw new Error('UNSUPPORTED_FILE');
}
