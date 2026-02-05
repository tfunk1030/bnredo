import * as React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { Canvas, Fill, Shader, Skia, vec } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '@/src/hooks/useReduceMotion';

// SKSL shader for organic wind flow lines
// Uses simplex noise for natural-looking curves
const WIND_SHADER_SOURCE = `
uniform float time;
uniform vec2 resolution;
uniform float windAngle; // Direction of wind flow in radians
uniform float intensity; // 0-1 opacity multiplier

// Simplex 2D noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian Motion for layered organic flow
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 4; i++) {
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}

vec4 main(vec2 fragCoord) {
  vec2 uv = fragCoord / resolution;
  
  // Rotate UV based on wind angle for directional flow
  float s = sin(windAngle);
  float c = cos(windAngle);
  vec2 rotatedUV = vec2(
    uv.x * c - uv.y * s,
    uv.x * s + uv.y * c
  );
  
  // Create flowing distortion field
  float flowSpeed = 0.03;
  vec2 flowOffset = vec2(time * flowSpeed, time * flowSpeed * 0.3);
  float distortion = fbm(rotatedUV * 3.0 + flowOffset);
  
  // Generate multiple layers of wind lines at different scales
  float lines = 0.0;
  
  // Primary wind lines - larger, slower
  float y1 = rotatedUV.y + distortion * 0.15;
  float wave1 = sin(y1 * 40.0 + time * 0.5) * 0.5 + 0.5;
  wave1 = smoothstep(0.45, 0.55, wave1);
  lines += wave1 * 0.6;
  
  // Secondary wind lines - medium, faster
  float y2 = rotatedUV.y + distortion * 0.2;
  float wave2 = sin(y2 * 70.0 + time * 0.8) * 0.5 + 0.5;
  wave2 = smoothstep(0.48, 0.52, wave2);
  lines += wave2 * 0.3;
  
  // Tertiary wind lines - fine detail
  float y3 = rotatedUV.y + distortion * 0.25;
  float wave3 = sin(y3 * 120.0 + time * 1.2) * 0.5 + 0.5;
  wave3 = smoothstep(0.49, 0.51, wave3);
  lines += wave3 * 0.1;
  
  // Edge fade for seamless blending
  float fadeX = smoothstep(0.0, 0.15, uv.x) * smoothstep(1.0, 0.85, uv.x);
  float fadeY = smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
  float fade = fadeX * fadeY;
  
  // Final color - subtle wind lines
  // Lower opacity to prevent washing out
  float alpha = lines * fade * 0.08 * intensity;
  
  // Subtle lighter lines against dark background
  vec3 lineColor = vec3(0.3, 0.35, 0.4);
  
  return vec4(lineColor, alpha);
}
`;

interface WindBackgroundProps {
  /** Wind direction in degrees (0 = North, 90 = East) */
  windDirection?: number;
  /** Intensity multiplier 0-1, default 1 */
  intensity?: number;
  /** Whether animation is paused */
  paused?: boolean;
}

export const WindBackground = React.memo(function WindBackground({
  windDirection = 45, // Default diagonal flow
  intensity = 1,
  paused = false,
}: WindBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  
  // Don't animate if reduce motion is enabled
  const shouldAnimate = !reduceMotion && !paused;
  
  // Create the shader
  const shader = React.useMemo(() => {
    return Skia.RuntimeEffect.Make(WIND_SHADER_SOURCE);
  }, []);
  
  // Animated time value
  const time = useSharedValue(0);
  
  React.useEffect(() => {
    if (shouldAnimate) {
      // Slow, continuous animation over 60 seconds then repeat
      time.value = withRepeat(
        withTiming(60, {
          duration: 60000,
          easing: Easing.linear,
        }),
        -1, // Infinite repeat
        false // Don't reverse
      );
    } else {
      time.value = 0;
    }
  }, [shouldAnimate, time]);
  
  // Convert wind direction from degrees to radians
  // Subtract 90 so that 0° (North) flows downward
  const windAngleRad = ((windDirection - 90) * Math.PI) / 180;
  
  // Uniforms for the shader
  const uniforms = useDerivedValue(() => ({
    time: time.value,
    resolution: vec(width, height),
    windAngle: windAngleRad,
    intensity: intensity,
  }), [time, width, height, windAngleRad, intensity]);
  
  if (!shader) {
    console.warn('WindBackground: Failed to compile shader');
    return null;
  }
  
  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      <Fill>
        <Shader source={shader} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
});

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    backgroundColor: 'transparent',
  },
});
