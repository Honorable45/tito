/** Texte révélé mot par mot ; `start` = délai avant le premier mot, `step` = décalage entre les mots (ms). */
export function Reveal({ text, start, step = 110 }: { text: string; start: number; step?: number }) {
  return (
    <>
      {text.split(' ').map((word, i) => (
        <span key={i} className="reveal-word" style={{ animationDelay: `${start + i * step}ms` }}>
          {word}
          {i < text.split(' ').length - 1 ? ' ' : ''}
        </span>
      ))}
    </>
  );
}

export const revealEnd = (text: string, start: number, step = 110) => start + text.split(' ').length * step;
