import { ChevronDown, LogOut, Mic, Shield } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import Logo from "../../assets/trenvet.svg";
import { useTranslation } from "react-i18next";

import UkFlag from "../../assets/flags/uk.svg";
import EnFlag from "../../assets/flags/en.svg";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

const Header = () => {
  const { isAdmin, isHost, isLoggedIn, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  const changeLanguage = (lng: "en" | "uk") => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  };

  const currentFlag = i18n.language === "uk" ? UkFlag : EnFlag;
  const currentLabel = i18n.language === "uk" ? "Українська" : "English";

  const isColoredHeader = isAdmin || isHost;

  const headerClass = cn(
    "border-b px-3 sm:px-6 py-3 sm:py-4",
    isAdmin && "bg-indigo-600 border-indigo-700 text-white",
    isHost && "bg-teal-600 border-teal-700 text-white",
    !isColoredHeader && "bg-white border-gray-200 text-gray-900"
  );

  const titleClass = cn(
    "text-lg sm:text-2xl font-bold truncate",
    isColoredHeader ? "text-white" : "text-gray-900"
  );

  const actionButtonClass = cn(
    "min-h-11 min-w-11",
    isColoredHeader &&
      "border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
  );

  const RoleIcon = isAdmin ? Shield : Mic;
  const roleLabel = isAdmin ? t("role.admin") : t("role.host");

  return (
    <header className={headerClass}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Left: Logo */}
        <div className="flex min-w-0 items-center">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-4">
            <img src={Logo} alt="Logo" className="h-7 w-auto sm:h-8 shrink-0" />
            <h1 className={titleClass}>Trenvet Order</h1>
          </Link>
        </div>

        {/* Center: Role indicator */}
        <div className="flex justify-center">
          {isLoggedIn && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1",
                isColoredHeader ? "bg-white/15" : "bg-gray-100"
              )}
              title={roleLabel}
            >
              <RoleIcon
                className="h-5 w-5 shrink-0"
                aria-label={roleLabel}
              />
              <span className="hidden sm:inline text-sm font-medium">
                {roleLabel}
              </span>
            </div>
          )}
        </div>

        {/* Right: Language + Logout */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <DropdownMenu onOpenChange={(isOpen) => setOpen(isOpen)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("flex items-center gap-2", actionButtonClass)}
              >
                <img
                  src={currentFlag}
                  alt="flag"
                  className="w-5 h-5 rounded-sm"
                />
                <span className="hidden sm:inline">{currentLabel}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform duration-200",
                    open && "rotate-180"
                  )}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage("en")}>
                <img
                  src={EnFlag}
                  alt="English"
                  className="w-5 h-5 mr-2 rounded-sm"
                />
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("uk")}>
                <img
                  src={UkFlag}
                  alt="Українська"
                  className="w-5 h-5 mr-2 rounded-sm"
                />
                Українська
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isLoggedIn && (
            <Button
              onClick={logout}
              variant="outline"
              size="sm"
              className={actionButtonClass}
              aria-label={t("logout")}
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
