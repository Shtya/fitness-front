'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, GraduationCap, Lightbulb, RefreshCw, RotateCcw, Undo2, X } from 'lucide-react';
import { applyMove, bestMove, gameStatus, inCheck, initialState, isAttacked, kingSquare, legalMoves, material, other, sqName, toSan } from './chess-engine';
import { ChessPiece, ChessPieceDefs } from './chess-pieces';

/** Stable id per piece (its starting square) so a moved piece keeps its DOM node and can slide. */
const startIds = () => initialState().board.map((p, i) => (p ? i : null));

function moveIds(ids, m) {
	const n = ids.slice();
	if (m.enPassant) n[m.to + (m.piece[0] === 'w' ? 8 : -8)] = null;
	n[m.to] = n[m.from];
	n[m.from] = null;
	if (m.castle) {
		const base = m.piece[0] === 'w' ? 56 : 0;
		if (m.castle === 'K') {
			n[base + 5] = n[base + 7];
			n[base + 7] = null;
		} else {
			n[base + 3] = n[base];
			n[base] = null;
		}
	}
	return n;
}
const LEVELS = {
	easy: { depth: 1, slack: 120, blunder: 0.25 },
	medium: { depth: 2, slack: 25 },
	hard: { depth: 3 },
};

const PIECES = {
	en: {
		K: { name: 'King', value: '∞', how: 'Moves one square in any direction. It can never move into check.', why: 'The most important piece — if it is checkmated, the game is over.' },
		Q: { name: 'Queen', value: '9', how: 'Moves any number of squares in a straight line or diagonally.', why: 'The strongest piece. Don’t bring it out too early or it gets chased around.' },
		R: { name: 'Rook', value: '5', how: 'Moves any number of squares straight: up, down, left or right.', why: 'Loves open files (columns with no pawns) and the 7th rank.' },
		B: { name: 'Bishop', value: '3', how: 'Moves any number of squares diagonally. It always stays on the same colour.', why: 'Strong on long open diagonals. Two bishops together are a big plus.' },
		N: { name: 'Knight', value: '3', how: 'Jumps in an “L”: two squares one way, then one square sideways. It is the only piece that jumps over others.', why: 'Best near the centre — “a knight on the rim is dim”.' },
		P: { name: 'Pawn', value: '1', how: 'Moves forward one square (two on its first move) but captures one square diagonally forward.', why: 'Reach the last row and it promotes — usually to a queen!' },
	},
	ar: {
		K: { name: 'الملك', value: '∞', how: 'يتحرك خانة واحدة في أي اتجاه، ولا يجوز أن يتحرك إلى خانة مهددة (كش).', why: 'أهم قطعة: إذا حصل عليه «كش مات» تنتهي اللعبة.' },
		Q: { name: 'الوزير', value: '9', how: 'يتحرك أي عدد من الخانات في خط مستقيم أو قطري.', why: 'أقوى قطعة. لا تُخرجه مبكرًا حتى لا يطارده الخصم.' },
		R: { name: 'الطابية', value: '5', how: 'تتحرك أي عدد من الخانات في خط مستقيم: للأمام أو الخلف أو الجانبين.', why: 'تحب الأعمدة المفتوحة (بلا عساكر) والصف السابع.' },
		B: { name: 'الفيل', value: '3', how: 'يتحرك أي عدد من الخانات قُطريًا، ويبقى دائمًا على نفس اللون.', why: 'قوي على الأقطار الطويلة المفتوحة، والفيلان معًا ميزة كبيرة.' },
		N: { name: 'الحصان', value: '3', how: 'يقفز على شكل حرف «L»: خانتين في اتجاه ثم خانة جانبية. القطعة الوحيدة التي تقفز فوق غيرها.', why: 'أفضل مكان له قرب المنتصف، وعلى الحافة يصبح ضعيفًا.' },
		P: { name: 'العسكري', value: '1', how: 'يتقدم خانة للأمام (أو خانتين في أول حركة) لكنه يأكل قُطريًا للأمام.', why: 'إذا وصل للصف الأخير يترقّى، غالبًا إلى وزير!' },
	},
};

const LESSONS = {
	en: [
		{
			id: 'goal',
			tab: 'Goal',
			title: 'What is the goal?',
			body: [
				'Chess is played by two sides, White and Black, on an 8×8 board. White always moves first, then you take turns — one move each.',
				'You win by checkmating the enemy king: attacking it so that it has no way to escape.',
				'You never actually capture the king. The game ends the moment it is trapped.',
				'Capture enemy pieces by moving onto their square. Each piece has a value (pawn 1, knight 3, bishop 3, rook 5, queen 9) — having more “points” usually means you are winning.',
			],
		},
		{ id: 'pieces', tab: 'Pieces', title: 'How the pieces move', pieces: true },
		{
			id: 'special',
			tab: 'Special moves',
			title: 'Three special moves',
			body: [
				'Castling: once per game, move the king two squares toward a rook and the rook jumps to the other side of the king. Allowed only if neither piece has moved, the squares between are empty, and the king is not in check or passing through an attacked square. Here: tap the king, then the square two steps sideways.',
				'Promotion: a pawn that reaches the last row becomes a queen, rook, bishop or knight — you choose.',
				'En passant: if an enemy pawn moves two squares and lands right next to your pawn, you may capture it as if it had moved only one — but only on the very next move.',
			],
		},
		{
			id: 'check',
			tab: 'Check & mate',
			title: 'Check, checkmate and draws',
			body: [
				'Check: the king is under attack. You must fix it right away by (1) moving the king, (2) blocking the attack with a piece, or (3) capturing the attacker.',
				'Checkmate: the king is in check and none of those three fixes is possible. Game over — whoever delivered it wins.',
				'Stalemate: the side to move is NOT in check but has no legal move. That is a draw, so be careful when you are far ahead!',
				'Other draws: only kings left (not enough pieces to mate), or 50 moves each without a capture or pawn move.',
			],
		},
		{
			id: 'tips',
			tab: 'How to win',
			title: 'Simple plan to start winning',
			body: [
				'1. Take the centre: start with a central pawn (e4 or d4).',
				'2. Develop: bring knights and bishops out before moving the queen, and don’t move the same piece twice early on.',
				'3. Castle early to keep your king safe.',
				'4. Before every move ask: “What does my opponent threaten?” and “Is the square I’m moving to safe?” — orange dots in this game warn you.',
				'5. Look for checks, captures and threats — in that order — for both sides.',
				'6. When you are ahead, trade pieces; when behind, keep them on the board.',
				'7. Endgame: push your passed pawns and bring your king into the fight.',
			],
		},
	],
	ar: [
		{
			id: 'goal',
			tab: 'الهدف',
			title: 'ما هدف اللعبة؟',
			body: [
				'الشطرنج بين لاعبين: الأبيض والأسود، على لوحة 8×8. الأبيض يبدأ دائمًا، ثم يتبادل اللاعبان الأدوار، حركة لكل واحد.',
				'تفوز عندما تحاصر ملك الخصم «كش مات»: أي تهاجمه بحيث لا يجد أي مهرب.',
				'الملك لا يُؤكل فعليًا؛ اللعبة تنتهي لحظة محاصرته.',
				'تأكل قطع الخصم بالتحرك إلى خانتها. لكل قطعة قيمة (عسكري 1، حصان 3، فيل 3، طابية 5، وزير 9)، ومن معه نقاط أكثر غالبًا هو الأقرب للفوز.',
			],
		},
		{ id: 'pieces', tab: 'القطع', title: 'كيف تتحرك القطع', pieces: true },
		{
			id: 'special',
			tab: 'حركات خاصة',
			title: 'ثلاث حركات خاصة',
			body: [
				'التبييت (الكاستلنج): مرة واحدة في اللعبة، يتحرك الملك خانتين نحو الطابية وتقفز الطابية للجهة الأخرى منه. مسموح فقط إذا لم يتحرك الملك ولا الطابية، والخانات بينهما فارغة، والملك ليس في كش ولا يمر بخانة مهددة. هنا: اضغط الملك ثم الخانة التي تبعد خطوتين للجانب.',
				'الترقية: العسكري الذي يصل للصف الأخير يتحول إلى وزير أو طابية أو فيل أو حصان، وأنت تختار.',
				'الأخذ في الممر: إذا تقدّم عسكري الخصم خانتين ووقف بجوار عسكريك مباشرة، يمكنك أكله كأنه تحرك خانة واحدة، لكن في الحركة التالية فقط.',
			],
		},
		{
			id: 'check',
			tab: 'الكش والمات',
			title: 'الكش، الكش مات، والتعادل',
			body: [
				'الكش: الملك تحت الهجوم. يجب أن تنقذه فورًا بـ (1) تحريك الملك، أو (2) وضع قطعة تسد الطريق، أو (3) أكل القطعة المهاجمة.',
				'الكش مات: الملك في كش ولا يوجد أي حل من الثلاثة. انتهت اللعبة وفاز من فعلها.',
				'الـ«ستيل مِت» (الملك المخنوق): الدور على لاعب ملكه ليس في كش لكن لا توجد له أي حركة قانونية. النتيجة تعادل، فانتبه وأنت متقدم كثيرًا!',
				'تعادلات أخرى: بقاء الملكين فقط (قطع غير كافية للمات)، أو 50 حركة لكل لاعب بلا أكل ولا تحريك عسكري.',
			],
		},
		{
			id: 'tips',
			tab: 'إزاي تكسب',
			title: 'خطة بسيطة لتبدأ الفوز',
			body: [
				'1. سيطر على المنتصف: ابدأ بعسكري في المنتصف (e4 أو d4).',
				'2. طوّر قطعك: أخرج الأحصنة والأفيال قبل الوزير، ولا تحرك نفس القطعة مرتين في البداية.',
				'3. بيّت مبكرًا لتحمي ملكك.',
				'4. قبل كل حركة اسأل: «ماذا يهدد الخصم؟» و«هل الخانة التي سأذهب إليها آمنة؟» — النقاط البرتقالية في هذه اللعبة تنبّهك.',
				'5. ابحث عن الكش ثم الأكل ثم التهديد، لك وللخصم.',
				'6. إذا كنت متقدمًا بادل القطع، وإذا كنت متأخرًا حافظ عليها.',
				'7. في النهاية: ادفع عساكرك الحرة وأدخِل ملكك في المعركة.',
			],
		},
	],
};

const pieceName = (p, ar) => PIECES[ar ? 'ar' : 'en'][p[1]].name;

/** One-line, beginner-friendly reason for a move (used by hints and the coach). */
function explain(state, m, ar) {
	const next = applyMove(state, m);
	const parts = [];
	const mated = inCheck(next) && !legalMoves(next).length;
	if (mated) return ar ? 'كش مات! هذه الحركة تنهي اللعبة لصالحك.' : 'Checkmate! This move wins the game.';
	if (m.captured) parts.push(ar ? `تأكل ${pieceName(m.captured, ar)} الخصم (قيمته ${PIECES.ar[m.captured[1]].value}).` : `Captures the ${pieceName(m.captured, ar).toLowerCase()} (worth ${PIECES.en[m.captured[1]].value}).`);
	if (m.promo) parts.push(ar ? 'ترقّي العسكري إلى وزير!' : 'Promotes the pawn to a queen!');
	if (m.castle) parts.push(ar ? 'التبييت يحمي الملك ويُدخل الطابية في اللعب.' : 'Castling tucks the king away and brings the rook into play.');
	if (inCheck(next)) parts.push(ar ? 'تضع ملك الخصم في كش.' : 'Puts the enemy king in check.');
	const me = m.piece[0];
	if (!m.captured && isAttacked(state.board, m.from, other(me)) && !isAttacked(next.board, m.to, other(me)) && m.piece[1] !== 'K') {
		parts.push(ar ? 'تُبعد القطعة عن الخطر.' : 'Moves the piece out of danger.');
	}
	// Does it guard a piece the opponent is attacking and that had no defender?
	const foe = other(me);
	for (let sq = 0; sq < 64 && !parts.length; sq += 1) {
		const p = next.board[sq];
		if (!p || p[0] !== me || sq === m.to || p[1] === 'K') continue;
		if (isAttacked(next.board, sq, foe) && !isAttacked(state.board, sq, me) && isAttacked(next.board, sq, me)) {
			parts.push(ar ? `تحمي ${pieceName(p, ar)} في ${sqName(sq)} الذي يهاجمه الخصم.` : `Protects your ${pieceName(p, ar).toLowerCase()} on ${sqName(sq)}, which is under attack.`);
		}
	}
	if (!parts.length) {
		const backRank = me === 'w' ? 7 : 0;
		const col = m.to & 7;
		const row = m.to >> 3;
		if ((m.piece[1] === 'N' || m.piece[1] === 'B') && m.from >> 3 === backRank) parts.push(ar ? 'تطوّر قطعة جديدة نحو المنتصف.' : 'Develops a new piece toward the centre.');
		else if (m.piece[1] === 'P' && col >= 2 && col <= 5 && row >= 2 && row <= 5) parts.push(ar ? 'تسيطر على مساحة في المنتصف.' : 'Grabs space in the centre.');
		else parts.push(ar ? 'تحسّن مكان القطعة وتزيد نشاطها.' : 'Improves the piece and makes it more active.');
	}
	return parts.join(' ');
}

const STATUS_TEXT = {
	checkmate: (winner, ar) => (ar ? (winner ? 'كش مات — فزت! 🎉' : 'كش مات — فاز الجهاز') : winner ? 'Checkmate — you win! 🎉' : 'Checkmate — the computer wins'),
	stalemate: (_, ar) => (ar ? 'تعادل: الملك مخنوق (لا توجد حركة قانونية وليس في كش).' : 'Draw by stalemate: no legal move, but not in check.'),
	material: (_, ar) => (ar ? 'تعادل: لا توجد قطع كافية لعمل كش مات.' : 'Draw: not enough pieces left to checkmate.'),
	fifty: (_, ar) => (ar ? 'تعادل: 50 حركة بلا أكل ولا تحريك عسكري.' : 'Draw: 50 moves without a capture or pawn move.'),
};

function Lessons({ ar, onClose, startAt = 'goal' }) {
	const list = LESSONS[ar ? 'ar' : 'en'];
	const [tab, setTab] = useState(startAt);
	const lesson = list.find(l => l.id === tab) || list[0];
	const pieces = PIECES[ar ? 'ar' : 'en'];
	return (
		<div className="wg-help" role="dialog" aria-labelledby="wg-learn-title">
			<div className="wg-help__card wg-learn">
				<div className="wg-help__head">
					<span className="wg-stage__badge wg-tone-slate">
						<GraduationCap size={18} aria-hidden />
					</span>
					<h3 id="wg-learn-title">{ar ? 'اتعلّم الشطرنج' : 'Learn chess'}</h3>
					<button type="button" className="wg-icon" onClick={onClose} aria-label={ar ? 'إغلاق' : 'Close'}>
						<X size={18} aria-hidden />
					</button>
				</div>
				<div className="wg-learn__tabs" role="tablist">
					{list.map(l => (
						<button key={l.id} type="button" role="tab" aria-selected={l.id === tab} className={l.id === tab ? 'is-on' : ''} onClick={() => setTab(l.id)}>
							{l.tab}
						</button>
					))}
				</div>
				<section className="wg-help__sec" role="tabpanel">
					<h4>{lesson.title}</h4>
					{lesson.pieces ? (
						<ul className="wg-learn__pieces">
							{['K', 'Q', 'R', 'B', 'N', 'P'].map(t => (
								<li key={t}>
									<span className="wg-learn__glyph" aria-hidden>
										<ChessPiece p={`w${t}`} />
									</span>
									<span>
										<b>
											{pieces[t].name} <small>{ar ? `القيمة ${pieces[t].value}` : `value ${pieces[t].value}`}</small>
										</b>
										<span>{pieces[t].how}</span>
										<em>{pieces[t].why}</em>
									</span>
								</li>
							))}
						</ul>
					) : (
						<ul>
							{lesson.body.map(line => (
								<li key={line}>{line}</li>
							))}
						</ul>
					)}
				</section>
				<div className="wg-learn__nav">
					<button
						type="button"
						className="wg-btn wg-btn--primary"
						onClick={() => {
							const i = list.findIndex(l => l.id === tab);
							if (i < list.length - 1) setTab(list[i + 1].id);
							else onClose();
						}}
					>
						{list.findIndex(l => l.id === tab) < list.length - 1 ? (ar ? 'التالي' : 'Next') : ar ? 'يلا نلعب' : 'Let’s play'}
					</button>
				</div>
			</div>
		</div>
	);
}

export default function Chess({ ar }) {
	const [you, setYou] = useState('w');
	const [level, setLevel] = useState('easy');
	const [state, setState] = useState(initialState);
	const [ids, setIds] = useState(startIds);
	const [log, setLog] = useState([]); // [{ before, beforeIds, move, san, by }]
	const [selected, setSelected] = useState(-1);
	const [hint, setHint] = useState(null);
	const [thinking, setThinking] = useState(false);
	const [promo, setPromo] = useState(null); // candidate moves for a promotion
	const [showMoves, setShowMoves] = useState(true);
	const [learn, setLearn] = useState(null); // lesson id or null
	const [note, setNote] = useState(null); // last coach message about a move
	const timer = useRef(0);

	const status = useMemo(() => gameStatus(state), [state]);
	const yourTurn = state.turn === you && status === 'play';
	const checkSq = inCheck(state) ? kingSquare(state.board, state.turn) : -1;
	const last = log[log.length - 1]?.move;

	const moves = useMemo(() => (selected >= 0 && yourTurn ? legalMoves(state, selected) : []), [state, selected, yourTurn]);
	const targets = useMemo(() => {
		const map = new Map();
		for (const m of moves) {
			const next = applyMove(state, m);
			const risky = isAttacked(next.board, m.to, other(you));
			const prev = map.get(m.to);
			map.set(m.to, { capture: Boolean(m.captured), risky: prev ? prev.risky && risky : risky });
		}
		return map;
	}, [moves, state, you]);

	// Computer's turn.
	useEffect(() => {
		if (state.turn === you || status !== 'play') return undefined;
		setThinking(true);
		timer.current = window.setTimeout(() => {
			const m = bestMove(state, LEVELS[level].depth, LEVELS[level]);
			if (m) {
				const san = toSan(state, m);
				const next = applyMove(state, m);
				setLog(l => [...l, { before: state, beforeIds: ids, move: m, san, by: 'cpu' }]);
				setState(next);
				setIds(prev => moveIds(prev, m));
				const name = pieceName(m.piece, ar);
				let text = ar ? `الجهاز حرّك ${name} إلى ${sqName(m.to)} (${san})` : `The computer moved its ${name.toLowerCase()} to ${sqName(m.to)} (${san})`;
				if (m.captured) text += ar ? `، وأكل قطعتك: ${pieceName(m.captured, ar)}.` : ` and captured your ${pieceName(m.captured, ar).toLowerCase()}.`;
				else text += '.';
				if (m.castle) text += ar ? ' (تبييت لحماية ملكه).' : ' (castling to protect its king).';
				if (inCheck(next) && legalMoves(next).length) text += ar ? ' كش! ملكك مهدد: حرّكه، أو سُدّ الطريق، أو كُل المهاجم.' : ' Check! Your king is attacked: move it, block the attack, or capture the attacker.';
				setNote({ kind: inCheck(next) ? 'warn' : 'cpu', text });
			}
			setThinking(false);
		}, 350);
		return () => window.clearTimeout(timer.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state, you, status, level, ar]);

	const play = m => {
		const san = toSan(state, m);
		setLog(l => [...l, { before: state, beforeIds: ids, move: m, san, by: 'you' }]);
		setState(applyMove(state, m));
		setIds(prev => moveIds(prev, m));
		setSelected(-1);
		setHint(null);
		setPromo(null);
		setNote(null);
	};

	const click = sq => {
		if (dragged.current) {
			dragged.current = false;
			return;
		}
		if (!yourTurn || thinking) return;
		const p = state.board[sq];
		if (selected >= 0 && targets.has(sq)) {
			const options = moves.filter(m => m.to === sq);
			if (options.length > 1) setPromo(options);
			else play(options[0]);
			return;
		}
		setPromo(null);
		setHint(null);
		if (p && p[0] === you) setSelected(sq === selected ? -1 : sq);
		else setSelected(-1);
	};

	const restart = (side = you) => {
		window.clearTimeout(timer.current);
		setYou(side);
		setState(initialState());
		setIds(startIds());
		setLog([]);
		setSelected(-1);
		setHint(null);
		setPromo(null);
		setThinking(false);
		setNote(side === 'b' ? { kind: 'cpu', text: ar ? 'أنت بالأسود؛ الأبيض (الجهاز) يبدأ.' : 'You play Black; White (the computer) moves first.' } : null);
	};

	const undo = () => {
		window.clearTimeout(timer.current);
		// Go back to before your last move (yours + the computer's reply).
		let i = log.length - 1;
		while (i >= 0 && log[i].by !== 'you') i -= 1;
		if (i < 0) return;
		setState(log[i].before);
		setIds(log[i].beforeIds);
		setLog(log.slice(0, i));
		setSelected(-1);
		setHint(null);
		setPromo(null);
		setThinking(false);
		setNote({ kind: 'info', text: ar ? 'رجعنا حركتك الأخيرة. جرّب فكرة مختلفة!' : 'Took back your last move. Try a different idea!' });
	};

	const askHint = () => {
		if (!yourTurn) return;
		const m = bestMove(state, 2);
		if (!m) return;
		setSelected(m.from);
		setHint({ from: m.from, to: m.to });
		setNote({
			kind: 'hint',
			text: ar
				? `تلميح: حرّك ${pieceName(m.piece, ar)} من ${sqName(m.from)} إلى ${sqName(m.to)}. ${explain(state, m, ar)}`
				: `Hint: move your ${pieceName(m.piece, ar).toLowerCase()} from ${sqName(m.from)} to ${sqName(m.to)}. ${explain(state, m, ar)}`,
		});
	};

	/* Drag and drop: the piece follows the pointer, then snaps (slides) into its square. */
	const boardRef = useRef(null);
	const drag = useRef(null);
	const dragged = useRef(false);
	const latest = useRef({});
	latest.current = { targets, moves, play, setPromo };

	const squareAt = (x, y) => {
		const r = boardRef.current.getBoundingClientRect();
		const col = Math.floor(((x - r.left) / r.width) * 8);
		const row = Math.floor(((y - r.top) / r.height) * 8);
		if (col < 0 || col > 7 || row < 0 || row > 7) return -1;
		const d = row * 8 + col;
		return you === 'b' ? 63 - d : d;
	};

	const onPointerDown = event => {
		if (event.button !== 0 || !yourTurn || thinking) return;
		const sq = squareAt(event.clientX, event.clientY);
		const p = sq >= 0 ? state.board[sq] : null;
		if (!p || p[0] !== you) return;
		const el = boardRef.current.querySelector(`[data-pid="${ids[sq]}"]`);
		const cell = boardRef.current.getBoundingClientRect().width / 8;
		drag.current = { sq, el, x0: event.clientX, y0: event.clientY, cell, moved: false };

		const move = e => {
			const dr = drag.current;
			if (!dr) return;
			const dx = e.clientX - dr.x0;
			const dy = e.clientY - dr.y0;
			if (!dr.moved && Math.hypot(dx, dy) < 6) return;
			if (!dr.moved) {
				dr.moved = true;
				setSelected(dr.sq);
				setHint(null);
				setPromo(null);
				dr.el?.classList.add('is-drag');
			}
			if (dr.el) dr.el.style.translate = `${dx}px ${dy}px`;
		};
		const up = e => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', up);
			const dr = drag.current;
			drag.current = null;
			if (!dr || !dr.moved) return;
			dragged.current = true;
			window.setTimeout(() => {
				dragged.current = false;
			}, 0);
			const to = squareAt(e.clientX, e.clientY);
			const { targets: t, moves: mv, play: doPlay, setPromo: openPromo } = latest.current;
			if (dr.el) {
				// Re-enable transitions and drop the offset together: the piece glides from the
				// drop point into its new square (or back home if the drop wasn't legal).
				dr.el.classList.remove('is-drag');
				dr.el.style.translate = '';
			}
			if (to >= 0 && t.has(to)) {
				const options = mv.filter(m => m.to === to);
				if (options.length > 1) openPromo(options);
				else doPlay(options[0]);
			}
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
	};

	// Coach message, most important first.
	const coach = (() => {
		if (status !== 'play') {
			const winner = status === 'checkmate' ? state.turn !== you : null;
			return { kind: status === 'checkmate' ? (winner ? 'win' : 'warn') : 'info', text: STATUS_TEXT[status](winner, ar) };
		}
		if (thinking) return { kind: 'cpu', text: ar ? 'الجهاز يفكر…' : 'The computer is thinking…' };
		if (selected >= 0 && !hint) {
			const info = PIECES[ar ? 'ar' : 'en'][state.board[selected][1]];
			const risky = [...targets.values()].filter(t => t.risky).length;
			const count = targets.size;
			const tail = count
				? ar
					? ` لها ${count} حركة متاحة.${showMoves && risky ? ' النقاط البرتقالية = خانات يستطيع الخصم أكلك فيها.' : ''}`
					: ` It has ${count} legal move${count === 1 ? '' : 's'}.${showMoves && risky ? ' Orange marks = squares where it can be captured.' : ''}`
				: ar
					? ' لا توجد لها حركة قانونية الآن.'
					: ' It has no legal move right now.';
			return { kind: 'piece', title: info.name, text: info.how + tail };
		}
		if (note) return note;
		if (checkSq >= 0) return { kind: 'warn', text: ar ? 'ملكك في كش! حرّكه، أو سُدّ الطريق بقطعة، أو كُل القطعة المهاجمة.' : 'Your king is in check! Move it, block with a piece, or capture the attacker.' };
		return { kind: 'info', text: ar ? 'دورك. اضغط على أي قطعة من قطعك لترى أين يمكنها التحرك وكيف تتحرك.' : 'Your move. Tap one of your pieces to see where it can go and how it moves.' };
	})();

	const diff = material(state.board, you) - material(state.board, other(you));
	const pairs = [];
	const sans = log.map(l => l.san);
	const offset = log.length && log[0].move.piece[0] === 'b' ? 1 : 0;
	const all = offset ? ['…', ...sans] : sans;
	for (let i = 0; i < all.length; i += 2) pairs.push([all[i], all[i + 1]]);
	const flip = you === 'b';

	return (
		<div className="wg-chess">
			<div className="wg-chess__main">
				<div className="wg-bar">
					<div className="wg-seg" role="radiogroup" aria-label={ar ? 'المستوى' : 'Level'}>
						{[
							['easy', ar ? 'سهل' : 'Easy'],
							['medium', ar ? 'متوسط' : 'Medium'],
							['hard', ar ? 'صعب' : 'Hard'],
						].map(([id, label]) => (
							<button key={id} type="button" role="radio" aria-checked={level === id} className={level === id ? 'is-on' : ''} onClick={() => setLevel(id)}>
								{label}
							</button>
						))}
					</div>
					<span className={`wg-chess__score ${diff > 0 ? 'is-up' : diff < 0 ? 'is-down' : ''}`} title={ar ? 'فرق النقاط (القطع)' : 'Material difference'}>
						{ar ? 'النقاط' : 'Material'} {diff > 0 ? `+${diff}` : diff}
					</span>
				</div>

				<div className="wg-chess__wrap">
					<div className="wg-chess__board" dir="ltr" ref={boardRef} onPointerDown={onPointerDown}>
						<ChessPieceDefs />
						{Array.from({ length: 64 }, (_, d) => {
							const sq = flip ? 63 - d : d;
							const p = state.board[sq];
							const r = sq >> 3;
							const c = sq & 7;
							const t = targets.get(sq);
							const showT = t && (showMoves || hint);
							return (
								<button
									key={sq}
									type="button"
									onClick={() => click(sq)}
									className={[
										'wg-sq',
										(r + c) % 2 ? 'is-dark' : 'is-light',
										sq === selected ? 'is-sel' : '',
										last && (sq === last.from || sq === last.to) ? 'is-last' : '',
										sq === checkSq ? 'is-check' : '',
										hint && (sq === hint.from || sq === hint.to) ? 'is-hint' : '',
										showT ? (t.capture ? 'is-cap' : 'is-move') : '',
										showT && showMoves && t.risky ? 'is-risky' : '',
									].join(' ')}
									aria-label={`${sqName(sq)}${p ? ` ${p[0] === 'w' ? (ar ? 'أبيض' : 'white') : ar ? 'أسود' : 'black'} ${pieceName(p, ar)}` : ''}`}
								>
									{d % 8 === 0 ? <span className="wg-sq__rank">{8 - r}</span> : null}
									{d >= 56 ? <span className="wg-sq__file">{'abcdefgh'[c]}</span> : null}
								</button>
							);
						})}
						<div className="wg-chess__pieces" aria-hidden>
							{state.board
								.map((p, sq) => (p ? { p, sq, id: ids[sq] } : null))
								.filter(Boolean)
								.sort((a, b) => a.id - b.id)
								.map(({ p, sq, id }) => {
									const d = flip ? 63 - sq : sq;
									return (
										<div
											key={id}
											data-pid={id}
											className={`wg-piece ${sq === selected ? 'is-sel' : ''} ${sq === checkSq ? 'is-check' : ''}`}
											style={{ transform: `translate(${(d & 7) * 100}%, ${(d >> 3) * 100}%)` }}
										>
											<ChessPiece p={p} />
										</div>
									);
								})}
						</div>
					</div>
					{promo ? (
						<div className="wg-over wg-over--promo">
							<p className="wg-over__title">{ar ? 'رقِّ العسكري إلى:' : 'Promote your pawn to:'}</p>
							<div className="wg-over__actions">
								{promo.map(m => (
									<button key={m.promo} type="button" className="wg-promo" onClick={() => play(m)} aria-label={pieceName(`x${m.promo}`, ar)}>
										<ChessPiece p={you + m.promo} />
										<small>{pieceName(`x${m.promo}`, ar)}</small>
									</button>
								))}
							</div>
						</div>
					) : null}
					{status !== 'play' ? (
						<div className="wg-over">
							<p className="wg-over__title">{coach.text}</p>
							<div className="wg-over__actions">
								<button type="button" className="wg-btn wg-btn--primary" onClick={() => restart()}>
									{ar ? 'دور جديد' : 'New game'}
								</button>
								<button type="button" className="wg-btn" onClick={undo}>
									{ar ? 'تراجع' : 'Take back'}
								</button>
							</div>
						</div>
					) : null}
				</div>
			</div>

			<aside className="wg-coach">
				<div className={`wg-coach__msg is-${coach.kind}`} aria-live="polite">
					{coach.title ? <b>{coach.title}</b> : null}
					<p>{coach.text}</p>
				</div>
				<div className="wg-coach__tools">
					<button type="button" className="wg-btn" onClick={askHint} disabled={!yourTurn || thinking}>
						<Lightbulb size={16} aria-hidden />
						{ar ? 'تلميح' : 'Hint'}
					</button>
					<button type="button" className="wg-btn" onClick={undo} disabled={!log.some(l => l.by === 'you')}>
						<Undo2 size={16} aria-hidden />
						{ar ? 'تراجع' : 'Undo'}
					</button>
					<button type="button" className={`wg-btn ${showMoves ? 'wg-btn--soft' : ''}`} onClick={() => setShowMoves(v => !v)} aria-pressed={showMoves}>
						{showMoves ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
						{ar ? 'إظهار الحركات' : 'Show moves'}
					</button>
					<button type="button" className="wg-btn wg-btn--learn" onClick={() => setLearn('goal')}>
						<GraduationCap size={16} aria-hidden />
						{ar ? 'اتعلّم الشطرنج' : 'Learn chess'}
					</button>
				</div>
				{showMoves ? (
					<ul className="wg-coach__legend">
						<li>
							<i className="dot" /> {ar ? 'حركة ممكنة' : 'Possible move'}
						</li>
						<li>
							<i className="ring" /> {ar ? 'أكل قطعة' : 'Capture'}
						</li>
						<li>
							<i className="risk" /> {ar ? 'خانة خطر' : 'Can be captured there'}
						</li>
					</ul>
				) : null}
				<div className="wg-coach__moves" aria-label={ar ? 'سجل الحركات' : 'Move list'}>
					{pairs.length ? (
						<ol dir="ltr">
							{pairs.map(([a, b], i) => (
								<li key={i}>
									<span>{i + 1}.</span>
									<b>{a}</b>
									<b>{b || ''}</b>
								</li>
							))}
						</ol>
					) : (
						<p>{ar ? 'سجل الحركات سيظهر هنا.' : 'Your moves will be listed here.'}</p>
					)}
				</div>
				<div className="wg-row">
					<button type="button" className="wg-btn" onClick={() => restart()}>
						<RotateCcw size={16} aria-hidden />
						{ar ? 'دور جديد' : 'New game'}
					</button>
					<button type="button" className="wg-btn" onClick={() => restart(you === 'w' ? 'b' : 'w')}>
						<RefreshCw size={16} aria-hidden />
						{ar ? (you === 'w' ? 'العب بالأسود' : 'العب بالأبيض') : you === 'w' ? 'Play as Black' : 'Play as White'}
					</button>
				</div>
			</aside>

			{learn ? <Lessons ar={ar} startAt={learn} onClose={() => setLearn(null)} /> : null}
		</div>
	);
}

