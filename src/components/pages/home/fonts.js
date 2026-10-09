import { Archivo } from "next/font/google";

// Archivo's width axis gives condensed, scoreboard-like headlines and a normal-width
// body from one family. Arabic falls through to Tajawal (--font-arabic, root layout).
export const archivo = Archivo({
	subsets: ["latin"],
	axes: ["wdth"],
	variable: "--font-archivo",
	display: "swap",
});
