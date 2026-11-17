import type { Category, Skill } from './types';

export function priorityRecalculationAction(version: number, reason: string) {
  return { version, reason: reason.trim() };
}

export function validateSkillName(
  name: string,
  skills: Skill[],
  selectedSkillId?: string
): string | undefined {
  const normalizedName = name.trim().toLocaleLowerCase();
  if (!normalizedName) return 'Skill name is required.';

  const duplicate = skills.some(
    (skill) =>
      skill.id !== selectedSkillId &&
      skill.name.trim().toLocaleLowerCase() === normalizedName
  );
  return duplicate ? 'That skill name is already in use.' : undefined;
}

export function validateCategoryName(
  name: string,
  categories: Category[],
  selectedCategoryId?: string
): string | undefined {
  const normalizedName = name.trim().toLocaleLowerCase();
  if (!normalizedName) return 'Category name is required.';

  const duplicate = categories.some(
    (category) =>
      category.id !== selectedCategoryId &&
      category.name.trim().toLocaleLowerCase() === normalizedName
  );
  return duplicate ? 'That category name is already in use.' : undefined;
}
