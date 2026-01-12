// "use client"

// import React, { useEffect, useMemo, useState } from "react"
// import { useSearchParams, useParams } from "next/navigation"
// import { REGISTRY, migrateDoc } from "../dashboard/builder/registry"

// const STORAGE_PREFIX = "landing:v3:"

// function settingsKey(tenant) {
// 	return `${STORAGE_PREFIX}${tenant}:settings`
// }

// export default function SiteTenantPage() {
// 	const params = useParams()
// 	const search = useSearchParams()
// 	const tenant = params?.tenant
// 	const mode = search.get("mode") // "preview" or null

// 	const [doc, setDoc] = useState(null)
// 	const [settings, setSettings] = useState(null)

// 	useEffect(() => {
// 		if (!tenant) return

// 		try {
// 			const rawSettings = localStorage.getItem(settingsKey(tenant))
// 			setSettings(rawSettings ? JSON.parse(rawSettings) : null)
// 		} catch { }

// 		try {
// 			setDoc(res?.doc ? migrateDoc(res.doc) : null)

// 		} catch { }
// 	}, [tenant, mode])

// 	const theme = doc?.theme || {
// 		primary: "#6366f1",
// 		secondary: "#8b5cf6",
// 		pageBackground: "#ffffff",
// 		sectionBackground: "#f9fafb",
// 		titleText: "#111827",
// 		bodyText: "#6b7280",
// 		buttonText: "#ffffff",
// 		outline: "#d1d5db",
// 	}

// 	const style = useMemo(
// 		() => ({ backgroundColor: theme.pageBackground, minHeight: "100vh" }),
// 		[theme.pageBackground],
// 	)

// 	if (!doc) {
// 		return (
// 			<div style={{ padding: 24, fontFamily: "system-ui" }}>
// 				<div style={{ fontWeight: 700, marginBottom: 8 }}>
// 					{mode === "preview" ? "No draft found" : "No published page yet"}
// 				</div>
// 				<div style={{ color: "#6b7280" }}>
// 					Go back to the builder and {mode === "preview" ? "edit + autosave" : "press Publish"}.
// 				</div>
// 			</div>
// 		)
// 	}

// 	return (
// 		<div style={style}>
// 			{(doc.blocks || []).map((b) => {
// 				const def = REGISTRY[b.designId]
// 				return <div key={b.id}>{def ? def.render({ block: b, theme }) : null}</div>
// 			})}

// 		</div>
// 	)
// }


import React from 'react';

const page = () => {
	return (
		<div className="">
			
		</div>
	);
};

export default page;