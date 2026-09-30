"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BellRing,
  Check,
  ChevronLeft,
  CircleCheck,
  Clock,
  Pause,
  Play,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLanguage, localize, translate } from "@/lib/i18n";
import type { Recipe } from "@/lib/recipes";
import { ingredientLine, stepIngredients, stepParts, type Units } from "@/lib/recipe-format";

type Timer = { endsAt: number | null; left: number; rang?: boolean };

// A short three-beep alarm. Browsers only allow sound after a tap, which starting a timer is.
function ring() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((at) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.3);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {}
  try {
    navigator.vibrate?.([300, 150, 300]);
  } catch {}
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CookingMode({
  recipe,
  scale,
  units,
  signedIn,
  onExit,
  onFinish,
  onReview,
}: {
  recipe: Recipe;
  scale: number;
  units: Units;
  signedIn: boolean;
  onExit: () => void;
  onFinish: () => Promise<boolean>;
  onReview: () => void;
}) {
  const { lang } = useLanguage();
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [timers, setTimers] = useState<Record<number, Timer>>({});
  const [now, setNow] = useState(() => Date.now());
  const top = useRef<HTMLDivElement>(null);
  const total = recipe.steps.length;
  const current = recipe.steps[step];
  const anyRunning = Object.values(timers).some((t) => t.endsAt);

  const remaining = (i: number) => {
    const t = timers[i];
    if (!t) return (recipe.steps[i]?.minutes || 0) * 60;
    return t.endsAt ? Math.max(0, Math.ceil((t.endsAt - now) / 1000)) : t.left;
  };

  // Tick while any timer runs, and ring once when one reaches zero. Timers keep going when you
  // move to another step, so you can cook the rice while the curry simmers.
  const timersRef = useRef(timers);
  useEffect(() => {
    timersRef.current = timers;
  }, [timers]);
  useEffect(() => {
    if (!anyRunning) return;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const due = Object.entries(timersRef.current).filter(([, x]) => x.endsAt && x.endsAt <= t);
      if (!due.length) return;
      setTimers((all) => {
        const next = { ...all };
        for (const [i] of due) next[+i] = { endsAt: null, left: 0, rang: true };
        return next;
      });
      ring();
      for (const [i] of due)
        toast.success(`${translate("Time’s up", lang)}: ${translate(recipe.steps[+i]?.title || "", lang)}`, {
          duration: 10000,
        });
    }, 500);
    return () => clearInterval(id);
  }, [anyRunning, lang, recipe.steps]);

  // Keep the screen awake while cooking, where the browser supports it.
  useEffect(() => {
    let lock: any = null;
    const request = async () => {
      try {
        lock = await (navigator as any).wakeLock?.request("screen");
      } catch {}
    };
    request();
    const again = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release?.().catch?.(() => {});
    };
  }, []);

  function go(to: number) {
    if (to >= total) {
      setFinished(true);
      if (signedIn && saved === "idle") {
        setSaved("saving");
        onFinish().then((ok) => setSaved(ok ? "saved" : "failed"));
      }
    } else setStep(Math.max(0, to));
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // ← / → move between steps (ignored while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || (e.target as HTMLElement)?.closest?.("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft" && step > 0) go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function toggleTimer(i: number) {
    const left = remaining(i);
    setNow(Date.now());
    setTimers((all) => {
      const t = all[i];
      if (t?.endsAt) return { ...all, [i]: { endsAt: null, left } };
      const start = left > 0 ? left : (recipe.steps[i].minutes || 0) * 60;
      return { ...all, [i]: { endsAt: Date.now() + start * 1000, left: start } };
    });
  }
  function resetTimer(i: number) {
    setTimers((all) => ({ ...all, [i]: { endsAt: null, left: (recipe.steps[i].minutes || 0) * 60 } }));
  }

  if (finished)
    return localize(
      <div className="cooking-finish" ref={top}>
        {recipe.image && <img src={recipe.image} alt="" />}
        <CircleCheck size={44} className="finish-icon" />
        <h2>You made it!</h2>
        <p>Enjoy your meal. Taste it and add a little salt or lemon if it needs it.</p>
        {signedIn ? (
          <p className="small-note" role="status">
            {saved === "saving"
              ? "Saving to your cooking history…"
              : saved === "saved"
                ? "Saved to your cooking history."
                : saved === "failed"
                  ? "Could not save to your history, but your meal is still delicious."
                  : ""}
          </p>
        ) : (
          <p className="small-note">Sign in to keep a history of everything you cook.</p>
        )}
        <div className="cooking-controls">
          <button className="btn outline" onClick={onReview}>
            <Star size={16} /> Rate this recipe
          </button>
          <button
            className="btn outline"
            onClick={() => {
              setFinished(false);
              setSaved("idle");
              setStep(0);
              setTimers({});
            }}
          >
            <RotateCcw size={16} /> Cook it again
          </button>
          <button className="btn primary" onClick={onExit}>
            <Check size={16} /> Done
          </button>
        </div>
      </div>,
      lang,
    );

  const uses = stepIngredients(recipe, step, (n) => [translate(n, lang)]);
  const otherTimers = Object.keys(timers)
    .map(Number)
    .filter((i) => i !== step && timers[i].endsAt);

  return localize(
    <div className="cooking-mode" ref={top}>
      <div className="cooking-progress">
        <span data-no-translate>
          {translate("Step", lang)} {step + 1} / {total}
        </span>
        <button className="text-btn" onClick={onExit}>
          <X size={16} /> Stop cooking
        </button>
      </div>
      <Progress value={((step + 1) / total) * 100} />
      <div className="step-dots" role="tablist" aria-label="Steps">
        {recipe.steps.map((s, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === step}
            aria-label={translate("Step", lang) + " " + (i + 1)}
            className={i === step ? "active" : i < step ? "done" : ""}
            onClick={() => go(i)}
          >
            {i < step ? <Check size={12} /> : i + 1}
          </button>
        ))}
      </div>

      {otherTimers.length > 0 && (
        <div className="running-timers" aria-live="polite">
          {otherTimers.map((i) => (
            <button key={i} className="chip" onClick={() => go(i)}>
              <Clock size={14} />
              <span data-no-translate>
                {translate(recipe.steps[i].title, lang)} · {clock(remaining(i))}
              </span>
            </button>
          ))}
        </div>
      )}

      <h2>{current.title}</h2>
      {uses.length > 0 && (
        <div className="step-uses" aria-label="Ingredients for this step">
          {uses.map((i) => (
            <span className="chip" key={i} data-no-translate>
              {ingredientLine(recipe.ingredients[i], scale, units, lang)}
            </span>
          ))}
        </div>
      )}
      <p className="step-text" data-no-translate>
        {stepParts(current.text, lang).map((part, n) =>
          typeof part === "string" ? (
            part
          ) : recipe.ingredients[part.ingredient] ? (
            <strong key={n}>{ingredientLine(recipe.ingredients[part.ingredient], scale, units, lang)}</strong>
          ) : null,
        )}
      </p>
      {current.check && (
        <p className="step-check">
          <Check size={17} />
          <span>
            <strong>Ready when:</strong> {current.check}
          </span>
        </p>
      )}

      {!!current.minutes && (
        <div className={"timer" + (timers[step]?.rang ? " rang" : "")}>
          {timers[step]?.rang ? <BellRing /> : <Clock />}
          <strong data-no-translate>{clock(remaining(step))}</strong>
          <button className="btn outline" onClick={() => toggleTimer(step)}>
            {timers[step]?.endsAt ? <Pause size={16} /> : <Play size={16} />}
            {timers[step]?.endsAt
              ? "Pause"
              : remaining(step) > 0 && remaining(step) < current.minutes * 60
                ? "Resume"
                : "Start timer"}
          </button>
          <button className="icon-btn" aria-label="Reset timer" onClick={() => resetTimer(step)}>
            <RotateCcw size={17} />
          </button>
        </div>
      )}

      <div className="cooking-controls">
        <button className="btn outline" disabled={step === 0} onClick={() => go(step - 1)}>
          <ChevronLeft size={17} /> Previous
        </button>
        <button className="btn primary" onClick={() => go(step + 1)}>
          {step === total - 1 ? "I made it!" : "Next step"} <ArrowRight size={17} />
        </button>
      </div>
    </div>,
    lang,
  );
}
