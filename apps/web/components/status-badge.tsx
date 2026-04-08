export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const color =
    normalized === 'IN_STOCK' || normalized === 'DONE' || normalized === 'GOOD'
      ? 'green'
      : normalized === 'ASSIGNED' || normalized === 'IN_PROGRESS' || normalized === 'FAIR'
        ? 'blue'
        : normalized === 'IN_MAINTENANCE' || normalized === 'OPEN'
          ? 'orange'
          : normalized === 'LOST' || normalized === 'DAMAGED' || normalized === 'POOR'
            ? 'red'
            : 'gray';
  return <span className={`badge ${color}`}>{value}</span>;
}
