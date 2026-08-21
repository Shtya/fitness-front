'use client';

import { createContext, useContext } from 'react';

const SidebarChromeContext = createContext({
	focusMode: false,
	setFocusMode: () => {},
	hideEdgeDock: false,
});

export function SidebarChromeProvider({ value, children }) {
	return (
		<SidebarChromeContext.Provider value={value}>
			{children}
		</SidebarChromeContext.Provider>
	);
}

export function useSidebarChrome() {
	return useContext(SidebarChromeContext);
}
