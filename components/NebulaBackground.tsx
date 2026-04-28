import { Canvas, Fill, Shader, Skia } from "@shopify/react-native-skia";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import {
    Easing,
    useDerivedValue,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const source = Skia.RuntimeEffect.Make(`
  uniform float time;
  uniform vec2 res;

  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){
    float v=0.0,a=0.5;
    for(int i=0;i<8;i++){v+=a*noise(p);p=p*2.13+vec2(3.7,1.9);a*=0.48;}
    return v;
  }
  float fbmTwist(vec2 p,float t){
    vec2 q=vec2(fbm(p+vec2(t*0.01,0.0)),fbm(p+vec2(0.0,t*0.01)));
    vec2 r=vec2(fbm(p+2.0*q+vec2(1.7,9.2)),fbm(p+2.0*q+vec2(8.3,2.8)));
    return fbm(p+2.2*r);
  }
  float star(vec2 uv,vec2 pos,float size,float bright){
    vec2 d=uv-pos;
    float core=bright*size/(dot(d,d)*900.0+size);
    float s1=bright*0.4*size/(d.x*d.x*2500.0+0.00008);
    float s2=bright*0.4*size/(d.y*d.y*2500.0+0.00008);
    s1*=smoothstep(0.07,0.0,abs(d.y));
    s2*=smoothstep(0.07,0.0,abs(d.x));
    float diag1=bright*0.15*size/(dot(d,vec2(0.707,-0.707))*dot(d,vec2(0.707,-0.707))*3000.0+0.0001);
    float diag2=bright*0.15*size/(dot(d,vec2(0.707,0.707))*dot(d,vec2(0.707,0.707))*3000.0+0.0001);
    diag1*=smoothstep(0.05,0.0,abs(dot(d,vec2(0.707,0.707))));
    diag2*=smoothstep(0.05,0.0,abs(dot(d,vec2(0.707,-0.707))));
    return clamp(core+s1+s2+diag1+diag2,0.0,2.0);
  }
  half4 main(vec2 fragCoord){
    vec2 uv=fragCoord/res;
    uv.y=1.0-uv.y;
    vec3 col=vec3(0.005,0.0,0.015);
    float t=time;
    vec2 q0=uv*1.4+vec2(-t*0.006,t*0.003);
    float far=fbm(q0*1.8);
    col+=vec3(0.02,0.04,0.18)*smoothstep(0.3,0.8,far)*0.6;
    vec2 qL=uv+vec2(-t*0.012,t*0.004);
    float pillarL=fbmTwist(qL*2.0+vec2(0.0,0.5),t);
    float maskL=smoothstep(0.38,0.78,pillarL);
    float leftBias=clamp(1.2-uv.x*2.5,0.0,1.0);
    leftBias*=leftBias;
    col+=mix(vec3(0.3,0.0,0.55),vec3(0.75,0.05,0.7),pillarL)*maskL*(0.8+leftBias*0.9);
    float hotL=smoothstep(0.55,0.82,fbm(qL*3.5+vec2(2.1,0.7)));
    col+=vec3(0.9,0.05,0.55)*hotL*leftBias*0.9;
    vec2 qR=uv+vec2(t*0.010,-t*0.003);
    float pillarR=fbmTwist(qR*2.0+vec2(3.3,1.1),t*0.9);
    float maskR=smoothstep(0.38,0.75,pillarR);
    float rightBias=clamp(uv.x*2.5-1.2,0.0,1.0);
    rightBias*=rightBias;
    col+=mix(vec3(0.35,0.0,0.60),vec3(0.65,0.05,0.75),pillarR)*maskR*(0.7+rightBias*0.9);
    float hotR=smoothstep(0.55,0.80,fbm(qR*3.5+vec2(5.5,2.3)));
    col+=vec3(0.85,0.05,0.60)*hotR*rightBias*0.85;
    vec2 q2=uv+vec2(-t*0.018,-t*0.005)+vec2(0.05,0.02);
    float f2a=fbm(q2*2.4);
    float f2b=fbm(q2*4.8+vec2(f2a*2.0,t*0.012));
    float f2c=fbmTwist(q2*3.0+vec2(f2b),t*1.2);
    float nebCenter=smoothstep(0.28,0.68,f2a*0.4+f2b*0.35+f2c*0.25);
    float cDist=length((uv-vec2(0.50,0.47))*vec2(1.0,1.5));
    float cGlow=clamp(1.0-cDist*1.1,0.0,1.0);
    cGlow=cGlow*cGlow*cGlow;
    vec3 bCol=mix(vec3(0.04,0.08,0.72),vec3(0.05,0.38,0.92),f2b);
    bCol=mix(bCol,vec3(0.02,0.68,0.98),f2c);
    bCol=mix(bCol,vec3(0.10,0.82,0.90),cGlow*0.6);
    col+=bCol*nebCenter*(1.0+cGlow*1.4);
    float bloom=cGlow*cGlow*fbm(uv*4.0+vec2(-t*0.014,t*0.008));
    col+=vec3(0.08,0.60,1.00)*bloom*1.1;
    col+=vec3(0.50,0.90,1.00)*bloom*bloom*0.9;
    col+=vec3(0.95,1.00,1.00)*pow(bloom*cGlow,3.0)*0.6;
    vec2 qd=uv+vec2(-t*0.008,t*0.002);
    float dust1=fbm(qd*3.8+vec2(1.3,4.7));
    float dust2=fbm(qd*6.0+vec2(7.1,2.3));
    float dustMask=smoothstep(0.52,0.72,dust1*0.6+dust2*0.4);
    float dustZone=smoothstep(0.0,0.25,uv.x)*smoothstep(1.0,0.75,uv.x);
    col*=1.0-dustMask*0.88*dustZone;
    vec2 qt=uv+vec2(-t*0.014,t*0.005);
    float tw1=fbm(qt*2.5+vec2(0.8,3.2));
    float tw2=fbm(qt*5.0+vec2(tw1));
    float topMask=smoothstep(0.40,0.72,tw1*0.55+tw2*0.45);
    float topBias=clamp(1.0-uv.y*2.5,0.0,1.0);
    col+=vec3(0.55,0.05,0.80)*topMask*topBias*0.7;
    col+=vec3(0.80,0.10,0.60)*topMask*topMask*topBias*0.5;
    for(int layer=0;layer<3;layer++){
      float lf=float(layer);
      float density=60.0+lf*35.0;
      float sizeMult=0.07-lf*0.018;
      vec2 sc=floor(uv*vec2(density,density*0.65));
      vec2 sf=fract(uv*vec2(density,density*0.65));
      float sn=hash(sc+vec2(lf*17.3,lf*31.7));
      float thresh=0.78+lf*0.06;
      if(sn>thresh){
        vec2 sp=vec2(hash(sc+vec2(7.3+lf,2.1)),hash(sc+vec2(1.7,9.5+lf)));
        float sr=length(sf-(0.2+sp*0.6));
        float sb=(sn-thresh)/(1.0-thresh);
        float s=smoothstep(sizeMult,0.0,sr)*sb;
        float ct=hash(sc+vec2(3.1+lf));
        vec3 sCol=ct<0.4?vec3(0.85,0.92,1.00):ct<0.65?vec3(0.65,0.78,1.00):ct<0.85?vec3(1.00,0.88,0.85):vec3(0.95,0.80,1.00);
        col+=sCol*s*(0.8+lf*0.3);
      }
    }
    col+=vec3(1.00,1.00,1.00)*star(uv,vec2(0.500,0.450),0.00090,1.20);
    col+=vec3(0.80,0.92,1.00)*star(uv,vec2(0.468,0.470),0.00060,0.90);
    col+=vec3(0.90,0.96,1.00)*star(uv,vec2(0.535,0.430),0.00050,0.85);
    col+=vec3(0.70,0.85,1.00)*star(uv,vec2(0.515,0.500),0.00045,0.75);
    col+=vec3(0.85,0.95,1.00)*star(uv,vec2(0.480,0.415),0.00040,0.70);
    col+=vec3(0.80,0.90,1.00)*star(uv,vec2(0.780,0.280),0.00070,1.00);
    col+=vec3(1.00,0.82,0.90)*star(uv,vec2(0.210,0.220),0.00065,0.95);
    col+=vec3(0.75,0.82,1.00)*star(uv,vec2(0.880,0.580),0.00055,0.80);
    col+=vec3(1.00,0.88,1.00)*star(uv,vec2(0.130,0.640),0.00045,0.70);
    col+=vec3(0.90,1.00,0.90)*star(uv,vec2(0.650,0.750),0.00050,0.75);
    col+=vec3(1.00,0.90,0.80)*star(uv,vec2(0.340,0.160),0.00060,0.85);
    col+=vec3(0.80,0.88,1.00)*star(uv,vec2(0.720,0.120),0.00040,0.65);
    col+=vec3(1.00,0.85,0.95)*star(uv,vec2(0.060,0.350),0.00045,0.68);
    col+=vec3(0.88,0.95,1.00)*star(uv,vec2(0.920,0.180),0.00050,0.72);
    vec2 vigUV=uv-0.5;
    float vig=1.0-dot(vigUV*vec2(1.1,1.3),vigUV*vec2(1.1,1.3))*1.8;
    vig=clamp(vig,0.0,1.0);
    vig=vig*vig*(3.0-2.0*vig);
    col*=mix(0.05,1.0,vig);
    col=col*(2.51*col+0.03)/(col*(2.43*col+0.59)+0.14);
    col=clamp(col,0.0,1.0);
    col=pow(col,vec3(0.88));
    return half4(col,1.0);
  }
`)!;

export const NebulaBackground = () => {
  const { width, height } = useWindowDimensions();
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(3600, { duration: 3600000, easing: Easing.linear }),
      -1
    );
  }, []);

  const uniforms = useDerivedValue(() => ({
    time: time.value,
    res: [width, height],
  }));

  return (
    <Canvas style={{ width, height, position: "absolute" }}>
      <Fill>
        <Shader source={source} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
};