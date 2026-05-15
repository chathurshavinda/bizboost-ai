type BizBoostWordmarkProps = {
    /** Visual size preset */
    size?: "nav" | "drawer" | "footer" | "compact";
    className?: string;
};
export default function BizBoostWordmark({ size = "nav", className = "" }: BizBoostWordmarkProps) {
    const rootClass = ["bb-logo-lockup", "bb-logo-lockup--type-only", `bb-logo-lockup--${size}`].join(" ");
    const typeClass = "bb-logo-type caveat-brush-regular";
    return (<span className={`${rootClass} ${className}`.trim()}>
      <span className={typeClass}>
        <span className="bb-logo-biz">Biz</span>
        <span className="bb-logo-boost">Boost</span>
      </span>
    </span>);
}
