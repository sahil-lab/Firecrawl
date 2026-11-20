/** In-page sections, in document order. The ids match the `id` of each section element. */
export const SECTIONS = [
  { id: 'validate', label: 'Validate' },
  { id: 'readiness', label: 'Readiness' },
  { id: 'scope', label: 'Scope' },
] as const;

export const SECTION_IDS: readonly string[] = SECTIONS.map((section) => section.id);
