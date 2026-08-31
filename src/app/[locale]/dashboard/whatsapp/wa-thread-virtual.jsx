'use client';

import { memo } from 'react';

export const WaMeasuredThreadRow = memo(function WaMeasuredThreadRow({
	index,
	start,
	measureElement,
	children,
}) {
	return (
		<div
			data-index={index}
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
