import { Extension } from '@tiptap/core';
import { Fragment, Slice } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { plainTextToTiptapDoc } from '@/lib/smart-document/structure';

const key = new PluginKey('smartPaste');

/**
 * Multi-line plain-text paste → conservative structure detection → TipTap nodes.
 * HTML pastes with real structure are left to TipTap's default handler.
 */
export const SmartPaste = Extension.create({
	name: 'smartPaste',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key,
				props: {
					handlePaste: (view, event) => {
						const html = event.clipboardData?.getData('text/html') || '';
						const text = event.clipboardData?.getData('text/plain') || '';
						if (!text.trim()) return false;
						if (html && /<(h[1-6]|ul|ol|li|blockquote|pre)\b/i.test(html)) return false;

						const lines = text.replace(/\r\n/g, '\n').split('\n');
						if (lines.length < 2) return false;

						event.preventDefault();
						const docJson = plainTextToTiptapDoc(text);
						const { state, dispatch } = view;
						const nodes = [];
						for (const json of docJson.content || []) {
							try {
								nodes.push(state.schema.nodeFromJSON(json));
							} catch {
								/* skip invalid */
							}
						}
						if (!nodes.length) return false;

						const fragment = Fragment.fromArray(nodes);
						const slice = new Slice(fragment, 0, 0);
						dispatch(state.tr.replaceSelection(slice).scrollIntoView());
						return true;
					},
				},
			}),
		];
	},
});
