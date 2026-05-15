import "./globals.css";
import { Anton, Archivo_Black, Caveat_Brush, DM_Sans, JetBrains_Mono, Playfair_Display, Plus_Jakarta_Sans, } from "next/font/google";
import Navbar from "../src/components/layout/Navbar";
const dmSans = DM_Sans({
    subsets: ["latin"],
    variable: "--font-sans",
});
const plusJakarta = Plus_Jakarta_Sans({
    subsets: ["latin"],
    weight: ["500", "600", "700"],
    variable: "--font-brand",
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
const jetbrainsMono = JetBrains_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
});
/** BizBoost wordmark — use `.caveat-brush-regular` + `var(--font-caveat-brush)` in CSS */
const caveatBrush = Caveat_Brush({
    weight: "400",
    subsets: ["latin"],
    variable: "--font-caveat-brush",
});
export const metadata = {
    title: "BizBoost AI",
    description: "Next.js App Router demo",
};
export default function RootLayout({ children }: {
    children: React.ReactNode;
}) {
    return (<html lang="en" suppressHydrationWarning><head>
      <script dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){document.documentElement.classList.remove('dark')}})();`,
        }}/>
    </head><body className={`${dmSans.variable} ${plusJakarta.variable} ${playfair.variable} ${anton.variable} ${archivoBlack.variable} ${jetbrainsMono.variable} ${caveatBrush.variable}`} style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}><Navbar /><div className="appShell">{children}</div></body></html>);
}
