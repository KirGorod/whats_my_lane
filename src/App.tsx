import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Button } from "./components/ui/button";
import HomePage from "./pages/HomePage/HomePage";
import CompetitionPage from "./pages/CompetitionPage/CompetitionPage";
import { Toaster } from "sonner";

function App() {
  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <Button asChild>
                <Link to="/">Home</Link>
              </Button>
            }
          />
          <Route
            path="/competitions/:competitionId"
            element={<CompetitionPage />}
          />{" "}
        </Routes>
      </Router>
      <Toaster position="bottom-right" richColors />
    </>
  );
}

export default App;
