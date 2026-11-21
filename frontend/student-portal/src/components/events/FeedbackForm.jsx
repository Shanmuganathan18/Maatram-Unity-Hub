import { useState } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, Field } from '../ui';
import { submitFeedback } from '../../services/eventService';
import { fmtInstant } from '../../utils/dates';
import { cn } from '../../utils/cn';

export default function FeedbackForm({ sid, eventId, existing }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (existing) return (
    <Card><CardHeader title="Your feedback" />
      <p className="flex gap-0.5" aria-label={`Rated ${existing.rating} out of 5`}>{[1, 2, 3, 4, 5].map((n) => <Star key={n} className={cn('h-5 w-5', n <= existing.rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300')} />)}</p>
      {existing.comment && <p className="mt-2 text-sm">{existing.comment}</p>}{existing.suggestion && <p className="mt-1 text-sm text-ink-soft">Suggestion: {existing.suggestion}</p>}
      <p className="mt-2 text-xs text-ink-mute">Submitted {fmtInstant(existing.submittedAt)}. Only you can see this feedback.</p>
    </Card>
  );
  const submit = async () => {
    if (!rating) { setErr('Please choose an overall rating.'); return; }
    setErr(''); setBusy(true);
    try { await submitFeedback(sid, eventId, { rating, comment: comment.trim(), suggestion: suggestion.trim() }); toast.success('Thanks – feedback submitted.'); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  return (
    <Card><CardHeader title="How was this event?" />
      <div className="space-y-4">
        <Field label="Overall experience" error={err}>
          <div role="radiogroup" aria-label="Overall rating" className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRating(n)} className="rounded-lg p-1.5"><Star className={cn('h-8 w-8', n <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300')} /></button>)}</div>
        </Field>
        <Field label="Short feedback (optional)" htmlFor="fb-c"><textarea id="fb-c" rows={3} maxLength={300} className="field" value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
        <Field label="Suggestion to improve (optional)" htmlFor="fb-s"><textarea id="fb-s" rows={2} maxLength={300} className="field" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} /></Field>
        <Button onClick={submit} loading={busy}>Submit feedback</Button>
      </div>
    </Card>
  );
}
