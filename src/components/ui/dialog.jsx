"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/utils/cn"

function Dialog({
	...props
}) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
	...props
}) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
	...props
}) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
	...props
}) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className
			)}
			{...props} />
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
 	...props
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(
					"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
					className
				)}
				{...props}>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						aria-label="Close"
						className={cn(
							// positioning
							"absolute top-4 rtl:left-4 ltr:right-4 z-50",

							// base button
							"group inline-flex items-center justify-center",
							"h-10 w-10 rounded-xl",

							// premium background (glass + gradient)
							"bg-white/70 dark:bg-slate-900/40 backdrop-blur",
							"border border-gray-200/70 dark:border-slate-700/70",

							// shadow + glow
							"shadow-md hover:shadow-lg",
							"hover:border-primary/30",

							// smooth motion
							"transition-all duration-300",
							"hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95",

							// focus ring
							"focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background",
							"data-[state=open]:bg-primary/10 data-[state=open]:text-primary",
							"disabled:pointer-events-none disabled:opacity-50"
						)}
					>
						{/* subtle glow on hover */}
						<span className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

						{/* icon */}
						 <XIcon
							className={cn(
								"relative z-10 size-4",
								"text-gray-600 dark:text-slate-200",
								"group-hover:text-primary transition-colors duration-300"
							)}
						/>

						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>

				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({
	className,
	...props
}) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-2   ", className)}
			{...props} />
	);
}

function DialogFooter({
	className,
	...props
}) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
			{...props} />
	);
}

function DialogTitle({
	className,
	...props
}) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("text-lg leading-none font-semibold", className)}
			{...props} />
	);
}

function DialogDescription({
	className,
	...props
}) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props} />
	);
}

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
}
