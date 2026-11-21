// Demo clock: lets reviewers simulate the weekly deadline deterministically.
import { getState, mutate } from './store';

export const now = () => { const c = getState().clock; return c.baseMs + (Date.now() - c.setAtReal); };
export const setDemoNow = (iso) => mutate((s) => { s.clock = { baseMs: Date.parse(iso), setAtReal: Date.now() }; });
