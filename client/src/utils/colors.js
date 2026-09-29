export const GRADIENT_PALETTES = [
  ['#6d5dfc', '#c04df8'],
  ['#22d3ee', '#6d5dfc'],
  ['#f43f8e', '#f59e0b'],
  ['#10b981', '#22d3ee'],
  ['#f59e0b', '#f43f5e']
];

export const getGradientStyle = (index = 0) => {
  const [c1, c2] = GRADIENT_PALETTES[Math.abs(index) % GRADIENT_PALETTES.length];
  return {
    background: `linear-gradient(135deg, ${c1}, ${c2})`
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
