"use client";

import React, { useEffect, useState } from "react";

export default function TermsOfService() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dayora_dark_mode");
    if (saved === "dark") {
      setIsDark(true);
    } else if (saved === "light") {
      setIsDark(false);
    } else {
      setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
  }, []);

  return (
    <div className={`min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 transition-colors duration-300 relative ${isDark ? "dark bg-zinc-950" : "bg-zinc-50"}`}>
      {/* Background Gradient Effect matching App.css */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 bg-gradient-to-br from-[#76376b] to-[#4a6ca4] dark:from-[#573776] dark:to-[#4a5ba4]" />

      <div className="relative w-full max-w-3xl bg-white/80 dark:bg-zinc-900/85 border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-2xl p-6 md:p-10 backdrop-blur-xl text-zinc-800 dark:text-zinc-200 transition-all">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b border-zinc-200/60 dark:border-zinc-800/60 pb-6 mb-6">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
          >
            ← Back to Dayora
          </a>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Terms of Service
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last Updated: July 23, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Agreement to Terms
            </h2>
            <p>
              By accessing and using <strong>Dayora</strong>, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you are prohibited from using the application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. Portfolio & Demonstration Status
            </h2>
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-400 space-y-2">
              <p className="font-semibold text-sm">⚠️ Important Portfolio Notice</p>
              <p className="text-xs leading-relaxed">
                Dayora is a software engineering portfolio demonstration project. While it offers fully functional synchronization, settings, and scheduling:
              </p>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>All subscription options and upgrade flows (Pro tier) are simulated in <strong>Stripe's test environment</strong>.</li>
                <li>No real financial transactions are completed, and you will never be charged real money.</li>
                <li>Do not enter actual credit card numbers or sensitive financial data.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. AI-Generated Content Disclaimer
            </h2>
            <p>
              Dayora integrates the <strong>Google Gemini API</strong> to automatically organize your notes into structured daily plans. By using this service, you acknowledge and agree to the following:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 font-medium text-zinc-700 dark:text-zinc-300">
              <li>
                All generated daily plans are provided "as-is" and "as-available" without warranties of any kind.
              </li>
              <li>
                AI models can generate incomplete, inaccurate, or suboptimal scheduling recommendations. You must review, evaluate, and verify all plans prior to executing them.
              </li>
              <li>
                We assume no liability or responsibility for any actions, decisions, scheduling conflicts, errors, or losses resulting from your reliance on AI-generated suggestions.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. User Accounts & Responsibilities
            </h2>
            <p>
              When creating an account, you agree to provide accurate information. You are responsible for safeguarding your login credentials (via email/password or Google OAuth) and for all activities that occur under your account.
            </p>
            <p>
              We reserve the right to suspend or terminate accounts that violate our terms or engage in misuse of the cloud synchronization or AI endpoints.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. Intellectual Property
            </h2>
            <p>
              You retain all ownership rights to the raw content, text notes, and customized goals you input into the application. Dayora does not claim ownership over any user data.
            </p>
            <p>
              The code, graphics, layout, logos, and UI components of Dayora are the intellectual property of the developer and are protected by applicable copyright and trademark laws.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, in no event shall the developer, Dayora, or its affiliates be liable for any direct, indirect, incidental, special, or consequential damages (including loss of data, profits, or business interruption) arising out of the use or inability to use this web application.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms of Service at any time. Any changes will be posted on this page with an updated "Last Updated" date. Your continued use of the application after changes are posted constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              8. Contact Us
            </h2>
            <p>
              If you have any questions or concerns regarding these Terms of Service, please reach out to us at:
            </p>
            <p className="font-semibold text-blue-500 dark:text-blue-400">
              juicyy.developer@gmail.com
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-zinc-200/60 dark:border-zinc-800/60 pt-6 mt-6">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            &copy; 2026 Dayora. All rights reserved.
          </p>
          <a
            href="/privacy"
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}
