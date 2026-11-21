import { useState, useEffect } from 'react';
import { Shield, Sparkles } from 'lucide-react';

const OFFICER_QUOTES = [
  {
    text: "Leadership is not about being in charge. It is about taking care of those in your charge.",
    author: "Simon Sinek",
    role: "Leadership Author",
  },
  {
    text: "The greatest leader is not necessarily the one who does the greatest things, but the one who gets people to do the greatest things.",
    author: "Ronald Reagan",
    role: "Public Service",
  },
  {
    text: "Zone coordination connects dreams to reality. When we mentor one student, we uplift an entire community.",
    author: "Maatram Foundation",
    role: "Officer Council",
  },
  {
    text: "True service is not measuring how many people you help, but how deeply you transform their trajectory.",
    author: "Maatram Zonal Lead Motto",
    role: "Core Value",
  },
  {
    text: "Discipline, presence, and empathy are the pillars of impactful mentorship.",
    author: "Operational Principle",
    role: "Maatram Coordination",
  },
];

export default function AnimatedQuotes() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % OFFICER_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const quote = OFFICER_QUOTES[currentIdx];

  return (
    <div
      className="relative rounded-2xl bg-white/10 p-6 backdrop-blur-md border border-white/15 transition-all duration-500"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-live="polite"
    >
      <Shield className="h-7 w-7 text-teal-300/70 mb-3" aria-hidden="true" />
      <p className="text-base sm:text-lg font-medium leading-relaxed text-white min-h-[72px] transition-opacity duration-500">
        “{quote.text}”
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-sm font-semibold text-teal-200">{quote.author}</p>
          <p className="text-xs text-slate-300">{quote.role}</p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {OFFICER_QUOTES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIdx ? 'w-6 bg-teal-400' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

