/** Map insert that evicts the oldest entries once `maxEntries` is exceeded. */
export function setBounded(map, key, value, maxEntries) {
	map.delete(key);
	map.set(key, value);
	while (map.size > maxEntries) {
		const oldest = map.keys().next().value;
		if (oldest === undefined) break;
		map.delete(oldest);
	}
	return value;
}

/**
 * LRU cache bounded by entry count and total bytes (Blob `size` by default).
 * A single value larger than `maxBytes` is not cached.
 */
export function createByteBoundedCache({
	maxEntries,
	maxBytes,
	sizeOf = value => Number(value?.size) || 0,
}) {
	const entries = new Map();
	let bytes = 0;

	const remove = key => {
		if (!entries.has(key)) return false;
		bytes -= sizeOf(entries.get(key));
		entries.delete(key);
		return true;
	};

	return {
		get(key) {
			if (!entries.has(key)) return undefined;
			const value = entries.get(key);
			entries.delete(key);
			entries.set(key, value);
			return value;
		},
		set(key, value) {
			remove(key);
			const size = sizeOf(value);
			if (size > maxBytes) return value;
			entries.set(key, value);
			bytes += size;
			while (entries.size > maxEntries || bytes > maxBytes) {
				const oldest = entries.keys().next().value;
				if (oldest === undefined) break;
				remove(oldest);
			}
			return value;
		},
		delete: remove,
		has: key => entries.has(key),
		get size() {
			return entries.size;
		},
		get bytes() {
			return bytes;
		},
	};
}
