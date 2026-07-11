export const getBadgeColor = (category: string | null) => {
  const prefix = (category ?? "").trim().toLowerCase().charAt(0);

  switch (prefix) {
    case "h":
      return "bg-category-h/18 text-category-h border border-category-h/35";
    case "r":
      return "bg-category-r/18 text-category-r border border-category-r/35";
    case "n":
      return "bg-category-n/18 text-category-n border border-category-n/35";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
};
