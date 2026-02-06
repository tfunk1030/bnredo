import * as React from 'react';
import { TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { animation } from '@/src/constants/theme';

interface AnimatedNumberProps {
  value: string | number;
  style?: StyleProp<TextStyle>;
  suffix?: React.ReactNode;
}

export function AnimatedNumber({ value, style, suffix }: AnimatedNumberProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const prevValue = React.useRef(value);

  React.useEffect(() => {
    if (prevValue.current !== value) {
      prevValue.current = value;

      if (reduceMotion) return;

      opacity.value = withSequence(
        withTiming(0.8, { duration: 100 }),
        withTiming(1, { duration: 100 }),
      );
      translateY.value = withSequence(
        withTiming(-4, { duration: 100 }),
        withSpring(0, animation.spring.snappy),
      );
    }
  }, [value, reduceMotion, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {value}
      {suffix}
    </Animated.Text>
  );
}
