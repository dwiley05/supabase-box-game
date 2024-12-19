import { v5 as uuidv5 } from 'uuid';

// Using a UUID namespace for consistent generation
const NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export const getSupabaseId = (appwriteId: string): string => {
  // Generate a UUID v5 using the Appwrite ID as the name
  // This will consistently generate the same UUID for the same Appwrite ID
  return uuidv5(appwriteId, NAMESPACE);
};
