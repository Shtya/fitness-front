'use client';

import { memo } from 'react';

/** Absolute-positioned measuring shell for the thread virtualizer. */
export const WaMeasuredThreadRow = memo(function WaMeasuredThreadRow({
	index,
	start,
	rowKey,
	measureElement,
	children,
}) {
	return (
		<div
			data-index={index}
			data-wa-row-key={rowKey || undefined}
			ref={measureElement}
			className="wa-message-virtual-item"
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: '100%',
				transform: `translateY(${start}px)`,
			}}
		>
			{children}
		</div>
	);
});
