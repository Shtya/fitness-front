'use client';

/**
 * Shows a search query left-to-right exactly as it is sent.
 * Each quoted phrase / operator is bidi-isolated, so an Arabic name next to a number
 * can't drag the number or the brackets into the right-to-left run.
 */
export default function QueryText({ query, className }) {
	// Operators like intext: / site: are their own token so `intext:` + `"جيمي"` stay in order.
	const tokens = String(query || '').match(/[()]|[a-z]+:(?=")|"[^"]*"|[^\s()"]+/g) || [];
	return (
		<code className={className} dir="ltr">
			{tokens.map((token, index) => {
				const prev = tokens[index - 1];
				const gap = index > 0 && prev !== '(' && token !== ')' && !prev.endsWith(':');
				return (
					<span key={`${index}-${token}`}>
						{gap ? ' ' : ''}
						{token === '(' || token === ')' ? token : <bdi>{token}</bdi>}
					</span>
				);
			})}
		</code>
	);
}
