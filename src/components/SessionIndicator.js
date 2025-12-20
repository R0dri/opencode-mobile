import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * Component that shows thinking animation when session is busy
 * @param {boolean} isThinking - Whether to show thinking animation
 */
const SessionIndicator = ({ isThinking }) => {
  const animationRefs = useRef([]);

  useEffect(() => {
    // Start animations when thinking begins
    if (isThinking) {
      animationRefs.current = Array(3).fill(0).map((_, index) => {
        const animatedValue = useRef(new Animated.Value(0)).current;
        
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
      // Stop animations when thinking ends
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
  }, [isThinking]);

  if (!isThinking) {
    return null;
  }

  const animatedDots = animationRefs.current.map(({ animatedValue }, index) => {
    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    const translateY = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -4],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          {
            opacity,
            transform: [{ translateY }],
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
      <Text style={styles.text}>thinking...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Position above input bar
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dotContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginHorizontal: 2,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default SessionIndicator;