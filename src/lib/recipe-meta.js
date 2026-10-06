import {
	Apple, Cake, Croissant, CupSoda, EggFried, IceCreamCone, Moon, Salad, Soup, Sun, Sunrise, Tag,
} from 'lucide-react';

export const MEAL_TYPE_META = {
	breakfast: { icon: Sunrise, color: 'amber' },
	savory_breakfast: { icon: EggFried, color: 'amber' },
	sweet_breakfast: { icon: Croissant, color: 'pink' },
	lunch: { icon: Sun, color: 'sky' },
	dinner: { icon: Moon, color: 'violet' },
	snack: { icon: Apple, color: 'green' },
	sweet: { icon: Cake, color: 'pink' },
	dessert: { icon: IceCreamCone, color: 'pink' },
	salad: { icon: Salad, color: 'emerald' },
	soup: { icon: Soup, color: 'amber' },
	drink: { icon: CupSoda, color: 'blue' },
};

export const DEFAULT_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export const SATIETY_LEVELS = ['low', 'medium', 'high'];
export const SATIETY_COLOR = { low: 'green', medium: 'amber', high: 'red' };

export const satietyLabel = (level, t) => (SATIETY_LEVELS.includes(level) ? t(`satiety.${level}`) : String(level || '—'));

export const mealTypeMeta = type => MEAL_TYPE_META[type] || { icon: Tag, color: 'slate' };

const humanize = s => String(s || '').replace(/[_-]+/g, ' ').replace(/^\w/, c => c.toUpperCase());

/** `t` must be scoped to `recipeLibrary`; meal types are free text in the backend, so unknown values fall back to a readable label. */
export function mealTypeLabel(type, t) {
	if (!type) return '';
	const key = `mealTypes.${type}`;
	return !String(type).includes('.') && t.has(key) ? t(key) : humanize(type);
}
