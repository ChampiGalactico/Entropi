import { useEffect, useState, type ComponentType } from "react";
import { loadIconComponent } from "../../lib/solarIcons";

export interface SolarIconProps {
  name: string | null | undefined;
  size?: number | string;
  color?: string;
  className?: string;
}

/** Renders a stored Solar Icon full name (e.g. "BookLinear"). Renders nothing if unset/unknown. */
export function SolarIcon({ name, size = 16, color, className }: SolarIconProps) {
  const [Icon, setIcon] = useState<ComponentType<{
    size?: number | string;
    color?: string;
    className?: string;
  }> | null>(null);

  useEffect(() => {
    let active = true;
    setIcon(null);
    if (name) void loadIconComponent(name).then((component) => {
      if (active) setIcon(() => component);
    });
    return () => {
      active = false;
    };
  }, [name]);

  if (!Icon) return null;
  return <Icon size={size} color={color} className={className} />;
}
