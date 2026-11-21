export const CheckGroup = ({ legend, options, value, onChange, error }) => (
  <fieldset><legend className="label">{legend}</legend>
    <div className="flex flex-wrap gap-2">{options.map((o) => { const v = o.value ?? o; const on = value.includes(v); return (
      <label key={v} className={`flex min-h-[40px] cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${on ? 'border-brand-600 bg-brand-50 font-semibold text-brand-900' : 'border-lavender-300 bg-white'}`}>
        <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={on} onChange={() => onChange(on ? value.filter((x) => x !== v) : [...value, v])} />{o.label ?? o}</label>); })}</div>
    {error && <p role="alert" className="mt-1 text-sm font-medium text-rose-700">{error}</p>}</fieldset>
);
