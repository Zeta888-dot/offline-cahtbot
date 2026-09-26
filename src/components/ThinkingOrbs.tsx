import { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

export default function ThinkingOrbs() {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loop = Animated.stagger(200, anims.map(a => Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 600, useNativeDriver: true }),
      ])
    )));
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.row}>
      {anims.map((a, i) => (
        <Animated.View key={i} style={[styles.orb, {
          opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
          transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.15] }) }],
        }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  orb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#84cc16' },
});