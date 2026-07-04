import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import CompetitionPage from "./pages/CompetitionPage/CompetitionPage";
import CompetitionDisplayPage from "./pages/CompetitionPage/display/CompetitionDisplayPage";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage/LoginPage";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/main/Header";
import ExercisesPage from "./pages/ExercisesPage/ExercisesPage";
import { useEffect } from "react";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function AppRoutes() {
  const { pathname } = useLocation();
  const isDisplayMode = pathname.endsWith("/display");

  return (
    <>
      <ScrollToTop />
      {!isDisplayMode && <Header />}
      <Routes>
        <Route path="/" element={<ExercisesPage />} />
        <Route
          path="/competitions/:exerciseId"
          element={<CompetitionPage />}
        />
        <Route
          path="/competitions/:exerciseId/display"
          element={<CompetitionDisplayPage />}
        />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );
}

export default App;
