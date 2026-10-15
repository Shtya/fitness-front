/** Distance (px) a bubble must travel before release triggers reply. */
export const SWIPE_REPLY_TRIGGER_PX = 64;
const SWIPE_REPLY_MAX_PX = 96;
const SWIPE_LOCK_PX = 10;

/**
 * Classify a touch drag on a bubble and return its live offset. Like WhatsApp, reply
 * pulls the bubble away from the inline-start edge: rightward in LTR, leftward in RTL.
 * The axis locks after the first ~10px so vertical scrolling is never hijacked.
 *
 * @returns {{ axis: 'none'|'x'|'y', offset: number, armed: boolean }}
 */
export function swipeReplyState({ dx = 0, dy = 0, rtl = false, locked = null } = {}) {
	const toward = rtl ? -dx : dx;
	let axis = locked;
	if (!axis) {
		if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) {
			return { axis: 'none', offset: 0, armed: false };
		}
		axis = Math.abs(dx) > Math.abs(dy) * 1.4 && toward > 0 ? 'x' : 'y';
	}
	if (axis !== 'x') return { axis, offset: 0, armed: false };
	const clamped = Math.max(0, Math.min(SWIPE_REPLY_MAX_PX, toward));
	// Rubber-band past the trigger so the bubble does not fly off the screen.
	const offset =
		clamped <= SWIPE_REPLY_TRIGGER_PX
			? clamped
			: SWIPE_REPLY_TRIGGER_PX + (clamped - SWIPE_REPLY_TRIGGER_PX) * 0.35;
	return {
		axis,
		offset: Math.round(rtl ? -offset : offset),
		armed: toward >= SWIPE_REPLY_TRIGGER_PX,
	};
}

/** Chat-list row swipe: reveal width for actions on each side. */
export const ROW_ACTION_WIDTH = 76;

/**
 * Row swipe with two action slots on the inline-end side and one action + "more" on the
 * inline-start side. Returns the settled translate (px, physical) after release.
 *
 * @param {{ dx: number, rtl?: boolean, startSlots?: number, endSlots?: number }} input
 */
export function settleRowSwipe({ dx = 0, rtl = false, startSlots = 2, endSlots = 2 } = {}) {
	// Physical right drag reveals the inline-start actions in LTR (left edge).
	const revealStart = rtl ? dx < 0 : dx > 0;
	const slots = revealStart ? startSlots : endSlots;
	const width = slots * ROW_ACTION_WIDTH;
	const magnitude = Math.abs(dx);
	if (magnitude < width * 0.4) return { offset: 0, side: null };
	return { offset: dx > 0 ? width : -width, side: revealStart ? 'start' : 'end' };
}

/** Live translate while dragging a row (rubber-band past the open width). */
export function dragRowOffset({ dx = 0, rtl = false, startSlots = 2, endSlots = 2 } = {}) {
	const revealStart = rtl ? dx < 0 : dx > 0;
	const width = (revealStart ? startSlots : endSlots) * ROW_ACTION_WIDTH;
	const magnitude = Math.abs(dx);
	const eased = magnitude <= width ? magnitude : width + (magnitude - width) * 0.3;
	return Math.round(Math.sign(dx) * eased);
}
