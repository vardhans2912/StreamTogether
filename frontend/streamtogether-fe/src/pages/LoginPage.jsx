import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function LoginPage() {
  useDocumentTitle("Sign in");
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ usernameOrEmail: "", password: "" });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError("");
  };

  const validate = () => {
    const next = {};
    if (!form.usernameOrEmail.trim()) next.usernameOrEmail = "Enter your username or email.";
    if (!form.password) next.password = "Enter your password.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setFormError("");
    try {
      const user = await login({
        usernameOrEmail: form.usernameOrEmail.trim(),
        password: form.password,
      });
      toast.success(`Welcome back, ${user.displayName || user.username}!`);
      const to = location.state?.from?.pathname || "/";
      navigate(to, { replace: true });
    } catch (err) {
      setFormError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to jump back into your rooms."
      footer={
        <>
          New to StreamTogether?{" "}
          <Link to="/register" className="kicker text-mint transition-colors hover:text-link">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-[2px] border border-violet bg-violet/10 px-3.5 py-2.5 text-sm text-ink"
          >
            {formError}
          </div>
        )}
        <Input
          label="Username or email"
          type="text"
          autoComplete="username"
          placeholder="demo"
          value={form.usernameOrEmail}
          onChange={setField("usernameOrEmail")}
          error={errors.usernameOrEmail}
          autoFocus
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
        />
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
