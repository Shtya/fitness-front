"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { cn } from "@/utils/cn"

function useUnlockBodyScrollWhileMounted(enabled) {
	React.useEffect(() => {
		if (!enabled) return

		const body = document.body

		const unlock = () => {
			body.removeAttribute("data-scroll-locked")
			if (body.style.overflow === "hidden") body.style.overflow = ""
			body.style.paddingRight = ""
		}

		unlock()

		const obs = new MutationObserver(unlock)
		obs.observe(body, {
			attributes: true,
			attributeFilter: ["style", "data-scroll-locked"],
		})

		return () => obs.disconnect()
	}, [enabled])
}


function Select(props) {
	return <SelectPrimitive.Root data-slot="select" {...props} />
}

function SelectGroup(props) {
	return <SelectPrimitive.Group data-slot="select-group" {...props} />
}

function SelectValue(props) {
	return <SelectPrimitive.Value data-slot="select-value"  {...props} />
}


function SelectTrigger({ className, size = "default", children, ...props }) {
	return (
		<SelectPrimitive.Trigger
			data-slot="select-trigger"
			data-size={size}
			className={cn(
				[
					"relative rtl:flex-row-reverse inline-flex w-full items-center justify-between gap-2",
					" h-[37px]  ",
					"rounded-md border-[1px] border-input bg-background/60",
					"px-3.5 text-sm text-foreground", 
					"transition-all duration-200",
					"hover:bg-background hover:shadow-md",
					"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
					"disabled:cursor-not-allowed disabled:opacity-50",
					"data-[placeholder]:text-muted-foreground",
					"*:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2",
					"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
				].join(" "),
				className
			)}
			{...props}
		>
			{/* subtle inner glow */}
			<span className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-b from-white/30 to-transparent opacity-0 transition-opacity duration-200 dark:from-white/10 group-hover:opacity-100" />
			<span className="relative  z-10 flex min-w-0   items-center">{children}</span>

			<SelectPrimitive.Icon asChild>
				<ChevronDownIcon className="relative z-10 size-4 opacity-70 transition-transform duration-200 data-[state=open]:rotate-180" />
			</SelectPrimitive.Icon>
		</SelectPrimitive.Trigger>
	)
}



function SelectContent({
	className,
	children,
	position = "popper",
	align = "start",
	...props
}) {
	// unlock scroll while dropdown is mounted/open (Radix portals mount content)
	useUnlockBodyScrollWhileMounted(true)

	const isRTL =
		typeof document !== "undefined" &&
		(document.documentElement.dir === "rtl" || document.body.dir === "rtl")

	// swap align only when using popper so RTL start/end feel natural
	const resolvedAlign =
		position === "popper"
			? isRTL
				? align === "start"
					? "end"
					: align === "end"
						? "start"
						: align
				: align
			: align

	return (
		<SelectPrimitive.Portal>
			<SelectPrimitive.Content
				data-slot="select-content"
				position={position}
				align={resolvedAlign}
				sideOffset={8}
				// ✅ IMPORTANT FIX:
				// Use trigger width var to match dropdown to trigger width in both LTR/RTL
				style={{
					width: "var(--radix-select-trigger-width)",
					minWidth: "var(--radix-select-trigger-width)",
				}}
				className={cn(
					[
						"relative z-50 overflow-hidden",
						// modern container
						"rounded-md border border-border/70 bg-popover text-popover-foreground shadow-xl",
						// animation
						"data-[state=open]:animate-in data-[state=closed]:animate-out",
						"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
						"data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
						"data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
						"data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2",
						// max height (valid token)
						"max-h-[var(--radix-select-content-available-height)]",
					].join(" "),
					className
				)}
				{...props}
			>
				{/* soft top highlight */}
				<div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/[0.04] to-transparent dark:from-white/[0.06]" />

				<SelectScrollUpButton />

				<SelectPrimitive.Viewport
					// ✅ don't force trigger height; that was wrong in your code
					// keep it full width and nicely padded
					className={cn("w-full p-2")}
				>
					{children}
				</SelectPrimitive.Viewport>

				<SelectScrollDownButton />
			</SelectPrimitive.Content>
		</SelectPrimitive.Portal>
	)
}

function SelectLabel({
	className,
	...props
}) {
	return (
		<SelectPrimitive.Label
			data-slot="select-label"
			className={cn("px-3 py-2 text-xs font-semibold text-muted-foreground", className)}
			{...props}
		/>
	)
}

function SelectItem({
	className,
	children,
	...props
}) {
	return (
		<SelectPrimitive.Item
			data-slot="select-item"
			className={cn(
				[
					"group relative rtl:flex-row-reverse flex w-full cursor-default select-none items-center gap-2 rounded-md px-3 py-2 text-sm outline-none",
					"transition-colors",
					"focus:bg-accent focus:text-accent-foreground",
					"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
				].join(" "),
				className
			)}
			{...props}
		>

			<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>

			{/* subtle hover highlight */}
			<span className="pointer-events-none absolute inset-0 rounded-md bg-gradient-to-r from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
		</SelectPrimitive.Item>
	)
}

function SelectSeparator({
	className,
	...props
}) {
	return (
		<SelectPrimitive.Separator
			data-slot="select-separator"
			className={cn("my-2 h-px bg-border/70", className)}
			{...props}
		/>
	)
}

function SelectScrollUpButton({
	className,
	...props
}) {
	return (
		<SelectPrimitive.ScrollUpButton
			data-slot="select-scroll-up-button"
			className={cn(
				[
					"flex cursor-default items-center justify-center py-2",
					"text-muted-foreground",
					"bg-gradient-to-b from-background/70 to-transparent",
				].join(" "),
				className
			)}
			{...props}
		>
			<ChevronUpIcon className="size-4" />
		</SelectPrimitive.ScrollUpButton>
	)
}

function SelectScrollDownButton({
	className,
	...props
}) {
	return (
		<SelectPrimitive.ScrollDownButton
			data-slot="select-scroll-down-button"
			className={cn(
				[
					"flex cursor-default items-center justify-center py-2",
					"text-muted-foreground",
					"bg-gradient-to-t from-background/70 to-transparent",
				].join(" "),
				className
			)}
			{...props}
		>
			<ChevronDownIcon className="size-4" />
		</SelectPrimitive.ScrollDownButton>
	)
}

export {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
}
