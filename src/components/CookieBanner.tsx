import { useState } from "react";
import Button from "./Button";

interface CookieBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export default function CookieBanner({
  onAccept,
  onDecline,
}: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleAccept = () => {
    setIsVisible(false);
    onAccept();
  };

  const handleDecline = () => {
    setIsVisible(false);
    onDecline();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-200 dark:border-zinc-700 shadow-lg">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              🍪 Cookie Preferences
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              We use cookies to save your notes, settings, and preferences
              locally in your browser. No data is sent to external servers. You
              can continue using the app without accepting cookies, but your
              data won't be saved between sessions.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleDecline}
              variant="default"
              size="sm"
              className="bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700"
            >
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              size="sm"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
            >
              Accept & Save Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
