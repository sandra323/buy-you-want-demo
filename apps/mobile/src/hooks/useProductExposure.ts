import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import {
  type ProductLayout,
  ProductExposureTracker,
  createThrottledRunner,
} from '../utils/product-exposure';

type ProductExposureOptions = {
  productIds: readonly string[];
  onExposure: (productId: string) => void;
  throttleMs?: number;
};

type ProductExposureHandlers = {
  onViewportLayout: (event: LayoutChangeEvent) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onProductLayout: (productId: string, layout: ProductLayout) => void;
};

export function useProductExposure({
  productIds,
  onExposure,
  throttleMs = 200,
}: ProductExposureOptions): ProductExposureHandlers {
  const trackerRef = useRef(new ProductExposureTracker());
  const callbackRef = useRef(onExposure);
  const viewportRef = useRef({ y: 0, height: 0 });

  useEffect(() => {
    callbackRef.current = onExposure;
  }, [onExposure]);

  const flush = useCallback(() => {
    const visibleIds = trackerRef.current.collectVisible(viewportRef.current);
    for (const productId of visibleIds) {
      callbackRef.current(productId);
    }
  }, []);

  const throttled = useMemo(
    () => createThrottledRunner(flush, throttleMs),
    [flush, throttleMs],
  );

  useEffect(() => {
    trackerRef.current.retainProducts(productIds);
    throttled.run();
  }, [productIds, throttled]);

  useEffect(
    () => () => {
      throttled.cancel();
    },
    [throttled],
  );

  useFocusEffect(
    useCallback(() => {
      trackerRef.current.resetSession();
      throttled.run();
      return () => {
        throttled.cancel();
      };
    }, [throttled]),
  );

  const onViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportRef.current.height = event.nativeEvent.layout.height;
      throttled.run();
    },
    [throttled],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewportRef.current = {
        y: event.nativeEvent.contentOffset.y,
        height: event.nativeEvent.layoutMeasurement.height,
      };
      throttled.run();
    },
    [throttled],
  );

  const onProductLayout = useCallback(
    (productId: string, layout: ProductLayout) => {
      trackerRef.current.setLayout(productId, layout);
      throttled.run();
    },
    [throttled],
  );

  return { onViewportLayout, onScroll, onProductLayout };
}
