export const SOLID_PALETTES = [
  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }, // Blue
  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' }, // Green
  { bg: '#fffbeb', color: '#b45309', border: '#fde68a' }, // Amber
  { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' }, // Purple
  { bg: '#fff1f2', color: '#be123c', border: '#fecdd3' }, // Rose
  { bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' }, // Teal
  { bg: '#f8fafc', color: '#334155', border: '#cbd5e1' }  // Slate
];

export const GRADIENT_PALETTES = [
  ['#2563eb', '#2563eb'],
  ['#16a34a', '#16a34a'],
  ['#d97706', '#d97706'],
  ['#7c3aed', '#7c3aed'],
  ['#0891b2', '#0891b2']
];

export const getGradientStyle = (index = 0) => {
  const p = SOLID_PALETTES[Math.abs(index) % SOLID_PALETTES.length];
  return {
    background: p.bg,
    color: p.color,
    border: `1px solid ${p.border}`,
    fontWeight: '700'
  };
};

export const getInitials = (name = '') => {
  if (!name) return '??';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const formatDate = (dateInput) => {
  if (!dateInput) return 'No due date';
  const d = new Date(dateInput);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
