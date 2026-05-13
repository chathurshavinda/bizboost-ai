"use client";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FaHome, FaIdBadge, FaUserCircle, FaGem, FaClipboardList, FaCalendarDay, FaEdit, FaImage, FaCog, FaSignOutAlt, } from "react-icons/fa";
export type SideMenuProps = {
    open: boolean;
    onClose: () => void;
    onRequestLogout: () => void;
};
export default function SideMenu({ open, onClose, onRequestLogout }: SideMenuProps) {
    const router = useRouter();
    const pathname = usePathname();
    const go = (href: string) => {
        onClose();
        router.push(href);
    };
    useEffect(() => {
        if (!open)
            return;
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open, onClose]);
    return (<>
      <div className={`bbSideBackdrop ${open ? "bbSideBackdrop--open" : ""}`} aria-hidden onClick={onClose}/>
      <aside className={`bbSideMenuPanel ${open ? "bbSideMenuPanel--open" : ""}`} role="dialog" aria-modal="true" aria-label="BizBoost navigation">
        <div className="bbSideBrand">
          <div className="bbBrandLeft">
            <span className="bbBrandName">BizBoost</span>
          </div>
          <button type="button" className="bbSideClose" aria-label="Close menu" onClick={onClose}>
            <span aria-hidden>×</span>
          </button>
        </div>

        <nav className="bbSideNavScroll">
          <div className="bbSideNav">
          <div className="bbSectionLabel">Overview</div>
          <SideItem icon={<FaHome size={15}/>} label="Home" onClick={() => go("/")} active={pathname === "/"}/>
          <SideItem icon={<FaIdBadge size={15}/>} label="Business details" onClick={() => go("/onboarding/business-details")} active={pathname === "/onboarding/business-details"}/>
          <SideItem icon={<FaUserCircle size={15}/>} label="Business profile" onClick={() => go("/dashboard/profile")} active={pathname === "/dashboard/profile"}/>

          <div className="bbDivider"/>
          <div className="bbSectionLabel">Planning</div>
          <SideItem icon={<FaGem size={15}/>} label="Select plan" onClick={() => go("/select-plan")} active={pathname === "/select-plan"}/>
          <SideItem icon={<FaClipboardList size={15}/>} label="Plan Builder" onClick={() => go("/marketing-plan")} active={pathname === "/marketing-plan"}/>
          <SideItem icon={<FaEdit size={15}/>} label="Biz Editor" onClick={() => go("/biz-editor")} active={pathname === "/biz-editor"}/>
          <SideItem icon={<FaImage size={15}/>} label="Poster preview" onClick={() => go("/poster-preview")} active={pathname === "/poster-preview"}/>
          <SideItem icon={<FaCalendarDay size={15}/>} label="Biz Calendar" onClick={() => go("/biz-calendar")} active={pathname === "/biz-calendar"}/>

          <div className="bbDivider"/>
          <div className="bbSectionLabel">Settings</div>
          <SideItem icon={<FaCog size={15}/>} label="Settings" onClick={() => go("/settings")} active={pathname === "/settings"}/>
          </div>
        </nav>

        <div className="bbLogoutWrap">
          <SideItem icon={<FaSignOutAlt size={15}/>} label="Logout" onClick={onRequestLogout} danger/>
        </div>

      </aside>
    </>);
}
type SideItemProps = {
    icon: ReactNode;
    label: string;
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
};
function SideItem({ icon, label, onClick, active = false, danger }: SideItemProps) {
    return (<button type="button" onClick={onClick} className={`bbSideItem ${active ? "bbSideItem--active" : ""} ${danger ? "bbSideItem--danger" : ""}`} role="menuitem">
      <span className="bbSideItemIcon">{icon}</span>
      <span className="bbSideItemLabel">{label}</span>
    </button>);
}
