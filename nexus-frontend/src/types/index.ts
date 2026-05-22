export interface User {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "district_officer" | "sanitation_worker" | "school_admin" | "ngo_staff";
  district?: string;
  is_active: boolean;
}

export interface Alert {
  id: string;
  unit_id: string;
  district: string;
  alert_type: string;
  severity: "low" | "moderate" | "high" | "critical";
  message: string;
  status: "active" | "acknowledged" | "resolved";
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  unit_name?: string;
  community?: string;
  prediction_data?: {
    risk_level?: string;
    risk_score?: number;
    predicted_overflow_hours?: number | null;
    reasoning?: string;
    recommendations?: string[];
    sms_message?: string | null;
  };
}

export interface HealthScore {
  id: string | null;
  district: string;
  score: number | null;
  ai_narrative: string;
  computed_at: string;
  pending?: boolean;
}

export interface SludgeJob {
  id: string;
  toilet_id: string;
  gatherer_id?: string;
  facility_id?: string;
  district: string;
  community?: string;
  status: "pending" | "assigned" | "accepted" | "in_transit" | "delivered" | "completed" | "cancelled";
  volume_litres?: number;
  waste_type: string;
  chain_complete: boolean;
  created_at: string;
  updated_at: string;
  toilet_name?: string;
  gatherer_name?: string;
}

export interface FloodAssessment {
  id: string;
  district: string;
  trigger_type: "auto" | "manual";
  trigger_rainfall_mm: number;
  status: "active" | "recovery" | "completed";
  total_assets_flagged: number;
  assets_inspected: number;
  assets_damaged: number;
  assets_destroyed: number;
  ai_assessment?: string;
  started_at: string;
  completed_at?: string;
}

export interface RegisteredToilet {
  id: string;
  owner_name: string;
  district: string;
  community: string;
  toilet_type: string;
  condition: "good" | "fair" | "poor" | "non_functional";
  is_verified: boolean;
  vulnerability_score: number;
  latitude?: number;
  longitude?: number;
}

export interface SanitationUnit {
  id: string;
  name: string;
  district: string;
  location_name: string;
  status: "active" | "inactive" | "critical";
  flood_zone_risk: "low" | "moderate" | "high" | "critical";
  vulnerability_score: number;
  latitude?: number;
  longitude?: number;
}

export interface DistrictStats {
  district: string;
  health_score: number;
  total_toilets: number;
  total_units: number;
  active_alerts: number;
  sludge_completion_rate: number;
  open_dumps: number;
}

export interface GeoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, unknown> & {
    id: string;
    name?: string;
    district?: string;
    layer: string;
    vulnerability_score?: number;
    risk_band?: "critical" | "high" | "moderate" | "low";
  };
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
  meta: { count: number; generated_at: string; layer?: string };
}
