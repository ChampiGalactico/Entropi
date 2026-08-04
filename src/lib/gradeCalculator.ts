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

  function valueFor(component: GradeComponent, visiting = new Set<number>()): number | null {
    if (values.has(component.id)) return values.get(component.id) ?? null;
    if (visiting.has(component.id)) return null;
    const nextVisiting = new Set(visiting).add(component.id);
    const nested = children.get(component.id) ?? [];
    let value: number | null;
    if (nested.length) {
      const available = nested
        .map((child) => ({ child, value: valueFor(child, nextVisiting) }))
        .filter((item): item is { child: GradeComponent; value: number } => item.value !== null);
      const weighted = available.filter((item) => item.child.weight !== null);
      if (!available.length) value = null;
      else if (weighted.length) {
        const weightSum = weighted.reduce((sum, item) => sum + (item.child.weight ?? 0), 0);
        value = weightSum > 0
          ? weighted.reduce((sum, item) => sum + item.value * (item.child.weight ?? 0), 0) / weightSum
          : null;
      } else value = available.reduce((sum, item) => sum + item.value, 0) / available.length;
    } else {
      const grades = entries.filter((entry) => entry.grade_component_id === component.id).map((entry) => entry.grade);
      value = grades.length ? grades.reduce((sum, grade) => sum + grade, 0) / grades.length : null;
    }
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
