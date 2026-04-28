import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { Easing, useDerivedValue, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

const fireSource = Skia.RuntimeEffect.Make(`
uniform float time;
uniform vec2 res;

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  
  return mix(
    mix(hash(i), hash(i + vec2(1,0)), f.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
    f.y
  );
}

float fbm(vec2 p){
  float v = 0.0;
  float a = 0.5;
  for(int i=0;i<6;i++){
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

half4 main(vec2 fragCoord){
  vec2 uv = fragCoord / res;

  // Center fire horizontally
  uv.x = uv.x * 2.0 - 1.0;

  float t = time * 0.7;

  // Stretch vertically (important for flame look)
  vec2 p = vec2(uv.x * 0.6, uv.y * 2.0);

  // Flow upward animation
  p.y += t * 1.5;

  float n = fbm(p * 2.5);

  // Flame shape mask (cone)
  float shape = smoothstep(0.8, 0.2, abs(uv.x) * (1.5 - uv.y));

  // Core intensity
  float core = smoothstep(0.3, 1.0, n) * shape;

  // Color palette (purple magic 🔮)
  vec3 col = vec3(0.0);

  vec3 purple = vec3(0.6, 0.1, 1.0);
  vec3 pink   = vec3(1.0, 0.2, 0.8);
  vec3 white  = vec3(1.0, 0.9, 1.0);

  col = mix(purple, pink, core);
  col = mix(col, white, core * core);

  // Glow boost
  col *= 1.5;

  // Magical sparkles ✨
  float spark = step(0.995, hash(vec2(floor(p.x*40.0), floor(p.y*40.0))));
  col += spark * vec3(1.0, 0.8, 1.0);

  // Fade bottom
  float fade = smoothstep(1.2, 0.2, uv.y);
  col *= fade;

  return half4(col, core * fade);
}
`)!;

export const RocketFire = ({ width = 120, height = 200 }) => {
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(1000, { duration: 20000, easing: Easing.linear }),
      -1
    );
  }, []);

  const uniforms = useDerivedValue(() => ({
    time: time.value,
    res: [width, height],
  }));

  return (
    <Canvas style={{ width, height }}>
      <Fill>
        <Shader source={fireSource} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
};