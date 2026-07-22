import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";
import Input from "./Input";
import Button from "./Button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = "signin" | "signup" | "forgot";

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setDisplayName("");
      setError(null);
      setMessage(null);
      setMode("signin");
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setError(null);
    setMessage(null);

    const emailTrim = email.trim();
    if (!emailTrim) {
      setError("Email is required.");
      return;
    }

    if (mode === "forgot") {
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, emailTrim);
        setMessage("Password reset email sent! Check your inbox.");
        setMode("signin");
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to send reset email.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setLoading(true);
      try {
        const cred = await createUserWithEmailAndPassword(auth, emailTrim, password);
        try {
          await sendEmailVerification(cred.user);
        } catch (verifyErr) {
          console.error("Failed to send verification email:", verifyErr);
        }
        if (displayName.trim()) {
          await updateProfile(cred.user, {
            displayName: displayName.trim(),
          });
        }
        onClose();
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to create account.");
      } finally {
        setLoading(false);
      }
    } else {
      // signin
      setLoading(true);
      try {
        await signInWithEmailAndPassword(auth, emailTrim, password);
        onClose();
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Invalid email or password.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 transform transition-all backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {mode === "signin" && "Welcome Back"}
            {mode === "signup" && "Create Account"}
            {mode === "forgot" && "Reset Password"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-medium w-7 h-7 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Firebase Config Check */}
        {!isFirebaseConfigured ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 space-y-3">
            <p className="text-sm font-medium">⚠️ Firebase Not Configured</p>
            <p className="text-xs leading-relaxed">
              Firebase keys are missing from the configuration. Copy the placeholders from{" "}
              <code className="bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
                .env.example
              </code>{" "}
              to your local{" "}
              <code className="bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
                .env
              </code>{" "}
              file and configure your project credentials to enable online syncing.
            </p>
          </div>
        ) : (
          <>
            {/* Alerts */}
            {error && (
              <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs">
                {error}
              </div>
            )}
            {message && (
              <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs">
                {message}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Display Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full text-sm"
                    autoFocus
                  />
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm"
                  autoFocus={mode !== "signup"}
                />
              </div>

              {mode !== "forgot" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>
              )}

              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                    Confirm Password
                  </label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-sm"
                  />
                </div>
              )}

              {mode === "signin" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full justify-center !bg-blue-600 hover:!bg-blue-700 !text-white !border-blue-500 shadow-md font-semibold text-sm"
              >
                {loading
                  ? "Processing..."
                  : mode === "signin"
                  ? "Sign In"
                  : mode === "signup"
                  ? "Create Account"
                  : "Send Reset Link"}
              </Button>
            </form>

            {/* Divider */}
            {mode !== "forgot" && (
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                <span className="flex-shrink mx-4 text-zinc-400 dark:text-zinc-500 text-xs font-semibold">
                  or continue with
                </span>
                <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
            )}

            {/* Social Authentication */}
            {mode !== "forgot" && (
              <Button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full justify-center flex items-center gap-2 !bg-transparent border border-zinc-300 dark:border-zinc-700 hover:!bg-zinc-100 dark:hover:!bg-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all text-sm font-medium"
              >
                {/* Google SVG Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google Sign In
              </Button>
            )}

            {/* Toggles */}
            <div className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              {mode === "signin" && (
                <>
                  Don't have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Create one
                  </button>
                </>
              )}
              {mode === "signup" && (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("signin")}
                    className="font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    Sign In
                  </button>
                </>
              )}
              {mode === "forgot" && (
                <button
                  onClick={() => setMode("signin")}
                  className="font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Back to Sign In
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
