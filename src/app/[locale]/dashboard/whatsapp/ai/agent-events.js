/** Window event the workspace socket handler re-dispatches for `ai_agent.state` packets. */
export const AI_AGENT_STATE_EVENT = 'wa:ai-agent-state';

/** Chat-list badge for a serialized agent state; null when nothing needs attention. */
export function agentRowBadge(state) {
	if (!state || (state.effectiveMode === 'off' && !state.pendingSuggestion)) return null;
	if (state.pendingSuggestion) return 'draft';
	if (state.status === 'handoff') return 'handoff';
	if (state.mode === 'auto' || state.mode === 'suggest') return state.mode;
	return null;
}
