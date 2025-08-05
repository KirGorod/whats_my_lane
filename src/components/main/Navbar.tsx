import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { isAdmin, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="w-full bg-white border-b shadow-sm px-6 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold">
        MyLogo
      </Link>

      <div>
        {isAdmin ? (
          <button
            onClick={handleLogout}
            className="text-red-500 hover:underline"
          >
            Logout
          </button>
        ) : (
          <Link to="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
