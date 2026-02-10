"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/utils/cn";
import { useLocale } from "next-intl";

function useDocumentDir() {
	const [dir, setDir] = React.useState("ltr");

	React.useEffect(() => {
		const getDir = () =>
			(document?.documentElement?.getAttribute("dir") || "ltr").toLowerCase();

		setDir(getDir());

		// لو اتجاه الصفحة ممكن يتغير ديناميكياً
		const observer = new MutationObserver(() => setDir(getDir()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["dir"],
		});

		return () => observer.disconnect();
	}, []);

	return dir;
}

function Switch({ className, ...props }) {
	const dir = useLocale();
	const isRTL = dir === "en";
	console.log(dir);

	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				"peer inline-flex shrink-0 items-center rounded-full border border-transparent outline-none",
				"h-6 w-11 p-[2px]",
				"bg-input data-[state=checked]:bg-primary",
				"shadow-sm transition-colors",
				"focus-visible:ring-4 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
				className
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block h-5 w-5 rounded-full bg-background shadow-md ring-0",
					"transition-transform duration-200 ease-out",
					isRTL
						? "data-[state=unchecked]:translate-x-[18px] data-[state=checked]:translate-x-0"
						: "data-[state=checked]:-translate-x-[18px] data-[state=unchecked]:translate-x-[1px]"
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
