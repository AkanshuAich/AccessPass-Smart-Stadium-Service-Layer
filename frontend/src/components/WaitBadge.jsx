export default function WaitBadge({ waitTime, size = 'md' }) {
  let level, label, dotColor;
  
  if (waitTime <= 5) {
    level = 'fast';
    label = `${waitTime} min`;
    dotColor = 'bg-wait-fast';
  } else if (waitTime <= 15) {
    level = 'moderate';
    label = `${waitTime} min`;
    dotColor = 'bg-wait-moderate';
  } else {
    level = 'crowded';
    label = `${waitTime} min`;
    dotColor = 'bg-wait-crowded';
  }

  const sizeClasses = size === 'lg' 
    ? 'px-3 py-1 text-sm' 
    : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`badge-${level} ${sizeClasses} flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`} />
      {label}
    </span>
  );
}
