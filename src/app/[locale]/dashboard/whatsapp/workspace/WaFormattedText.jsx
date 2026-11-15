'use client';

import { resolveWhatsAppMentionLabel, looksLikeMarkdown, parseWhatsAppBold, messageTextSegments } from '../whatsapp-utils';
import MarkdownMessage from '../../ai-free/MarkdownMessage';

export function WhatsAppFormattedText({
	text,
	mentionDirectory = null,
	mentionLabels = null,
	forceMarkdown = false,
}) {
	if (forceMarkdown || looksLikeMarkdown(text)) {
		return <MarkdownMessage content={text} className="wa-chat-md" />;
	}
	return parseWhatsAppBold(text).flatMap((part, partIndex) =>
		messageTextSegments(part.text).map((segment, segmentIndex) => {
			const key = `${partIndex}:${segmentIndex}`;
			const content =
				segment.type === 'link' ? (
					<a
						key={key}
						href={segment.href}
						target="_blank"
						rel="noreferrer"
						className="wa-message-link font-medium text-[#027EB5] underline decoration-[#027EB5]/50 underline-offset-2 hover:decoration-current dark:text-[#53BDEB]"
						onClick={event => event.stopPropagation()}
					>
						{segment.text}
					</a>
				) : segment.type === 'mention' ? (
					// Its own direction (from the name), so "@Ahmed" inside an Arabic line keeps
					// the @ before the name instead of flipping to "Ahmed@".
					<bdi key={key} dir="auto" className="wa-message-mention">
						{resolveWhatsAppMentionLabel(
							segment.text,
							mentionDirectory,
							mentionLabels,
						).replace(/ /g, '\u00A0')}
					</bdi>
				) : segment.type === 'emoji' ? (
					<span key={key} className="wa-message-emoji">
						{segment.text}
					</span>
				) : (
					segment.text
				);
			let node =
				typeof content === 'string' ? (
					<span key={key} className="wa-message-run">
						{content}
					</span>
				) : (
					content
				);
			if (part.code) {
				node = (
					<code key={key} className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.92em] dark:bg-white/10">
						{content}
					</code>
				);
			}
			if (part.bold) {
				node = (
					<strong key={`${key}-b`} className="font-bold">
						{node}
					</strong>
				);
			}
			if (part.italic) {
				node = (
					<em key={`${key}-i`} className="italic">
						{node}
					</em>
				);
			}
			if (part.strike) {
				node = (
					<span key={`${key}-s`} className="line-through">
						{node}
					</span>
				);
			}
			return node;
		}),
	);
}
