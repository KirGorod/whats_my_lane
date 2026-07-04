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

  const RoleIcon = isAdmin ? Shield : Mic;
  const roleLabel = isAdmin ? t("role.admin") : t("role.host");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-3 sm:px-6 sm:py-4">
        {/* Left: Logo */}
        <div className="flex min-w-0 items-center">
          <Link to="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src={Logo} alt="Logo" className="h-7 w-auto shrink-0 sm:h-8" />
            <h1 className="font-heading truncate text-lg font-bold text-foreground sm:text-2xl">
              Trenvet Order
            </h1>
          </Link>
        </div>

        {/* Center: Role indicator */}
        <div className="flex justify-center">
          {isLoggedIn && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium",
                isAdmin &&
                  "bg-primary/15 text-primary ring-1 ring-primary/30",
                isHost &&
                  "bg-brand-orange/20 text-brand-orange ring-1 ring-brand-orange/35",
                !isAdmin &&
                  !isHost &&
                  "bg-muted text-muted-foreground"
              )}
              title={roleLabel}
            >
              <RoleIcon className="h-4 w-4 shrink-0" aria-label={roleLabel} />
              <span className="hidden sm:inline">{roleLabel}</span>
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
                className="flex min-h-11 min-w-11 items-center gap-2"
              >
                <img
                  src={currentFlag}
                  alt="flag"
                  className="h-5 w-5 rounded-sm"
                />
                <span className="hidden sm:inline">{currentLabel}</span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
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
                  className="mr-2 h-5 w-5 rounded-sm"
                />
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage("uk")}>
                <img
                  src={UkFlag}
                  alt="Українська"
                  className="mr-2 h-5 w-5 rounded-sm"
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
              className="min-h-11 min-w-11"
              aria-label={t("logout")}
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
