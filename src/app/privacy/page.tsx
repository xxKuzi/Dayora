"use client";

import React, { useEffect, useState } from "react";

export default function PrivacyPolicy() {
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
    <div className={`min-h-screen w-full flex flex-col items-center md:justify-center p-4 md:p-8 transition-colors duration-300 relative ${isDark ? "dark bg-zinc-950" : "bg-zinc-50"}`}>
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
            Privacy Policy
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Last Updated: July 23, 2026
          </p>
        </div>

        {/* Content */}
        <div className="space-y-6 text-sm leading-relaxed md:max-h-[60vh] md:overflow-y-auto md:pr-2 custom-scrollbar">
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              1. Introduction
            </h2>
            <p>
              Welcome to <strong>Dayora</strong>. We respect your privacy and are committed to protecting the personal data of our users. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our web application.
            </p>
            <p>
              By accessing or using Dayora, you consent to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              2. Information We Collect
            </h2>
            <p>
              To provide a synchronized planning and note-taking experience, we collect certain personal and usage data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Account Credentials:</strong> If you sign in or register, we collect your email address and profile metadata (such as display name and profile picture if signing in via Google Auth) through <strong>Firebase Authentication</strong>.
              </li>
              <li>
                <strong>User-Generated Content:</strong> We store the notes, daily plans, habits, goals, and customized settings you create. This data is saved locally on your device and, if signed in, synchronized to our database using <strong>Cloud Firestore</strong>.
              </li>
              <li>
                <strong>AI Queries:</strong> When you request daily plan generation, the notes and prompts you provide are sent to the <strong>Google Gemini API</strong> to construct your agenda.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              3. How We Use Your Information
            </h2>
            <p> We use the collected data for the following purposes: </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To create and manage your user account.</li>
              <li>To synchronize your notes and schedules across multiple devices.</li>
              <li>To generate customized, AI-driven daily plans.</li>
              <li>To analyze usage metrics in order to optimize and improve the application.</li>
              <li>To process simulated subscription tiers (Pro status).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              4. Data Sharing & Third Parties
            </h2>
            <p>
              We do not sell your personal data. We share data only with third-party service providers essential to running our service:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Google Cloud & Firebase:</strong> We use Firebase for user authentication (email and Google OAuth) and database hosting (Firestore). You can read Google's privacy terms on their official website.
              </li>
              <li>
                <strong>Google Gemini API:</strong> We transmit your notes and scheduling requirements to the Google Gemini API for AI generation. Google's API policy states that developer data sent to Gemini APIs is not used to train Google's models.
              </li>
              <li>
                <strong>Stripe:</strong> Stripe is used to demonstrate monetization. All transactions are run inside Stripe's test environment. No real credit card details are stored or processed on our production networks.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              5. GDPR Compliance & User Rights
            </h2>
            <p>
              For users in the European Economic Area (EEA), we process personal data in compliance with the General Data Protection Regulation (GDPR). You have the following rights regarding your data:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>The Right to Access:</strong> You can request copies of your personal data.</li>
              <li><strong>The Right to Rectification:</strong> You can edit your notes, name, and settings directly in the app.</li>
              <li><strong>The Right to Erasure:</strong> You can delete individual notes (which are moved to Trash and can be permanently deleted) or request complete account deletion by contacting us.</li>
              <li><strong>The Right to Object:</strong> You can decline cookie storage, which will restrict storing data in your browser's local storage.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              6. Data Security
            </h2>
            <p>
              We implement standard physical, technical, and administrative security measures (such as SSL encryption and Firebase security rules) designed to secure your data. However, please remember that no method of transmission over the internet or database hosting is 100% secure.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              7. Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, your rights, or wish to delete your account, please contact us at:
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
            href="/terms"
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
}
