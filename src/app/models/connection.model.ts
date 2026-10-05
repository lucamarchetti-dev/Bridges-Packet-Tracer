/**
 * Una connessione logica tra due dispositivi.
 *
 * Importante: la connessione NON contiene coordinate. Sa solo "chi" collega
 * (sourceId, targetId). Le coordinate dei due estremi vengono lette sempre
 * dal Device corrispondente, così quando un dispositivo viene spostato la
 * connessione "segue" automaticamente, senza bisogno di essere aggiornata
 * manualmente (vedi TopologyService.connectionLines).
 */
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
}
