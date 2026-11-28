// Biểu tượng các chặng nuôi hàu; luôn đi kèm chữ nên aria-hidden.
const paths = {
  nursery: "M12 21v-8M12 13c0-4 3-6 7-6 0 4-3 6-7 6ZM12 15c0-3-2-5-6-5 0 3 2 5 6 5Z",
  seeding: "M3 7h18M6 7v6M12 7v9M18 7v6M6 16.5a1.5 1.5 0 1 0 .01 0M12 19.5a1.5 1.5 0 1 0 .01 0M18 16.5a1.5 1.5 0 1 0 .01 0",
  care: "M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11ZM9.500 14.500a2.500 2.500 0 0 0 2.500 2.500",
  harvest: "M4 10h16l-2 10H6L4 10ZM8 10a4 4 0 0 1 8 0M9.500 14v2.500M14.500 14v2.500",
  sale: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v.01M14 20h3M20 17v3",
} as const;

export type JourneyIconName = keyof typeof paths;

export function JourneyIcon({ name }: { name: JourneyIconName }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}
