import type { GradeComponent, GradeEntry } from "../types";

export interface GradeSummary {
  values: Map<number, number | null>;
  subjectGrade: number | null;
  configuredWeight: number;
}

/** Calculates with full floating-point precision. Rounding belongs only in the UI. */
export function calculateGrades(components: GradeComponent[], entries: GradeEntry[]): GradeSummary {
  const values = new Map<number, number | null>();
  const children = new Map<number | null, GradeComponent[]>();
  for (const component of components) {
    const group = children.get(component.parent_id) ?? [];
    group.push(component);
    children.set(component.parent_id, group);
  }

  function valueFor(component: GradeComponent): number | null {
    if (values.has(component.id)) return values.get(component.id) ?? null;
    const componentEntries = entries.filter((entry) => entry.grade_component_id === component.id);
    const weightedEntries = componentEntries.filter((entry) => entry.weight > 0);
    let value: number | null;
    if (weightedEntries.length) {
      const weight = weightedEntries.reduce((sum, entry) => sum + entry.weight, 0);
      value = weightedEntries.reduce((sum, entry) => sum + entry.grade * entry.weight, 0) / weight;
    } else value = componentEntries.length ? componentEntries.reduce((sum, entry) => sum + entry.grade, 0) / componentEntries.length : null;
    values.set(component.id, value);
    return value;
  }

  components.forEach((component) => valueFor(component));
  const roots = children.get(null) ?? [];
  const configuredWeight = roots.reduce((sum, component) => sum + (component.weight ?? 0), 0);
  const availableRoots = roots
    .map((component) => ({ component, value: valueFor(component) }))
    .filter((item): item is { component: GradeComponent; value: number } => item.value !== null);
  const weightedRoots = availableRoots.filter((item) => item.component.weight !== null);
  let subjectGrade: number | null = null;
  if (weightedRoots.length) {
    const availableWeight = weightedRoots.reduce((sum, item) => sum + (item.component.weight ?? 0), 0);
    if (availableWeight > 0) subjectGrade = weightedRoots.reduce((sum, item) => sum + item.value * (item.component.weight ?? 0), 0) / availableWeight;
  } else if (availableRoots.length) {
    subjectGrade = availableRoots.reduce((sum, item) => sum + item.value, 0) / availableRoots.length;
  }
  return { values, subjectGrade, configuredWeight };
}
