'use client';

import { useEffect, useRef, useState } from 'react';
import { Anchor, Apple, Bird, Cherry, Coffee, Feather, Flower2, Leaf, Moon, RotateCcw, Star, Sun } from 'lucide-react';
import { loadBest, saveBest } from './game-utils';

const ICONS = [Sun, Moon, Star, Leaf, Bird, Coffee, Cherry, Feather, Flower2, Anchor, Apple];
const PAIRS = 8;

function shuffle(list) {
	const a = [...list];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function newDeck() {
	const picks = shuffle(ICONS.map((_, i) => i)).slice(0, PAIRS);
	return shuffle([...picks, ...picks]).map((icon, i) => ({ id: i, icon, open: false, matched: false }));
}

export default function MemoryGame({ ar }) {
	const [cards, setCards] = useState(newDeck);
	const [picked, setPicked] = useState([]);
	const [moves, setMoves] = useState(0);
	const [best, setBest] = useState(() => loadBest('memory'));
	const [seconds, setSeconds] = useState(0);
	const [started, setStarted] = useState(false);
	const lock = useRef(false);
	const won = cards.every(c => c.matched);

	useEffect(() => {
		if (!started || won) return undefined;
		const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
		return () => window.clearInterval(id);
	}, [started, won]);

	useEffect(() => {
		if (won && moves) setBest(saveBest('memory', moves, { lowerIsBetter: true }));
	}, [won, moves]);

	const flip = card => {
		if (lock.current || card.open || card.matched) return;
		setStarted(true);
		const nextPicked = [...picked, card.id];
		setCards(prev => prev.map(c => (c.id === card.id ? { ...c, open: true } : c)));
		if (nextPicked.length < 2) {
			setPicked(nextPicked);
			return;
		}
		setMoves(m => m + 1);
		const [a, b] = nextPicked.map(id => cards.find(c => c.id === id) || card);
		if (a.icon === b.icon) {
			setCards(prev => prev.map(c => (nextPicked.includes(c.id) ? { ...c, open: true, matched: true } : c)));
			setPicked([]);
			return;
		}
		lock.current = true;
		setPicked(nextPicked);
		window.setTimeout(() => {
			setCards(prev => prev.map(c => (nextPicked.includes(c.id) ? { ...c, open: false } : c)));
			setPicked([]);
			lock.current = false;
		}, 750);
	};

	const restart = () => {
		lock.current = false;
		setCards(newDeck());
		setPicked([]);
		setMoves(0);
		setSeconds(0);
		setStarted(false);
	};

	const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

	return (
		<div className="wg-memory">
			<div className="wg-bar">
				<div className="wg-scores">
					<span className="wg-score">
						<small>{ar ? 'المحاولات' : 'Moves'}</small>
						<b>{moves}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الوقت' : 'Time'}</small>
						<b dir="ltr">{time}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الأفضل' : 'Best'}</small>
						<b>{best || '—'}</b>
					</span>
				</div>
				<button type="button" className="wg-btn" onClick={restart}>
					<RotateCcw size={16} aria-hidden />
					{ar ? 'جديدة' : 'New game'}
				</button>
			</div>

			<div className="wg-memory__grid">
				{cards.map(card => {
					const Icon = ICONS[card.icon];
					const shown = card.open || card.matched;
					return (
						<button
							key={card.id}
							type="button"
							onClick={() => flip(card)}
							disabled={card.matched}
							aria-label={shown ? (ar ? 'بطاقة مكشوفة' : 'Open card') : ar ? 'بطاقة مقلوبة' : 'Hidden card'}
							className={`wg-card ${shown ? 'is-open' : ''} ${card.matched ? 'is-matched' : ''}`}
						>
							<span className="wg-card__inner">
								<span className="wg-card__back" aria-hidden />
								<span className="wg-card__face">
									<Icon size={28} strokeWidth={1.9} aria-hidden />
								</span>
							</span>
						</button>
					);
				})}

				{won ? (
					<div className="wg-over">
						<p className="wg-over__title">{ar ? 'أحسنت!' : 'Well done!'}</p>
						<p className="wg-over__sub">{ar ? `أنهيتها في ${moves} محاولة خلال ${time}` : `${moves} moves in ${time}`}</p>
						<div className="wg-over__actions">
							<button type="button" className="wg-btn wg-btn--primary" onClick={restart}>
								{ar ? 'العب مجددًا' : 'Play again'}
							</button>
						</div>
					</div>
				) : null}
			</div>
			<p className="wg-hint">{ar ? 'اقلب بطاقتين في كل مرة وطابِق الأزواج.' : 'Flip two cards at a time and match the pairs.'}</p>
		</div>
	);
}
