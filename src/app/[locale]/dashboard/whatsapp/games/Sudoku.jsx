'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eraser, Lightbulb, RotateCcw } from 'lucide-react';
import { isTypingTarget, loadBest, saveBest } from './game-utils';

const CLUES = { easy: 40, medium: 32 };

const rowOf = i => Math.floor(i / 9);
const colOf = i => i % 9;
const boxOf = i => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

function canPlace(grid, i, v) {
	const r = rowOf(i);
	const c = colOf(i);
	const b = boxOf(i);
	for (let j = 0; j < 81; j += 1) {
		if (grid[j] !== v || j === i) continue;
		if (rowOf(j) === r || colOf(j) === c || boxOf(j) === b) return false;
	}
	return true;
}

function shuffled(list) {
	const a = [...list];
	for (let i = a.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/** Backtracking solver. Fills `grid` in place; returns the number of solutions found (up to `limit`). */
function solve(grid, limit = 1, random = false) {
	const i = grid.indexOf(0);
	if (i < 0) return 1;
	let count = 0;
	const digits = random ? shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9];
	for (const v of digits) {
		if (!canPlace(grid, i, v)) continue;
		grid[i] = v;
		count += solve(grid, limit - count, random);
		if (count >= limit) {
			if (limit === 1) return count; // keep the filled grid
			grid[i] = 0;
			return count;
		}
		grid[i] = 0;
	}
	return count;
}

/** A full random solution, then cells removed while the puzzle keeps exactly one solution. */
function makePuzzle(level) {
	const solution = Array(81).fill(0);
	solve(solution, 1, true);
	const puzzle = [...solution];
	let clues = 81;
	for (const i of shuffled(puzzle.map((_, k) => k))) {
		if (clues <= CLUES[level]) break;
		const keep = puzzle[i];
		puzzle[i] = 0;
		if (solve([...puzzle], 2) !== 1) puzzle[i] = keep;
		else clues -= 1;
	}
	return { puzzle, solution };
}

export default function Sudoku({ ar }) {
	const [level, setLevel] = useState('easy');
	const [game, setGame] = useState(() => makePuzzle('easy'));
	const [cells, setCells] = useState(() => game.puzzle);
	const [selected, setSelected] = useState(-1);
	const [mistakes, setMistakes] = useState(0);
	const [seconds, setSeconds] = useState(0);
	const [best, setBest] = useState(() => loadBest('sudoku-easy'));
	const won = useMemo(() => cells.every((v, i) => v === game.solution[i]), [cells, game]);

	useEffect(() => {
		if (won) return undefined;
		const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
		return () => window.clearInterval(id);
	}, [won, game]);

	useEffect(() => {
		if (won) setBest(saveBest(`sudoku-${level}`, Math.max(1, seconds), { lowerIsBetter: true }));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [won]);

	const restart = (lv = level) => {
		const next = makePuzzle(lv);
		setLevel(lv);
		setGame(next);
		setCells(next.puzzle);
		setSelected(-1);
		setMistakes(0);
		setSeconds(0);
		setBest(loadBest(`sudoku-${lv}`));
	};

	const enter = v => {
		if (selected < 0 || game.puzzle[selected] || won) return;
		setCells(prev => prev.map((x, i) => (i === selected ? v : x)));
		if (v && v !== game.solution[selected]) setMistakes(m => m + 1);
	};

	const hint = () => {
		const target = selected >= 0 && cells[selected] !== game.solution[selected] ? selected : cells.findIndex((v, i) => v !== game.solution[i]);
		if (target < 0) return;
		setSelected(target);
		setCells(prev => prev.map((x, i) => (i === target ? game.solution[i] : x)));
	};

	useEffect(() => {
		const onKey = event => {
			if (isTypingTarget(event.target)) return;
			if (/^[1-9]$/.test(event.key)) {
				enter(Number(event.key));
				return;
			}
			if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
				enter(0);
				return;
			}
			const moves = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
			if (moves[event.key] !== undefined) {
				event.preventDefault();
				setSelected(s => (s < 0 ? 0 : Math.min(80, Math.max(0, s + moves[event.key]))));
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	const sel = selected >= 0 ? { r: rowOf(selected), c: colOf(selected), b: boxOf(selected), v: cells[selected] } : null;
	const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
	const counts = useMemo(() => {
		const out = Array(10).fill(0);
		cells.forEach((v, i) => {
			if (v && v === game.solution[i]) out[v] += 1;
		});
		return out;
	}, [cells, game]);

	return (
		<div className="wg-sudoku">
			<div className="wg-bar">
				<div className="wg-scores">
					<span className="wg-score">
						<small>{ar ? 'الوقت' : 'Time'}</small>
						<b dir="ltr">{time}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'أخطاء' : 'Mistakes'}</small>
						<b>{mistakes}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الأفضل' : 'Best'}</small>
						<b dir="ltr">{best ? `${Math.floor(best / 60)}:${String(best % 60).padStart(2, '0')}` : '—'}</b>
					</span>
				</div>
				<div className="wg-seg" role="radiogroup" aria-label={ar ? 'المستوى' : 'Level'}>
					{[
						['easy', ar ? 'سهل' : 'Easy'],
						['medium', ar ? 'متوسط' : 'Medium'],
					].map(([id, label]) => (
						<button key={id} type="button" role="radio" aria-checked={level === id} className={level === id ? 'is-on' : ''} onClick={() => restart(id)}>
							{label}
						</button>
					))}
				</div>
			</div>

			<div className="wg-sudoku__wrap">
				<div className="wg-sudoku__grid" dir="ltr">
					{cells.map((v, i) => {
						const given = Boolean(game.puzzle[i]);
						const wrong = v && v !== game.solution[i];
						const peer = sel && (rowOf(i) === sel.r || colOf(i) === sel.c || boxOf(i) === sel.b);
						const same = sel && sel.v && v === sel.v;
						return (
							<button
								key={i}
								type="button"
								onClick={() => setSelected(i)}
								aria-label={`${ar ? 'صف' : 'Row'} ${rowOf(i) + 1} ${ar ? 'عمود' : 'column'} ${colOf(i) + 1}${v ? `: ${v}` : ''}`}
								className={[
									'wg-su',
									given ? 'is-given' : '',
									wrong ? 'is-wrong' : '',
									i === selected ? 'is-sel' : peer ? 'is-peer' : '',
									same && i !== selected ? 'is-same' : '',
									colOf(i) % 3 === 2 && colOf(i) !== 8 ? 'edge-r' : '',
									rowOf(i) % 3 === 2 && rowOf(i) !== 8 ? 'edge-b' : '',
								].join(' ')}
							>
								{v || ''}
							</button>
						);
					})}
				</div>
				{won ? (
					<div className="wg-over">
						<p className="wg-over__title">{ar ? 'حللتها!' : 'Solved!'}</p>
						<p className="wg-over__sub">{ar ? `في ${time} بـ ${mistakes} أخطاء` : `In ${time} with ${mistakes} mistakes`}</p>
						<div className="wg-over__actions">
							<button type="button" className="wg-btn wg-btn--primary" onClick={() => restart()}>
								{ar ? 'لغز جديد' : 'New puzzle'}
							</button>
						</div>
					</div>
				) : null}
			</div>

			<div className="wg-sudoku__pad" dir="ltr">
				{[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
					<button key={n} type="button" className="wg-su-key" onClick={() => enter(n)} disabled={counts[n] >= 9}>
						{n}
					</button>
				))}
			</div>
			<div className="wg-row">
				<button type="button" className="wg-btn" onClick={() => enter(0)}>
					<Eraser size={16} aria-hidden />
					{ar ? 'امسح' : 'Erase'}
				</button>
				<button type="button" className="wg-btn" onClick={hint}>
					<Lightbulb size={16} aria-hidden />
					{ar ? 'تلميح' : 'Hint'}
				</button>
				<button type="button" className="wg-btn" onClick={() => restart()}>
					<RotateCcw size={16} aria-hidden />
					{ar ? 'جديد' : 'New'}
				</button>
			</div>
		</div>
	);
}
