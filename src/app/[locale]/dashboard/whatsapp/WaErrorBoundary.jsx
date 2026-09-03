'use client';

import { Component } from 'react';

export default class WaErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error) {
		if (typeof console !== 'undefined') {
			console.error('WhatsApp pane crashed', error);
		}
	}

	render() {
		if (this.state.hasError) {
			const ar = this.props.locale === 'ar';
			return (
				this.props.fallback || (
					<div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm text-slate-500">
						<p className="font-semibold text-slate-700 dark:text-slate-200">
							{ar ? 'تعذر عرض هذا الجزء' : 'This pane could not be displayed'}
						</p>
						<button
							type="button"
							className="rounded-full bg-[#00a884] px-4 py-1.5 text-xs font-bold text-white"
							onClick={() => this.setState({ hasError: false })}
						>
							{ar ? 'إعادة المحاولة' : 'Retry'}
						</button>
					</div>
				)
			);
		}
		return this.props.children;
	}
}
