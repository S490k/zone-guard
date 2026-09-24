export interface DisasterZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Hardcoded disaster zones for Pakistan
export const DISASTER_ZONES: DisasterZone[] = [
  {
    id: 'zone-taunsa-barrage',
    name: 'Taunsa Barrage Flood Risk',
    latitude: 30.6987,
    longitude: 70.8503,
    radiusKm: 15,
    severity: 'high',
    description: 'Flood risk zone around Taunsa Barrage, Punjab Province',
    createdAt: new Date(),
  },
  {
    id: 'zone-jacobabad',
    name: 'Jacobabad Heat Wave Zone',
    latitude: 27.2822,
    longitude: 68.4501,
    radiusKm: 30,
    severity: 'critical',
    description: 'Extreme heat wave zone - one of hottest places on Earth',
    createdAt: new Date(),
  },
  {
    id: 'zone-muzaffarabad',
    name: 'Muzaffarabad Earthquake Zone',
    latitude: 34.3590,
    longitude: 73.4713,
    radiusKm: 20,
    severity: 'medium',
    description: 'Seismic activity zone in Azad Jammu and Kashmir',
    createdAt: new Date(),
  },
];

// Zone alert configuration
export const ZONE_ALERT_CONFIG = {
  // Minimum distance in meters before alert is triggered
  ALERT_THRESHOLD_M: 5000, // 5km warning before zone
  // Time to wait before sending duplicate alerts (seconds)
  ALERT_DEDUP_WINDOW_S: 60,
  // How often to check location against zones (seconds)
  LOCATION_CHECK_INTERVAL_S: 30,
};

export const SEVERITY_COLORS = {
  low: '#15803D',
  medium: '#A16207',
  high: '#C2410C',
  critical: '#B3261E',
} as const;
