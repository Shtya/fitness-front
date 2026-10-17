'use client';

import { useEffect, useState } from 'react';
import { Circle, RotateCcw, X } from 'lucide-react';

const LINES = [
	[0, 1, 2],
	[3, 4, 5],
	[6, 7, 8],
	[0, 3, 6],
	[1, 4, 7],
	[2, 5, 8],
	[0, 4, 8],
	[2, 4, 6],
];

function winnerOf(board) {
	for (const [a, b, c] of LINES) {
		if (board[a] && board[a] === board[b] && board[a] === board[c]) return { player: board[a], line: [a, b, c] };
	}
	return board.every(Boolean) ? { player: 'draw', line: [] } : null;
}

function minimax(board, turn) {
	const w = winnerOf(board);
	if (w) return { score: w.player === 'O' ? 10 : w.player === 'X' ? -10 : 0 };
	let best = { score: turn === 'O' ? -Infinity : Infinity, index: -1 };
	board.forEach((cell, i) => {
		if (cell) return;
		const next = [...board];
		next[i] = turn;
		const { score } = minimax(next, turn === 'O' ? 'X' : 'O');
		if (turn === 'O' ? score > best.score : score < best.score) best = { score, index: i };
	});
	return best;
}

/** Strong but beatable: plays the best move most of the time, a random one sometimes. */
function computerMove(board, level) {
	const free = board.map((c, i) => (c ? -1 : i)).filter(i => i >= 0);
	if (!free.length) return -1;
	const mistake = level === 'easy' ? 0.55 : 0.12;
	if (Math.random() < mistake) return free[Math.floor(Math.random() * free.length)];
	return minimax(board, 'O').index;
}

export default function TicTacToe({ ar }) {
	const [board, setBoard] = useState(Array(9).fill(null));
	const [level, setLevel] = useState('normal');
	const [tally, setTally] = useState({ you: 0, cpu: 0, draw: 0 });
	const result = winnerOf(board);
	const yourTurn = !result && board.filter(Boolean).length % 2 === 0;

	// Computer answers after a short beat.
	useEffect(() => {
		if (result || yourTurn) return undefined;
		const id = window.setTimeout(() => {
			setBoard(prev => {
				const i = computerMove(prev, level);
				if (i < 0) return prev;
				const next = [...prev];
				next[i] = 'O';
				return next;
			});
		}, 380);
		return () => window.clearTimeout(id);
	}, [board, result, yourTurn, level]);

	useEffect(() => {
		if (!result) return;
		setTally(t => ({
			you: t.you + (result.player === 'X' ? 1 : 0),
			cpu: t.cpu + (result.player === 'O' ? 1 : 0),
			draw: t.draw + (result.player === 'draw' ? 1 : 0),
		}));
	}, [result?.player, result?.line?.join()]); // eslint-disable-line react-hooks/exhaustive-deps

	const play = i => {
		if (!yourTurn || board[i]) return;
		const next = [...board];
		next[i] = 'X';
		setBoard(next);
	};

	const restart = () => setBoard(Array(9).fill(null));

	return (
		<div className="wg-ttt">
			<div className="wg-bar">
				<div className="wg-scores">
					<span className="wg-score">
						<small>{ar ? 'أنت' : 'You'}</small>
						<b>{tally.you}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'تعادل' : 'Draw'}</small>
						<b>{tally.draw}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الجهاز' : 'CPU'}</small>
						<b>{tally.cpu}</b>
					</span>
				</div>
				<div className="wg-seg" role="radiogroup" aria-label={ar ? 'المستوى' : 'Level'}>
					{[
						['easy', ar ? 'سهل' : 'Easy'],
						['normal', ar ? 'صعب' : 'Hard'],
					].map(([id, label]) => (
						<button key={id} type="button" role="radio" aria-checked={level === id} className={level === id ? 'is-on' : ''} onClick={() => setLevel(id)}>
							{label}
						</button>
					))}
				</div>
			</div>

			<p className="wg-ttt__status" aria-live="polite">
				{result
					? result.player === 'X'
						? ar ? 'فزت!' : 'You win!'
						: result.player === 'O'
							? ar ? 'فاز الجهاز' : 'Computer wins'
							: ar ? 'تعادل' : "It's a draw"
					: yourTurn
						? ar ? 'دورك (X)' : 'Your turn (X)'
						: ar ? 'الجهاز يفكّر…' : 'Computer is thinking…'}
			</p>

			<div className="wg-ttt__board" dir="ltr">
				{board.map((cell, i) => (
					<button
						key={i}
						type="button"
						onClick={() => play(i)}
						disabled={Boolean(cell) || !yourTurn}
						aria-label={cell ? cell : ar ? `خانة ${i + 1}` : `Cell ${i + 1}`}
						className={`wg-ttt__cell ${result?.line?.includes(i) ? 'is-win' : ''}`}
					>
						{cell === 'X' ? <X size={42} strokeWidth={2.6} className="wg-ttt__x" aria-hidden /> : null}
						{cell === 'O' ? <Circle size={36} strokeWidth={2.8} className="wg-ttt__o" aria-hidden /> : null}
					</button>
				))}
			</div>

			<div className="wg-ttt__actions">
				<button type="button" className={`wg-btn ${result ? 'wg-btn--primary' : ''}`} onClick={restart}>
					<RotateCcw size={16} aria-hidden />
					{result ? (ar ? 'جولة جديدة' : 'New round') : ar ? 'ابدأ من جديد' : 'Restart'}
				</button>
			</div>
		</div>
	);
}
