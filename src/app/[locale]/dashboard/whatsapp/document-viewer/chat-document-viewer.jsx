'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import mammoth from 'mammoth';
import { cn } from '@/lib/utils';
import { MarkdownContent } from './markdown-content';
import { detectPreviewKind, isOleBuffer, isZipBuffer } from './mime';
import { parseWorkbookSheets } from './excel-preview';
import './chat-document-viewer.css';

const DOCX_VIEWER_STYLE_OVERRIDES = `
.docx-preview-host .docx-wrapper {
  background: #e8eaed !important;
  padding: 32px clamp(16px, 4vw, 48px) 48px !important;
  display: flex !important;
  flex-flow: column !important;
  align-items: center !important;
  min-height: 100%;
  width: 100%;
  box-sizing: border-box;
}
.docx-preview-host .docx-wrapper > section.docx {
  background: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08) !important;
  margin: 0 auto 28px !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  flex-shrink: 0;
  overflow: hidden !important;
  position: relative;
  max-width: min(100%, 816px);
  width: 100%;
}
.docx-preview-host .docx-wrapper > section.docx:last-child {
  margin-bottom: 20px !important;
}
`;

const LABELS = {
	en: {
		untitled: 'Untitled file',
		download: 'Download',
		close: 'Close',
		loadError: 'Could not load this file.',
		parseError: 'Could not preview this document.',
		emptyDoc: 'This document is empty.',
		legacyDocHint: 'Legacy .doc files cannot be previewed here. Download the file to open it.',
		simplifiedPreviewHint: 'Simplified preview — layout may differ from Word.',
		zipHint: 'ZIP archives cannot be previewed. Download the file instead.',
		unsupportedHint: 'Preview is not available for this file type. You can still download it.',
		truncatedRows: 'Showing a truncated preview of this sheet.',
		kinds: {
			pdf: 'PDF',
			docx: 'Word',
			xlsx: 'Spreadsheet',
			markdown: 'Markdown',
			text: 'Text',
			image: 'Image',
			zip: 'ZIP',
			unsupported: 'File',
		},
	},
	ar: {
		untitled: 'ملف بدون اسم',
		download: 'تنزيل',
		close: 'إغلاق',
		loadError: 'تعذر تحميل هذا الملف.',
		parseError: 'تعذر عرض هذا المستند.',
		emptyDoc: 'هذا المستند فارغ.',
		legacyDocHint: 'ملفات .doc القديمة لا تُعرض هنا. نزّل الملف لفتحه.',
		simplifiedPreviewHint: 'معاينة مبسطة — الشكل قد يختلف عن Word.',
		zipHint: 'ملفات ZIP لا تُعرض. نزّل الملف بدلًا من ذلك.',
		unsupportedHint: 'المعاينة غير متاحة لهذا النوع. يمكنك تنزيله.',
		truncatedRows: 'عرض جزء فقط من الجدول.',
		kinds: {
			pdf: 'PDF',
			docx: 'وورد',
			xlsx: 'جدول',
			markdown: 'Markdown',
			text: 'نص',
			image: 'صورة',
			zip: 'ZIP',
			unsupported: 'ملف',
		},
	},
};

function appendDocxViewerOverrides(styleContainer) {
	if (!styleContainer) return;
	styleContainer.querySelector("[data-docx-viewer='overrides']")?.remove();
	const style = document.createElement('style');
	style.setAttribute('data-docx-viewer', 'overrides');
	style.textContent = DOCX_VIEWER_STYLE_OVERRIDES;
	styleContainer.appendChild(style);
}

function useObjectUrl(blob) {
	const [objectUrl, setObjectUrl] = useState('');
	useEffect(() => {
		if (!blob) {
			setObjectUrl('');
			return undefined;
		}
		const url = URL.createObjectURL(blob);
		setObjectUrl(url);
		return () => URL.revokeObjectURL(url);
	}, [blob]);
	return objectUrl;
}

function asTypedBlob(blob, mimeType) {
	if (!blob) return null;
	const type = String(blob.type || '').toLowerCase();
	const wanted = String(mimeType || '').toLowerCase();
	if (!wanted || type === wanted) return blob;
	return blob.slice(0, blob.size, mimeType);
}

async function blobStartsWithPdf(blob) {
	if (!blob || blob.size < 5) return false;
	const head = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
	// Allow leading whitespace before %PDF
	const text = String.fromCharCode(...head);
	if (text.startsWith('%PDF')) return true;
	const wider = new Uint8Array(await blob.slice(0, 1024).arrayBuffer());
	const probe = String.fromCharCode(...wider);
	return probe.includes('%PDF');
}

async function loadArrayBuffer(blob) {
	if (!blob) throw new Error('missing blob');
	return blob.arrayBuffer();
}

async function loadText(blob) {
	if (!blob) throw new Error('missing blob');
	return blob.text();
}

async function convertDocxWithMammoth(buffer) {
	const options = {
		includeDefaultStyleMap: true,
		styleMap: [
			"p[style-name='Heading 1'] => h1:fresh",
			"p[style-name='Heading 2'] => h2:fresh",
			"r[style-name='Strong'] => strong",
		],
	};
	try {
		return await mammoth.convertToHtml(
			{ arrayBuffer: buffer },
			{
				...options,
				convertImage: mammoth.images.imgElement(image =>
					image.read('base64').then(imageBuffer => ({
						src: `data:${image.contentType};base64,${imageBuffer}`,
					})),
				),
			},
		);
	} catch {
		return mammoth.convertToHtml({ arrayBuffer: buffer }, options);
	}
}

function Loading() {
	return (
		<div className="flex h-[50vh] items-center justify-center text-slate-400">
			<Loader2 className="h-6 w-6 animate-spin" />
		</div>
	);
}

function Unsupported({ message }) {
	return (
		<div className="flex h-[50vh] items-center justify-center px-6 text-center text-sm text-slate-500">
			{message}
		</div>
	);
}

function PdfPreview({ blob, name, t }) {
	const [pdfBlob] = useState(() => asTypedBlob(blob, 'application/pdf'));
	const objectUrl = useObjectUrl(pdfBlob);
	const [status, setStatus] = useState('loading');

	useEffect(() => {
		let cancelled = false;
		setStatus('loading');
		if (!pdfBlob) {
			setStatus('error');
			return undefined;
		}
		blobStartsWithPdf(pdfBlob)
			.then(ok => {
				if (!cancelled) setStatus(ok ? 'ready' : 'error');
			})
			.catch(() => {
				if (!cancelled) setStatus('error');
			});
		return () => {
			cancelled = true;
		};
	}, [pdfBlob]);

	if (status === 'loading' || !objectUrl) return <Loading />;
	if (status === 'error') {
		return (
			<div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-3 bg-[#f8fafc] px-6 text-center text-sm text-slate-500">
				<p>{t.loadError}</p>
				{objectUrl ? (
					<a
						href={objectUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
					>
						{t.download}
					</a>
				) : null}
			</div>
		);
	}

	return (
		<div className="wa-pdf-preview">
			<embed
				title={name}
				src={objectUrl}
				type="application/pdf"
				className="wa-pdf-preview-iframe"
			/>
		</div>
	);
}

function ImagePreview({ blob, name, t }) {
	const objectUrl = useObjectUrl(blob);
	if (!objectUrl) return <Loading />;
	return (
		<div className="flex h-full min-h-full items-center justify-center bg-[#f4f4f5] p-6">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img
				src={objectUrl}
				alt={name}
				className="max-h-[calc(100dvh-5.5rem)] max-w-full rounded-sm border border-slate-200 bg-white object-contain shadow-sm"
				onError={event => {
					event.currentTarget.replaceWith(
						Object.assign(document.createElement('div'), {
							className:
								'flex h-[50vh] items-center justify-center px-6 text-center text-sm text-slate-500',
							textContent: t.loadError,
						}),
					);
				}}
			/>
		</div>
	);
}

function DocxPreview({ blob, t }) {
	const containerRef = useRef(null);
	const styleContainerRef = useRef(null);
	const [error, setError] = useState('');
	const [mode, setMode] = useState('loading');

	useEffect(() => {
		let cancelled = false;

		async function showHtml(html) {
			const container = containerRef.current;
			const styleContainer = styleContainerRef.current;
			if (!container || !styleContainer || cancelled) return false;
			styleContainer.innerHTML = '';
			container.innerHTML = html || `<p>${t.emptyDoc}</p>`;
			setMode('mammoth');
			setError('');
			return true;
		}

		async function showDocxRender(buffer) {
			const container = containerRef.current;
			const styleContainer = styleContainerRef.current;
			if (!container || !styleContainer || cancelled) return false;
			const docBlob = blob instanceof Blob ? blob : new Blob([buffer]);
			const { renderAsync } = await import('docx-preview');
			container.innerHTML = '';
			styleContainer.innerHTML = '';
			await renderAsync(docBlob, container, styleContainer, {
				className: 'docx',
				inWrapper: true,
				ignoreWidth: false,
				ignoreHeight: false,
				ignoreFonts: false,
				renderHeaders: true,
				renderFooters: true,
				renderFootnotes: true,
				renderEndnotes: true,
				breakPages: true,
				ignoreLastRenderedPageBreak: false,
				useBase64URL: true,
				experimental: false,
			});
			appendDocxViewerOverrides(styleContainer);
			if (cancelled) return false;
			setMode('docx');
			setError('');
			return true;
		}

		async function run() {
			setError('');
			setMode('loading');
			if (!blob) {
				setError(t.loadError);
				setMode('error');
				return;
			}
			try {
				const buffer = await loadArrayBuffer(blob);
				if (cancelled) return;
				const bytes = new Uint8Array(buffer);
				const isZip = isZipBuffer(bytes);
				const isOle = isOleBuffer(bytes);

				if (isOle && !isZip) {
					if (!cancelled) {
						setError(t.legacyDocHint);
						setMode('error');
					}
					return;
				}

				if (!isZip) {
					const text = new TextDecoder('utf-8').decode(bytes).trim();
					const container = containerRef.current;
					if (text && container) {
						container.innerHTML = `<pre class="whitespace-pre-wrap p-6 text-[13px]">${text.replace(/</g, '&lt;')}</pre>`;
						setMode('plain');
						return;
					}
					setError(t.emptyDoc);
					setMode('error');
					return;
				}

				try {
					if (await showDocxRender(buffer)) return;
				} catch {
					/* fallback */
				}

				try {
					const result = await convertDocxWithMammoth(buffer);
					if (await showHtml(result.value)) return;
				} catch {
					/* fall through */
				}

				if (!cancelled) {
					setError(t.parseError);
					setMode('error');
				}
			} catch {
				if (!cancelled) {
					setError(t.loadError);
					setMode('error');
				}
			}
		}

		const raf = requestAnimationFrame(() => {
			run();
		});
		return () => {
			cancelled = true;
			cancelAnimationFrame(raf);
		};
	}, [blob, t]);

	return (
		<div className="relative min-h-full w-full">
			{mode === 'loading' ? (
				<div className="absolute inset-0 z-10 flex min-h-[50vh] items-center justify-center bg-[#e8eaed]">
					<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
				</div>
			) : null}
			{mode === 'error' && error ? (
				<div className="absolute inset-0 z-10 flex min-h-[50vh] items-center justify-center bg-[#e8eaed] px-6 text-center text-sm text-slate-500">
					{error}
				</div>
			) : null}
			{mode === 'mammoth' ? (
				<div className="sticky top-0 z-[5] border-b border-amber-200/80 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
					{t.simplifiedPreviewHint}
				</div>
			) : null}
			<div ref={styleContainerRef} className="docx-preview-styles" aria-hidden="true" />
			<div
				ref={containerRef}
				className={cn(
					'docx-preview-host w-full',
					mode === 'mammoth' &&
						'min-h-[50vh] bg-white p-6 prose prose-sm max-w-none [&_img]:max-w-full [&_table]:w-full [&_td]:border [&_td]:p-2',
				)}
			/>
		</div>
	);
}

function XlsxPreview({ blob, t }) {
	const [sheets, setSheets] = useState(null);
	const [active, setActive] = useState(0);
	const [error, setError] = useState('');

	useEffect(() => {
		let cancelled = false;
		loadArrayBuffer(blob)
			.then(buffer => {
				const parsed = parseWorkbookSheets(buffer);
				if (!cancelled) setSheets(parsed);
			})
			.catch(() => {
				if (!cancelled) setError(t.loadError);
			});
		return () => {
			cancelled = true;
		};
	}, [blob, t]);

	if (error) return <Unsupported message={error} />;
	if (sheets == null) return <Loading />;
	if (!sheets.length) return <Unsupported message={t.emptyDoc} />;

	const current = sheets[active] || sheets[0];
	const grid = current.grid;

	return (
		<div className="flex h-full min-h-full flex-col bg-[#f3f3f3]">
			{sheets.length > 1 ? (
				<div className="flex gap-0.5 overflow-x-auto border-b border-[#c8c8c8] bg-[#e6e6e6] px-1 py-1">
					{sheets.map((sheet, index) => (
						<button
							key={sheet.name}
							type="button"
							onClick={() => setActive(index)}
							className={cn(
								'shrink-0 rounded-t px-4 py-1.5 text-xs font-medium transition',
								index === active
									? 'bg-white text-slate-900 shadow-sm'
									: 'text-slate-500 hover:bg-white/70 hover:text-slate-900',
							)}
						>
							{sheet.name}
						</button>
					))}
				</div>
			) : (
				<div className="border-b border-[#c8c8c8] bg-[#e6e6e6] px-3 py-1.5 text-xs font-medium text-slate-800">
					{current.name}
				</div>
			)}

			<div className="flex-1 overflow-auto p-3">
				<div className="inline-block min-w-full overflow-hidden rounded-sm border border-[#c8c8c8] bg-white shadow-sm">
					<table className="xlsx-preview-table border-collapse text-[12px]">
						<thead>
							<tr>
								<th className="xlsx-preview-corner" />
								{grid.columns.map(column => (
									<th
										key={column.index}
										className="xlsx-preview-col-head"
										style={column.width ? { minWidth: column.width, width: column.width } : undefined}
									>
										{column.label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{grid.rows.map(row => (
								<tr key={row.index}>
									<th className="xlsx-preview-row-head">{row.number}</th>
									{row.cells.map(cell => (
										<td
											key={cell.key}
											rowSpan={cell.rowSpan}
											colSpan={cell.colSpan}
											className={cn(
												'xlsx-preview-cell',
												cell.isHeader && 'xlsx-preview-cell-header',
												cell.isNumber && 'xlsx-preview-cell-number',
												cell.bold && 'font-semibold',
											)}
										>
											{cell.value || '\u00a0'}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{grid.truncatedRows || grid.truncatedCols ? (
					<p className="mt-2 px-1 text-xs text-slate-500">{t.truncatedRows}</p>
				) : null}
			</div>
		</div>
	);
}

function MarkdownPreview({ blob, t }) {
	const [text, setText] = useState(null);
	const [error, setError] = useState('');
	useEffect(() => {
		let cancelled = false;
		loadText(blob)
			.then(value => {
				if (!cancelled) setText(value);
			})
			.catch(() => {
				if (!cancelled) setError(t.loadError);
			});
		return () => {
			cancelled = true;
		};
	}, [blob, t]);
	if (error) return <Unsupported message={error} />;
	if (text == null) return <Loading />;
	return (
		<div className="min-h-[50vh] overflow-auto bg-white p-6 sm:p-8">
			<MarkdownContent content={text || t.emptyDoc} />
		</div>
	);
}

function TextPreview({ blob, t }) {
	const [text, setText] = useState(null);
	const [error, setError] = useState('');
	useEffect(() => {
		let cancelled = false;
		loadText(blob)
			.then(value => {
				if (!cancelled) setText(value);
			})
			.catch(() => {
				if (!cancelled) setError(t.loadError);
			});
		return () => {
			cancelled = true;
		};
	}, [blob, t]);
	if (error) return <Unsupported message={error} />;
	if (text == null) return <Loading />;
	return (
		<pre className="min-h-[50vh] whitespace-pre-wrap break-words p-5 font-mono text-[13px] leading-relaxed text-slate-800">
			{text || t.emptyDoc}
		</pre>
	);
}

function PreviewBody({ kind, name, blob, t }) {
	if (!blob) return <Unsupported message={t.loadError} />;
	if (kind === 'image') return <ImagePreview blob={blob} name={name} t={t} />;
	if (kind === 'pdf') return <PdfPreview blob={blob} name={name} t={t} />;
	if (kind === 'docx') return <DocxPreview blob={blob} t={t} />;
	if (kind === 'xlsx') return <XlsxPreview blob={blob} t={t} />;
	if (kind === 'markdown') return <MarkdownPreview blob={blob} t={t} />;
	if (kind === 'text') return <TextPreview blob={blob} t={t} />;
	if (kind === 'zip') return <Unsupported message={t.zipHint} />;
	return <Unsupported message={t.unsupportedHint} />;
}

/**
 * Fullscreen document preview for WhatsApp chat attachments.
 * file: { name, mimeType?, blob }
 */
export function ChatDocumentViewer({ open, onClose, file, locale = 'en' }) {
	const t = LABELS[locale] || LABELS.en;
	const name = file?.name || file?.fileName || t.untitled;
	const mimeType = file?.mimeType;
	const kind = file ? detectPreviewKind(mimeType, name) : 'unsupported';
	const blob = file?.blob || null;
	const previewKey = `${kind}:${name}:${blob?.size || 0}:${blob?.type || ''}`;

	useEffect(() => {
		if (!open) return undefined;
		const onKeyDown = event => {
			if (event.key === 'Escape') onClose?.();
		};
		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		window.addEventListener('keydown', onKeyDown);
		return () => {
			document.body.style.overflow = previousOverflow;
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [open, onClose]);

	if (!open || !file) return null;

	const download = () => {
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		anchor.href = url;
		anchor.download = name || 'attachment';
		anchor.click();
		window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
	};

	return (
		<>
			<button
				type="button"
				className="wa-doc-viewer-backdrop"
				aria-label={t.close}
				onClick={onClose}
			/>
			<div className="wa-doc-viewer-panel" role="dialog" aria-modal="true" aria-label={name}>
				<header className="wa-doc-viewer-header">
					<div className="min-w-0 flex-1">
						<p className="truncate text-[15px] font-bold tracking-tight text-slate-900" title={name}>
							{name}
						</p>
						<p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
							{t.kinds[kind] || t.kinds.unsupported}
						</p>
					</div>
					<button
						type="button"
						onClick={download}
						disabled={!blob}
						className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
					>
						<Download size={14} />
						{t.download}
					</button>
					<button
						type="button"
						onClick={onClose}
						className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100"
						aria-label={t.close}
					>
						<X size={18} />
					</button>
				</header>
				<div
					className={cn(
						'wa-doc-viewer-body',
						kind === 'docx' && 'docx-bg',
						kind === 'pdf' && 'is-pdf',
						kind === 'xlsx' && 'is-xlsx',
					)}
				>
					<PreviewBody key={previewKey} kind={kind} name={name} blob={blob} t={t} />
				</div>
			</div>
		</>
	);
}
