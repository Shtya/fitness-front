import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}


export function cls(...inputs) {
	return inputs.flat(Infinity).filter(Boolean).join(' ');
}