-- ====================================================================
-- MABOUNDZA SUPABASE DATABASE MIGRATION SCRIPT
-- Application de Reconnaissance & Préservation des Plantes Médicinales du Gabon
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. ENUMS (TYPES ENUMERES)
-- --------------------------------------------------------------------

CREATE TYPE public.user_role AS ENUM (
  'standard',
  'child',
  'parent',
  'teacher',
  'tradipractitioner',
  'expert_botanist',
  'farmer',
  'admin'
);

CREATE TYPE public.plant_part AS ENUM (
  'leaf',
  'flower',
  'fruit',
  'bark',
  'root',
  'stem',
  'entire_plant'
);

CREATE TYPE public.validation_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'rejected'
);

CREATE TYPE public.conservation_status AS ENUM (
  'LC', -- Preoccupation mineure
  'NT', -- Quasi menacee
  'VU', -- Vulnerable
  'EN', -- En danger
  'CR', -- En danger critique
  'EW', -- Eteinte a l'etat sauvage
  'EX', -- Eteinte
  'DD', -- Donnees insuffisantes
  'NE'  -- Non evaluee
);

CREATE TYPE public.subscription_tier AS ENUM (
  'freemium',
  'family_premium',
  'pro_premium'
);

CREATE TYPE public.contribution_type AS ENUM (
  'new_plant',
  'vernacular_name',
  'audio_pronunciation',
  'traditional_use',
  'observation_photo'
);

-- --------------------------------------------------------------------
-- 2. TABLES PROFIL ET UTILISATEURS
-- --------------------------------------------------------------------

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  province_gabon TEXT, -- Estuaire, Haut-Ogooue, Moyen-Ogooue, Ngounie, Nyanga, Ogooue-Ivindo, Ogooue-Lolo, Ogooue-Maritime, Woleu-Ntem
  preferred_language_id UUID,
  bio TEXT,
  is_verified_expert BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'standard',
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  offline_pack_downloaded BOOLEAN DEFAULT FALSE,
  offline_region TEXT DEFAULT 'gabon_all',
  auto_sync_wifi_only BOOLEAN DEFAULT TRUE,
  dark_mode_enabled BOOLEAN DEFAULT FALSE,
  kids_mode_pin_hash TEXT,
  parental_consent_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 3. TABLES REFERENTIEL BOTANIQUE
-- --------------------------------------------------------------------

CREATE TABLE public.plant_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scientific_name TEXT NOT NULL UNIQUE,
  common_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES public.plant_families(id) ON DELETE SET NULL,
  scientific_name TEXT NOT NULL UNIQUE,
  french_name TEXT NOT NULL,
  commercial_name TEXT,
  genus TEXT NOT NULL,
  synonyms TEXT[],
  botanical_description TEXT NOT NULL,
  morphology_leaf TEXT,
  morphology_flower TEXT,
  morphology_fruit TEXT,
  morphology_bark TEXT,
  morphology_root TEXT,
  habitat TEXT,
  geographic_distribution TEXT,
  phenology TEXT, -- Periode de floraison / fructification
  conservation_status public.conservation_status DEFAULT 'LC',
  is_endemic_gabon BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES public.profiles(id),
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plant_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  organ public.plant_part NOT NULL DEFAULT 'leaf',
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  photographer_credit TEXT,
  license TEXT DEFAULT 'CC-BY-NC',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.languages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE, -- ex: 'fang', 'myene', 'punu', 'nzebi'
  name_french TEXT NOT NULL,
  name_native TEXT NOT NULL,
  region_gabon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plant_vernacular_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  local_name TEXT NOT NULL,
  phonetic_transcription TEXT,
  audio_url TEXT,
  contributor_id UUID REFERENCES public.profiles(id),
  validation_status public.validation_status DEFAULT 'pending',
  validated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plant_id, language_id, local_name)
);

-- --------------------------------------------------------------------
-- 4. TABLES SANTE, MEDICINE TRADITIONNELLE ET SECURITE
-- --------------------------------------------------------------------

CREATE TABLE public.plant_uses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL REFERENCES public.plants(id) ON DELETE CASCADE,
  organ_used public.plant_part NOT NULL,
  traditional_preparation TEXT NOT NULL, -- Infusion, decoction, poultice, etc.
  therapeutic_indication TEXT NOT NULL,
  cultural_significance TEXT,
  scientific_reference TEXT,
  is_validated BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plant_safety (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_id UUID NOT NULL UNIQUE REFERENCES public.plants(id) ON DELETE CASCADE,
  toxicity_level TEXT NOT NULL, -- 'NONE', 'MILD', 'MODERATE', 'HIGH', 'HIGHLY_TOXIC'
  toxic_organs public.plant_part[],
  dangerous_compounds TEXT[],
  precautions TEXT NOT NULL,
  vulnerable_populations TEXT[], -- 'pregnant_women', 'children', 'elderly', 'kidney_disease'
  verified_by_medical_expert UUID REFERENCES public.profiles(id),
  last_medical_review_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plant_contraindications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_safety_id UUID NOT NULL REFERENCES public.plant_safety(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.plant_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plant_safety_id UUID NOT NULL REFERENCES public.plant_safety(id) ON DELETE CASCADE,
  medication_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'LOW', 'MODERATE', 'SEVERE'
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.expert_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'plant', 'use', 'safety', 'contribution'
  entity_id UUID NOT NULL,
  expert_id UUID NOT NULL REFERENCES public.profiles(id),
  expert_role public.user_role NOT NULL,
  comments TEXT,
  status public.validation_status NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 5. TABLES RECONNAISSANCE IA ET SCANS
-- --------------------------------------------------------------------

CREATE TABLE public.ai_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL UNIQUE,
  tflite_file_url TEXT,
  accuracy_score NUMERIC(5,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  organ_photographed public.plant_part DEFAULT 'leaf',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  was_offline_scan BOOLEAN DEFAULT FALSE,
  device_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.scan_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  predicted_scientific_name TEXT NOT NULL,
  confidence_score NUMERIC(5,4) NOT NULL, -- Ex: 0.9452 (94.52%)
  rank INTEGER NOT NULL, -- 1, 2, ou 3
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 6. TABLES HERBIER NUMERIQUE
-- --------------------------------------------------------------------

CREATE TABLE public.herbarium_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  custom_title TEXT,
  captured_image_url TEXT NOT NULL,
  organ_type public.plant_part DEFAULT 'leaf',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  location_name TEXT,
  notes TEXT,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 7. TABLES CONTRIBUTIONS COMMUNAUTAIRES
-- --------------------------------------------------------------------

CREATE TABLE public.contributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contributor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.contribution_type NOT NULL,
  plant_id UUID REFERENCES public.plants(id) ON DELETE SET NULL,
  proposed_scientific_name TEXT,
  proposed_french_name TEXT,
  language_id UUID REFERENCES public.languages(id),
  proposed_local_name TEXT,
  audio_url TEXT,
  proposed_usage TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  status public.validation_status DEFAULT 'pending',
  reviewer_comments TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.contribution_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 8. TABLES MODULES EDUCATIFS (PETIT BOTANISTE, ECOLE, FAMILLE)
-- --------------------------------------------------------------------

CREATE TABLE public.families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_name TEXT NOT NULL,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  join_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_in_family TEXT DEFAULT 'child', -- 'parent', 'child'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, user_id)
);

CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  grade_level TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.class_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  target_mode TEXT DEFAULT 'kids', -- 'kids', 'school', 'general'
  minimum_age INT DEFAULT 6,
  creator_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  image_url TEXT,
  options JSONB NOT NULL, -- Array of strings/objects
  correct_option_index INT NOT NULL,
  explanation TEXT,
  order_index INT DEFAULT 0
);

CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  passed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  category TEXT DEFAULT 'botanist', -- 'explorer', 'quiz_master', 'guardian', 'scout'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- --------------------------------------------------------------------
-- 9. TABLES ABONNEMENTS ET COMMERCE BIO-RESPONSABLE
-- --------------------------------------------------------------------

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier public.subscription_tier NOT NULL DEFAULT 'freemium',
  status TEXT DEFAULT 'active', -- 'active', 'canceled', 'past_due'
  amount_fcfa INT DEFAULT 0,
  payment_method TEXT, -- 'airtel_money', 'moov_money', 'card'
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --------------------------------------------------------------------
-- 10. FONCTIONS ET TRIGGERS AUTOMATIQUES
-- --------------------------------------------------------------------

-- Function updates updated_at automatically
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_plants_updated_at
BEFORE UPDATE ON public.plants
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_herbarium_updated_at
BEFORE UPDATE ON public.herbarium_entries
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'standard');

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'freemium', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS public.user_role AS $$
DECLARE
  v_role public.user_role;
BEGIN
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_role, 'standard'::public.user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- 11. POLITIQUES DE SECURITE ROW LEVEL SECURITY (RLS)
-- --------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_safety ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.herbarium_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can read basic profile info, user edits own profile
CREATE POLICY "Les profils sont lisibles par tous"
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Utilisateurs modifient leur propre profil"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Preferences: User accesses own preferences
CREATE POLICY "Utilisateurs gèrent leurs propres préférences"
ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Plants: Anyone can read published plants, only admins & botanists edit
CREATE POLICY "Plantes publiées lisibles par tous"
ON public.plants FOR SELECT USING (is_published = true OR public.get_user_role(auth.uid()) IN ('admin', 'expert_botanist'));

CREATE POLICY "Experts et Admins gèrent les fiches botaniques"
ON public.plants FOR ALL USING (public.get_user_role(auth.uid()) IN ('admin', 'expert_botanist'));

-- Herbarium: Strictly private per user
CREATE POLICY "Herbier strictement privé"
ON public.herbarium_entries FOR ALL USING (auth.uid() = user_id);

-- Contributions: User sees their contributions, experts review all
CREATE POLICY "Lecture contributions"
ON public.contributions FOR SELECT USING (
  auth.uid() = contributor_id OR public.get_user_role(auth.uid()) IN ('admin', 'expert_botanist', 'tradipractitioner')
);

CREATE POLICY "Ajout contribution par tout utilisateur connecté"
ON public.contributions FOR INSERT WITH CHECK (auth.uid() = contributor_id);

-- Subscriptions: Private to user
CREATE POLICY "Lecture abonnement"
ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
