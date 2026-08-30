import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useCartAnimationStore } from '../store/cart-animation';
import { tokens } from '../theme';

const DOT_SIZE = 30;

export function AddToCartAnimationOverlay() {
  const flight = useCartAnimationStore((state) => state.flight);
  const progress = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const endX = useSharedValue(0);
  const endY = useSharedValue(0);

  useEffect(() => {
    if (!flight) {
      return;
    }
    startX.value = flight.start.x;
    startY.value = flight.start.y;
    endX.value = flight.end.x;
    endY.value = flight.end.y;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: 620,
      easing: Easing.out(Easing.cubic),
    });
  }, [endX, endY, flight, progress, startX, startY]);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const x = startX.value + (endX.value - startX.value) * t;
    const linearY = startY.value + (endY.value - startY.value) * t;
    const arcY = linearY - 120 * 4 * t * (1 - t);
    return {
      opacity: t >= 1 ? 0 : 1,
      transform: [
        { translateX: x - DOT_SIZE / 2 },
        { translateY: arcY - DOT_SIZE / 2 },
        { scale: 1 - t * 0.35 },
      ],
    };
  });

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <Animated.View style={[styles.dot, animatedStyle]}>
        <MaterialCommunityIcons
          name="cart"
          size={18}
          color={tokens.color.surface}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  dot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DOT_SIZE / 2,
    backgroundColor: tokens.color.primary,
  },
});
