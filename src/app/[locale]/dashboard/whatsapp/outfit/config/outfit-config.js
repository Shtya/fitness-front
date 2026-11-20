/**
 * Outfit Matcher — the one editable config: clothing colours (with their names), which colours
 * count as neutrals, the fashion rules' weights, shirt/t-shirt rules, and the shoe × fit hem table.
 * Rule explanation texts live in messages/<locale>.json under "outfitMatcher" (keys referenced here).
 */

/** Every supported locale has a name for every colour. */
export const COLOR_LOCALES = ['en', 'ar'];

/**
 * Real clothing colours. family: neutral | warm | cool | earth. base: counts as a neutral base
 * (does not use up one of the 3 main colours). denim: blue denim, treated as a neutral.
 */
export const PALETTE = [
	{ id: 'black', hex: '#111111', family: 'neutral', base: true, names: { en: 'Black', ar: 'أسود' } },
	{ id: 'charcoal', hex: '#36454F', family: 'neutral', base: true, names: { en: 'Charcoal', ar: 'رمادي فحمي' } },
	{ id: 'dark-grey', hex: '#555555', family: 'neutral', base: true, names: { en: 'Dark grey', ar: 'رمادي غامق' } },
	{ id: 'steel-grey', hex: '#6E7B85', family: 'neutral', base: true, names: { en: 'Steel grey', ar: 'رمادي فولاذي' } },
	{ id: 'grey', hex: '#8E8E8E', family: 'neutral', base: true, names: { en: 'Grey', ar: 'رمادي' } },
	{ id: 'heather-grey', hex: '#A6A6A6', family: 'neutral', base: true, names: { en: 'Heather grey', ar: 'رمادي ميلانج' } },
	{ id: 'light-grey', hex: '#C8C8C8', family: 'neutral', base: true, names: { en: 'Light grey', ar: 'رمادي فاتح' } },
	{ id: 'white', hex: '#F7F7F5', family: 'neutral', base: true, names: { en: 'White', ar: 'أبيض' } },
	{ id: 'off-white', hex: '#EFEBE0', family: 'neutral', base: true, names: { en: 'Off-white', ar: 'أوف وايت' } },
	{ id: 'ecru', hex: '#E3D9C0', family: 'neutral', base: true, names: { en: 'Ecru', ar: 'إكرو' } },
	{ id: 'cream', hex: '#F2E6C9', family: 'neutral', base: true, names: { en: 'Cream', ar: 'كريمي' } },
	{ id: 'stone', hex: '#CFC6B4', family: 'neutral', base: true, names: { en: 'Stone', ar: 'حجري' } },
	{ id: 'beige', hex: '#D9C6A5', family: 'neutral', base: true, names: { en: 'Beige', ar: 'بيج' } },
	{ id: 'taupe', hex: '#8B7D6B', family: 'neutral', base: true, names: { en: 'Taupe', ar: 'توب' } },
	{ id: 'sand', hex: '#C8B08A', family: 'earth', base: true, names: { en: 'Sand', ar: 'رملي' } },
	{ id: 'khaki', hex: '#B9A57B', family: 'earth', base: true, names: { en: 'Khaki', ar: 'كاكي' } },
	{ id: 'camel', hex: '#C19A6B', family: 'earth', base: true, names: { en: 'Camel', ar: 'جملي' } },
	{ id: 'tan', hex: '#B5835A', family: 'earth', base: true, names: { en: 'Tan', ar: 'تان' } },
	{ id: 'cognac', hex: '#9A4E1C', family: 'earth', base: true, names: { en: 'Cognac', ar: 'كونياك' } },
	{ id: 'mocha', hex: '#7B5B4A', family: 'earth', base: true, names: { en: 'Mocha', ar: 'موكا' } },
	{ id: 'brown', hex: '#6B4423', family: 'earth', base: true, names: { en: 'Brown', ar: 'بني' } },
	{ id: 'chocolate', hex: '#4E2A1E', family: 'earth', base: true, names: { en: 'Chocolate', ar: 'شوكولاتة' } },
	{ id: 'dark-brown', hex: '#3D2817', family: 'earth', base: true, names: { en: 'Dark brown', ar: 'بني غامق' } },
	{ id: 'navy', hex: '#1F2A44', family: 'cool', base: true, names: { en: 'Navy', ar: 'كحلي' } },
	{ id: 'midnight', hex: '#191D2B', family: 'cool', base: true, names: { en: 'Midnight navy', ar: 'كحلي داكن' } },
	{ id: 'denim-light', hex: '#8BA6C9', family: 'cool', base: true, denim: true, names: { en: 'Light denim', ar: 'جينز فاتح' } },
	{ id: 'denim', hex: '#4A6A94', family: 'cool', base: true, denim: true, names: { en: 'Mid denim', ar: 'جينز' } },
	{ id: 'denim-dark', hex: '#2B3A55', family: 'cool', base: true, denim: true, names: { en: 'Dark denim', ar: 'جينز غامق' } },
	{ id: 'olive', hex: '#556B2F', family: 'earth', base: true, names: { en: 'Olive', ar: 'زيتي' } },
	{ id: 'army', hex: '#4B5320', family: 'earth', base: true, names: { en: 'Army green', ar: 'أخضر عسكري' } },
	{ id: 'sage', hex: '#9CAF88', family: 'earth', names: { en: 'Sage', ar: 'أخضر مريمية' } },
	{ id: 'forest', hex: '#2C4A35', family: 'cool', names: { en: 'Forest green', ar: 'أخضر غامق' } },
	{ id: 'bottle-green', hex: '#1B3B2F', family: 'cool', names: { en: 'Bottle green', ar: 'أخضر زجاجي' } },
	{ id: 'emerald', hex: '#1F7A4F', family: 'cool', names: { en: 'Emerald', ar: 'زمردي' } },
	{ id: 'mint', hex: '#B6E2C9', family: 'cool', names: { en: 'Mint', ar: 'نعناعي' } },
	{ id: 'teal', hex: '#1F6F78', family: 'cool', names: { en: 'Teal', ar: 'تيل' } },
	{ id: 'petrol', hex: '#1E4D5C', family: 'cool', names: { en: 'Petrol', ar: 'بترولي' } },
	{ id: 'turquoise', hex: '#3FB8AF', family: 'cool', names: { en: 'Turquoise', ar: 'تركواز' } },
	{ id: 'slate-blue', hex: '#5A6E8C', family: 'cool', names: { en: 'Slate blue', ar: 'أزرق رمادي' } },
	{ id: 'royal-blue', hex: '#2A52BE', family: 'cool', names: { en: 'Royal blue', ar: 'أزرق ملكي' } },
	{ id: 'sky-blue', hex: '#9CC3E6', family: 'cool', names: { en: 'Sky blue', ar: 'لبني' } },
	{ id: 'powder-blue', hex: '#B8D0E8', family: 'cool', names: { en: 'Powder blue', ar: 'أزرق بودرة' } },
	{ id: 'lavender', hex: '#B9A7D6', family: 'cool', names: { en: 'Lavender', ar: 'لافندر' } },
	{ id: 'lilac', hex: '#C8A2C8', family: 'cool', names: { en: 'Lilac', ar: 'ليلكي' } },
	{ id: 'purple', hex: '#5B3A7A', family: 'cool', names: { en: 'Purple', ar: 'بنفسجي' } },
	{ id: 'plum', hex: '#5E2750', family: 'cool', names: { en: 'Plum', ar: 'برقوقي' } },
	{ id: 'mustard', hex: '#C9A227', family: 'warm', names: { en: 'Mustard', ar: 'خردلي' } },
	{ id: 'yellow', hex: '#E8C547', family: 'warm', names: { en: 'Yellow', ar: 'أصفر' } },
	{ id: 'orange', hex: '#E07B39', family: 'warm', names: { en: 'Orange', ar: 'برتقالي' } },
	{ id: 'peach', hex: '#F2C2A0', family: 'warm', names: { en: 'Peach', ar: 'خوخي' } },
	{ id: 'coral', hex: '#E8806B', family: 'warm', names: { en: 'Coral', ar: 'مرجاني' } },
	{ id: 'terracotta', hex: '#C4664A', family: 'earth', names: { en: 'Terracotta', ar: 'تراكوتا' } },
	{ id: 'rust', hex: '#A0461F', family: 'earth', names: { en: 'Rust', ar: 'صدئي' } },
	{ id: 'brick', hex: '#8E3B2E', family: 'earth', names: { en: 'Brick', ar: 'طوبي' } },
	{ id: 'red', hex: '#B3242B', family: 'warm', names: { en: 'Red', ar: 'أحمر' } },
	{ id: 'burgundy', hex: '#6D1F2E', family: 'warm', names: { en: 'Burgundy', ar: 'بورجندي' } },
	{ id: 'wine', hex: '#722F37', family: 'warm', names: { en: 'Wine', ar: 'نبيتي' } },
	{ id: 'maroon', hex: '#5A1E1E', family: 'warm', names: { en: 'Maroon', ar: 'خمري' } },
	{ id: 'pink', hex: '#E9A7B8', family: 'warm', names: { en: 'Pink', ar: 'بمبي' } },
	{ id: 'dusty-pink', hex: '#C99A9E', family: 'warm', names: { en: 'Dusty pink', ar: 'وردي مطفي' } },
];

export const PALETTE_BY_ID = Object.fromEntries(PALETTE.map(color => [color.id, color]));

/** Wearable slots. "top" means the shirt or t-shirt the engine picks. */
export const SLOTS = ['pants', 'shirt', 'tshirt', 'jacket', 'shoes', 'belt', 'strap', 'socks'];

export const OCCASIONS = ['work', 'casual', 'date', 'formal', 'gym', 'friday', 'travel'];
export const WEATHERS = ['hot', 'mild', 'cold'];
export const PANTS_TYPES = ['jeans', 'chinos', 'trousers', 'cargo', 'joggers', 'shorts'];
export const PANTS_FITS = ['skinny', 'slim', 'straight', 'relaxed', 'wide', 'cargo', 'jogger'];
export const SHOE_TYPES = ['whiteSneakers', 'chunkySneakers', 'running', 'loafers', 'derby', 'boots', 'sandals'];
/** Hem lengths, longest first (the 3D slider follows this order). */
export const HEM_LENGTHS = ['full', 'slight', 'none', 'cropped', 'ankle'];
export const SKIN_TONES = ['fair', 'wheat', 'olive', 'tan', 'dark'];
export const UNDERTONES = ['warm', 'cool', 'neutral'];
export const BUILDS = ['slim', 'average', 'athletic', 'broad'];

/** Leather and sneaker colours the shoe / belt / strap slots choose from. */
export const SHOE_COLORS = ['black', 'dark-brown', 'brown', 'cognac', 'tan', 'white', 'off-white', 'grey', 'navy'];
export const LEATHER_COLORS = ['black', 'dark-brown', 'brown', 'cognac', 'tan'];
/** Layers that go over most outfits. */
export const JACKET_COLORS = ['navy', 'charcoal', 'olive', 'camel', 'black', 'stone', 'denim', 'brown', 'beige', 'grey'];

/** Weights of the fashion rules (score starts at BASE, clamped to 30–99). */
export const RULES = {
	BASE: 72,
	/** Top vs bottom lightness gap (LCh L*) that reads as clear contrast. */
	minLightnessGap: 18,
	smallGapPenalty: 10,
	tonalAllowedDeltaE: 12,
	/** Tonal (same family) still needs some depth difference, or it reads as one block. */
	tonalMinGap: 10,
	tonalBonus: 2,
	/** Clear light/dark contrast reads crisp: +1 per `contrastStep` of L* above the minimum gap, capped. */
	contrastStep: 7,
	maxContrastBonus: 8,
	/** Two loud (high chroma) colours at similar lightness clash. */
	loudChroma: 38,
	loudClashPenalty: 22,
	navyBlackPenalty: 12,
	tooManyAccentsPenalty: 14,
	neutralTopBonus: 6,
	strategyBonus: { neutral: 6, monochrome: 3, analogous: 4, complementary: 2, split: 1, triadic: -2 },
	occasion: {
		work: { neutralBonus: 6, loudPenalty: 8 },
		casual: { neutralBonus: 2, loudPenalty: 0 },
		date: { neutralBonus: 2, loudPenalty: 2, richBonus: 4 },
		formal: { neutralBonus: 9, loudPenalty: 14 },
		gym: { neutralBonus: 0, loudPenalty: -4 },
		friday: { neutralBonus: 6, loudPenalty: 10, lightBonus: 4 },
		travel: { neutralBonus: 4, loudPenalty: 2 },
	},
	weather: { hot: { lightTopBonus: 6, darkTopPenalty: 4 }, mild: {}, cold: { darkTopBonus: 3 } },
	skin: { undertoneMatch: 6, undertoneClash: 4, washOutPenalty: 6, contrastBonus: 3 },
	favoriteBonus: 8,
	dislikedPenalty: 30,
	lockedConflictPenalty: 10,
	minSuggestions: 6,
	maxSuggestions: 8,
	/** Variety: picks per colour strategy, and how different two suggested tops must be (ΔE2000). */
	perStrategy: { neutral: 3, default: 2 },
	minTopDeltaE: 10,
};

/** Shoes by pants colour family: brown leather with navy / olive / beige / denim; black with greys. */
export const SHOE_RULES = {
	brownWith: ['navy', 'midnight', 'olive', 'army', 'beige', 'sand', 'khaki', 'camel', 'stone', 'cream', 'off-white', 'ecru', 'denim-light', 'denim', 'denim-dark', 'brown', 'taupe', 'tan'],
	blackWith: ['black', 'charcoal', 'dark-grey', 'steel-grey', 'grey', 'heather-grey', 'light-grey', 'white'],
};

/**
 * Shirt vs t-shirt: points for "shirt" (+) or "t-shirt" (−) from pants type, occasion, weather.
 * |total| >= 2 is a clear verdict, otherwise either works.
 */
export const TOP_RULES = {
	pants: { jeans: -1, chinos: 0, trousers: 3, cargo: -2, joggers: -3, shorts: -2 },
	occasion: { work: 2, casual: -1, date: 1, formal: 4, gym: -5, friday: 1, travel: -1 },
	weather: { hot: -1, mild: 0, cold: 1 },
	alternatives: {
		shirt: ['knitPolo', 'overshirt', 'polo'],
		tshirt: ['polo', 'henley', 'overshirt'],
		either: ['polo', 'knitPolo', 'henley'],
	},
};

export const FABRICS = {
	hot: ['linen', 'cotton', 'seersucker', 'chambray'],
	mild: ['cotton', 'oxford', 'lightKnit', 'denim'],
	cold: ['wool', 'flannel', 'knit', 'corduroy'],
};

/**
 * Hem ("break") table: shoe × pants fit → best hem, also fine, and avoid. Hem values are
 * HEM_LENGTHS; reason keys are under outfitMatcher.hem.reasons in the locale files.
 */
const hem = (best, ok, avoid, reason) => ({ best, ok, avoid, reason });
export const HEM_TABLE = {
	whiteSneakers: {
		skinny: hem('none', ['cropped', 'ankle'], ['full'], 'sneakerSlim'),
		slim: hem('none', ['cropped', 'ankle'], ['full'], 'sneakerSlim'),
		straight: hem('none', ['slight', 'cropped'], ['full'], 'sneakerSlim'),
		relaxed: hem('slight', ['none'], ['full', 'ankle'], 'sneakerRelaxed'),
		wide: hem('slight', ['none'], ['full', 'ankle'], 'sneakerRelaxed'),
		cargo: hem('slight', ['none'], ['full'], 'cargo'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
	chunkySneakers: {
		skinny: hem('none', ['slight'], ['cropped', 'ankle', 'full'], 'chunkyTight'),
		slim: hem('none', ['slight'], ['cropped', 'ankle', 'full'], 'chunkyTight'),
		straight: hem('slight', ['none'], ['cropped', 'full'], 'chunkyWide'),
		relaxed: hem('slight', ['none'], ['cropped', 'ankle', 'full'], 'chunkyWide'),
		wide: hem('slight', ['none'], ['cropped', 'ankle', 'full'], 'chunkyWide'),
		cargo: hem('slight', ['none'], ['ankle', 'full'], 'cargo'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
	running: {
		skinny: hem('none', ['cropped'], ['full'], 'sneakerSlim'),
		slim: hem('none', ['cropped'], ['full'], 'sneakerSlim'),
		straight: hem('none', ['slight'], ['full'], 'sneakerSlim'),
		relaxed: hem('slight', ['none'], ['full'], 'sneakerRelaxed'),
		wide: hem('slight', ['none'], ['full'], 'sneakerRelaxed'),
		cargo: hem('slight', ['none'], ['full'], 'cargo'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
	loafers: {
		skinny: hem('cropped', ['ankle', 'none'], ['full', 'slight'], 'loafer'),
		slim: hem('none', ['cropped', 'ankle'], ['full'], 'loafer'),
		straight: hem('none', ['slight', 'cropped'], ['full'], 'loafer'),
		relaxed: hem('slight', ['none'], ['full'], 'loaferRelaxed'),
		wide: hem('slight', ['none', 'cropped'], ['full'], 'loaferRelaxed'),
		cargo: hem('none', ['slight'], ['full'], 'cargo'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
	derby: {
		skinny: hem('none', ['cropped'], ['full'], 'formal'),
		slim: hem('none', ['slight'], ['full'], 'formal'),
		straight: hem('slight', ['none'], ['full', 'ankle'], 'formal'),
		relaxed: hem('slight', ['none'], ['ankle'], 'formal'),
		wide: hem('slight', ['full', 'none'], ['ankle'], 'formalWide'),
		cargo: hem('none', ['slight'], ['full'], 'cargo'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
	boots: {
		skinny: hem('none', ['cropped'], ['full', 'ankle'], 'boots'),
		slim: hem('none', ['slight'], ['full', 'ankle'], 'boots'),
		straight: hem('slight', ['none'], ['full', 'ankle'], 'boots'),
		relaxed: hem('slight', ['none'], ['ankle', 'cropped'], 'boots'),
		wide: hem('slight', ['full'], ['ankle', 'cropped'], 'boots'),
		cargo: hem('slight', ['none'], ['ankle'], 'boots'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
	sandals: {
		skinny: hem('ankle', ['cropped'], ['full', 'slight'], 'sandals'),
		slim: hem('ankle', ['cropped'], ['full', 'slight'], 'sandals'),
		straight: hem('cropped', ['ankle', 'none'], ['full'], 'sandals'),
		relaxed: hem('cropped', ['none', 'ankle'], ['full'], 'sandals'),
		wide: hem('none', ['cropped'], ['full'], 'sandals'),
		cargo: hem('cropped', ['none'], ['full'], 'sandals'),
		jogger: hem('ankle', ['cropped'], ['full', 'slight'], 'jogger'),
	},
};

/* ======================================================================================
 * WARDROBE + STYLIST (the "my clothes" side). Everything editable lives here.
 * ==================================================================================== */

export const WARDROBE_CATEGORIES = ['top', 'bottom', 'outerwear', 'onepiece', 'shoes', 'belt', 'watch', 'bag', 'hat', 'scarf', 'socks', 'accessory'];

/**
 * Sub-categories: category, default formality (1–5), and how the mannequin and engine see it
 * (slot = matcher slot; shoeType = hem-table row; pantsType = top-advice row).
 */
export const SUBCATEGORIES = {
	tshirt: { category: 'top', formality: 1, slot: 'tshirt' },
	polo: { category: 'top', formality: 2, slot: 'tshirt' },
	henley: { category: 'top', formality: 2, slot: 'tshirt' },
	shirt: { category: 'top', formality: 3, slot: 'shirt' },
	oxford: { category: 'top', formality: 3, slot: 'shirt' },
	knit: { category: 'top', formality: 3, slot: 'shirt' },
	sweatshirt: { category: 'top', formality: 1, slot: 'shirt' },
	hoodie: { category: 'top', formality: 1, slot: 'shirt' },
	tank: { category: 'top', formality: 1, slot: 'tshirt' },
	jeans: { category: 'bottom', formality: 2, slot: 'pants', pantsType: 'jeans' },
	chinos: { category: 'bottom', formality: 3, slot: 'pants', pantsType: 'chinos' },
	trousers: { category: 'bottom', formality: 4, slot: 'pants', pantsType: 'trousers' },
	cargo: { category: 'bottom', formality: 1, slot: 'pants', pantsType: 'cargo' },
	joggers: { category: 'bottom', formality: 1, slot: 'pants', pantsType: 'joggers' },
	shorts: { category: 'bottom', formality: 1, slot: 'pants', pantsType: 'shorts' },
	jacket: { category: 'outerwear', formality: 3, slot: 'jacket' },
	blazer: { category: 'outerwear', formality: 4, slot: 'jacket' },
	overshirt: { category: 'outerwear', formality: 2, slot: 'jacket' },
	bomber: { category: 'outerwear', formality: 2, slot: 'jacket' },
	denimJacket: { category: 'outerwear', formality: 2, slot: 'jacket' },
	coat: { category: 'outerwear', formality: 4, slot: 'jacket' },
	cardigan: { category: 'outerwear', formality: 3, slot: 'jacket' },
	suit: { category: 'onepiece', formality: 5, slot: 'jacket' },
	jalabiya: { category: 'onepiece', formality: 3, slot: 'shirt' },
	sneakers: { category: 'shoes', formality: 2, slot: 'shoes', shoeType: 'whiteSneakers' },
	chunkySneakers: { category: 'shoes', formality: 1, slot: 'shoes', shoeType: 'chunkySneakers' },
	running: { category: 'shoes', formality: 1, slot: 'shoes', shoeType: 'running' },
	loafers: { category: 'shoes', formality: 4, slot: 'shoes', shoeType: 'loafers' },
	derby: { category: 'shoes', formality: 5, slot: 'shoes', shoeType: 'derby' },
	boots: { category: 'shoes', formality: 3, slot: 'shoes', shoeType: 'boots' },
	sandals: { category: 'shoes', formality: 1, slot: 'shoes', shoeType: 'sandals' },
	belt: { category: 'belt', formality: 3, slot: 'belt' },
	watch: { category: 'watch', formality: 3, slot: 'strap' },
	bag: { category: 'bag', formality: 2 },
	cap: { category: 'hat', formality: 1 },
	scarf: { category: 'scarf', formality: 3 },
	socks: { category: 'socks', formality: 2, slot: 'socks' },
	accessory: { category: 'accessory', formality: 2 },
};

export const PATTERNS = ['solid', 'stripes', 'checks', 'print', 'graphic', 'textured'];
export const MATERIALS = ['cotton', 'linen', 'denim', 'wool', 'knit', 'jersey', 'leather', 'suede', 'synthetic', 'silk', 'fleece'];
export const ITEM_FITS = ['slim', 'regular', 'relaxed', 'oversized', 'wide', 'cropped'];
export const SEASONS = ['hot', 'mild', 'cold', 'rain'];
export const STYLE_TAGS = ['minimal', 'classic', 'smartCasual', 'streetwear', 'sporty', 'bold', 'traditional'];
export const MOODS = ['minimal', 'classic', 'bold', 'relaxed'];
export const ITEM_STATUSES = ['clean', 'worn', 'laundry', 'tailor', 'archived'];

/** Formality window (1–5) each occasion wants. */
export const OCCASION_FORMALITY_RANGE = {
	work: [3, 4],
	casual: [1, 3],
	date: [2, 4],
	formal: [4, 5],
	gym: [1, 1],
	friday: [2, 4],
	travel: [1, 3],
};

/** Map an item fit to the hem-table fit. */
export const FIT_TO_PANTS_FIT = { slim: 'slim', regular: 'straight', relaxed: 'relaxed', oversized: 'relaxed', wide: 'wide', cropped: 'slim' };

/** Points the stylist adds or takes on top of the colour score. Keys double as i18n keys. */
export const STYLIST_RULES = {
	formalityOutOfRange: 7, // per step outside the occasion window
	formalitySpread: 5, // per step of spread above 2 between pieces
	seasonMismatch: 8,
	twoPatterns: 12,
	twoBoldPatterns: 20,
	bothLoose: 7,
	fitBalanced: 4,
	sneakersFormal: 14,
	gymNeedsTrainers: 25,
	leatherShoeClash: 10,
	beltShoesMatch: 3,
	beltShoesClash: 6,
	outerwearCold: 5,
	outerwearHot: 10,
	noOuterwearCold: 6,
	rainShoes: 6,
	favoriteItem: 2,
	recentlyWorn: 9, // worn within recentDays
	recentDays: 3,
	moodBold: 5,
	moodMinimal: 5,
	feedbackWeight: 8, // times the learned weight (-1 to +1)
	goodOutfit: 70, // counts as a good outfit for versatility, capsule and gaps
};

/** Wears before an item goes to the laundry pile (0 = never). */
export const LAUNDRY_LIMITS = { top: 1, bottom: 3, outerwear: 6, onepiece: 2, shoes: 0, belt: 0, watch: 0, bag: 0, hat: 4, scarf: 5, socks: 1, accessory: 0 };

/** "Buy next" candidates the gap analysis tries against what you own. */
export const GAP_CANDIDATES = [
	{ subcategory: 'oxford', color: 'white', fit: 'regular' },
	{ subcategory: 'oxford', color: 'sky-blue', fit: 'regular' },
	{ subcategory: 'tshirt', color: 'white', fit: 'regular' },
	{ subcategory: 'tshirt', color: 'black', fit: 'regular' },
	{ subcategory: 'tshirt', color: 'navy', fit: 'regular' },
	{ subcategory: 'polo', color: 'navy', fit: 'regular' },
	{ subcategory: 'knit', color: 'camel', fit: 'regular' },
	{ subcategory: 'knit', color: 'charcoal', fit: 'regular' },
	{ subcategory: 'chinos', color: 'beige', fit: 'slim' },
	{ subcategory: 'chinos', color: 'navy', fit: 'slim' },
	{ subcategory: 'jeans', color: 'denim-dark', fit: 'slim' },
	{ subcategory: 'trousers', color: 'charcoal', fit: 'slim' },
	{ subcategory: 'trousers', color: 'grey', fit: 'regular' },
	{ subcategory: 'sneakers', color: 'white', fit: 'regular' },
	{ subcategory: 'loafers', color: 'brown', fit: 'regular' },
	{ subcategory: 'derby', color: 'black', fit: 'regular' },
	{ subcategory: 'jacket', color: 'navy', fit: 'regular' },
	{ subcategory: 'overshirt', color: 'olive', fit: 'relaxed' },
	{ subcategory: 'belt', color: 'brown', fit: 'regular' },
];

/** Default body for the 3D mannequin (cm and kg; hips and shoulders from -1 to +1). */
export const DEFAULT_BODY = { height: 175, weight: 74, hips: 0, shoulders: 0, skin: 'wheat' };
export const SKIN_COLORS = { fair: '#E9C9AE', wheat: '#D3A27F', olive: '#B98B65', tan: '#9C6B48', dark: '#6A4630' };
