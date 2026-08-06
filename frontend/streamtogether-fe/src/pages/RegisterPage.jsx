import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  useDocumentTitle("Create account");
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", username: "", password: "" });
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
    if (!EMAIL_RE.test(form.email.trim())) next.email = "Enter a valid email address.";
    if (form.username.trim().length < 3) next.username = "Username must be at least 3 characters.";
    if (form.password.length < 6) next.password = "Password must be at least 6 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setFormError("");
    try {
      const user = await register({
        email: form.email.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      toast.success(`Welcome to StreamTogether, ${user.displayName || user.username}!`);
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err.message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start hosting watch parties in seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="kicker text-mint transition-colors hover:text-link">
            Sign in
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
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={setField("email")}
          error={errors.email}
          autoFocus
        />
        <Input
          label="Username"
          type="text"
          autoComplete="username"
          placeholder="moviebuff"
          value={form.username}
          onChange={setField("username")}
          error={errors.username}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={form.password}
          onChange={setField("password")}
          error={errors.password}
        />
        <Button type="submit" size="lg" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
