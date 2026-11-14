interface SectionHeaderProps {
  number: string;
  title: string;
}

export function SectionHeader({ number, title }: SectionHeaderProps) {
  return (
    <div className="section-label">
      <span>{number}</span>
      <h2>{title}</h2>
    </div>
  );
}
