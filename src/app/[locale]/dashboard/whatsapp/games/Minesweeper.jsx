'use client';

import { useEffect, useRef, useState } from 'react';
import { Bomb, Flag, RotateCcw } from 'lucide-react';
import { loadBest, saveBest } from './game-utils';

const LEVELS = {
	easy: { rows: 9, cols: 9, mines: 10 },
	medium: { rows: 12, cols: 12, mines: 24 },
};

const neighbours = (i, rows, cols) => {
	const r = Math.floor(i / cols);
	const c = i % cols;
	const out = [];
	for (let dr = -1; dr <= 1; dr += 1) {
		for (let dc = -1; dc <= 1; dc += 1) {
			if (!dr && !dc) continue;
			const nr = r + dr;
			const nc = c + dc;
			if (nr >= 0 && nc >= 0 && nr < rows && nc < cols) out.push(nr * cols + nc);
		}
	}
	return out;
};

function emptyBoard({ rows, cols }) {
	return Array.from({ length: rows * cols }, () => ({ mine: false, n: 0, open: false, flag: false }));
}

/** Mines are placed after the first click, never on it or next to it. */
function plantMines(board, level, safe) {
	const { rows, cols, mines } = level;
	const keepClear = new Set([safe, ...neighbours(safe, rows, cols)]);
	const spots = board.map((_, i) => i).filter(i => !keepClear.has(i));
	for (let i = spots.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[spots[i], spots[j]] = [spots[j], spots[i]];
	}
	const next = board.map(c => ({ ...c }));
	spots.slice(0, mines).forEach(i => {
		next[i].mine = true;
	});
	next.forEach((cell, i) => {
		cell.n = neighbours(i, rows, cols).filter(j => next[j].mine).length;
	});
	return next;
}

function reveal(board, start, level) {
	const next = board.map(c => ({ ...c }));
	const stack = [start];
	while (stack.length) {
		const i = stack.pop();
		const cell = next[i];
		if (cell.open || cell.flag) continue;
		cell.open = true;
		if (!cell.mine && cell.n === 0) stack.push(...neighbours(i, level.rows, level.cols));
	}
	return next;
}

export default function Minesweeper({ ar }) {
	const [levelId, setLevelId] = useState('easy');
	const level = LEVELS[levelId];
	const [board, setBoard] = useState(() => emptyBoard(LEVELS.easy));
	const [status, setStatus] = useState('ready'); // ready | playing | won | lost
	const [flagMode, setFlagMode] = useState(false);
	const [seconds, setSeconds] = useState(0);
	const [best, setBest] = useState(() => loadBest('mines-easy'));
	const press = useRef({ timer: 0, long: false });

	useEffect(() => {
		if (status !== 'playing') return undefined;
		const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
		return () => window.clearInterval(id);
	}, [status]);

	const restart = (id = levelId) => {
		setLevelId(id);
		setBoard(emptyBoard(LEVELS[id]));
		setStatus('ready');
		setSeconds(0);
		setBest(loadBest(`mines-${id}`));
	};

	const finish = (nextBoard, lost) => {
		if (lost) {
			setBoard(nextBoard.map(c => (c.mine ? { ...c, open: true } : c)));
			setStatus('lost');
			return;
		}
		const safeLeft = nextBoard.some(c => !c.mine && !c.open);
		setBoard(nextBoard);
		if (!safeLeft) {
			setStatus('won');
			setBest(saveBest(`mines-${levelId}`, Math.max(1, seconds), { lowerIsBetter: true }));
		}
	};

	const open = i => {
		if (status === 'won' || status === 'lost') return;
		let current = board;
		if (status === 'ready') {
			current = plantMines(board, level, i);
			setStatus('playing');
		}
		const cell = current[i];
		if (cell.flag) return;
		if (cell.open && cell.n > 0) {
			// Chord: open all neighbours when the right number of flags is around.
			const around = neighbours(i, level.rows, level.cols);
			if (around.filter(j => current[j].flag).length !== cell.n) return;
			let next = current;
			let lost = false;
			for (const j of around) {
				if (next[j].flag || next[j].open) continue;
				if (next[j].mine) lost = true;
				next = reveal(next, j, level);
			}
			finish(next, lost);
			return;
		}
		if (cell.mine) {
			finish(current, true);
			return;
		}
		finish(reveal(current, i, level), false);
	};

	const toggleFlag = i => {
		if (status === 'won' || status === 'lost' || board[i].open) return;
		setBoard(prev => prev.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)));
	};

	const flags = board.filter(c => c.flag).length;

	return (
		<div className="wg-mines">
			<div className="wg-bar">
				<div className="wg-scores">
					<span className="wg-score">
						<small>{ar ? 'الألغام' : 'Mines'}</small>
						<b>{level.mines - flags}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الوقت' : 'Time'}</small>
						<b>{seconds}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الأفضل' : 'Best'}</small>
						<b>{best ? `${best}s` : '—'}</b>
					</span>
				</div>
				<div className="flex gap-2">
					<div className="wg-seg" role="radiogroup" aria-label={ar ? 'المستوى' : 'Level'}>
						{[
							['easy', ar ? 'سهل' : 'Easy'],
							['medium', ar ? 'متوسط' : 'Medium'],
						].map(([id, label]) => (
							<button key={id} type="button" role="radio" aria-checked={levelId === id} className={levelId === id ? 'is-on' : ''} onClick={() => restart(id)}>
								{label}
							</button>
						))}
					</div>
				</div>
			</div>

			<div className="wg-mines__wrap">
				<div className="wg-mines__grid" style={{ '--cols': level.cols }} onContextMenu={event => event.preventDefault()}>
					{board.map((cell, i) => (
						<button
							key={`${levelId}-${i}`}
							type="button"
							className={`wg-mine ${cell.open ? 'is-open' : ''} ${cell.open && cell.mine ? 'is-boom' : ''} n${cell.n}`}
							onPointerDown={event => {
								if (event.pointerType === 'mouse') return;
								press.current.long = false;
								press.current.timer = window.setTimeout(() => {
									press.current.long = true;
									toggleFlag(i);
								}, 420);
							}}
							onPointerUp={() => window.clearTimeout(press.current.timer)}
							onPointerLeave={() => window.clearTimeout(press.current.timer)}
							onClick={() => {
								if (press.current.long) {
									press.current.long = false;
									return;
								}
								if (flagMode) toggleFlag(i);
								else open(i);
							}}
							onContextMenu={event => {
								event.preventDefault();
								toggleFlag(i);
							}}
							aria-label={cell.open ? (cell.mine ? (ar ? 'لغم' : 'Mine') : String(cell.n || '')) : cell.flag ? (ar ? 'علَم' : 'Flag') : ar ? 'خانة مغلقة' : 'Hidden cell'}
						>
							{cell.open ? (
								cell.mine ? (
									<Bomb size={16} aria-hidden />
								) : cell.n ? (
									cell.n
								) : null
							) : cell.flag ? (
								<Flag size={15} aria-hidden />
							) : null}
						</button>
					))}
				</div>

				{status === 'won' || status === 'lost' ? (
					<div className="wg-over">
						<p className="wg-over__title">{status === 'won' ? (ar ? 'نظّفت الحقل!' : 'Field cleared!') : ar ? 'انفجر لغم' : 'Boom!'}</p>
						<p className="wg-over__sub">{status === 'won' ? (ar ? `في ${seconds} ثانية` : `In ${seconds} seconds`) : ar ? 'جرّب مرة أخرى' : 'Give it another go'}</p>
						<div className="wg-over__actions">
							<button type="button" className="wg-btn wg-btn--primary" onClick={() => restart()}>
								{ar ? 'العب مجددًا' : 'Play again'}
							</button>
						</div>
					</div>
				) : null}
			</div>

			<div className="wg-row">
				<button type="button" className={`wg-btn ${flagMode ? 'wg-btn--on' : ''}`} onClick={() => setFlagMode(v => !v)} aria-pressed={flagMode}>
					<Flag size={16} aria-hidden />
					{flagMode ? (ar ? 'وضع العلَم: مفعّل' : 'Flag mode: on') : ar ? 'وضع العلَم' : 'Flag mode'}
				</button>
				<button type="button" className="wg-btn" onClick={() => restart()}>
					<RotateCcw size={16} aria-hidden />
					{ar ? 'جديدة' : 'New game'}
				</button>
			</div>
		</div>
	);
}
