'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, RotateCcw } from 'lucide-react';
import { isTypingTarget, loadBest, saveBest } from './game-utils';
import { WORLD, readTheme, useCanvasLoop, worldX } from './canvas-loop';

const COLS = 7;
const ROWS = 5;
const PAD_W = 72;
const PAD_H = 10;
const PAD_Y = WORLD - 28;
const BALL_R = 6;
const BRICK_H = 16;
const GAP = 6;
const TOP = 48;
const ROW_TONES = ['#f15c6d', '#f5a524', '#ffd24d', '#25d366', '#3b9ef5'];

function makeBricks() {
	const w = (WORLD - GAP * (COLS + 1)) / COLS;
	const list = [];
	for (let r = 0; r < ROWS; r += 1) {
		for (let c = 0; c < COLS; c += 1) {
			list.push({ x: GAP + c * (w + GAP), y: TOP + r * (BRICK_H + GAP), w, h: BRICK_H, row: r, alive: true });
		}
	}
	return list;
}

function freshWorld(level = 1) {
	return {
		pad: WORLD / 2 - PAD_W / 2,
		ball: { x: WORLD / 2, y: PAD_Y - BALL_R - 1, vx: 0, vy: 0, stuck: true },
		bricks: makeBricks(),
		speed: 250 + (level - 1) * 30,
		keys: { left: false, right: false },
	};
}

export default function Breakout({ ar }) {
	const canvasRef = useRef(null);
	const world = useRef(freshWorld());
	const [score, setScore] = useState(0);
	const [lives, setLives] = useState(3);
	const [level, setLevel] = useState(1);
	const [best, setBest] = useState(() => loadBest('breakout'));
	const [status, setStatus] = useState('playing'); // playing | over
	const scoreRef = useRef(0);
	const livesRef = useRef(3);

	const launch = useCallback(() => {
		const b = world.current.ball;
		if (!b.stuck || status !== 'playing') return;
		const angle = (-Math.PI / 2) + (Math.random() * 0.8 - 0.4);
		b.vx = Math.cos(angle) * world.current.speed;
		b.vy = Math.sin(angle) * world.current.speed;
		b.stuck = false;
	}, [status]);

	const update = dt => {
		const w = world.current;
		const step = 380 * dt;
		if (w.keys.left) w.pad -= step;
		if (w.keys.right) w.pad += step;
		w.pad = Math.max(0, Math.min(WORLD - PAD_W, w.pad));
		const b = w.ball;
		if (b.stuck) {
			b.x = w.pad + PAD_W / 2;
			b.y = PAD_Y - BALL_R - 1;
			return;
		}
		b.x += b.vx * dt;
		b.y += b.vy * dt;
		// walls
		if (b.x < BALL_R) {
			b.x = BALL_R;
			b.vx = Math.abs(b.vx);
		}
		if (b.x > WORLD - BALL_R) {
			b.x = WORLD - BALL_R;
			b.vx = -Math.abs(b.vx);
		}
		if (b.y < BALL_R) {
			b.y = BALL_R;
			b.vy = Math.abs(b.vy);
		}
		// paddle: the bounce angle depends on where the ball lands
		if (b.vy > 0 && b.y + BALL_R >= PAD_Y && b.y + BALL_R <= PAD_Y + PAD_H + 6 && b.x >= w.pad - BALL_R && b.x <= w.pad + PAD_W + BALL_R) {
			const hit = (b.x - (w.pad + PAD_W / 2)) / (PAD_W / 2);
			const angle = -Math.PI / 2 + hit * 1.05;
			const sp = Math.hypot(b.vx, b.vy);
			b.vx = Math.cos(angle) * sp;
			b.vy = Math.sin(angle) * sp;
			b.y = PAD_Y - BALL_R;
		}
		// bricks
		for (const br of w.bricks) {
			if (!br.alive) continue;
			if (b.x + BALL_R < br.x || b.x - BALL_R > br.x + br.w || b.y + BALL_R < br.y || b.y - BALL_R > br.y + br.h) continue;
			br.alive = false;
			const overlapX = Math.min(b.x + BALL_R - br.x, br.x + br.w - (b.x - BALL_R));
			const overlapY = Math.min(b.y + BALL_R - br.y, br.y + br.h - (b.y - BALL_R));
			if (overlapX < overlapY) b.vx = -b.vx;
			else b.vy = -b.vy;
			scoreRef.current += (ROWS - br.row) * 10;
			setScore(scoreRef.current);
			break;
		}
		if (w.bricks.every(br => !br.alive)) {
			const next = level + 1;
			setLevel(next);
			const pad = w.pad;
			world.current = { ...freshWorld(next), pad };
			return;
		}
		// missed
		if (b.y > WORLD + BALL_R * 2) {
			livesRef.current = Math.max(0, livesRef.current - 1);
			setLives(livesRef.current);
			if (!livesRef.current) {
				setStatus('over');
				setBest(saveBest('breakout', scoreRef.current));
			}
			b.stuck = true;
		}
	};

	const draw = ctx => {
		const t = readTheme(canvasRef.current);
		const w = world.current;
		ctx.fillStyle = t.board;
		ctx.fillRect(0, 0, WORLD, WORLD);
		for (const br of w.bricks) {
			if (!br.alive) continue;
			ctx.fillStyle = ROW_TONES[br.row % ROW_TONES.length];
			ctx.beginPath();
			ctx.roundRect ? ctx.roundRect(br.x, br.y, br.w, br.h, 5) : ctx.rect(br.x, br.y, br.w, br.h);
			ctx.fill();
		}
		ctx.fillStyle = t.strong;
		ctx.beginPath();
		ctx.roundRect ? ctx.roundRect(w.pad, PAD_Y, PAD_W, PAD_H, 5) : ctx.rect(w.pad, PAD_Y, PAD_W, PAD_H);
		ctx.fill();
		ctx.fillStyle = t.ink;
		ctx.beginPath();
		ctx.arc(w.ball.x, w.ball.y, BALL_R, 0, Math.PI * 2);
		ctx.fill();
		if (w.ball.stuck && status === 'playing') {
			ctx.fillStyle = t.muted;
			ctx.font = '600 14px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(ar ? 'اضغط أو المسافة للإطلاق' : 'Click or press Space to launch', WORLD / 2, WORLD / 2 + 40);
		}
	};

	useCanvasLoop(canvasRef, { running: status === 'playing', update, draw });

	useEffect(() => {
		const onKey = (event, down) => {
			if (isTypingTarget(event.target)) return;
			if (event.key === 'ArrowLeft' || event.key === 'a') {
				world.current.keys.left = down;
				event.preventDefault();
			} else if (event.key === 'ArrowRight' || event.key === 'd') {
				world.current.keys.right = down;
				event.preventDefault();
			} else if (event.key === ' ' && down) {
				event.preventDefault();
				launch();
			}
		};
		const kd = e => onKey(e, true);
		const ku = e => onKey(e, false);
		window.addEventListener('keydown', kd);
		window.addEventListener('keyup', ku);
		return () => {
			window.removeEventListener('keydown', kd);
			window.removeEventListener('keyup', ku);
		};
	}, [launch]);

	const restart = () => {
		world.current = freshWorld(1);
		scoreRef.current = 0;
		livesRef.current = 3;
		setScore(0);
		setLives(3);
		setLevel(1);
		setStatus('playing');
	};

	return (
		<div className="wg-breakout">
			<div className="wg-bar">
				<div className="wg-scores">
					<span className="wg-score">
						<small>{ar ? 'النقاط' : 'Score'}</small>
						<b>{score}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'المرحلة' : 'Level'}</small>
						<b>{level}</b>
					</span>
					<span className="wg-score">
						<small>{ar ? 'الأفضل' : 'Best'}</small>
						<b>{best}</b>
					</span>
				</div>
				<span className="wg-lives" aria-label={ar ? `${lives} محاولات` : `${lives} lives`}>
					{[0, 1, 2].map(i => (
						<Heart key={i} size={18} fill={i < lives ? 'currentColor' : 'none'} aria-hidden />
					))}
				</span>
			</div>
			<div
				className="wg-canvas-board"
				onPointerMove={event => {
					world.current.pad = Math.max(0, Math.min(WORLD - PAD_W, worldX(event, canvasRef.current) - PAD_W / 2));
				}}
				onPointerDown={event => {
					world.current.pad = Math.max(0, Math.min(WORLD - PAD_W, worldX(event, canvasRef.current) - PAD_W / 2));
					launch();
				}}
			>
				<canvas ref={canvasRef} className="wg-canvas" aria-label={ar ? 'لعبة كسر الطوب' : 'Breakout game'} />
				{status === 'over' ? (
					<div className="wg-over">
						<p className="wg-over__title">{ar ? 'انتهت المحاولات' : 'Game over'}</p>
						<p className="wg-over__sub">{ar ? `نقاطك ${score} · المرحلة ${level}` : `Score ${score} · level ${level}`}</p>
						<div className="wg-over__actions">
							<button type="button" className="wg-btn wg-btn--primary" onClick={restart}>
								{ar ? 'العب مجددًا' : 'Play again'}
							</button>
						</div>
					</div>
				) : null}
			</div>
			<div className="wg-row">
				<button type="button" className="wg-btn" onClick={restart}>
					<RotateCcw size={16} aria-hidden />
					{ar ? 'جديدة' : 'New game'}
				</button>
			</div>
		</div>
	);
}
