import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { doc, setDoc, collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import Button from "./Button";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state on open/close
  useEffect(() => {
    if (!isOpen) {
      setModalState("benefits");
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Trigger Stripe Checkout doc creation when state changes to "checkout"
  useEffect(() => {
    if (modalState === "checkout" && user && db) {
      setLoading(true);
      setError(null);

      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_dummy";
      const sessionsRef = collection(db, "users", user.uid, "checkout_sessions");
      
      let unsub: (() => void) | null = null;

      addDoc(sessionsRef, {
        price: priceId,
        success_url: window.location.origin,
        cancel_url: window.location.origin,
      })
        .then((docRef) => {
          unsub = onSnapshot(docRef, (snap) => {
            const data = snap.data();
            if (data?.url) {
              window.location.assign(data.url);
            } else if (data?.error) {
              setError(data.error.message || "Failed to create checkout session.");
              setLoading(false);
            }
          });
        })
        .catch((err: any) => {
          console.error("Error creating checkout session:", err);
          setError(err.message || "Failed to initiate Stripe Checkout.");
          setLoading(false);
        });

      return () => {
        if (unsub) unsub();
      };
    }
  }, [modalState, user]);

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
          <div className="p-6 md:p-8 space-y-6 text-center py-12 flex flex-col items-center justify-center">
            {error ? (
              <>
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 border border-red-500/30 text-3xl mb-4">
                  ⚠️
                </div>
                <h3 className="text-xl font-bold text-white">Stripe Redirection Failed</h3>
                <p className="text-sm text-zinc-400 max-w-sm leading-relaxed mt-2">
                  {error}
                </p>
                <div className="flex gap-3 pt-6 w-full max-w-xs">
                  <Button
                    type="button"
                    onClick={() => setModalState("benefits")}
                    className="flex-1 justify-center py-2.5 !bg-transparent border border-zinc-800 hover:!bg-zinc-800/50 text-zinc-400 hover:text-white transition-all rounded-2xl cursor-pointer text-sm"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setModalState("benefits");
                      setTimeout(() => setModalState("checkout"), 100);
                    }}
                    className="flex-1 justify-center py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold tracking-wide transition-all shadow-lg hover:shadow-purple-500/25 cursor-pointer text-sm"
                  >
                    Try Again
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-6"></div>
                <h3 className="text-xl font-bold text-white">Redirecting to Stripe Checkout</h3>
                <p className="text-sm text-zinc-400 max-w-sm leading-relaxed mt-2">
                  We are opening your secure billing session. Please complete payment on the checkout page to upgrade your account.
                </p>
                <div className="pt-6 w-full max-w-xs">
                  <Button
                    type="button"
                    onClick={() => setModalState("benefits")}
                    className="w-full justify-center py-2.5 !bg-transparent border border-zinc-800 hover:!bg-zinc-800/50 text-zinc-400 hover:text-white transition-all rounded-2xl cursor-pointer text-sm"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
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
