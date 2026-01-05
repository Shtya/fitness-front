"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"

export default function Providers({ children }) {
	const [client] = useState(() => new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60_000,        // يعتبر الداتا fresh لمدة دقيقة
				gcTime: 10 * 60_000,      // يحتفظ بالكاش 10 دقائق
				refetchOnWindowFocus: false,
				retry: 1,
			},
		},
	}))

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
