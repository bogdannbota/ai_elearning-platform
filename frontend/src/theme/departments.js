// Paletă fixă, sobră. Fiecare departament primește o nuanță stabilă după id.
const PALETTE = [
  { name: "slate",   chip: "bg-slate-100 text-slate-700 border-slate-200",   bar: "#475569", dot: "bg-slate-500" },
  { name: "blue",    chip: "bg-blue-50 text-blue-700 border-blue-200",        bar: "#1f5fbf", dot: "bg-blue-600" },
  { name: "teal",    chip: "bg-teal-50 text-teal-700 border-teal-200",        bar: "#0f766e", dot: "bg-teal-600" },
  { name: "violet",  chip: "bg-violet-50 text-violet-700 border-violet-200",  bar: "#6d28d9", dot: "bg-violet-600" },
  { name: "amber",   chip: "bg-amber-50 text-amber-800 border-amber-200",     bar: "#b45309", dot: "bg-amber-600" },
  { name: "rose",    chip: "bg-rose-50 text-rose-700 border-rose-200",        bar: "#be123c", dot: "bg-rose-600" },
];

export function deptTheme(departmentId) {
  if (departmentId == null) {
    return { name: "neutral", chip: "bg-slate-100 text-slate-500 border-slate-200", bar: "#94a3b8", dot: "bg-slate-300" };
  }
  return PALETTE[departmentId % PALETTE.length];
}