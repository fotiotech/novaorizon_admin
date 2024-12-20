// Importez les fonctions nécessaires depuis date-fns
import { formatDistanceToNow } from "date-fns";
import { enGB } from "date-fns/locale"; // Pour la localisation en français

// Fonction utilitaire pour transformer la date
function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true, locale: enGB });
}

// Exemple de composant React en TypeScript
import React from "react";

// Définissez les types des props
interface DateComponentProps {
  date: string;
}

export const DateComponent: React.FC<DateComponentProps> = ({ date }) => {
  return (
    <div>
      <p>{formatRelativeDate(date)}</p>
    </div>
  );
};
