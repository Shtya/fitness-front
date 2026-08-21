'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

export function MarkdownContent({ content, className }) {
	return (
		<div className={cn('wa-doc-markdown', className)}>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{content || ''}</ReactMarkdown>
		</div>
	);
}
