"use client";
import Image from "next/image";
type BizBoostLogoProps = {
    size?: number;
    className?: string;
    "aria-hidden"?: boolean;
};
export default function BizBoostLogo({ size = 36, className, "aria-hidden": ariaHidden = true }: BizBoostLogoProps) {
    return (<Image src="/bizboost-mark.png" alt="BizBoost logo" width={size} height={size} className={className} aria-hidden={ariaHidden} priority/>);
}
