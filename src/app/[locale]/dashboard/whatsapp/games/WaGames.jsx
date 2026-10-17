'use client';

import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bird, Bomb, Brain, BrickWall, ChevronDown, Crown, Gamepad2, Grid2x2, Grid3x3, Hash, Info, Lightbulb, Maximize2, Minimize2, Target, Worm, X } from 'lucide-react';
import './wa-games.css';

const Game2048 = lazy(() => import('./Game2048'));
const SnakeGame = lazy(() => import('./SnakeGame'));
const MemoryGame = lazy(() => import('./MemoryGame'));
const TicTacToe = lazy(() => import('./TicTacToe'));
const Minesweeper = lazy(() => import('./Minesweeper'));
const Sudoku = lazy(() => import('./Sudoku'));
const Breakout = lazy(() => import('./Breakout'));
const Flappy = lazy(() => import('./Flappy'));
const Chess = lazy(() => import('./Chess'));

/**
 * Every game: `Comp` for a built-in one. An embedded game could be added later as
 * `{ type: 'iframe', src: 'https://…' }` (licensed provider only) — GameStage renders it sandboxed.
 * `help` = { goal, controls[], tips[] } per language, shown in the ⓘ panel.
 */
export const GAMES = [
	{
		id: 'chess',
		Icon: Crown,
		tone: 'slate',
		en: ['Chess', 'Play & learn with a coach'],
		ar: ['الشطرنج', 'العب واتعلّم مع مدرّب'],
		Comp: Chess,
		help: {
			en: {
				goal: 'Checkmate the computer’s king: attack it so it has no escape. You play White and move first. New to chess? Press “Learn chess” for short lessons on every piece and rule.',
				controls: ['Tap one of your pieces — its legal moves appear on the board and the coach explains how that piece moves', 'Tap a highlighted square to move there', 'Hint shows a good move and why; Undo takes your last move back', 'Choose Easy, Medium or Hard, or switch sides with “Play as Black”'],
				tips: ['Dots = possible moves, rings = captures, orange = the piece can be captured there.', 'Open with a centre pawn, bring out knights and bishops, then castle.', 'Before each move, check what the computer is threatening.'],
			},
			ar: {
				goal: 'حاصر ملك الجهاز «كش مات» بحيث لا يجد مهربًا. أنت بالأبيض وتبدأ أولًا. جديد على الشطرنج؟ اضغط «اتعلّم الشطرنج» لدروس قصيرة عن كل قطعة وكل قاعدة.',
				controls: ['اضغط على قطعة من قطعك: تظهر حركاتها على اللوحة ويشرح لك المدرّب كيف تتحرك', 'اضغط على خانة مُعلَّمة لتتحرك إليها', '«تلميح» يقترح حركة جيدة ويشرح السبب، و«تراجع» يلغي حركتك الأخيرة', 'اختر سهل أو متوسط أو صعب، أو بدّل اللون بـ«العب بالأسود»'],
				tips: ['النقطة = حركة ممكنة، الدائرة = أكل، البرتقالي = الخصم يستطيع أكل قطعتك هناك.', 'ابدأ بعسكري في المنتصف، ثم أخرج الأحصنة والأفيال، ثم بيّت.', 'قبل كل حركة، انظر ماذا يهدد الجهاز.'],
			},
		},
	},
	{
		id: '2048',
		Icon: Grid2x2,
		tone: 'amber',
		en: ['2048', 'Slide and merge numbers'],
		ar: ['2048', 'حرّك الأرقام واجمعها'],
		Comp: Game2048,
		help: {
			en: {
				goal: 'Slide the tiles so equal numbers merge into one. Keep merging until you build a 2048 tile.',
				controls: ['Arrow keys or WASD to slide every tile', 'On touch: swipe in any direction'],
				tips: ['Keep your biggest tile in one corner and never move away from it.', 'Fill the row next to that corner with descending numbers.', 'Avoid the move that pulls the big tile out of its corner unless you must.'],
			},
			ar: {
				goal: 'حرّك المربعات بحيث تندمج الأرقام المتساوية في رقم واحد، واستمر حتى تصل إلى 2048.',
				controls: ['الأسهم أو WASD لتحريك كل المربعات', 'على اللمس: اسحب في أي اتجاه'],
				tips: ['ثبّت أكبر رقم في ركن واحد ولا تبعده عنه.', 'رتّب الصف المجاور للركن بأرقام تنازلية.', 'تجنّب الحركة التي تُخرج الرقم الكبير من ركنه إلا للضرورة.'],
			},
		},
	},
	{
		id: 'snake',
		Icon: Worm,
		tone: 'green',
		en: ['Snake', 'Eat, grow, don’t crash'],
		ar: ['الثعبان', 'كُل وكبَر بدون اصطدام'],
		Comp: SnakeGame,
		help: {
			en: {
				goal: 'Guide the snake to the food. Every bite makes it longer and a little faster.',
				controls: ['Arrow keys or WASD to turn', 'Space to pause or resume', 'On touch: swipe to turn'],
				tips: ['Hitting a wall or your own tail ends the round.', 'Stay near the edges and leave the middle open for turning.', 'Plan your next turn early — speed goes up with your score.'],
			},
			ar: {
				goal: 'وجّه الثعبان إلى الطعام. كل لقمة تجعله أطول وأسرع قليلًا.',
				controls: ['الأسهم أو WASD للالتفاف', 'المسافة للإيقاف المؤقت أو الاستئناف', 'على اللمس: اسحب للالتفاف'],
				tips: ['الاصطدام بالجدار أو بذيلك ينهي الجولة.', 'امشِ بجوار الحواف واترك المنتصف مفتوحًا للالتفاف.', 'خطّط للالتفافة التالية مبكرًا، فالسرعة تزيد مع النقاط.'],
			},
		},
	},
	{
		id: 'memory',
		Icon: Brain,
		tone: 'violet',
		en: ['Memory', 'Find all the pairs'],
		ar: ['الذاكرة', 'طابِق كل الأزواج'],
		Comp: MemoryGame,
		help: {
			en: {
				goal: 'Flip two cards at a time and find all 8 matching pairs in as few moves as possible.',
				controls: ['Click or tap a card to flip it'],
				tips: ['Two cards that don’t match flip back — remember where they were.', 'Open a card you haven’t seen before, then match it from memory.', 'Fewer moves and less time beat your best.'],
			},
			ar: {
				goal: 'اقلب بطاقتين في كل مرة واعثر على الأزواج الثمانية بأقل عدد من الحركات.',
				controls: ['اضغط على البطاقة لقلبها'],
				tips: ['البطاقتان غير المتطابقتين تنقلبان مرة أخرى، فتذكّر مكانهما.', 'افتح بطاقة جديدة أولًا ثم طابقها من ذاكرتك.', 'حركات أقل ووقت أقصر = رقم قياسي أفضل.'],
			},
		},
	},
	{
		id: 'ttt',
		Icon: Hash,
		tone: 'blue',
		en: ['Tic-tac-toe', 'Beat the computer'],
		ar: ['إكس أو', 'اهزم الجهاز'],
		Comp: TicTacToe,
		help: {
			en: {
				goal: 'Get three of your X marks in a row — across, down or diagonally — before the computer does.',
				controls: ['Click or tap an empty square', 'Pick Easy or Hard at the top'],
				tips: ['Start in the centre or a corner.', 'Always block the computer when it has two in a row.', 'Try to create two winning lines at once (a fork).'],
			},
			ar: {
				goal: 'كوّن ثلاث علامات X في صف واحد، أفقيًا أو رأسيًا أو قطريًا، قبل الجهاز.',
				controls: ['اضغط على خانة فارغة', 'اختر سهل أو صعب من الأعلى'],
				tips: ['ابدأ بالمنتصف أو بأحد الأركان.', 'اقطع على الجهاز دائمًا إذا كان لديه علامتان في صف.', 'حاول صنع خطّين للفوز في نفس الوقت.'],
			},
		},
	},
	{
		id: 'mines',
		Icon: Bomb,
		tone: 'rose',
		en: ['Minesweeper', 'Clear the field safely'],
		ar: ['كاسحة الألغام', 'نظّف الحقل بأمان'],
		Comp: Minesweeper,
		help: {
			en: {
				goal: 'Open every safe square without touching a mine. A number shows how many mines touch that square.',
				controls: ['Click to open a square', 'Right-click (or long-press on touch) to place a flag', 'Turn on “Flag mode” to flag with a normal tap', 'Click an opened number to open its neighbours when its flags are complete'],
				tips: ['Your first click is always safe and opens an area.', 'A “1” next to exactly one hidden square means that square is a mine.', 'Flag what you’re sure of, then use the numbers to open the rest.'],
			},
			ar: {
				goal: 'افتح كل الخانات الآمنة دون لمس أي لغم. الرقم يوضح عدد الألغام الملاصقة للخانة.',
				controls: ['اضغط لفتح خانة', 'الزر الأيمن (أو الضغط المطوّل على اللمس) لوضع علَم', 'فعّل «وضع العلَم» لوضع الأعلام بضغطة عادية', 'اضغط على رقم مفتوح لفتح ما حوله عندما تكتمل أعلامه'],
				tips: ['أول ضغطة آمنة دائمًا وتفتح مساحة.', 'الرقم «1» بجوار خانة مغلقة واحدة فقط يعني أنها لغم.', 'ضع علَمًا على ما تتأكد منه، ثم استخدم الأرقام لفتح الباقي.'],
			},
		},
	},
	{
		id: 'sudoku',
		Icon: Grid3x3,
		tone: 'teal',
		en: ['Sudoku', 'Fill the grid with logic'],
		ar: ['سودوكو', 'املأ الشبكة بالمنطق'],
		Comp: Sudoku,
		help: {
			en: {
				goal: 'Fill every empty square with 1–9 so each row, each column and each 3×3 box has every digit exactly once.',
				controls: ['Select a square, then tap a number or type 1–9', 'Backspace / Delete or “Erase” clears it', 'Arrow keys move the selection'],
				tips: ['Every puzzle has exactly one solution — no guessing needed.', 'Look for a box missing just one or two digits first.', 'Wrong digits turn red; “Hint” fills the selected square.'],
			},
			ar: {
				goal: 'املأ كل خانة فارغة برقم من 1 إلى 9 بحيث يظهر كل رقم مرة واحدة في كل صف وعمود ومربع 3×3.',
				controls: ['اختر خانة ثم اضغط رقمًا أو اكتب 1–9', 'Backspace أو «امسح» لتفريغها', 'الأسهم لتحريك التحديد'],
				tips: ['لكل لغز حل واحد فقط، فلا تحتاج للتخمين.', 'ابدأ بالمربع الذي ينقصه رقم أو رقمان.', 'الأرقام الخاطئة تظهر بالأحمر، و«تلميح» يملأ الخانة المحددة.'],
			},
		},
	},
	{
		id: 'breakout',
		Icon: BrickWall,
		tone: 'orange',
		en: ['Breakout', 'Bounce and break bricks'],
		ar: ['كسر الطوب', 'ارتد واكسر الطوب'],
		Comp: Breakout,
		help: {
			en: {
				goal: 'Bounce the ball off your paddle to break every brick. Clear the wall to reach a faster level.',
				controls: ['Move the mouse or finger over the board to move the paddle', 'Arrow keys or A / D also move it', 'Click or Space to launch the ball'],
				tips: ['Hitting the ball with the paddle’s edge sends it at a sharper angle.', 'Higher rows give more points.', 'You have 3 lives — a missed ball costs one.'],
			},
			ar: {
				goal: 'اجعل الكرة ترتد من المضرب لتكسر كل الطوب. نظّف الجدار لتنتقل إلى مرحلة أسرع.',
				controls: ['حرّك الماوس أو إصبعك فوق اللوحة لتحريك المضرب', 'الأسهم أو A / D أيضًا', 'اضغط أو المسافة لإطلاق الكرة'],
				tips: ['ضرب الكرة بطرف المضرب يرسلها بزاوية أحدّ.', 'الصفوف العليا تعطي نقاطًا أكثر.', 'لديك 3 محاولات، وكل كرة تفلت تخصم واحدة.'],
			},
		},
	},
	{
		id: 'flappy',
		Icon: Bird,
		tone: 'sky',
		en: ['Flappy chat', 'Fly through the gaps'],
		ar: ['الفقاعة الطائرة', 'طِر بين الفتحات'],
		Comp: Flappy,
		help: {
			en: {
				goal: 'Keep the chat bubble in the air and fly through the gaps between the pipes. Each pipe you pass is a point.',
				controls: ['Click / tap the board, Space or ↑ to flap'],
				tips: ['Short, steady taps work better than many fast ones.', 'Aim for the middle of each gap.', 'Touching a pipe, the ground or the top ends the run.'],
			},
			ar: {
				goal: 'حافظ على الفقاعة في الهواء ومُرّ من الفتحات بين الأعمدة. كل عمود تعبره بنقطة.',
				controls: ['اضغط على اللوحة أو المسافة أو ↑ لترتفع'],
				tips: ['ضغطات قصيرة ومنتظمة أفضل من ضغطات كثيرة سريعة.', 'استهدف منتصف كل فتحة.', 'لمس العمود أو الأرض أو السقف ينهي الجولة.'],
			},
		},
	},
];

const SEEN_KEY = 'wa-games:help-seen';

function hasSeenHelp(id) {
	try {
		return JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]').includes(id);
	} catch {
		return true;
	}
}

function markHelpSeen(id) {
	try {
		const list = JSON.parse(window.localStorage.getItem(SEEN_KEY) || '[]');
		if (!list.includes(id)) window.localStorage.setItem(SEEN_KEY, JSON.stringify([...list, id]));
	} catch {
		/* storage blocked: the panel just shows again next time */
	}
}

function useDismiss(open, setOpen, ref) {
	useEffect(() => {
		if (!open) return undefined;
		const onDown = event => {
			if (!ref.current?.contains(event.target)) setOpen(false);
		};
		const onKey = event => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				setOpen(false);
			}
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey, true);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey, true);
		};
	}, [open, setOpen, ref]);
}

function GameGrid({ ar, current, onPick }) {
	return (
		<div className="wg-menu__grid">
			{GAMES.map(game => {
				const [name, desc] = ar ? game.ar : game.en;
				return (
					<button
						key={game.id}
						type="button"
						role="menuitem"
						className={`wg-pick wg-tone-${game.tone} ${current === game.id ? 'is-current' : ''}`}
						aria-current={current === game.id ? 'true' : undefined}
						onClick={() => onPick(game.id)}
					>
						<span className="wg-pick__icon">
							<game.Icon size={20} aria-hidden />
						</span>
						<span className="wg-pick__text">
							<span className="wg-pick__name">{name}</span>
							<span className="wg-pick__desc">{desc}</span>
						</span>
					</button>
				);
			})}
		</div>
	);
}

/** Corner button + menu. `onPick(id)` opens a game in the idle pane. */
export function GamesLauncher({ ar, onPick }) {
	const [open, setOpen] = useState(false);
	const wrap = useRef(null);
	useDismiss(open, setOpen, wrap);

	return (
		<div className="wg-launch" ref={wrap} dir={ar ? 'rtl' : 'ltr'}>
			<button type="button" className="wg-launch__btn" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="menu">
				<Gamepad2 size={18} aria-hidden />
				<span>{ar ? 'ألعاب' : 'Games'}</span>
			</button>
			{open ? (
				<div className="wg-menu" role="menu" aria-label={ar ? 'اختر لعبة' : 'Pick a game'}>
					<p className="wg-menu__title">{ar ? `استراحة قصيرة؟ ${GAMES.length} ألعاب` : `Take a short break · ${GAMES.length} games`}</p>
					<GameGrid
						ar={ar}
						onPick={id => {
							setOpen(false);
							onPick(id);
						}}
					/>
				</div>
			) : null}
		</div>
	);
}

function HelpPanel({ ar, game, onClose }) {
	const help = (ar ? game.help?.ar : game.help?.en) || null;
	const [name] = ar ? game.ar : game.en;
	if (!help) return null;
	return (
		<div className="wg-help" role="dialog" aria-modal="false" aria-labelledby="wg-help-title">
			<div className="wg-help__card">
				<div className="wg-help__head">
					<span className={`wg-stage__badge wg-tone-${game.tone}`}>
						<game.Icon size={18} aria-hidden />
					</span>
					<h3 id="wg-help-title">{ar ? `طريقة لعب ${name}` : `How to play ${name}`}</h3>
					<button type="button" className="wg-icon" onClick={onClose} aria-label={ar ? 'إغلاق الشرح' : 'Close help'}>
						<X size={18} aria-hidden />
					</button>
				</div>
				<section className="wg-help__sec">
					<h4>
						<Target size={15} aria-hidden />
						{ar ? 'الهدف' : 'Goal'}
					</h4>
					<p>{help.goal}</p>
				</section>
				<section className="wg-help__sec">
					<h4>
						<Gamepad2 size={15} aria-hidden />
						{ar ? 'التحكم' : 'Controls'}
					</h4>
					<ul>
						{help.controls.map(line => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</section>
				<section className="wg-help__sec wg-help__sec--tips">
					<h4>
						<Lightbulb size={15} aria-hidden />
						{ar ? 'نصائح' : 'Tips'}
					</h4>
					<ul>
						{help.tips.map(line => (
							<li key={line}>{line}</li>
						))}
					</ul>
				</section>
				<button type="button" className="wg-btn wg-btn--primary wg-help__go" onClick={onClose}>
					{ar ? 'فهمت، يلا نلعب' : 'Got it, let’s play'}
				</button>
			</div>
		</div>
	);
}

/** The chosen game, filling the idle pane, with help, a game switcher and a way back. */
export function GameStage({ ar, gameId, onClose, onSwitch }) {
	const game = GAMES.find(g => g.id === gameId) || GAMES[0];
	const [name] = ar ? game.ar : game.en;
	const Comp = game.Comp;
	const [help, setHelp] = useState(false);
	const [menu, setMenu] = useState(false);
	const menuRef = useRef(null);
	useDismiss(menu, setMenu, menuRef);
	const stageRef = useRef(null);
	const [nativeFull, setNativeFull] = useState(false);
	const [maxed, setMaxed] = useState(false); // fallback when the Fullscreen API isn't available
	const full = nativeFull || maxed;

	useEffect(() => {
		const sync = () => {
			const on = document.fullscreenElement === stageRef.current;
			setNativeFull(on);
			if (on) setMaxed(false);
		};
		document.addEventListener('fullscreenchange', sync);
		return () => {
			document.removeEventListener('fullscreenchange', sync);
			if (document.fullscreenElement === stageRef.current) document.exitFullscreen?.().catch(() => {});
		};
	}, []);

	const toggleFull = async () => {
		if (document.fullscreenElement) {
			await document.exitFullscreen().catch(() => {});
			return;
		}
		if (maxed) {
			setMaxed(false);
			return;
		}
		// Native full screen when the browser allows it; otherwise (unsupported, refused, or no
		// answer — embedded views can leave the request pending) fill the window instead.
		const el = stageRef.current;
		if (!el?.requestFullscreen) {
			setMaxed(true);
			return;
		}
		const ok = await Promise.race([
			el.requestFullscreen({ navigationUI: 'hide' }).then(() => true, () => false),
			new Promise(resolve => window.setTimeout(() => resolve(false), 600)),
		]);
		if (!ok && document.fullscreenElement !== el) setMaxed(true);
	};

	const close = () => {
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		onClose();
	};

	// First time a game is opened, explain it.
	useEffect(() => {
		const first = !hasSeenHelp(game.id);
		setHelp(first);
		if (first) markHelpSeen(game.id);
	}, [game.id]);

	useEffect(() => {
		const onKey = event => {
			if (event.key !== 'Escape' || event.defaultPrevented) return;
			if (help) setHelp(false);
			else if (maxed) setMaxed(false);
			else if (!document.fullscreenElement) onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose, help, maxed]);

	return (
		<div className={`wg-stage ${maxed ? 'is-max' : ''}`} dir={ar ? 'rtl' : 'ltr'} ref={stageRef}>
			<header className="wg-stage__head">
				<button type="button" className="wg-icon" onClick={close} aria-label={ar ? 'رجوع' : 'Back'}>
					<ArrowLeft size={20} className={ar ? 'rotate-180' : ''} aria-hidden />
				</button>
				<span className={`wg-stage__badge wg-tone-${game.tone}`}>
					<game.Icon size={18} aria-hidden />
				</span>
				<h2 className="wg-stage__title">{name}</h2>
				<button
					type="button"
					className={`wg-icon wg-info ${help ? 'is-on' : ''}`}
					onClick={() => setHelp(v => !v)}
					aria-pressed={help}
					aria-label={ar ? 'طريقة اللعب والتلميحات' : 'How to play & hints'}
					title={ar ? 'طريقة اللعب والتلميحات' : 'How to play & hints'}
				>
					<Info size={20} aria-hidden />
				</button>
				<div className="wg-switch" ref={menuRef}>
					<button type="button" className="wg-switch__btn" onClick={() => setMenu(v => !v)} aria-expanded={menu} aria-haspopup="menu">
						<Gamepad2 size={17} aria-hidden />
						<span>{ar ? 'كل الألعاب' : 'All games'}</span>
						<ChevronDown size={15} aria-hidden />
					</button>
					{menu ? (
						<div className="wg-menu wg-menu--stage" role="menu" aria-label={ar ? 'كل الألعاب' : 'All games'}>
							<GameGrid
								ar={ar}
								current={game.id}
								onPick={id => {
									setMenu(false);
									if (id !== game.id) onSwitch(id);
								}}
							/>
						</div>
					) : null}
				</div>
				<button
					type="button"
					className={`wg-icon ${full ? 'is-on' : ''}`}
					onClick={toggleFull}
					aria-pressed={full}
					aria-label={full ? (ar ? 'الخروج من ملء الشاشة' : 'Exit full screen') : ar ? 'ملء الشاشة' : 'Full screen'}
					title={full ? (ar ? 'الخروج من ملء الشاشة' : 'Exit full screen') : ar ? 'ملء الشاشة' : 'Full screen'}
				>
					{full ? <Minimize2 size={19} aria-hidden /> : <Maximize2 size={19} aria-hidden />}
				</button>
				<button type="button" className="wg-icon" onClick={close} aria-label={ar ? 'إغلاق اللعبة' : 'Close game'}>
					<X size={20} aria-hidden />
				</button>
			</header>
			<div className="wg-stage__body">
				{game.type === 'iframe' ? (
					<iframe
						className="wg-embed"
						src={game.src}
						title={name}
						loading="lazy"
						sandbox="allow-scripts allow-same-origin allow-pointer-lock"
						referrerPolicy="no-referrer"
						allow="fullscreen; gamepad"
					/>
				) : (
					<Suspense fallback={<div className="wg-loading" />}>
						<Comp key={game.id} ar={ar} />
					</Suspense>
				)}
				{help ? <HelpPanel ar={ar} game={game} onClose={() => setHelp(false)} /> : null}
			</div>
		</div>
	);
}
