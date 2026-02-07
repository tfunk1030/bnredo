import { normalizeClubName } from '@/src/features/settings/utils/club-mapping';

export enum SkillLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  PROFESSIONAL = "professional"
}

export interface ShotResult {
  carryDistance: number;
  lateralMovement: number;
}

export interface BallModel {
  name: string;
  compression: number;
  speed_factor: number;
  spin_factor: number;
  temp_sensitivity: number;
  dimple_pattern: string;
}

export interface ClubData {
  id?: string; // Unique identifier for stable editing/deletion after sorting
  name: string;
  normalYardage: number;
  ball_speed: number;
  launch_angle: number;
  spin_rate: number;
  max_height: number;
  land_angle: number;
  spin_decay: number;
  wind_sensitivity: number;
}

export class YardageModelEnhanced {
  // Enhanced physics constants with O1 model refinements
  private static readonly GRAVITY: number = 32.174;  // ft/s²
  private static readonly WIND_POWER_SCALE: number = 0.230;  // O1 model refined value
  private static readonly TAILWIND_AMPLIFIER: number = 1.235; // O1 model refined value
  private static readonly LATERAL_BASE_MULTIPLIER: number = 2.0; // Refined value
  private static readonly SPIN_GYRO_THRESHOLD: number = 6000; // RPM threshold
  private static readonly SPIN_TRANSITION_ZONE: number = 300; // RPM transition width
  private static readonly AIR_DENSITY_SEA_LEVEL: number = 1.177; // kg/m³ (77°F, 1013.25 hPa, 50% RH - TrackMan standard)
  private static readonly REFERENCE_VELOCITY: number = 50; // m/s for spin decay
  private static readonly ALTITUDE_PRESSURE_RATIO = 0.190284;
  private static readonly DENSITY_EXPONENT_SEA: number = 0.7; // Tuned for viscosity compensation
  private static readonly DENSITY_EXPONENT_ALT: number = 0.5;
  private static readonly ALTITUDE_THRESHOLD: number = 3000;
  private static readonly MAGNUS_A = 6.1121;
  private static readonly MAGNUS_B = 17.502;
  private static readonly MAGNUS_C = 240.97;
  private static readonly GAS_CONSTANT_DRY = 287.058;
  private static readonly GAS_CONSTANT_VAPOR = 461.495;

  // Club database with refined wind sensitivity coefficients
  private static readonly CLUB_DATABASE: Readonly<Record<string, ClubData>> = {
    "driver": {
      name: "Driver",
      normalYardage: 300,
      ball_speed: 175.5,
      launch_angle: 11.0,
      spin_rate: 2575,
      max_height: 40,
      land_angle: 39,
      spin_decay: 0.08,
      wind_sensitivity: 1.0
    },
    "3-wood": {
      name: "3-Wood",
      normalYardage: 265,
      ball_speed: 160,
      launch_angle: 11.5,
      spin_rate: 3333,
      max_height: 38,
      land_angle: 42,
      spin_decay: 0.09,
      wind_sensitivity: 1.0
    },
    "5-wood": {
      name: "5-Wood",
      normalYardage: 245,
      ball_speed: 156,
      launch_angle: 10.7,
      spin_rate: 4622,
      max_height: 34,
      land_angle: 37,
      spin_decay: 0.10,
      wind_sensitivity: 1.0
    },
    "4-iron": {
      name: "4-Iron",
      normalYardage: 220,
      ball_speed: 135.4,
      launch_angle: 12.5,
      spin_rate: 4273,
      max_height: 33,
      land_angle: 40,
      spin_decay: 0.105,
      wind_sensitivity: 1.0
    },
    "5-iron": {
      name: "5-Iron",
      normalYardage: 210,
      ball_speed: 132.4,
      launch_angle: 13.6,
      spin_rate: 5004,
      max_height: 37,
      land_angle: 42.6,
      spin_decay: 0.11,
      wind_sensitivity: 1.0
    },
    "6-iron": {
      name: "6-Iron",
      normalYardage: 198,
      ball_speed: 130,
      launch_angle: 15.0,
      spin_rate: 6004,
      max_height: 36.0,
      land_angle: 46,
      spin_decay: 0.115,
      wind_sensitivity: 1.0
    },
    "7-iron": {
      name: "7-Iron",
      normalYardage: 185,
      ball_speed: 124,
      launch_angle: 16.8,
      spin_rate: 7024,
      max_height: 35.5,
      land_angle: 48.2,
      spin_decay: 0.12,
      wind_sensitivity: 1.0
    },
    "8-iron": {
      name: "8-Iron",
      normalYardage: 170,
      ball_speed: 116,
      launch_angle: 18.5,
      spin_rate: 7708,
      max_height: 35,
      land_angle: 47.3,
      spin_decay: 0.13,
      wind_sensitivity: 1.0
    },
    "9-iron": {
      name: "9-Iron",
      normalYardage: 153,
      ball_speed: 112,
      launch_angle: 19.6,
      spin_rate: 8893,
      max_height: 34,
      land_angle: 49.6,
      spin_decay: 0.14,
      wind_sensitivity: 1.0
    },
    "pitching-wedge": {
      name: "PW",
      normalYardage: 145,
      ball_speed: 107.5,
      launch_angle: 21.3,
      spin_rate: 9236,
      max_height: 34,
      land_angle: 50.6,
      spin_decay: 0.15,
      wind_sensitivity: 1.0
    },
    "gap-wedge": {
      name: "GW",
      normalYardage: 135,
      ball_speed: 95.8,
      launch_angle: 23.0,
      spin_rate: 10070,
      max_height: 33,
      land_angle: 51.1,
      spin_decay: 0.155,
      wind_sensitivity: 1.0
    },
    "sand-wedge": {
      name: "SW",
      normalYardage: 130,
      ball_speed: 89,
      launch_angle: 25.3,
      spin_rate: 10800,
      max_height: 33,
      land_angle: 51.4,
      spin_decay: 0.16,
      wind_sensitivity: 1.0
    },
    "lob-wedge": {
      name: "LW",
      normalYardage: 120,
      ball_speed: 77,
      launch_angle: 28.1,
      spin_rate: 12000,
      max_height: 33,
      land_angle: 52,
      spin_decay: 0.165,
      wind_sensitivity: 1.0
    }
  };

  // Ball models
  private static readonly BALL_MODELS: Readonly<Record<string, BallModel>> = {
    "tour_premium": {
      name: "Tour Premium",
      compression: 95,
      speed_factor: 1.00,
      spin_factor: 1.05,
      temp_sensitivity: 1.0,
      dimple_pattern: "hexagonal"
    }
  };

  // Instance variables
  private temperature: number | null = null;
  private pressure: number | null = null;
  private humidity: number | null = null;
  private windSpeed: number | null = null;
  private windDirection: number | null = null;
  private ball_model = "tour_premium";
  private altitude: number | null = null;

  private calculateEnvironmentalFactor(): number {
    const currentDensity = this.calculateAirDensity(
      this.temperature || 70,
      this.pressure || 1013.25,
      this.humidity || 50
    );

    const densityRatio = currentDensity / YardageModelEnhanced.AIR_DENSITY_SEA_LEVEL;
    const useAltExponent = this.altitude && this.altitude > YardageModelEnhanced.ALTITUDE_THRESHOLD;
    const exponent = useAltExponent ? YardageModelEnhanced.DENSITY_EXPONENT_ALT
                                  : YardageModelEnhanced.DENSITY_EXPONENT_SEA;

    return Math.pow(densityRatio, -exponent);
  }

  /**
   * Calculate air density from temperature, pressure, and humidity.
   *
   * IMPORTANT: This function expects STATION PRESSURE (actual local pressure
   * at the measurement location), not MSL (mean sea level) pressure.
   *
   * Station pressure naturally decreases with altitude (~12 hPa per 100m),
   * so altitude effects on ball flight are automatically incorporated when
   * using station pressure. No separate altitude adjustment is needed.
   *
   * Weather APIs used:
   * - Open-Meteo: `surface_pressure` (station pressure) ✓
   * - Tomorrow.io: `pressureSurfaceLevel` (station pressure) ✓
   *
   * If using MSL pressure, you must convert to station pressure first:
   * P_station = P_msl × exp(-g×M×h / (R×T))
   *
   * @param tempF Temperature in Fahrenheit
   * @param pressureMb Pressure in millibars (hPa) - MUST be station pressure
   * @param humidity Relative humidity (0-100%)
   * @returns Air density in kg/m³
   */
  private calculateAirDensity(tempF: number, pressureMb: number, humidity: number): number {
    const tempC = (tempF - 32) * 5/9;
    const pressurePa = pressureMb * 100;

    const svp = YardageModelEnhanced.MAGNUS_A * Math.exp(
      (YardageModelEnhanced.MAGNUS_B * tempC) / (tempC + YardageModelEnhanced.MAGNUS_C)
    );
    const vaporPressure = (humidity / 100) * svp;

    return (pressurePa - vaporPressure * 100) / (YardageModelEnhanced.GAS_CONSTANT_DRY * (tempC + 273.15)) +
           vaporPressure * 100 / (YardageModelEnhanced.GAS_CONSTANT_VAPOR * (tempC + 273.15));
  }

  calculateAdjustedYardage(targetYardage: number, skillLevel: SkillLevel, club: string): ShotResult {
    const clubKey = normalizeClubName(club.toLowerCase()) || club.toLowerCase();
    const clubData = YardageModelEnhanced.CLUB_DATABASE[clubKey];
    const ball = YardageModelEnhanced.BALL_MODELS[this.ball_model];

    if (!clubData) {
      throw new Error(`Unknown club: ${club}`);
    }

    // Calculate flight parameters
    const initial_velocity_fps = clubData.ball_speed * 1.467 * ball.speed_factor;
    const launch_rad = clubData.launch_angle * Math.PI / 180;
    const flight_time = (2 * initial_velocity_fps * Math.sin(launch_rad)) / YardageModelEnhanced.GRAVITY;

    // Start with target yardage
    let adjustedYardage = targetYardage;

    // Apply environmental factor
    const envFactor = this.calculateEnvironmentalFactor();
    adjustedYardage *= envFactor;

    const skillMultipliers = {
      [SkillLevel.BEGINNER]: 0.90,
      [SkillLevel.INTERMEDIATE]: 0.95,
      [SkillLevel.ADVANCED]: 1.00,
      [SkillLevel.PROFESSIONAL]: 1.00
    };

    adjustedYardage *= skillMultipliers[skillLevel];

    // Calculate wind effects with enhanced model
    let lateralMovement = 0;
    if (this.windSpeed !== null && this.windDirection !== null) {
      this._validate_wind_inputs(this.windSpeed, this.windDirection);

      const wind_rad = this.windDirection * Math.PI / 180;
      const wind_gradient = this._calculate_wind_gradient(clubData.max_height * 3);
      const effective_wind = this.windSpeed * wind_gradient;

      const wind_effects = this._calculate_wind_effects(
        adjustedYardage,
        clubData,
        ball,
        effective_wind,
        wind_rad,
        flight_time
      );

      adjustedYardage -= wind_effects.distance_effect;
      lateralMovement = wind_effects.lateral_movement;
    }

    return {
      carryDistance: Math.round(adjustedYardage * 10) / 10,
      lateralMovement: Math.round(lateralMovement * 10) / 10
    };
  }

  private _calculate_wind_gradient(height_ft: number): number {
    if (height_ft < 0) {
      throw new Error('Height cannot be negative');
    }

    const base_gradient = 1.1;
    const scale_factor = 0.14;
    const reference_height = 32;

    return base_gradient + (scale_factor * Math.log10(
      Math.max(height_ft, reference_height) / reference_height
    ));
  }

  private _calculate_wind_effects(
    yardage: number,
    club_data: ClubData,
    ball: BallModel,
    effective_wind: number,
    wind_rad: number,
    flight_time: number
  ): { distance_effect: number; lateral_movement: number } {
    const distance_factor = Math.pow(
      yardage / 200,
      0.7 * (1 - Math.max(0, yardage - 400) / 1000)
    );

    const height_factor = Math.pow(club_data.max_height / 40, 3);
    const speed_factor = Math.sqrt(123 / (club_data.ball_speed * ball.speed_factor));
    const gyro_stability = Math.min(1, club_data.spin_rate / YardageModelEnhanced.SPIN_GYRO_THRESHOLD);
    const stability_factor = 0.7 + (0.42 * gyro_stability);

    const HEADTAIL_CALIBRATION = 0.15;
    let wind_factor = Math.cos(wind_rad);
    const wind_normalized = effective_wind / 5;

    if (wind_factor > 0) {
      const spin_lift_factor = 1.0 + (gyro_stability * 0.25);
      wind_factor *= YardageModelEnhanced.TAILWIND_AMPLIFIER *
        Math.pow(Math.abs(wind_normalized), YardageModelEnhanced.WIND_POWER_SCALE) *
        Math.pow(flight_time / 2.0, 0.37) *
        spin_lift_factor *
        HEADTAIL_CALIBRATION * 3.7;
    } else {
      const spin_lift_factor = 1.1 + (gyro_stability * 0.25);
      wind_factor *= Math.pow(Math.abs(wind_normalized), YardageModelEnhanced.WIND_POWER_SCALE) *
        Math.pow(flight_time / 2.0, 0.30) *
        spin_lift_factor *
        HEADTAIL_CALIBRATION * 3.7;
    }

    const head_tail_effect = effective_wind *
      wind_factor *
      distance_factor *
      speed_factor *
      club_data.wind_sensitivity *
      height_factor *
      stability_factor;

    const CROSSWIND_CALIBRATION = 0.08;
    const cross_factor = Math.sin(wind_rad);
    const isQuarteringHead = Math.cos(wind_rad) > 0;
    const quarteringMultiplier = isQuarteringHead ? 1.3 : 0.8;

    const lateral_movement = cross_factor *
      effective_wind *
      flight_time *
      distance_factor *
      speed_factor *
      club_data.wind_sensitivity *
      height_factor *
      stability_factor *
      CROSSWIND_CALIBRATION *
      Math.pow(Math.abs(wind_normalized), 0.3) *
      (1 + ball.spin_factor * 0.05) *
      YardageModelEnhanced.LATERAL_BASE_MULTIPLIER *
      quarteringMultiplier;

    return {
      distance_effect: head_tail_effect,
      lateral_movement,
    };
  }

  private _calculate_spin_decay(spin_rate: number, flight_time: number, ball_speed: number): number {
    const decay_rate = 0.12;
    const speed_factor = ball_speed / 123;
    return spin_rate * Math.exp(-decay_rate * flight_time * speed_factor);
  }

  private _validate_wind_inputs(wind_speed: number | null, wind_direction: number | null): void {
    if (wind_speed !== null) {
      if (wind_speed < 0) {
        throw new Error('Wind speed cannot be negative');
      }
      if (wind_speed > 50) {
        throw new Error('Wind speed exceeds maximum supported value (50 mph)');
      }
    }
    if (wind_direction !== null) {
      if (wind_direction < 0 || wind_direction >= 360) {
        throw new Error('Wind direction must be between 0 and 359 degrees');
      }
    }
  }

  clubExists(clubKey: string): boolean {
    return clubKey in YardageModelEnhanced.CLUB_DATABASE;
  }

  setBallModel(model: string): void {
    if (!(model in YardageModelEnhanced.BALL_MODELS)) {
      throw new Error(`Unknown ball model: ${model}`);
    }
    this.ball_model = model;
  }

  setConditions(
    temperature: number,
    altitude: number,
    wind_speed: number,
    wind_direction: number,
    pressure: number,
    humidity: number
  ): void {
    this._validate_wind_inputs(wind_speed, wind_direction);

    this.temperature = temperature;
    this.altitude = altitude;
    this.windSpeed = wind_speed;
    this.windDirection = wind_direction;
    this.pressure = pressure;
    this.humidity = humidity;
  }
}
