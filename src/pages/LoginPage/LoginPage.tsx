import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Logo from "../../assets/trenvet.svg";

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      navigate("/");
    } else {
      setError(t("login.invalidCredentials"));
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="login-gradient-bg flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-[380px] shadow-md">
        <CardHeader className="items-center space-y-4 pb-2 text-center">
          <img src={Logo} alt="Trenvet" className="h-12 w-auto" />
          <CardTitle className="font-heading text-xl">
            {t("login.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder={t("login.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              type="password"
              placeholder={t("login.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="min-h-11 w-full">
              {t("login.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
