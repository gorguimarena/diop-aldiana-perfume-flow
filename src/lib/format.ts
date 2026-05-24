export const fXOF = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(n ?? 0)) + " FCFA";

export const fNum = (n: number | null | undefined) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(n ?? 0));

export const fDate = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
};

export const fDateShort = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("fr-FR");
};

export const PAYMENT_LABELS: Record<string, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  especes: "Espèces",
  carte: "Carte bancaire",
  virement: "Virement",
};

export const CATEGORY_LABELS: Record<string, string> = {
  homme: "Homme",
  femme: "Femme",
  mixte: "Mixte",
};
