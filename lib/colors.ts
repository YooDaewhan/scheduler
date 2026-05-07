const COMPANY_COLORS = [
  "#EF4444", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#06B6D4", "#F97316",
  "#6366F1", "#14B8A6", "#E11D48", "#84CC16",
];

export function getNextColor(usedColors: string[]): string {
  for (const c of COMPANY_COLORS) {
    if (!usedColors.includes(c)) return c;
  }
  return COMPANY_COLORS[usedColors.length % COMPANY_COLORS.length];
}
