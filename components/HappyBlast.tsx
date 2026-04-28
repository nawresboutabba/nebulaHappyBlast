import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NebulaBackground } from './NebulaBackground';
import { RocketFire } from './RocketFire';

const rocketImg = require('../assets/rocket.png');
const wordsData = require('../data/happyBlastWords.json') as {
  positive: string[];
  negative: string[];
};

const { width, height } = Dimensions.get('window');
const ROCKET_SIZE = 68;
const ROCKET_BASE_Y = height * 0.72;
const GAME_DURATION = 60;
const WORD_SPAWN_MS = 720;
const GAME_TICK_MS = 32;
const FAKE_CAMERA_SPEED = 0.62;
const BG_PARALLAX_Y = 0.1;
const WORD_CAMERA_MATCH = 0.52;

type WordType = 'positive' | 'negative';

interface FallingWord {
  id: number;
  text: string;
  type: WordType;
  x: number;
  y: number;
  speed: number;
  drift: number;
  size: number;
}

interface BombFx {
  id: number;
  x: number;
  y: number;
  color: string;
  glow: string;
  scale: Animated.Value;
  opacity: Animated.Value;
  flashOpacity: Animated.Value;
  flashScale: Animated.Value;
  ringOpacity: Animated.Value;
  ringScale: Animated.Value;
  coreOpacity: Animated.Value;
  coreScale: Animated.Value;
}

interface HappyBlastProps {
  onClose: () => void;
}

const HappyBlast: React.FC<HappyBlastProps> = ({ onClose }) => {
  const screenShake = useRef(new Animated.Value(0)).current;
  const rocketFlame = useRef(new Animated.Value(0.6)).current;
  const rocketPos = useRef(
    new Animated.ValueXY({ x: width * 0.5 - ROCKET_SIZE / 2, y: ROCKET_BASE_Y })
  ).current;
  const rocketXRef = useRef(width * 0.5 - ROCKET_SIZE / 2);
  const rocketYRef = useRef(ROCKET_BASE_Y);
  const wordIdRef = useRef(1);
  const gameRunningRef = useRef(true);
  const cameraYRef = useRef(0);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [words, setWords] = useState<FallingWord[]>([]);
  const [bombFx, setBombFx] = useState<BombFx[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [lastHit, setLastHit] = useState<{ delta: number; type: WordType } | null>(null);
  const isGameOverRef = useRef(false);
  const [cameraY, setCameraY] = useState(0);

  const positiveWords = useMemo(() => wordsData.positive ?? [], []);
  const negativeWords = useMemo(() => wordsData.negative ?? [], []);

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const spawnBomb = useCallback((x: number, y: number, type: WordType) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const scale = new Animated.Value(0.25);
    const opacity = new Animated.Value(1);
    const flashOpacity = new Animated.Value(0);
    const flashScale = new Animated.Value(0.35);
    const ringOpacity = new Animated.Value(0.9);
    const ringScale = new Animated.Value(0.42);
    const coreOpacity = new Animated.Value(0.95);
    const coreScale = new Animated.Value(0.3);
    const color = type === 'positive' ? 'rgba(129, 246, 199, 0.98)' : 'rgba(255, 110, 170, 0.98)';
    const glow = type === 'positive' ? 'rgba(34, 197, 94, 0.58)' : 'rgba(255, 64, 129, 0.58)';

    setBombFx(prev => [
      ...prev,
      { id, x, y, color, glow, scale, opacity, flashOpacity, flashScale, ringOpacity, ringScale, coreOpacity, coreScale },
    ]);

    Animated.parallel([
      Animated.timing(scale, {
        toValue: 3.25,
        duration: 190,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 42,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.74,
          duration: 44,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(flashOpacity, {
            toValue: 1,
            duration: 34,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(flashScale, {
            toValue: 1.2,
            duration: 34,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(flashOpacity, {
            toValue: 0,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(flashScale, {
            toValue: 1.7,
            duration: 150,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.parallel([
        Animated.timing(ringScale, {
          toValue: 2.5,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(ringOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(coreScale, {
            toValue: 1.18,
            duration: 72,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(coreOpacity, {
            toValue: 1,
            duration: 50,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(coreScale, {
            toValue: 1.8,
            duration: 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(coreOpacity, {
            toValue: 0,
            duration: 120,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      setBombFx(prev => prev.filter(fx => fx.id !== id));
    });
  }, []);

  const triggerScreenShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(screenShake, { toValue: 4, duration: 38, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: -4, duration: 38, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: 1.5, duration: 32, useNativeDriver: true }),
      Animated.timing(screenShake, { toValue: 0, duration: 32, useNativeDriver: true }),
    ]).start();
  }, [screenShake]);

  const moveRocketTo = useCallback(
    (x: number) => {
      const clampedX = clamp(x - ROCKET_SIZE / 2, 10, width - ROCKET_SIZE - 10);
      Animated.spring(rocketPos, {
        toValue: { x: clampedX, y: ROCKET_BASE_Y },
        speed: 18,
        bounciness: 6,
        useNativeDriver: true,
      }).start();
    },
    [rocketPos]
  );

  const spawnWord = useCallback(() => {
    if (!gameRunningRef.current) return;

    const isPositive = Math.random() < 0.68;
    const type: WordType = isPositive ? 'positive' : 'negative';
    const pool = isPositive ? positiveWords : negativeWords;
    if (!pool.length) return;
    const text = pool[Math.floor(Math.random() * pool.length)];

    const size = Math.floor(Math.random() * 6) + 14;
    const x = Math.random() * (width - 150) + 12;
    const speed = Math.random() * 2.0 + 1.2;
    const drift = (Math.random() - 0.5) * 0.6;

    const nextWord: FallingWord = {
      id: wordIdRef.current++,
      text,
      type,
      x,
      y: -40,
      speed,
      drift,
      size,
    };

    setWords(prev => [...prev, nextWord].slice(-24));
  }, [negativeWords, positiveWords]);

  const restartGame = useCallback(() => {
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setWords([]);
    setBombFx([]);
    setTimeLeft(GAME_DURATION);
    setGameOver(false);
    setLastHit(null);
    gameRunningRef.current = true;
    isGameOverRef.current = false;
    cameraYRef.current = 0;
    setCameraY(0);
    const startX = width * 0.5 - ROCKET_SIZE / 2;
    rocketPos.setValue({ x: startX, y: ROCKET_BASE_Y });
  }, [rocketPos]);

  useEffect(() => {
    isGameOverRef.current = gameOver;
  }, [gameOver]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: evt => {
        if (isGameOverRef.current) return false;
        if (evt.nativeEvent.locationY < 110) return false;
        return true;
      },
      onMoveShouldSetPanResponder: evt => {
        if (isGameOverRef.current) return false;
        if (evt.nativeEvent.locationY < 110) return false;
        return true;
      },
      onPanResponderGrant: evt => {
        if (isGameOverRef.current) return;
        moveRocketTo(evt.nativeEvent.locationX);
      },
      onPanResponderMove: evt => {
        if (isGameOverRef.current) return;
        moveRocketTo(evt.nativeEvent.locationX);
      },
    })
  ).current;

  useEffect(() => {
    const rocketFlameLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rocketFlame, {
          toValue: 1,
          duration: 130,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rocketFlame, {
          toValue: 0.58,
          duration: 150,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    rocketFlameLoop.start();

    return () => {
      rocketFlameLoop.stop();
    };
  }, [rocketFlame]);

  useEffect(() => {
    const xId = rocketPos.x.addListener(({ value }) => {
      rocketXRef.current = value;
    });
    const yId = rocketPos.y.addListener(({ value }) => {
      rocketYRef.current = value;
    });
    return () => {
      rocketPos.x.removeListener(xId);
      rocketPos.y.removeListener(yId);
    };
  }, [rocketPos.x, rocketPos.y]);

  useEffect(() => {
    if (gameOver) return;
    const spawnInterval = setInterval(spawnWord, WORD_SPAWN_MS);
    return () => clearInterval(spawnInterval);
  }, [gameOver, spawnWord]);

  useEffect(() => {
    if (gameOver) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          gameRunningRef.current = false;
          isGameOverRef.current = true;
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameOver]);

  useEffect(() => {
    if (gameOver) return;
    const tick = setInterval(() => {
      cameraYRef.current += FAKE_CAMERA_SPEED;
      setCameraY(cameraYRef.current);

      setWords(prevWords => {
        const survivors: FallingWord[] = [];
        const hits: FallingWord[] = [];

        const rocketCenterX = rocketXRef.current + ROCKET_SIZE / 2;
        const rocketCenterY = rocketYRef.current + ROCKET_SIZE / 2;
        const collisionRadius = ROCKET_SIZE * 0.55;

        prevWords.forEach(word => {
          const nextY = word.y + word.speed + WORD_CAMERA_MATCH;
          const nextX = clamp(word.x + word.drift, 8, width - 130);
          const wordCenterX = nextX + 60;
          const wordCenterY = nextY + 16;
          const dx = rocketCenterX - wordCenterX;
          const dy = rocketCenterY - wordCenterY;
          const hitDistance = Math.hypot(dx, dy);

          if (hitDistance < collisionRadius) {
            hits.push({ ...word, x: nextX, y: nextY });
            return;
          }

          if (nextY < height + 60) {
            survivors.push({ ...word, x: nextX, y: nextY });
          }
        });

        if (hits.length > 0) {
          let delta = 0;
          let positiveHits = 0;
          let negativeHits = 0;

          hits.forEach(hit => {
            const add = hit.type === 'positive' ? 15 : -1;
            delta += add;
            if (hit.type === 'positive') {
              positiveHits += 1;
            } else {
              negativeHits += 1;
            }
            spawnBomb(hit.x + 60, hit.y + 16, hit.type);
          });

          if (negativeHits > 0) {
            triggerScreenShake();
            setCombo(0);
          } else if (positiveHits > 0) {
            setCombo(prev => {
              const nextCombo = prev + positiveHits;
              setBestCombo(currentBest => Math.max(currentBest, nextCombo));
              return nextCombo;
            });
          }

          setScore(prev => Math.max(0, prev + delta));
          setLastHit({
            delta,
            type: negativeHits > 0 ? 'negative' : 'positive',
          });
        }

        return survivors;
      });
    }, GAME_TICK_MS);
    return () => clearInterval(tick);
  }, [gameOver, spawnBomb, triggerScreenShake]);

  useEffect(() => {
    if (!lastHit) return;
    const t = setTimeout(() => setLastHit(null), 650);
    return () => clearTimeout(t);
  }, [lastHit]);

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <View style={styles.container}>
        <Animated.View style={[styles.worldLayer, { transform: [{ translateX: screenShake }] }]}>
          <View
            pointerEvents="none"
            style={{
              ...StyleSheet.absoluteFillObject,
              transform: [{ translateY: -(cameraY * BG_PARALLAX_Y) }],
            }}
          >
            <NebulaBackground />
          </View>

          <View style={styles.wordsLayer} pointerEvents="none">
            {words.map(word => (
              <View
                key={word.id}
                style={[
                  styles.wordChip,
                  word.type === 'positive' ? styles.positiveWord : styles.negativeWord,
                  { left: word.x, top: word.y },
                ]}
              >
                <View
                  style={[
                    styles.wordAccent,
                    word.type === 'positive' ? styles.positiveAccent : styles.negativeAccent,
                  ]}
                />
                <Text style={[styles.wordText, { fontSize: word.size }]}>{word.text}</Text>
              </View>
            ))}
          </View>

          <Animated.View
            style={[
              styles.rocketWrap,
              {
                transform: [
                  { translateX: rocketPos.x },
                  { translateY: rocketPos.y },
                ],
              },
            ]}
          >
            {/* Outer glow flame */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.rocketFlameOuter,
                {
                  opacity: rocketFlame.interpolate({
                    inputRange: [0.58, 1],
                    outputRange: [0.45, 0.95],
                  }),
                  transform: [
                    {
                      translateY: rocketFlame.interpolate({
                        inputRange: [0.58, 1],
                        outputRange: [2, -2], // subtle vibration
                      }),
                    },
                    {
                      scaleY: rocketFlame.interpolate({
                        inputRange: [0.58, 1],
                        outputRange: [0.85, 1.35],
                      }),
                    },
                    {
                      scaleX: rocketFlame.interpolate({
                        inputRange: [0.58, 1],
                        outputRange: [0.9, 1.08],
                      }),
                    },
                  ],
                },
              ]}
            />

            {/* 🔥 MAIN FIRE (FIXED POSITION) */}
            <View style={styles.rocketFireContainer}>
              <RocketFire
                width={ROCKET_SIZE * 0.18}
                height={ROCKET_SIZE * 0.28}
              />
            </View>

            {/* Rocket image (on top) */}
            <Image
              source={rocketImg}
              style={styles.rocket}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.effectsLayer} pointerEvents="none">
            {bombFx.map(fx => (
              <View key={fx.id} style={{ position: 'absolute', left: fx.x - 32, top: fx.y - 32, width: 68, height: 68 }}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.bombFlash,
                    {
                      opacity: fx.flashOpacity,
                      transform: [{ scale: fx.flashScale }],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.bombCore,
                    {
                      backgroundColor: fx.color,
                      opacity: fx.coreOpacity,
                      transform: [{ scale: fx.coreScale }],
                    },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.bombRing,
                    {
                      borderColor: fx.color,
                      opacity: fx.ringOpacity,
                      transform: [{ scale: fx.ringScale }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.bombGlow,
                    {
                      backgroundColor: fx.glow,
                      opacity: fx.opacity.interpolate({
                        inputRange: [0, 0.74, 0.95, 1],
                        outputRange: [0, 0.28, 0.48, 0.24],
                      }),
                      transform: [{
                        scale: fx.scale.interpolate({
                          inputRange: [0.25, 3.25],
                          outputRange: [0.65, 2.4],
                        }),
                      }],
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.bomb,
                    {
                      borderColor: fx.color,
                      shadowColor: fx.glow,
                      opacity: fx.opacity,
                      transform: [{ scale: fx.scale }],
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.topHud} pointerEvents="box-none">
          <View style={styles.hudChip}>
            <Text style={styles.hudLabel}>Time</Text>
            <Text style={styles.hudValue}>{timeLeft}s</Text>
          </View>
          <View style={styles.hudChip}>
            <Text style={styles.hudLabel}>Score</Text>
            <Text style={styles.hudValue}>{score}</Text>
          </View>
          <View style={styles.hudChip}>
            <Text style={styles.hudLabel}>Combo</Text>
            <Text style={styles.hudValue}>x{combo}</Text>
          </View>
        </View>

        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={10}>
          <Text style={styles.closeText}>Back to roadmap</Text>
        </Pressable>

        {!!lastHit && (
          <View style={styles.hitBanner} pointerEvents="none">
            <Text style={[styles.hitText, lastHit.type === 'positive' ? styles.hitGood : styles.hitBad]}>
              {lastHit.delta >= 0 ? `+${lastHit.delta}` : `${lastHit.delta}`} points
            </Text>
          </View>
        )}

        <View style={styles.titleWrap} pointerEvents="none">
          <Text style={styles.title}>Happy Blast</Text>
          <Text style={styles.subtitle}>Tap or drag: move the rocket into words.</Text>
        </View>

        {gameOver && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>Mission Complete</Text>
              <Text style={styles.gameOverStat}>Final score: {score}</Text>
              <Text style={styles.gameOverStat}>Best combo: x{bestCombo}</Text>
              <View style={styles.gameOverActions}>
                <Pressable style={[styles.actionButton, styles.retryButton]} onPress={restartGame}>
                  <Text style={styles.actionText}>Play Again</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.exitButton]} onPress={onClose}>
                  <Text style={styles.actionText}>Exit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9000,
    elevation: 9000,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A1028',
    overflow: 'hidden',
  },
  worldLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: 'absolute',
    top: 44,
    left: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 17, 54, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(194, 150, 255, 0.68)',
    zIndex: 50,
  },
  closeText: {
    color: '#EFE7FF',
    fontSize: 13,
    fontWeight: '700',
  },
  topHud: {
    position: 'absolute',
    top: 42,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 50,
  },
  hudChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 18, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(167, 151, 255, 0.45)',
    minWidth: 78,
    alignItems: 'center',
  },
  hudLabel: {
    color: '#C9B2FF',
    fontSize: 11,
    fontWeight: '600',
  },
  hudValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  wordsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  wordChip: {
    position: 'absolute',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    maxWidth: 150,
    alignItems: 'center',
    overflow: 'hidden',
  },
  wordAccent: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 3,
    height: 10,
    borderRadius: 999,
  },
  positiveAccent: {
    backgroundColor: 'rgba(110, 231, 183, 0.18)',
  },
  negativeAccent: {
    backgroundColor: 'rgba(255, 133, 176, 0.16)',
  },
  positiveWord: {
    backgroundColor: 'rgba(18, 44, 84, 0.78)',
    borderColor: 'rgba(102, 232, 202, 0.88)',
    shadowColor: '#6EE7B7',
    shadowOpacity: 0.82,
    shadowRadius: 10,
  },
  negativeWord: {
    backgroundColor: 'rgba(72, 20, 63, 0.8)',
    borderColor: 'rgba(255, 110, 170, 0.9)',
    shadowColor: '#FF4D9A',
    shadowOpacity: 0.72,
    shadowRadius: 10,
  },
  wordText: {
    color: '#F8F4FF',
    fontWeight: '800',
    textAlign: 'center',
  },
  rocketWrap: {
    position: 'absolute',
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
    zIndex: 30,
  },
  rocketFlameOuter: {
    position: 'absolute',
    left: ROCKET_SIZE * 0.5 - (ROCKET_SIZE * 0.28) / 2,
    top: ROCKET_SIZE * 0.78,
    width: ROCKET_SIZE * 0.28,
    height: ROCKET_SIZE * 0.42,
    borderRadius: 999,
    backgroundColor: 'rgba(159, 119, 255, 0.75)',
    shadowColor: '#FF8AE2',
    shadowOpacity: 0.82,
    shadowRadius: 14,
  },
  rocket: {
    width: ROCKET_SIZE,
    height: ROCKET_SIZE,
  },
  effectsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 35,
  },
  bomb: {
    position: 'absolute',
    left: 19,
    top: 19,
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 3,
    backgroundColor: 'transparent',
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  bombGlow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 68,
    height: 68,
    borderRadius: 999,
  },
  bombRing: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2.6,
  },
  bombCore: {
    position: 'absolute',
    left: 23,
    top: 23,
    width: 22,
    height: 22,
    borderRadius: 999,
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  bombFlash: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
  },
  hitBanner: {
    position: 'absolute',
    top: 104,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(12, 10, 32, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(180, 148, 246, 0.65)',
    zIndex: 50,
  },
  hitText: {
    fontSize: 15,
    fontWeight: '800',
  },
  hitGood: {
    color: '#86EFAC',
  },
  hitBad: {
    color: '#FB7185',
  },
  titleWrap: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
    paddingHorizontal: 18,
    zIndex: 50,
  },
  title: {
    color: '#F6EBFF',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(185, 136, 255, 0.85)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 0 },
  },
  subtitle: {
    marginTop: 4,
    color: '#D7C7FF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 5, 20, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  gameOverCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: 'rgba(24, 18, 58, 0.95)',
    borderWidth: 1.4,
    borderColor: 'rgba(190, 146, 255, 0.86)',
    padding: 20,
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#F3E8FF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  gameOverStat: {
    color: '#D8B4FE',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  gameOverActions: {
    flexDirection: 'row',
    marginTop: 14,
    gap: 10,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  retryButton: {
    backgroundColor: 'rgba(72, 187, 120, 0.24)',
    borderColor: 'rgba(110, 231, 183, 0.8)',
  },
  exitButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(214, 188, 250, 0.7)',
  },
  actionText: {
    color: '#F8F4FF',
    fontWeight: '800',
    fontSize: 14,
  },
  rocketFireContainer: {
    position: 'absolute',
    left: ROCKET_SIZE * 0.5 - (ROCKET_SIZE * 0.18) / 2, // perfectly centered
    top: ROCKET_SIZE * 0.82, // slightly below rocket
    width: ROCKET_SIZE * 0.18,
    height: ROCKET_SIZE * 0.3,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1, // behind rocket
  },
});

export default HappyBlast;
