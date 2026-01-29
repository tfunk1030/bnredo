export interface Location {
  lat: number;
  lng: number;
  elevation?: number;
}

export interface EnvironmentalConditions {
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;  // Added wind gust field
  density: number;
  elevation?: number;
  obTime?: string;  // Last observation time
  city?: string;
}

export interface ShotAdjustments {
  distanceAdjustment: number;
  trajectoryShift: number;
  spinAdjustment: number;
  launchAngleAdjustment: number;
}

export class EnvironmentalCalculator {
  private static readonly STANDARD_TEMP = 70;
  private static readonly STANDARD_PRESSURE = 1013.25;
  private static readonly STANDARD_DENSITY = 1.225;

  static calculateAirDensity(conditions: Partial<EnvironmentalConditions>): number {
    const tempC = (conditions.temperature! - 32) * 5/9;
    const vaporPressure = this.calculateVaporPressure(conditions.temperature!, conditions.humidity!);
    const dryPressure = conditions.pressure! - vaporPressure;

    return (dryPressure * 100) / (287.05 * (tempC + 273.15)) +
           (vaporPressure * 100) / (461.495 * (tempC + 273.15));
  }

  // WMO-recommended Magnus constants for saturation vapor pressure
  private static readonly MAGNUS_A = 6.1121;
  private static readonly MAGNUS_B = 17.502;
  private static readonly MAGNUS_C = 240.97;

  static calculateVaporPressure(tempF: number, humidity: number): number {
    const tempC = (tempF - 32) * 5/9;
    // WMO Magnus equation: more accurate across typical golf temperature range
    const saturationPressure = this.MAGNUS_A * Math.exp((this.MAGNUS_B * tempC) / (tempC + this.MAGNUS_C));
    return (humidity / 100) * saturationPressure;
  }

  static calculateWindEffect(windSpeed: number, windDirection: number, shotDirection: number) {
    const relativeAngle = (windDirection - shotDirection) * Math.PI / 180;
    return {
      headwind: windSpeed * Math.cos(relativeAngle),
      crosswind: windSpeed * Math.sin(relativeAngle)
    };
  }

  static calculateShotAdjustments(conditions: EnvironmentalConditions, shotDirection: number = 0): ShotAdjustments {
    const density = conditions.density ?? this.calculateAirDensity(conditions);
    const densityRatio = density / this.STANDARD_DENSITY;
    const wind = this.calculateWindEffect(conditions.windSpeed, conditions.windDirection, shotDirection);

    const densityEffect = (1 - densityRatio) * 100;
    const windEffect = -wind.headwind * 1.5;
    const distanceAdjustment = densityEffect + windEffect;
    const trajectoryShift = wind.crosswind * 2;
    const spinAdjustment = (densityRatio - 1) * -50;
    const launchAngleAdjustment = wind.headwind * 0.1;

    return { distanceAdjustment, trajectoryShift, spinAdjustment, launchAngleAdjustment };
  }

  static calculateAltitudeEffect(altitude: number): number {
    return (altitude / 1000) * 2;
  }

  static getFlightTimeAdjustment(conditions: EnvironmentalConditions): number {
    const density = conditions.density ?? this.calculateAirDensity(conditions);
    const densityRatio = density / this.STANDARD_DENSITY;
    return 1 + ((1 - densityRatio) * 0.1);
  }

  static getRecommendedAdjustments(conditions: EnvironmentalConditions): string[] {
    const recommendations: string[] = [];
    const wind = this.calculateWindEffect(conditions.windSpeed, conditions.windDirection, 0);

    if (Math.abs(wind.headwind) > 5) {
      recommendations.push(wind.headwind > 0
        ? "Into wind: Club up and swing easier for better control"
        : "Downwind: Club down and be aware of reduced spin/control");
    }

    if (Math.abs(wind.crosswind) > 5) {
      recommendations.push("Significant crosswind: Allow for shot shape into the wind");
    }

    if (conditions.temperature < 50) {
      recommendations.push("Cold conditions: Ball will fly shorter, consider clubbing up");
    }

    if (conditions.humidity > 80) {
      recommendations.push("High humidity: Ball will fly slightly shorter");
    }

    if (conditions.altitude > 3000) {
      recommendations.push("High altitude: Ball will fly further, consider clubbing down");
    }

    return recommendations;
  }

  static getEnvironmentalSummary(conditions: EnvironmentalConditions): string {
    const adjustments = this.calculateShotAdjustments(conditions);
    const altitudeEffect = this.calculateAltitudeEffect(conditions.altitude);

    return `
      Playing conditions will affect your shots as follows:
      • Distance: ${adjustments.distanceAdjustment > 0 ? 'Increase' : 'Decrease'} by ${Math.abs(adjustments.distanceAdjustment).toFixed(1)}%
      • Ball flight: ${Math.abs(adjustments.trajectoryShift).toFixed(1)} yards ${adjustments.trajectoryShift > 0 ? 'right' : 'left'}
      • Altitude effect: +${altitudeEffect.toFixed(1)}% carry distance
      • Spin rate: ${adjustments.spinAdjustment > 0 ? 'Increased' : 'Decreased'} effect
    `.trim();
  }
}
