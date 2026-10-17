/*
 * Small, complete chess rules engine + alpha-beta search for the games corner.
 * Squares are 0..63, index = row * 8 + col, row 0 = rank 8 (Black's back rank).
 * Pieces are strings: colour + type, e.g. 'wK', 'bP'.
 */

export const FILES = 'abcdefgh';
export const VALUE = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const on = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
export const other = color => (color === 'w' ? 'b' : 'w');
export const sqName = i => FILES[i & 7] + (8 - (i >> 3));

export function initialState() {
	const board = Array(64).fill(null);
	START.split('/').forEach((row, r) => {
		let c = 0;
		for (const ch of row) {
			if (/\d/.test(ch)) c += Number(ch);
			else {
				board[r * 8 + c] = (ch === ch.toUpperCase() ? 'w' : 'b') + ch.toUpperCase();
				c += 1;
			}
		}
	});
	return { board, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1, half: 0, moveNo: 1 };
}

/** Is `sq` attacked by any piece of colour `by`? */
export function isAttacked(board, sq, by) {
	const r = sq >> 3;
	const c = sq & 7;
	const pr = by === 'w' ? r + 1 : r - 1;
	for (const dc of [-1, 1]) if (on(pr, c + dc) && board[pr * 8 + c + dc] === `${by}P`) return true;
	for (const [dr, dc] of KNIGHT) if (on(r + dr, c + dc) && board[(r + dr) * 8 + c + dc] === `${by}N`) return true;
	for (const [dr, dc] of KING) if (on(r + dr, c + dc) && board[(r + dr) * 8 + c + dc] === `${by}K`) return true;
	const ray = (dirs, types) => {
		for (const [dr, dc] of dirs) {
			let rr = r + dr;
			let cc = c + dc;
			while (on(rr, cc)) {
				const p = board[rr * 8 + cc];
				if (p) {
					if (p[0] === by && types.includes(p[1])) return true;
					break;
				}
				rr += dr;
				cc += dc;
			}
		}
		return false;
	};
	return ray(DIAG, 'BQ') || ray(ORTH, 'RQ');
}

export const kingSquare = (board, color) => board.indexOf(`${color}K`);
export const inCheck = (state, color = state.turn) => isAttacked(state.board, kingSquare(state.board, color), other(color));

function pseudoMoves(state, from, out) {
	const { board, turn } = state;
	const p = board[from];
	if (!p || p[0] !== turn) return;
	const r = from >> 3;
	const c = from & 7;
	const type = p[1];
	const foe = other(turn);
	const add = (to, extra) => out.push({ from, to, piece: p, captured: board[to] || null, ...extra });

	if (type === 'P') {
		const dir = turn === 'w' ? -1 : 1;
		const lastRow = turn === 'w' ? 0 : 7;
		const push = (to, extra) => {
			if (to >> 3 === lastRow) for (const promo of ['Q', 'R', 'B', 'N']) add(to, { ...extra, promo });
			else add(to, extra);
		};
		if (on(r + dir, c) && !board[(r + dir) * 8 + c]) {
			push((r + dir) * 8 + c);
			const two = (r + 2 * dir) * 8 + c;
			if (r === (turn === 'w' ? 6 : 1) && !board[two]) add(two, { double: true });
		}
		for (const dc of [-1, 1]) {
			if (!on(r + dir, c + dc)) continue;
			const to = (r + dir) * 8 + c + dc;
			if (board[to] && board[to][0] === foe) push(to);
			else if (to === state.ep) add(to, { enPassant: true, captured: `${foe}P` });
		}
		return;
	}

	if (type === 'N' || type === 'K') {
		for (const [dr, dc] of type === 'N' ? KNIGHT : KING) {
			if (!on(r + dr, c + dc)) continue;
			const to = (r + dr) * 8 + c + dc;
			if (!board[to] || board[to][0] === foe) add(to);
		}
		const base = turn === 'w' ? 56 : 0;
		if (type === 'K' && from === base + 4 && !isAttacked(board, from, foe)) {
			if (state.castle[`${turn}K`] && !board[base + 5] && !board[base + 6] && board[base + 7] === `${turn}R` && !isAttacked(board, base + 5, foe) && !isAttacked(board, base + 6, foe)) {
				add(base + 6, { castle: 'K' });
			}
			if (state.castle[`${turn}Q`] && !board[base + 3] && !board[base + 2] && !board[base + 1] && board[base] === `${turn}R` && !isAttacked(board, base + 3, foe) && !isAttacked(board, base + 2, foe)) {
				add(base + 2, { castle: 'Q' });
			}
		}
		return;
	}

	const dirs = type === 'B' ? DIAG : type === 'R' ? ORTH : [...DIAG, ...ORTH];
	for (const [dr, dc] of dirs) {
		let rr = r + dr;
		let cc = c + dc;
		while (on(rr, cc)) {
			const to = rr * 8 + cc;
			if (board[to]) {
				if (board[to][0] === foe) add(to);
				break;
			}
			add(to);
			rr += dr;
			cc += dc;
		}
	}
}

export function applyMove(state, m) {
	const b = state.board.slice();
	const color = m.piece[0];
	b[m.from] = null;
	b[m.to] = m.promo ? color + m.promo : m.piece;
	if (m.enPassant) b[m.to + (color === 'w' ? 8 : -8)] = null;
	if (m.castle) {
		const base = color === 'w' ? 56 : 0;
		if (m.castle === 'K') {
			b[base + 5] = b[base + 7];
			b[base + 7] = null;
		} else {
			b[base + 3] = b[base];
			b[base] = null;
		}
	}
	const castle = { ...state.castle };
	if (m.piece[1] === 'K') {
		castle[`${color}K`] = false;
		castle[`${color}Q`] = false;
	}
	for (const sq of [m.from, m.to]) {
		if (sq === 63) castle.wK = false;
		if (sq === 56) castle.wQ = false;
		if (sq === 7) castle.bK = false;
		if (sq === 0) castle.bQ = false;
	}
	return {
		board: b,
		turn: other(color),
		castle,
		ep: m.double ? (m.from + m.to) / 2 : -1,
		half: m.piece[1] === 'P' || m.captured ? 0 : state.half + 1,
		moveNo: state.moveNo + (color === 'b' ? 1 : 0),
	};
}

/** Legal moves for the side to move (optionally only from one square). */
export function legalMoves(state, from = -1) {
	const pseudo = [];
	if (from >= 0) pseudoMoves(state, from, pseudo);
	else for (let i = 0; i < 64; i += 1) pseudoMoves(state, i, pseudo);
	const me = state.turn;
	return pseudo.filter(m => {
		const next = applyMove(state, m);
		return !isAttacked(next.board, kingSquare(next.board, me), other(me));
	});
}

function insufficient(board) {
	const rest = board.filter(p => p && p[1] !== 'K');
	return rest.length === 0 || (rest.length === 1 && (rest[0][1] === 'B' || rest[0][1] === 'N'));
}

/** 'play' | 'checkmate' | 'stalemate' | 'material' | 'fifty' */
export function gameStatus(state) {
	if (!legalMoves(state).length) return inCheck(state) ? 'checkmate' : 'stalemate';
	if (insufficient(state.board)) return 'material';
	if (state.half >= 100) return 'fifty';
	return 'play';
}

export function material(board, color) {
	return board.reduce((sum, p) => (p && p[0] === color ? sum + VALUE[p[1]] : sum), 0) / 100;
}

/** Standard algebraic notation (Nf3, exd5, O-O, e8=Q+, Qh7#). */
export function toSan(state, m) {
	let s;
	if (m.castle) s = m.castle === 'K' ? 'O-O' : 'O-O-O';
	else {
		const t = m.piece[1];
		if (t === 'P') s = m.captured ? `${FILES[m.from & 7]}x` : '';
		else {
			const twins = legalMoves(state).filter(o => o.piece === m.piece && o.to === m.to && o.from !== m.from);
			let dis = '';
			if (twins.length) {
				if (twins.every(o => (o.from & 7) !== (m.from & 7))) dis = FILES[m.from & 7];
				else if (twins.every(o => o.from >> 3 !== m.from >> 3)) dis = String(8 - (m.from >> 3));
				else dis = sqName(m.from);
			}
			s = t + dis + (m.captured ? 'x' : '');
		}
		s += sqName(m.to);
		if (m.promo) s += `=${m.promo}`;
	}
	const next = applyMove(state, m);
	if (inCheck(next)) s += legalMoves(next).length ? '+' : '#';
	return s;
}

/* ─── Search ───────────────────────────────────────────────────── */
const MATE = 100000;

function evaluate(board) {
	let score = 0;
	for (let i = 0; i < 64; i += 1) {
		const p = board[i];
		if (!p) continue;
		const r = i >> 3;
		const c = i & 7;
		const t = p[1];
		const centre = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5));
		let v = VALUE[t];
		if (t === 'N') v += centre * 12;
		else if (t === 'B') v += centre * 6;
		else if (t === 'Q') v += centre * 3;
		else if (t === 'K') v -= centre * 10;
		else if (t === 'P') {
			const adv = p[0] === 'w' ? 6 - r : r - 1;
			v += adv * 8 + (c >= 2 && c <= 5 ? adv * 3 : 0);
		}
		score += p[0] === 'w' ? v : -v;
	}
	return score;
}

const ordered = moves =>
	moves.sort((a, b) => (b.captured ? VALUE[b.captured[1]] * 10 - VALUE[b.piece[1]] : 0) + (b.promo === 'Q' ? 800 : 0) - ((a.captured ? VALUE[a.captured[1]] * 10 - VALUE[a.piece[1]] : 0) + (a.promo === 'Q' ? 800 : 0)));

/** Captures-only search so the engine doesn't stop counting in the middle of a trade. */
function quiesce(state, alpha, beta, depth) {
	const stand = (state.turn === 'w' ? 1 : -1) * evaluate(state.board);
	if (stand >= beta) return beta;
	if (stand > alpha) alpha = stand;
	if (depth <= 0) return alpha;
	const captures = ordered(legalMoves(state).filter(m => m.captured || m.promo === 'Q'));
	for (const m of captures) {
		const v = -quiesce(applyMove(state, m), -beta, -alpha, depth - 1);
		if (v >= beta) return beta;
		if (v > alpha) alpha = v;
	}
	return alpha;
}

function negamax(state, depth, alpha, beta, ply) {
	if (depth === 0) return quiesce(state, alpha, beta, 3);
	const moves = legalMoves(state);
	if (!moves.length) return inCheck(state) ? -MATE + ply : 0;
	if (state.half >= 100) return 0;
	let best = -Infinity;
	for (const m of ordered(moves)) {
		const v = -negamax(applyMove(state, m), depth - 1, -beta, -alpha, ply + 1);
		if (v > best) best = v;
		if (v > alpha) alpha = v;
		if (alpha >= beta) break;
	}
	return best;
}

/** Best move for the side to move. `slack` (centipawns) picks randomly among near-best moves. */
export function bestMove(state, depth, { slack = 0, blunder = 0 } = {}) {
	const moves = ordered(legalMoves(state));
	if (!moves.length) return null;
	if (blunder && Math.random() < blunder) return moves[Math.floor(Math.random() * moves.length)];
	if (!slack) {
		// Narrow window: later moves only prove "not better", so keep the first strict best.
		let alpha = -Infinity;
		let best = moves[0];
		for (const m of moves) {
			const v = -negamax(applyMove(state, m), depth - 1, -Infinity, -alpha, 1);
			if (v > alpha) {
				alpha = v;
				best = m;
			}
		}
		return best;
	}
	// Full window so every score is exact, then pick among the near-best.
	const scored = moves.map(m => [-negamax(applyMove(state, m), depth - 1, -Infinity, Infinity, 1), m]);
	const top = Math.max(...scored.map(([v]) => v));
	const pool = scored.filter(([v]) => v >= top - slack);
	return pool[Math.floor(Math.random() * pool.length)][1];
}
