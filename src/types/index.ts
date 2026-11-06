export type UserRole =
  | 'standard'
  | 'child'
  | 'parent'
  | 'teacher'
  | 'tradipractitioner'
  | 'expert_botanist'
  | 'farmer'
  | 'admin';

export type PlantPart =
  | 'leaf'
  | 'flower'
  | 'fruit'
  | 'bark'
  | 'root'
  | 'stem'
  | 'entire_plant'
  | 'unknown';

export type ValidationStatus = 'pending' | 'under_review' | 'approved' | 'rejected';

export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE';

export type SubscriptionTier = 'freemium' | 'family_premium' | 'pro_premium';

export interface UserProfile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  province_gabon?: string;
  preferred_language_id?: string;
  bio?: string;
  is_verified_expert?: boolean;
  role?: UserRole;
  created_at: string;
}

export interface PlantFamily {
  id: string;
  scientific_name: string;
  common_name?: string;
  description?: string;
}

export interface VernacularName {
  id: string;
  plant_id: string;
  language_id: string;
  language_name?: string;
  local_name: string;
  phonetic_transcription?: string;
  audio_url?: string;
  validation_status: ValidationStatus;
}

export interface PlantImage {
  id: string;
  plant_id: string;
  image_url: string;
  organ: PlantPart;
  caption?: string;
  is_primary: boolean;
  photographer_credit?: string;
}

export interface PlantSafetyInfo {
  id: string;
  plant_id: string;
  toxicity_level: 'NONE' | 'MILD' | 'MODERATE' | 'HIGH' | 'HIGHLY_TOXIC';
  toxic_organs: PlantPart[];
  dangerous_compounds: string[];
  precautions: string;
  vulnerable_populations: string[];
  verified_by_medical_expert?: string;
  last_medical_review_date: string;
}

export interface PlantUse {
  id: string;
  plant_id: string;
  organ_used: PlantPart;
  traditional_preparation: string;
  therapeutic_indication: string;
  cultural_significance?: string;
  scientific_reference?: string;
  is_validated: boolean;
}

export interface Plant {
  id: string;
  family_id?: string;
  family?: PlantFamily;
  scientific_name: string;
  french_name: string;
  commercial_name?: string;
  genus: string;
  synonyms?: string[];
  botanical_description: string;
  morphology_leaf?: string;
  morphology_flower?: string;
  morphology_fruit?: string;
  morphology_bark?: string;
  morphology_root?: string;
  habitat?: string;
  geographic_distribution?: string;
  phenology?: string;
  conservation_status: ConservationStatus;
  is_endemic_gabon: boolean;
  is_published: boolean;
  images?: PlantImage[];
  vernacular_names?: VernacularName[];
  safety?: PlantSafetyInfo;
  uses?: PlantUse[];
}

export interface GbifSpeciesRecord {
  id: string;
  gbif_species_key: number;
  scientific_name: string;
  family_name?: string;
  genus?: string;
  authorship?: string;
  common_name?: string;
  common_name_language?: string;
  occurrence_count: number;
  source_url: string;
  cached_at: string;
  local_image_uri?: string;
  image_credit?: string;
  image_license?: string;
  image_source_url?: string;
  photo_checked_at?: string;
  photo_error?: string;
  photos?: GbifSpeciesPhoto[];
}

export interface GbifSpeciesPhoto {
  id: string;
  species_id: string;
  remote_url: string;
  local_image_uri: string;
  image_credit: string;
  image_license: string;
  image_source_url: string;
  cached_at: string;
}

export interface HerbariumEntry {
  id: string;
  user_id: string;
  plant_id?: string;
  plant?: Plant;
  custom_title?: string;
  captured_image_url: string;
  organ_type: PlantPart;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  notes?: string;
  scanned_at: string;
  is_synced: boolean;
}

export interface Contribution {
  id: string;
  contributor_id: string;
  type: 'new_plant' | 'vernacular_name' | 'audio_pronunciation' | 'traditional_use' | 'observation_photo';
  plant_id?: string;
  proposed_scientific_name?: string;
  proposed_french_name?: string;
  language_id?: string;
  proposed_local_name?: string;
  audio_url?: string;
  proposed_usage?: string;
  latitude?: number;
  longitude?: number;
  status: ValidationStatus;
  reviewer_comments?: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question_text: string;
  image_url?: string;
  options: string[];
  correct_option_index: number;
  explanation?: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  target_mode: 'kids' | 'school' | 'general';
  minimum_age: number;
  questions?: QuizQuestion[];
}

export interface Badge {
  id: string;
  code: string;
  title: string;
  description: string;
  icon_name: string;
  category: string;
  unlocked_at?: string;
}
