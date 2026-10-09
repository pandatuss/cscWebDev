import { useEffect, useState } from "react";
import mascot from "@/assets/preloader-mascot.png";

const MIN_DISPLAY_MS = 1200;

const LOADING_LINES: { at: number; text: string }[] = [
  { at: 0, text: "Waking up the code gremlins..." },
  { at: 18, text: "Brewing fresh pixels..." },
  { at: 36, text: "Consulting the rubber duck..." },
  { at: 54, text: "Dusting off the semicolons..." },
  { at: 72, text: "Almost there. Probably." },
];

const READY_LINE = "Go be awesome!";

function lineForProgress(progress: number) {
  let line = LOADING_LINES[0].text;
  for (const entry of LOADING_LINES) {
    if (progress >= entry.at) line = entry.text;
  }
  return line;
}

function waitForWindowLoad() {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
}

function waitForFonts() {
  return document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve();
}

export function Preloader() {
  const [progress, setProgress] = useState(8);
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let done = false;
    const tick = window.setInterval(() => {
      if (!done) setProgress((p) => Math.min(90, p + (90 - p) * 0.08));
    }, 80);
    Promise.all([waitForWindowLoad(), waitForFonts()]).then(() => {
      const wait = Math.max(0, MIN_DISPLAY_MS - (performance.now() - start));
      window.setTimeout(() => {
        done = true;
        setProgress(100);
        setReady(true);
        window.setTimeout(() => setHidden(true), 650);
      }, wait);
    });
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = hidden ? "" : "hidden";
  }, [hidden]);

  if (hidden) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ready ? "Ready" : "Loading website"}
      className={`preloader-screen fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden px-6 transition-opacity duration-500 ${ready ? "pointer-events-none opacity-0 delay-150" : "opacity-100"}`}
    >
      <div aria-hidden className="preloader-circuit pointer-events-none absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className="preloader-particle absolute size-2 rounded-[2px] bg-primary/40"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${(i % 7) * 0.5}s` }}
          />
        ))}
      </div>

      <div className="relative flex w-full max-w-3xl items-center justify-center">
        <div className="relative">
          <div aria-hidden className="preloader-ring absolute inset-x-[-20%] bottom-2 h-16 rounded-[50%]" />
          <img src={mascot} alt="" width={260} height={260} className="preloader-mascot relative size-48 object-contain sm:size-64" />
        </div>
      </div>

      <div className="relative mt-10 w-full max-w-sm">
        <div className="h-3 overflow-hidden rounded-full bg-primary/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-cyan transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p
          key={ready ? READY_LINE : lineForProgress(progress)}
          className="preloader-line mt-5 text-center font-display text-lg font-semibold text-navy"
        >
          {ready ? READY_LINE : lineForProgress(progress)}
        </p>
        <div aria-hidden className="mt-4 flex items-center gap-3 text-primary">
          <span className="h-px flex-1 bg-primary/50" />
          <span className="font-mono text-lg font-bold">{"</>"}</span>
          <span className="h-px flex-1 bg-primary/50" />
        </div>
      </div>
    </div>
  );
}
