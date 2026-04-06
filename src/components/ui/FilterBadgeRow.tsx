import Badge from "@/components/ui/badge";

export function FilterBadgeRow({ badges }: { badges: readonly string[] }) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <Badge key={badge} variant="outline">
          {badge}
        </Badge>
      ))}
    </div>
  );
}