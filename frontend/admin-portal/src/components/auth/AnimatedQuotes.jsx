import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const ADMIN_QUOTES = [
  {
    quote: "True leadership is not about power; it is about empowering others to realize their boundless potential.",
    author: "Maatram Foundation",
    context: "Guiding Principle for Foundation Leadership"
  },
  {
    quote: "Education is the most powerful weapon which you can use to change the world.",
    author: "Nelson Mandela",
    context: "Foundation Core Philosophy"
  },
  {
    quote: "Accountability and stewardship ensure that every resource directly elevates a deserving student's future.",
    author: "Maatram Executive Council",
    context: "Governance & Transparency Charter"
  },
  {
    quote: "Small acts of collective dedication create ripples of profound socio-economic transformation.",
    author: "Suchetha Bhat",
    context: "Social Impact Leadership"
  }
];

export default function AnimatedQuotes() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % ADMIN_QUOTES.length);
        setFade(true);
      }, 400);
    }, 5500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const current = ADMIN_QUOTES[index];

  return (
    <div
      className="relative rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/15 shadow-inner transition-all duration-300 hover:bg-white/15"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Inspiring Governance Quotes"
    >
      <div className="flex items-start gap-3">
        <Quote className="h-6 w-6 text-indigo-300 shrink-0 mt-0.5 opacity-80" aria-hidden="true" />
        <div className={`transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-sm italic font-medium leading-relaxed text-slate-100">
            "{current.quote}"
          </p>
          <div className="mt-2.5 flex items-center justify-between text-xs text-indigo-200">
            <span className="font-semibold text-white">&mdash; {current.author}</span>
            <span className="text-[11px] text-indigo-300/80">{current.context}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 pt-1">
        {ADMIN_QUOTES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setFade(false);
              setTimeout(() => {
                setIndex(i);
                setFade(true);
              }, 200);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? 'w-6 bg-indigo-400' : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
            aria-label={`Go to quote ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

