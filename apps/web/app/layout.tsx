import "./globals.css";
import { Anton, Archivo_Black, DM_Sans, JetBrains_Mono, Playfair_Display, Space_Grotesk, } from "next/font/google";
import Navbar from "../src/components/layout/Navbar";
const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-sans",
});
const playfair = Playfair_Display({
    subsets: ["latin"],
    variable: "--font-playfair",
});
const anton = Anton({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-anton",
});
const archivoBlack = Archivo_Black({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-archivo-black",
});
const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space",
});
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});
export const metadata = {
    title: "BizBoost AI",
    description: "Next.js App Router demo",
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning><body className={`${dmSans.variable} ${playfair.variable} ${anton.variable} ${archivoBlack.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`} style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}><Navbar /><div className="appShell">{children}</div></body></html>);
}
