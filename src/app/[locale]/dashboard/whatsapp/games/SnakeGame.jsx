'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { KEY_DIRECTIONS, isTypingTarget, loadBest, saveBest, swipeDirection } from './game-utils';

const CELLS = 17;
const START_MS = 150;
const MIN_MS = 70;
const VEC = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

function freshState() {
	const mid = Math.floor(CELLS / 2);
	const snake = [
		[mid - 2, mid],
		[mid - 3, mid],
		[mid - 4, mid],
	];
	return { snake, dir: 'right', queue: [], food: placeFood(snake), score: 0, dead: false };
}

function placeFood(snake) {
	const taken = new Set(snake.map(([x, y]) => `${x},${y}`));
	const free = [];
	for (let x = 0; x < CELLS; x += 1) for (let y = 0; y < CELLS; y += 1) if (!taken.has(`${x},${y}`)) free.push([x, y]);
	return free[Math.floor(Math.random() * free.length)] || [0, 0];
}

function readColors(el) {
	const cs = getComputedStyle(el);
	const v = name => cs.getPropertyValue(name).trim();
	return { board: v('--wg-board'), grid: v('--wg-grid'), snake: v('--wg-accent'), head: v('--wg-accent-strong'), food: v('--wg-danger') };
}

export default function SnakeGame({ ar }) {
	const canvasRef = useRef(null);
	const wrapRef = useRef(null);
	const state = useRef(freshState());
	const [score, setScore] = useState(0);
	const [best, setBest] = useState(() => loadBest('snake'));
	const [status, setStatus] = useState('ready'); // ready | running | paused | over
	const start = useRef(null);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		const dpr = window.devicePixelRatio || 1;
		const size = canvas.clientWidth;
		if (canvas.width !== Math.round(size * dpr)) {
			canvas.width = Math.round(size * dpr);
			canvas.height = Math.round(size * dpr);
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		const cell = size / CELLS;
		const c = readColors(wrapRef.current || canvas);
		ctx.fillStyle = c.board;
		ctx.fillRect(0, 0, size, size);
		ctx.fillStyle = c.grid;
		for (let x = 0; x < CELLS; x += 1) {
			for (let y = 0; y < CELLS; y += 1) {
				if ((x + y) % 2 === 0) ctx.fillRect(x * cell, y * cell, cell, cell);
			}
		}
		const { snake, food } = state.current;
		// food
		ctx.fillStyle = c.food;
		ctx.beginPath();
		ctx.arc((food[0] + 0.5) * cell, (food[1] + 0.5) * cell, cell * 0.34, 0, Math.PI * 2);
		ctx.fill();
		// snake
		snake.forEach(([x, y], i) => {
			ctx.fillStyle = i === 0 ? c.head : c.snake;
			const pad = i === 0 ? 1 : 2;
			const r = cell * 0.3;
			const px = x * cell + pad;
			const py = y * cell + pad;
			const w = cell - pad * 2;
			ctx.beginPath();
			ctx.roundRect ? ctx.roundRect(px, py, w, w, r) : ctx.rect(px, py, w, w);
			ctx.fill();
		});
	}, []);

	const step = useCallback(() => {
		const s = state.current;
		if (s.dead) return;
		if (s.queue.length) s.dir = s.queue.shift();
		const [dx, dy] = VEC[s.dir];
		const [hx, hy] = s.snake[0];
		const head = [hx + dx, hy + dy];
		const hitWall = head[0] < 0 || head[1] < 0 || head[0] >= CELLS || head[1] >= CELLS;
		const eating = head[0] === s.food[0] && head[1] === s.food[1];
		const body = eating ? s.snake : s.snake.slice(0, -1);
		const hitSelf = body.some(([x, y]) => x === head[0] && y === head[1]);
		if (hitWall || hitSelf) {
			s.dead = true;
			setStatus('over');
			setBest(saveBest('snake', s.score));
			draw();
			return;
		}
		s.snake = [head, ...body];
		if (eating) {
			s.score += 1;
			s.food = placeFood(s.snake);
			setScore(s.score);
		}
		draw();
	}, [draw]);

	// Game clock: speeds up a little with every bite.
	useEffect(() => {
		if (status !== 'running') return undefined;
		const ms = Math.max(MIN_MS, START_MS - score * 3);
		const id = window.setInterval(step, ms);
		return () => window.clearInterval(id);
	}, [status, score, step]);

	useEffect(() => {
		draw();
		const onResize = () => draw();
		window.addEventListener('resize', onResize);
		return () => window.removeEventListener('resize', onResize);
	}, [draw]);

	// Pause when the tab is hidden.
	useEffect(() => {
		const onHide = () => document.visibilityState === 'hidden' && setStatus(s => (s === 'running' ? 'paused' : s));
		document.addEventListener('visibilitychange', onHide);
		return () => document.removeEventListener('visibilitychange', onHide);
	}, []);

	const turn = useCallback(
		dir => {
			const s = state.current;
			if (status === 'over') return;
			if (status !== 'running') setStatus('running');
			const last = s.queue.length ? s.queue[s.queue.length - 1] : s.dir;
			if (dir === last || dir === OPPOSITE[last]) return;
			if (s.queue.length < 2) s.queue.push(dir);
		},
		[status],
	);

	const restart = () => {
		state.current = freshState();
		setScore(0);
		setStatus('running');
		draw();
	};

	const togglePause = () => setStatus(s => (s === 'running' ? 'paused' : s === 'paused' || s === 'ready' ? 'running' : s));

	useEffect(() => {
		const onKey = event => {
			if (isTypingTarget(event.target)) return;
			if (event.key === ' ') {
				event.preventDefault();
				if (status === 'over') restart();
				else togglePause();
				return;
			}
			const dir = KEY_DIRECTIONS[event.key];
			if (!dir) return;
			event.preventDefault();
			turn(dir);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [turn, status]);

	return (
		<div className="wg-snake" ref={wrapRef}>
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
				<div className="flex gap-2">
					{status === 'running' || status === 'paused' ? (
						<button type="button" className="wg-btn wg-btn--icon" onClick={togglePause} aria-label={status === 'running' ? (ar ? 'إيقاف مؤقت' : 'Pause') : ar ? 'استئناف' : 'Resume'}>
							{status === 'running' ? <Pause size={17} aria-hidden /> : <Play size={17} aria-hidden />}
						</button>
					) : null}
					<button type="button" className="wg-btn" onClick={restart}>
						<RotateCcw size={16} aria-hidden />
						{ar ? 'جديدة' : 'New game'}
					</button>
				</div>
			</div>

			<div
				className="wg-snake__board"
				onPointerDown={event => {
					start.current = { x: event.clientX, y: event.clientY };
				}}
				onPointerUp={event => {
					if (!start.current) return;
					const dir = swipeDirection(event.clientX - start.current.x, event.clientY - start.current.y);
					start.current = null;
					if (dir) turn(dir);
					else if (status === 'ready' || status === 'paused') setStatus('running');
				}}
			>
				<canvas ref={canvasRef} className="wg-snake__canvas" aria-label={ar ? 'لعبة الثعبان' : 'Snake game'} />
				{status !== 'running' ? (
					<div className="wg-over">
						<p className="wg-over__title">
							{status === 'over' ? (ar ? 'انتهت اللعبة' : 'Game over') : status === 'paused' ? (ar ? 'متوقفة مؤقتًا' : 'Paused') : ar ? 'الثعبان' : 'Snake'}
						</p>
						<p className="wg-over__sub">
							{status === 'over'
								? ar ? `نقاطك ${score}` : `Score ${score}`
								: ar ? 'كُل النقاط الحمراء ولا تصطدم بالجدار أو بنفسك' : 'Eat the red dots, avoid the walls and yourself'}
						</p>
						<div className="wg-over__actions">
							<button type="button" className="wg-btn wg-btn--primary" onClick={status === 'over' ? restart : () => setStatus('running')}>
								{status === 'over' ? (ar ? 'العب مجددًا' : 'Play again') : status === 'paused' ? (ar ? 'استئناف' : 'Resume') : ar ? 'ابدأ' : 'Start'}
							</button>
						</div>
					</div>
				) : null}
			</div>
			<p className="wg-hint">{ar ? 'الأسهم أو اسحب للتحكم · المسافة للإيقاف' : 'Arrow keys or swipe to steer · Space to pause'}</p>
		</div>
	);
}
