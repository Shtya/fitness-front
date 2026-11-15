'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { Copy, Check, ExternalLink, Loader2, MapPin, Navigation, Utensils, Coffee, Pill, Banknote, Fuel, Maximize2, X } from 'lucide-react';
import api from '@/utils/axios';
import { whatsAppLocationFromMessage, whatsAppLocationHref } from '../whatsapp-utils';

/** 3×3 OpenStreetMap tiles positioned so the exact coordinate sits at the centre. */
function locationTileMosaic(lat, lng, zoom = 16) {
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const n = 2 ** zoom;
	const latRad = (lat * Math.PI) / 180;
	const fx = ((lng + 180) / 360) * n;
	const fy = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
	if (!Number.isFinite(fx) || !Number.isFinite(fy)) return null;
	const tx = Math.floor(fx);
	const ty = Math.floor(fy);
	const tiles = [];
	for (let dy = -1; dy <= 1; dy += 1) {
		for (let dx = -1; dx <= 1; dx += 1) {
			const x = (((tx + dx) % n) + n) % n;
			const y = ty + dy;
			if (y < 0 || y >= n) continue;
			tiles.push({
				key: `${dx}:${dy}`,
				src: `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`,
				left: (dx + 1) * 256,
				top: (dy + 1) * 256,
			});
		}
	}
	// Pixel position of the point inside the 768×768 mosaic.
	return { tiles, pointX: (fx - tx + 1) * 256, pointY: (fy - ty + 1) * 256 };
}

function formatCoordinate(value, positive, negative) {
	const abs = Math.abs(value);
	const degrees = Math.floor(abs);
	const minutesFloat = (abs - degrees) * 60;
	const minutes = Math.floor(minutesFloat);
	const seconds = ((minutesFloat - minutes) * 60).toFixed(1);
	return `${degrees}°${minutes}′${seconds}″ ${value >= 0 ? positive : negative}`;
}

const LOCATION_NEARBY = [
	{ id: 'restaurants', icon: Utensils, en: 'Restaurants', ar: 'مطاعم', query: 'restaurants' },
	{ id: 'cafes', icon: Coffee, en: 'Cafés', ar: 'كافيهات', query: 'cafes' },
	{ id: 'pharmacy', icon: Pill, en: 'Pharmacies', ar: 'صيدليات', query: 'pharmacy' },
	{ id: 'atm', icon: Banknote, en: 'ATMs', ar: 'ماكينات ATM', query: 'atm' },
	{ id: 'fuel', icon: Fuel, en: 'Gas', ar: 'بنزينة', query: 'gas station' },
];

/** In-chat map: live Google Maps (no API key needed for the embed) + place details. */
function WaLocationViewer({ location, title, address, isLive, locale = 'en', onClose }) {
	const ar = String(locale).toLowerCase().startsWith('ar');
	const lat = Number(location.latitude);
	const lng = Number(location.longitude);
	const [satellite, setSatellite] = useState(false);
	const [nearby, setNearby] = useState('');
	const [copied, setCopied] = useState('');
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
	const point = `${lat},${lng}`;
	const nearbyItem = LOCATION_NEARBY.find(item => item.id === nearby);
	const query = nearbyItem ? `${nearbyItem.query} near ${point}` : point;
	const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&ll=${point}&z=${nearbyItem ? 15 : 17}&t=${satellite ? 'k' : 'm'}&hl=${ar ? 'ar' : 'en'}&output=embed`;
	const openHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point)}`;
	const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(point)}`;

	useEffect(() => {
		const onKey = event => {
			if (event.key === 'Escape') onCloseRef.current?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	const copyValue = async (value, key) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(key);
			window.setTimeout(() => setCopied(current => (current === key ? '' : current)), 1400);
		} catch {
			toast.error(ar ? 'تعذر النسخ' : 'Could not copy');
		}
	};

	return createPortal(
		<div className="wa-locv-scrim" role="presentation" onClick={() => onCloseRef.current?.()}>
			<div
				className="wa-locv"
				role="dialog"
				aria-modal="true"
				aria-label={title}
				dir={ar ? 'rtl' : 'ltr'}
				onClick={event => event.stopPropagation()}
			>
				<div className="wa-locv__map">
					<iframe
						key={embedSrc}
						title={title}
						src={embedSrc}
						loading="lazy"
						referrerPolicy="no-referrer-when-downgrade"
						allowFullScreen
					/>
					<div className="wa-locv__map-tools">
						<div className="wa-locv__seg" role="group" aria-label={ar ? 'نوع الخريطة' : 'Map type'}>
							<button type="button" className={!satellite ? 'is-active' : ''} onClick={() => setSatellite(false)}>
								{ar ? 'خريطة' : 'Map'}
							</button>
							<button type="button" className={satellite ? 'is-active' : ''} onClick={() => setSatellite(true)}>
								{ar ? 'قمر صناعي' : 'Satellite'}
							</button>
						</div>
					</div>
				</div>

				<aside className="wa-locv__side">
					<header className="wa-locv__head">
						<span className="wa-locv__head-icon" aria-hidden="true">
							<MapPin size={18} strokeWidth={2.2} />
						</span>
						<div className="min-w-0 flex-1">
							<h2 className="wa-locv__title" dir="auto">
								{title}
							</h2>
							{isLive ? (
								<span className="wa-locv__live">
									<span aria-hidden="true" />
									{ar ? 'موقع مباشر' : 'Live location'}
								</span>
							) : null}
						</div>
						<button type="button" className="wa-locv__close" onClick={() => onCloseRef.current?.()} aria-label={ar ? 'إغلاق' : 'Close'}>
							<X size={18} strokeWidth={2.2} />
						</button>
					</header>

					<div className="wa-locv__body wa-ui-scroll nice-scroll">
						{address ? (
							<p className="wa-locv__address" dir="auto">
								{address}
							</p>
						) : null}

						<div className="wa-locv__actions">
							<a className="wa-locv__primary" href={directionsHref} target="_blank" rel="noopener noreferrer">
								<Navigation size={16} strokeWidth={2.2} />
								{ar ? 'الاتجاهات' : 'Directions'}
							</a>
							<a className="wa-locv__secondary" href={openHref} target="_blank" rel="noopener noreferrer">
								<ExternalLink size={15} strokeWidth={2.2} />
								{ar ? 'افتح في Google Maps' : 'Open in Google Maps'}
							</a>
						</div>

						<section className="wa-locv__block">
							<p className="wa-locv__label">{ar ? 'الإحداثيات' : 'Coordinates'}</p>
							<button type="button" className="wa-locv__coord" onClick={() => void copyValue(coords, 'dec')}>
								<span dir="ltr">{coords}</span>
								{copied === 'dec' ? <Check size={14} strokeWidth={2.6} /> : <Copy size={14} strokeWidth={2.2} />}
							</button>
							<p className="wa-locv__dms" dir="ltr">
								{formatCoordinate(lat, 'N', 'S')} · {formatCoordinate(lng, 'E', 'W')}
							</p>
							<button type="button" className="wa-locv__link" onClick={() => void copyValue(openHref, 'link')}>
								{copied === 'link' ? <Check size={13} strokeWidth={2.6} /> : <Copy size={13} strokeWidth={2.2} />}
								{copied === 'link'
									? ar
										? 'اتنسخ اللينك'
										: 'Link copied'
									: ar
										? 'انسخ لينك الموقع'
										: 'Copy map link'}
							</button>
						</section>

						<section className="wa-locv__block">
							<p className="wa-locv__label">{ar ? 'إيه اللي جنبه؟' : 'What’s nearby'}</p>
							<div className="wa-locv__chips">
								<button
									type="button"
									className={`wa-locv__chip${!nearby ? ' is-active' : ''}`}
									onClick={() => setNearby('')}
								>
									<MapPin size={14} strokeWidth={2.2} />
									{ar ? 'المكان' : 'The pin'}
								</button>
								{LOCATION_NEARBY.map(item => {
									const Icon = item.icon;
									return (
										<button
											key={item.id}
											type="button"
											className={`wa-locv__chip${nearby === item.id ? ' is-active' : ''}`}
											onClick={() => setNearby(current => (current === item.id ? '' : item.id))}
										>
											<Icon size={14} strokeWidth={2.2} />
											{ar ? item.ar : item.en}
										</button>
									);
								})}
							</div>
							<p className="wa-locv__hint">
								{ar
									? 'اضغط على أي مكان في الخريطة عشان تشوف تفاصيله.'
									: 'Click any place on the map to see its details.'}
							</p>
						</section>
					</div>
				</aside>
			</div>
		</div>,
		document.body,
	);
}

/** One request per message, shared by every render: coordinates the bubble did not get. */
const locationFetchCache = new Map();

function fetchMessageLocation(conversationId, messageId) {
	const key = `${conversationId}:${messageId}`;
	if (!locationFetchCache.has(key)) {
		locationFetchCache.set(
			key,
			api
				.get(`/whatsapp/conversations/${conversationId}/messages/${messageId}/location`, { timeout: 45000 })
				.then(({ data }) => data?.location || data?.data?.location || null)
				.catch(error => {
					// Let a later render retry transient failures.
					locationFetchCache.delete(key);
					throw error;
				}),
		);
	}
	return locationFetchCache.get(key);
}

export function LocationMessage({ message, location, type, locale = 'en', conversationId = null }) {
	const [mapFailed, setMapFailed] = useState(false);
	const [opening, setOpening] = useState(false);
	const [fetchedLocation, setFetchedLocation] = useState(null);
	const [viewerOpen, setViewerOpen] = useState(false);
	const resolved = fetchedLocation || location || whatsAppLocationFromMessage(message);
	const isLive =
		Boolean(resolved?.isLive) ||
		['live_location', 'livelocation'].includes(String(type || message?.type || '').toLowerCase());
	const arabic = String(locale).toLowerCase().startsWith('ar');
	const fallbackLabel = arabic
		? isLive
			? 'موقع مباشر'
			: 'موقع'
		: isLive
			? 'Live location'
			: 'Pinned location';
	const lat = Number(resolved?.latitude);
	const lng = Number(resolved?.longitude);
	const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
	const title = String(resolved?.name || '').trim() || fallbackLabel;
	const address = String(resolved?.address || '').trim();
	const preview = resolved?.previewDataUrl;
	const mosaic = hasCoords ? locationTileMosaic(lat, lng, 16) : null;
	const canFetch =
		Boolean(conversationId && message?.id) &&
		!String(message.id).startsWith('live:') &&
		!String(message.id).startsWith('pending:');
	const [autoState, setAutoState] = useState('idle');
	// Older or cached rows can arrive without coordinates; the server has them.
	useEffect(() => {
		if (hasCoords || !canFetch) return undefined;
		let cancelled = false;
		setAutoState('loading');
		fetchMessageLocation(conversationId, message.id)
			.then(fetched => {
				if (cancelled) return;
				if (Number.isFinite(Number(fetched?.latitude)) && Number.isFinite(Number(fetched?.longitude))) {
					setFetchedLocation(current => current || { ...(resolved || {}), ...fetched });
					setAutoState('done');
				} else {
					setAutoState('missing');
				}
			})
			.catch(() => {
				if (!cancelled) setAutoState('missing');
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- once per message
	}, [hasCoords, canFetch, conversationId, message?.id]);
	const directionsHref = hasCoords
		? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}`
		: null;

	// Coordinates are sometimes only on the server (older rows): fetch them, then open the map.
	const openViewer = async event => {
		event?.preventDefault?.();
		event?.stopPropagation?.();
		if (hasCoords) {
			setViewerOpen(true);
			return;
		}
		const href = whatsAppLocationHref(message, resolved);
		if (
			conversationId &&
			message?.id &&
			!String(message.id).startsWith('live:') &&
			!String(message.id).startsWith('pending:')
		) {
			setOpening(true);
			try {
				const { data } = await api.get(
					`/whatsapp/conversations/${conversationId}/messages/${message.id}/location`,
					{ timeout: 45000 },
				);
				const fetched = data?.location || data?.data?.location || null;
				if (Number.isFinite(Number(fetched?.latitude)) && Number.isFinite(Number(fetched?.longitude))) {
					setFetchedLocation({ ...(resolved || {}), ...fetched });
					setViewerOpen(true);
					return;
				}
			} catch (error) {
				if (Number(error?.response?.status) === 401) return;
				const apiMessage = String(error?.response?.data?.message || error?.message || '').toLowerCase();
				if (apiMessage.includes('not connected') && !href) {
					toast.error(
						arabic ? 'اربط واتساب أولاً ثم أعد فتح الموقع' : 'Link WhatsApp first, then open this location again',
					);
					return;
				}
			} finally {
				setOpening(false);
			}
		}
		if (href) {
			window.open(href, '_blank', 'noopener,noreferrer');
			return;
		}
		toast.error(
			arabic
				? 'إحداثيات هذه الرسالة غير محفوظة. اطلب إرسال الموقع مرة أخرى'
				: 'This location was not saved. Ask them to send it again',
		);
	};

	return (
		<div className={`wa-loc${isLive ? ' is-live' : ''}`} onPointerDown={event => event.stopPropagation()}>
			<button
				type="button"
				className="wa-loc__map"
				onClick={event => void openViewer(event)}
				disabled={opening}
				aria-label={arabic ? `اعرض ${title} على الخريطة` : `Show ${title} on the map`}
			>
				{preview && (!mosaic || mapFailed) ? (
					<img src={preview} alt="" loading="lazy" className="wa-loc__preview" />
				) : mosaic && !mapFailed ? (
					<span
						className="wa-loc__tiles"
						style={{ left: `calc(50% - ${mosaic.pointX}px)`, top: `calc(50% - ${mosaic.pointY}px)` }}
						aria-hidden="true"
					>
						{mosaic.tiles.map(tile => (
							<img
								key={tile.key}
								src={tile.src}
								alt=""
								loading="lazy"
								draggable={false}
								style={{ left: tile.left, top: tile.top }}
								onError={() => setMapFailed(true)}
							/>
						))}
					</span>
				) : (
					<span className={`wa-loc__fallback${autoState === 'loading' ? ' is-loading' : ''}`} aria-hidden="true" />
				)}
				<span className="wa-loc__pin" aria-hidden="true">
					<MapPin size={30} strokeWidth={2.2} fill="currentColor" />
				</span>
				{isLive ? (
					<span className="wa-loc__live">
						<span aria-hidden="true" />
						{arabic ? 'مباشر' : 'Live'}
					</span>
				) : null}
				<span className="wa-loc__open">
					{opening ? <Loader2 size={13} className="animate-spin" /> : <Maximize2 size={13} strokeWidth={2.4} />}
					{hasCoords
						? arabic
							? 'افتح الخريطة'
							: 'Open map'
						: autoState === 'loading'
							? arabic
								? 'بيحمّل الموقع…'
								: 'Loading location…'
							: arabic
								? 'حاول تاني'
								: 'Try again'}
				</span>
			</button>
			<div className="wa-loc__body">
				<p className="wa-loc__title" dir="auto">
					{title}
				</p>
				{address ? (
					<p className="wa-loc__address" dir="auto">
						{address}
					</p>
				) : null}
				{!hasCoords && autoState === 'missing' ? (
					<p className="wa-loc__address">
						{arabic
							? 'تفاصيل الموقع مش متاحة دلوقتي.'
							: 'Location details are not available right now.'}
					</p>
				) : null}
				{hasCoords ? (
					<p className="wa-loc__coords" dir="ltr">
						{lat.toFixed(5)}, {lng.toFixed(5)}
					</p>
				) : null}
			</div>
			{hasCoords ? (
				<div className="wa-loc__actions">
					<button type="button" onClick={event => void openViewer(event)}>
						<MapPin size={14} strokeWidth={2.2} />
						{arabic ? 'عرض' : 'View'}
					</button>
					<a href={directionsHref} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()}>
						<Navigation size={14} strokeWidth={2.2} />
						{arabic ? 'الاتجاهات' : 'Directions'}
					</a>
				</div>
			) : null}
			{viewerOpen && hasCoords && typeof document !== 'undefined' ? (
				<WaLocationViewer
					location={{ latitude: lat, longitude: lng }}
					title={title}
					address={address}
					isLive={isLive}
					locale={locale}
					onClose={() => setViewerOpen(false)}
				/>
			) : null}
		</div>
	);
}
