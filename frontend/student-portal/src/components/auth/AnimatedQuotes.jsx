import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const STUDENT_QUOTES = [
  {
    text: "Education is not preparation for life; education is life itself.",
    author: "John Dewey",
    role: "Philosopher & Educator",
  },
  {
    text: "Opportunities don't just happen. You create them through discipline, continuous learning, and active participation.",
    author: "Maatram Mentorship Motto",
    role: "Guiding Principle",
  },
  {
    text: "The beautiful thing about learning is that no one can take it away from you.",
    author: "B.B. King",
    role: "Legendary Musician",
  },
  {
    text: "Your weekly availability is your commitment to your future. Every session attended brings you closer to your career goals.",
    author: "Maatram Foundation",
    role: "Student Success Team",
  },
  {
    text: "Success is the sum of small efforts, repeated day in and day out.",
    author: "Robert Collier",
    role: "Author",
  },
];

export default function AnimatedQuotes() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % STUDENT_QUOTES.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const quote = STUDENT_QUOTES[currentIdx];

  return (
    <div
      className="relative rounded-2xl bg-white/10 p-6 backdrop-blur-md border border-white/15 transition-all duration-500"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-live="polite"
    >
      <Quote className="h-8 w-8 text-emerald-300/60 mb-3" aria-hidden="true" />
      <p className="text-base sm:text-lg font-medium leading-relaxed text-white min-h-[72px] transition-opacity duration-500">
        “{quote.text}”
      </p>
      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
        <div>
          <p className="text-sm font-semibold text-emerald-200">{quote.author}</p>
          <p className="text-xs text-slate-300">{quote.role}</p>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {STUDENT_QUOTES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentIdx(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIdx ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

