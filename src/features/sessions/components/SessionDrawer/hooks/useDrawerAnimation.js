/**
 * @fileoverview Animation hook for SessionDrawer components
 * Maintains exact timing and behavior from original implementation
 */
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import {
  calculateInitialTranslateX,
  calculateGestureThresholds,
} from "../utils/drawerCalculations";

/**
 * Animation hook for drawer open/close behavior - with dynamic width
 * @param {boolean} isPersistent - Whether drawer is persistent sidebar
 * @param {Function} onClose - Callback when drawer closes
 * @param {number} drawerWidth - Actual drawer width in pixels
 * @returns {Object} Animation controls and gesture handler
 */
export const useDrawerAnimation = (
  isPersistent,
  onClose,
  drawerWidth = 320,
) => {
  const initialTranslateX = calculateInitialTranslateX(
    isPersistent,
    drawerWidth,
  );
  const translateX = useSharedValue(initialTranslateX);

  const openDrawer = () => {
    translateX.value = withTiming(0, { duration: 300 });
  };

  const closeDrawer = () => {
    translateX.value = withTiming(
      -drawerWidth,
      { duration: 300 },
      (finished) => {
        if (finished && onClose) {
          runOnJS(onClose)();
        }
      },
    );
  };

  // Gesture handling - only for modal drawers
  const { gestureThreshold, velocityThreshold, edgeZoneWidth } =
    calculateGestureThresholds(drawerWidth);

  const gestureHandler = Gesture.Pan()
    .activeOffsetX([-edgeZoneWidth, edgeZoneWidth])
    .onUpdate((event) => {
      if (!isPersistent) {
        // Only respond to horizontal gestures
        if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
          const clampedX = Math.max(
            -drawerWidth,
            Math.min(0, event.translationX),
          );
          translateX.value = clampedX;
        }
      }
    })
    .onEnd((event) => {
      if (
        !isPersistent &&
        Math.abs(event.translationX) > Math.abs(event.translationY)
      ) {
        const { translationX, velocityX } = event;
        const shouldOpen =
          translationX > gestureThreshold || velocityX > velocityThreshold;
        const shouldClose =
          translationX < -gestureThreshold || velocityX < -velocityThreshold;

        if (shouldOpen && translateX.value < 0) {
          openDrawer();
        } else if (shouldClose && translateX.value > -drawerWidth) {
          closeDrawer();
        } else {
          // Snap to nearest state
          const snapToOpen = Math.abs(translationX) < gestureThreshold;
          translateX.value = withTiming(snapToOpen ? 0 : -drawerWidth, {
            duration: 200,
          });
        }
      }
    });

  return {
    translateX,
    gestureHandler,
    openDrawer,
    closeDrawer,
  };
};
