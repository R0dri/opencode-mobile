import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * StatusIcon component - Visual status indicator using SVG
 * @param {Object} props - Component props
 * @param {string} props.status - Todo status: pending, in_progress, completed, cancelled
 */
const TodoStatusIcon = ({ status }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status === 'pending') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else if (status === 'in_progress') {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ).start();
    }
  }, [status, pulseAnim, spinAnim]);

  const renderIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Svg width="14" height="14" viewBox="0 0 16 16">
              <Circle cx="8" cy="8" r="6" stroke="#7b1fa2" strokeWidth="2" fill="none" />
            </Svg>
          </Animated.View>
        );
      case 'in_progress':
        return (
          <Animated.View
            style={{
              transform: [
                {
                  rotate: spinAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            }}
          >
            <Svg width="14" height="14" viewBox="0 0 16 16">
              <Circle
                cx="8"
                cy="8"
                r="6"
                stroke="#f57c00"
                strokeWidth="2"
                fill="none"
                strokeDasharray="10 5"
              />
            </Svg>
          </Animated.View>
        );
      case 'completed':
        return (
          <Svg width="14" height="14" viewBox="0 0 16 16">
            <Path
              d="M2 8l4 4 8-8"
              stroke="#2e7d32"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        );
      case 'cancelled':
        return (
          <Svg width="14" height="14" viewBox="0 0 16 16">
            <Path
              d="M2 2l12 12M14 2L2 14"
              stroke="#d32f2f"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </Svg>
        );
      default:
        return (
          <Svg width="14" height="14" viewBox="0 0 16 16">
            <Circle cx="8" cy="8" r="6" stroke="#666" strokeWidth="2" fill="none" />
          </Svg>
        );
    }
  };

  return <View style={{ marginRight: 8 }}>{renderIcon()}</View>;
};

export default TodoStatusIcon;