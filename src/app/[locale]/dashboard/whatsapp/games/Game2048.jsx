'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { KEY_DIRECTIONS, isTypingTarget, loadBest, saveBest, swipeDirection } from './game-utils';

const SIZE = 4;
let tileSeq = 0;

function emptyCells(tiles) {
	const taken = new Set(tiles.map(t => t.r * SIZE + t.c));
	const free = [];
	for (let i = 0; i < SIZE * SIZE; i += 1) if (!taken.has(i)) free.push(i);
	return free;
}

function addRandom(tiles) {
	const free = emptyCells(tiles);
	if (!free.length) return tiles;
	const cell = free[Math.floor(Math.random() * free.length)];
	return [...tiles, { id: ++tileSeq, r: Math.floor(cell / SIZE), c: cell % SIZE, v: Math.random() < 0.9 ? 2 : 4, fresh: true }];
}

function newBoard() {
	return addRandom(addRandom([]));
}

/** Slides every row/column toward `dir`; equal neighbours merge once per move. */
function slide(tiles, dir) {
	const vertical = dir === 'up' || dir === 'down';
	const reverse = dir === 'right' || dir === 'down';
	const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
	for (const t of tiles) grid[t.r][t.c] = t;

	let moved = false;
	let gained = 0;
	const out = [];
	for (let line = 0; line < SIZE; line += 1) {
		const cells = [];
		for (let i = 0; i < SIZE; i += 1) {
			const idx = reverse ? SIZE - 1 - i : i;
			const t = vertical ? grid[idx][line] : grid[line][idx];
			if (t) cells.push(t);
		}
		const merged = [];
		for (let i = 0; i < cells.length; i += 1) {
			const cur = cells[i];
			const next = cells[i + 1];
			if (next && next.v === cur.v) {
				merged.push({ id: cur.id, v: cur.v * 2, merged: true, gone: next.id });
				gained += cur.v * 2;
				i += 1;
			} else {
				merged.push({ id: cur.id, v: cur.v });
			}
		}
		merged.forEach((t, pos) => {
			const idx = reverse ? SIZE - 1 - pos : pos;
			const r = vertical ? idx : line;
			const c = vertical ? line : idx;
			const before = tiles.find(x => x.id === t.id);
			if (before.r !== r || before.c !== c || t.merged) moved = true;
			out.push({ id: t.id, r, c, v: t.v, merged: Boolean(t.merged) });
		});
	}
	return { tiles: out, moved, gained };
}

function canMove(tiles) {
	if (tiles.length < SIZE * SIZE) return true;
	const at = (r, c) => tiles.find(t => t.r === r && t.c === c)?.v;
	for (let r = 0; r < SIZE; r += 1) {
		for (let c = 0; c < SIZE; c += 1) {
			const v = at(r, c);
			if (v === at(r, c + 1) || v === at(r + 1, c)) return true;
		}
	}
	return false;
}

export default function Game2048({ ar }) {
	const [tiles, setTiles] = useState(newBoard);
	const [score, setScore] = useState(0);
	const [best, setBest] = useState(() => loadBest('2048'));
	const [won, setWon] = useState(false);
	const [keepGoing, setKeepGoing] = useState(false);
	const over = !canMove(tiles);
	const start = useRef(null);

	const move = useCallback(
		dir => {
			if (over || (won && !keepGoing)) return;
			setTiles(prev => {
				const result = slide(prev, dir);
				if (!result.moved) return prev;
				if (result.gained) {
					setScore(s => {
						const next = s + result.gained;
						setBest(saveBest('2048', next));
						return next;
					});
				}
				if (result.tiles.some(t => t.v === 2048)) setWon(true);
				return addRandom(result.tiles);
			});
		},
		[over, won, keepGoing],
	);

	useEffect(() => {
		const onKey = event => {
			const dir = KEY_DIRECTIONS[event.key];
			if (!dir || isTypingTarget(event.target)) return;
			event.preventDefault();
			move(dir);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [move]);

	const restart = () => {
		setTiles(newBoard());
		setScore(0);
		setWon(false);
		setKeepGoing(false);
	};

	return (
		<div className="wg-2048">
			<div className="wg-bar">
				<div className="wg-scores">
					<span className="wg-score">
						<small>{ar ? 'النقاط' : 'Score'}</small>
						<b>{score}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الأفضل' : 'Best'}</small>
						<b>{best}</b>
					</span>
				</div>
				<button type="button" className="wg-btn" onClick={restart}>
					<RotateCcw size={16} aria-hidden />
					{ar ? 'جديدة' : 'New game'}
				</button>
			</div>

			<div
				className="wg-2048__board"
				role="application"
				aria-label={ar ? 'لوحة 2048، استخدم الأسهم أو اسحب' : '2048 board, use arrow keys or swipe'}
				onPointerDown={event => {
					start.current = { x: event.clientX, y: event.clientY };
				}}
				onPointerUp={event => {
					if (!start.current) return;
					const dir = swipeDirection(event.clientX - start.current.x, event.clientY - start.current.y);
					start.current = null;
					if (dir) move(dir);
				}}
			>
				{Array.from({ length: SIZE * SIZE }, (_, i) => (
					<span key={i} className="wg-2048__cell" style={{ '--r': Math.floor(i / SIZE), '--c': i % SIZE }} />
				))}
				{tiles.map(t => (
					<span
						key={t.id}
						className={`wg-2048__tile v${Math.min(t.v, 4096)} ${t.fresh ? 'is-fresh' : ''} ${t.merged ? 'is-merged' : ''}`}
						style={{ '--r': t.r, '--c': t.c }}
					>
						<span key={t.v}>{t.v}</span>
					</span>
				))}

				{over || (won && !keepGoing) ? (
					<div className="wg-over">
						<p className="wg-over__title">{won ? (ar ? 'وصلت إلى 2048!' : 'You made 2048!') : ar ? 'انتهت الحركات' : 'No moves left'}</p>
						<p className="wg-over__sub">{ar ? `نقاطك ${score}` : `Score ${score}`}</p>
						<div className="wg-over__actions">
							{won && !over ? (
								<button type="button" className="wg-btn" onClick={() => setKeepGoing(true)}>
									{ar ? 'أكمل اللعب' : 'Keep going'}
								</button>
							) : null}
							<button type="button" className="wg-btn wg-btn--primary" onClick={restart}>
								{ar ? 'العب مجددًا' : 'Play again'}
							</button>
						</div>
					</div>
				) : null}
			</div>
			<p className="wg-hint">{ar ? 'حرّك بالأسهم أو اسحب. اجمع الأرقام المتشابهة حتى 2048.' : 'Use arrow keys or swipe. Merge equal numbers to reach 2048.'}</p>
		</div>
	);
}
