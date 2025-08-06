import { Flag, LogOut, Upload } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

const Header = () => {
  const { isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/exercises">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Lane Competition Manager
            </h1>
          </Link>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 sm:gap-3">
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
