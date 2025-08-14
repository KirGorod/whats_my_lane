import { ChevronDown, LogOut, Moon, Sun } from "lucide-react";
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
import { useState, useEffect } from "react";

const THEME_KEY = "theme";
const applyTheme = (theme: "light" | "dark") => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
};
const getTheme = (): "light" | "dark" =>
  (localStorage.getItem(THEME_KEY) as "light" | "dark") ||
  (window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light");

const Header = () => {
  const { isAdmin, logout } = useAuth();
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(getTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
  };

  const changeLanguage = (lng: "en" | "uk") => {
    i18n.changeLanguage(lng);
    document.documentElement.lang = lng;
  };

  const currentFlag = i18n.language === "uk" ? UkFlag : EnFlag;
  const currentLabel = i18n.language === "uk" ? "Українська" : "English";

  return (
    <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex flex-row gap-4">
            <img src={Logo} alt="Logo" className="h-8 w-auto" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Trenvet Lane Manager
            </h1>
          </Link>
        </div>

        {/* Right: Language Dropdown + Theme Toggle + Admin Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Dropdown */}
          <DropdownMenu onOpenChange={(isOpen) => setOpen(isOpen)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <img
                  src={currentFlag}
                  alt="flag"
                  className="w-5 h-5 rounded-sm"
                />
                <span className="hidden sm:inline">{currentLabel}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
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

          {/* Theme toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="flex items-center gap-2"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">
              {theme === "dark" ? "Light" : "Dark"}
            </span>
          </Button>

          {isAdmin && (
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
