'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { isTypingTarget, loadBest, saveBest } from './game-utils';
import { WORLD, readTheme, useCanvasLoop } from './canvas-loop';

const GRAVITY = 1250;
const FLAP = -380;
const PIPE_W = 54;
const GAP = 128;
const SPEED = 140;
const SPAWN = 1.45;
const BIRD_X = 110;
const R = 13;
const GROUND = WORLD - 26;

function freshWorld() {
	return { y: WORLD / 2 - 30, vy: 0, pipes: [], timer: SPAWN * 0.6, t: 0, score: 0 };
}

export default function Flappy({ ar }) {
	const canvasRef = useRef(null);
	const world = useRef(freshWorld());
	const [status, setStatus] = useState('ready'); // ready | playing | over
	const [score, setScore] = useState(0);
	const [best, setBest] = useState(() => loadBest('flappy'));

	const flap = useCallback(() => {
		if (status === 'over') return;
		if (status === 'ready') setStatus('playing');
		world.current.vy = FLAP;
	}, [status]);

	const restart = () => {
		world.current = freshWorld();
		setScore(0);
		setStatus('ready');
	};

	const update = dt => {
		const w = world.current;
		w.t += dt;
		if (status !== 'playing') {
			w.y = WORLD / 2 - 30 + Math.sin(w.t * 3) * 6; // idle hover
			return;
		}
		w.vy += GRAVITY * dt;
		w.y += w.vy * dt;
		w.timer -= dt;
		if (w.timer <= 0) {
			w.timer = SPAWN;
			const top = 50 + Math.random() * (GROUND - GAP - 100);
			w.pipes.push({ x: WORLD + 10, top, scored: false });
		}
		for (const p of w.pipes) {
			p.x -= SPEED * dt;
			if (!p.scored && p.x + PIPE_W < BIRD_X - R) {
				p.scored = true;
				w.score += 1;
				setScore(w.score);
			}
		}
		w.pipes = w.pipes.filter(p => p.x > -PIPE_W - 10);
		const hitPipe = w.pipes.some(
			p => BIRD_X + R > p.x && BIRD_X - R < p.x + PIPE_W && (w.y - R < p.top || w.y + R > p.top + GAP),
		);
		if (hitPipe || w.y + R >= GROUND || w.y - R <= 0) {
			setStatus('over');
			setBest(saveBest('flappy', w.score));
		}
	};

	const draw = ctx => {
		const t = readTheme(canvasRef.current);
		const w = world.current;
		ctx.fillStyle = t.board;
		ctx.fillRect(0, 0, WORLD, WORLD);
		// soft clouds
		ctx.fillStyle = t.grid;
		for (let i = 0; i < 3; i += 1) {
			const cx = ((i * 160 - w.t * 18) % (WORLD + 120) + WORLD + 120) % (WORLD + 120) - 60;
			ctx.beginPath();
			ctx.ellipse(cx, 70 + i * 55, 46, 16, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		// pipes
		for (const p of w.pipes) {
			ctx.fillStyle = t.strong;
			ctx.beginPath();
			ctx.roundRect ? ctx.roundRect(p.x, -10, PIPE_W, p.top + 10, 8) : ctx.rect(p.x, 0, PIPE_W, p.top);
			ctx.fill();
			ctx.beginPath();
			ctx.roundRect ? ctx.roundRect(p.x, p.top + GAP, PIPE_W, GROUND - (p.top + GAP) + 10, 8) : ctx.rect(p.x, p.top + GAP, PIPE_W, GROUND - p.top - GAP);
			ctx.fill();
		}
		// ground
		ctx.fillStyle = t.grid;
		ctx.fillRect(0, GROUND, WORLD, WORLD - GROUND);
		// the bird: a little chat bubble that tilts with its speed
		ctx.save();
		ctx.translate(BIRD_X, w.y);
		ctx.rotate(Math.max(-0.5, Math.min(0.9, w.vy / 600)));
		ctx.fillStyle = t.accent;
		ctx.beginPath();
		ctx.arc(0, 0, R, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.moveTo(-R * 0.7, R * 0.55);
		ctx.lineTo(-R * 1.15, R * 1.05);
		ctx.lineTo(-R * 0.15, R * 0.85);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = '#ffffff';
		[-5, 0, 5].forEach(x => {
			ctx.beginPath();
			ctx.arc(x, 0, 1.9, 0, Math.PI * 2);
			ctx.fill();
		});
		ctx.restore();
		// score
		if (status === 'playing') {
			ctx.fillStyle = t.ink;
			ctx.font = '800 34px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(String(w.score), WORLD / 2, 60);
		}
	};

	useCanvasLoop(canvasRef, { running: status !== 'over', update, draw });

	useEffect(() => {
		const onKey = event => {
			if (isTypingTarget(event.target)) return;
			if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w') {
				event.preventDefault();
				if (status === 'over') restart();
				else flap();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [flap, status]);

	return (
		<div className="wg-flappy">
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
			</div>
			<div className="wg-canvas-board" onPointerDown={() => (status === 'over' ? null : flap())}>
				<canvas ref={canvasRef} className="wg-canvas" aria-label={ar ? 'لعبة الطيران' : 'Flappy game'} />
				{status === 'ready' ? (
					<div className="wg-over wg-over--soft">
						<p className="wg-over__title">{ar ? 'اضغط لتطير' : 'Tap to fly'}</p>
						<p className="wg-over__sub">{ar ? 'اضغط أو المسافة لترتفع، ومُرّ بين الأعمدة' : 'Tap or press Space to rise, slip between the pipes'}</p>
					</div>
				) : null}
				{status === 'over' ? (
					<div className="wg-over">
						<p className="wg-over__title">{ar ? 'اصطدمت!' : 'Crashed!'}</p>
						<p className="wg-over__sub">{ar ? `نقاطك ${score}` : `Score ${score}`}</p>
						<div className="wg-over__actions">
							<button type="button" className="wg-btn wg-btn--primary" onClick={restart}>
								{ar ? 'العب مجددًا' : 'Play again'}
							</button>
						</div>
					</div>
				) : null}
			</div>
			<p className="wg-hint">{ar ? 'اضغط على اللوحة أو المسافة لترتفع' : 'Tap the board or press Space to rise'}</p>
		</div>
	);
}
