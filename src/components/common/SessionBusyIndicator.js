import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Animated dots component that shows when session is busy
 * @param {boolean} isBusy - Whether the session is busy
 */
const SessionBusyIndicator = ({ isBusy }) => {
  const animationRefs = useRef([]);

  useEffect(() => {
    // Start animations when busy begins
    if (isBusy) {
      animationRefs.current = Array(3).fill(0).map((_, index) => {
        const animatedValue = new Animated.Value(0);

        const loopAnimation = Animated.loop(
          Animated.sequence([
            Animated.delay(index * 200),
            Animated.timing(animatedValue, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(animatedValue, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        );

        loopAnimation.start();
        return { animatedValue, loopAnimation };
      });
    } else {
      // Stop animations when busy ends
      animationRefs.current.forEach(({ loopAnimation }) => {
        if (loopAnimation) {
          loopAnimation.stop();
        }
      });
      animationRefs.current = [];
    }

    return () => {
      // Cleanup on unmount
      animationRefs.current.forEach(({ loopAnimation }) => {
        if (loopAnimation) {
          loopAnimation.stop();
        }
      });
    };
  }, [isBusy]);

  if (!isBusy) {
    return null;
  }

  const animatedDots = animationRefs.current.map(({ animatedValue }, index) => {
    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          {
            opacity,
            transform: [
              {
                translateY: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -4],
                }),
              },
            ],
          },
        ]}
      />
    );
  });

  return (
    <View style={styles.container}>
      <View style={styles.dotContainer}>
        {animatedDots}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFC107', // Yellow dots
    marginHorizontal: 2,
  },
});

export default SessionBusyIndicator;