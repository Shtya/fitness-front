import { Mark, mergeAttributes } from '@tiptap/core';

/** Soft amber focus mark — distinct from Highlight. */
export const FocusMark = Mark.create({
	name: 'focusMark',
	inclusive: false,
	parseHTML() {
		return [{ tag: 'mark[data-focus]' }];
	},
	renderHTML({ HTMLAttributes }) {
		return ['mark', mergeAttributes(HTMLAttributes, { 'data-focus': '', class: 'sd-focus' }), 0];
	},
	addCommands() {
		return {
			toggleFocusMark:
				() =>
				({ commands }) =>
					commands.toggleMark(this.name),
		};
	},
});
