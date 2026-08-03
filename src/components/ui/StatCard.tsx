import { Card } from "./Card";

export interface StatCardProps {
  label: string;
  value: string | number;
  accentColor?: string;
}

export function StatCard({ label, value, accentColor }: StatCardProps) {
  return (
    <Card accentColor={accentColor} className="flex flex-col gap-1">
      <span className="text-2xl font-bold text-text-primary">{value}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </Card>
  );
}
