import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import HomePage from "./pages/HomePage/HomePage";
import CompetitionPage from "./pages/CompetitionPage/CompetitionPage";
import { Toaster } from "sonner";
import LoginPage from "./pages/LoginPage/LoginPage";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/main/Header";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/competitions/:competitionId"
            element={<CompetitionPage />}
          />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Router>
      <Toaster position="bottom-right" richColors />
    </AuthProvider>
  );
}

export default App;
