import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import Button from "./Button";
import Input from "./Input";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSignInClick: () => void;
}

type ModalState = "benefits" | "checkout" | "success";

export default function UpgradeModal({
  isOpen,
  onClose,
  user,
  onSignInClick,
}: UpgradeModalProps) {
  const [modalState, setModalState] = useState<ModalState>("benefits");
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvc, setCvc] = useState("424");
  const [cardName, setCardName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setModalState("benefits");
      setCardNumber("4242 4242 4242 4242");
      setExpiry("12/28");
      setCvc("424");
      setCardName(user?.displayName || "");
      setError(null);
      setLoading(false);
    }
  }, [isOpen, user]);

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

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !db) return;
    setLoading(true);
    setError(null);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { isPro: true }, { merge: true });
      setModalState("success");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upgrade user subscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignInAndClose = () => {
    onClose();
    onSignInClick();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-3xl shadow-2xl overflow-hidden transform transition-all backdrop-blur-xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500"></div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 text-sm font-medium w-8 h-8 rounded-full flex items-center justify-center hover:bg-zinc-800 transition-colors z-10 cursor-pointer"
          aria-label="Close modal"
        >
          ✕
        </button>

        {isOpen && modalState === "benefits" && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                ⭐ DAYORA PRO
              </span>
              <h3 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Supercharge Your Productivity
              </h3>
              <p className="text-sm text-zinc-400">
                Unlock up to 20 daily AI assistant plan generations and 10 email exports.
              </p>
            </div>

            {/* Comparison Details */}
            <div className="grid md:grid-cols-2 gap-4 items-stretch">
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 flex flex-col justify-start">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center h-5">
                  Free Version
                </span>
                <div className="space-y-2 text-sm text-zinc-300">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 flex-shrink-0">✕</span>
                    <span>1 AI prompt daily (Unsigned)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 flex-shrink-0">✕</span>
                    <span>3 AI prompts daily (Signed In)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 flex-shrink-0">✕</span>
                    <span>1 daily plan email export</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-indigo-950/20 border border-purple-500/30 space-y-3 flex flex-col justify-start">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1 h-5">
                  Pro features ✨
                </span>
                <div className="space-y-2 text-sm text-zinc-200">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <strong className="text-white">Up to 20</strong>
                    <span>AI daily schedules</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <strong className="text-white">Up to 10</strong>
                    <span>daily plan email exports</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    <span>Priority rendering & zero delays</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 text-center space-y-1">
              <div className="flex items-baseline gap-1.5 justify-center">
                <span className="text-3xl font-extrabold text-white">$2.99</span>
                <span className="text-sm text-zinc-400 font-medium">/ month</span>
              </div>
              <p className="text-xs text-zinc-500">Cancel or update subscription settings anytime.</p>
            </div>

            {/* CTA action buttons */}
            <div className="pt-2">
              {user ? (
                <Button
                  onClick={() => setModalState("checkout")}
                  className="w-full justify-center py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 cursor-pointer text-base"
                >
                  Upgrade to Pro
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    onClick={handleSignInAndClose}
                    className="w-full justify-center py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg cursor-pointer text-base"
                  >
                    Sign In to Upgrade
                  </Button>
                  <p className="text-center text-xs text-zinc-500 leading-normal">
                    You must be logged in to sync your subscription across devices.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {isOpen && modalState === "checkout" && user && (
          <form onSubmit={handleCheckoutSubmit} className="p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                💳 Secure checkout simulation
              </h3>
              <p className="text-xs text-zinc-400 leading-normal">
                This is a mock billing form. Submit with test credit card details to simulated checkout completion.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-950/40 border border-red-900/55 rounded-2xl text-xs text-red-400 leading-relaxed">
                <strong>Error:</strong> {error}
              </div>
            )}

            {/* Simulated Checkout Inputs */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Cardholder Name</label>
                <Input
                  required
                  type="text"
                  placeholder="e.g. Alex Mercer"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="!bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Card Number</label>
                <Input
                  required
                  type="text"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="!bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">Expiry Date</label>
                  <Input
                    required
                    type="text"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    className="!bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-400">CVC</label>
                  <Input
                    required
                    type="text"
                    placeholder="123"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    className="!bg-zinc-950 border-zinc-800 text-white placeholder-zinc-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Billing details card representation */}
            <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="text-zinc-500 uppercase font-semibold">Total Price Due:</span>
                <p className="text-white font-bold text-sm">$2.99/mo</p>
              </div>
              <div className="flex gap-2">
                <span className="text-zinc-500 font-bold border border-zinc-800 px-2 py-0.5 rounded">VISA</span>
                <span className="text-zinc-500 font-bold border border-zinc-800 px-2 py-0.5 rounded">MC</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                disabled={loading}
                onClick={() => setModalState("benefits")}
                className="flex-1 justify-center py-2.5 !bg-transparent border border-zinc-800 hover:!bg-zinc-800/50 text-zinc-400 hover:text-white transition-all rounded-2xl cursor-pointer text-sm"
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 justify-center py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 cursor-pointer text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : (
                  "Pay & Subscribe"
                )}
              </Button>
            </div>
          </form>
        )}

        {isOpen && modalState === "success" && (
          <div className="p-8 text-center space-y-6 py-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 text-5xl mb-2 animate-bounce">
              🎉
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white">Upgrade Successful!</h3>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                Thank you for upgrading to <strong className="text-purple-400">Dayora Pro</strong>! All limit restrictions are now successfully removed from your account.
              </p>
            </div>

            <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800 text-left text-xs max-w-sm mx-auto space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Plan:</span>
                <span className="text-purple-400 font-semibold">Pro Subscription</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">AI Prompt limit:</span>
                <span className="text-purple-400 font-semibold">20 daily prompts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Email Export limit:</span>
                <span className="text-purple-400 font-semibold">10 daily emails</span>
              </div>
            </div>

            <div className="pt-2">
              <Button
                onClick={onClose}
                className="w-full justify-center py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-bold cursor-pointer text-sm"
              >
                Start planning as Pro
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
