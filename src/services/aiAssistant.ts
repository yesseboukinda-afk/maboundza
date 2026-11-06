import { getLocalPlants } from '@/database/sqlite';
import { Plant } from '@/types';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'maman_maboundza' | 'dr_maboundza';
  text: string;
  timestamp: string;
  referencedPlantId?: string;
  warning?: boolean;
}

export const MEDICAL_DISCLAIMER_TEXT =
  "Les informations présentées par l'assistant ne remplacent pas un avis médical. En cas de doute, de symptômes ou de réaction inhabituelle, consultez immédiatement un professionnel de santé.";

export async function askMamanMaboundza(userQuery: string): Promise<ChatMessage> {
  const queryLower = userQuery.toLowerCase();
  const plants = await getLocalPlants();

  let matchedPlant: Plant | undefined = plants.find(
    (p) =>
      queryLower.includes(p.french_name.toLowerCase()) ||
      queryLower.includes(p.scientific_name.toLowerCase()) ||
      p.vernacular_names?.some((v) => queryLower.includes(v.local_name.toLowerCase()))
  );

  let responseText = '';
  let warning = false;

  if (queryLower.includes('posologie') || queryLower.includes('dose') || queryLower.includes('enceinte') || queryLower.includes('enfant')) {
    warning = true;
    responseText = `Bonjour mon enfant. En tant que Maman MABOUNDZA, la sécurité de ta famille est ma priorité absolue.\n\nJe ne peux pas te donner de posologie médicale ou de dosage précis. Les plantes du Gabon sont puissantes et doivent être manipulées avec précaution sous l'avis d'un tradipraticien expérimenté ou d'un médecin.`;
  } else if (matchedPlant) {
    responseText = `Akeva ! Parlons de **${matchedPlant.french_name}** (*${matchedPlant.scientific_name}*).\n\nC'est une plante de la famille des **${matchedPlant.family?.scientific_name || 'familles gabonaises'}**.\n\n**Description :** ${matchedPlant.botanical_description}\n\n**Précautions d'emploi :** ${matchedPlant.safety?.precautions || 'Consulter les contre-indications avant tout usage.'}`;
  } else {
    responseText = "Je n’ai pas trouvé de fiche botanique correspondant à cette question. Consulte l’encyclopédie ou essaie avec le nom scientifique ou local de la plante.";
  }

  responseText += `\n\n${MEDICAL_DISCLAIMER_TEXT}`;

  return {
    id: `msg_${Date.now()}`,
    sender: 'maman_maboundza',
    text: responseText,
    timestamp: new Date().toISOString(),
    referencedPlantId: matchedPlant?.id,
    warning,
  };
}
