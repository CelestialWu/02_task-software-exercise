import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uTexelSize;
  uniform float uRadius;
  uniform float uIntensity;
  uniform float uEdgeStrength;
  uniform float uTime;
  uniform float uPaperOpacity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = texture(tDiffuse, uv);
    int radius = int(uRadius);

    // ===== Stage 1: Kuwahara smoothing =====
    float bestVar = 1e10;
    vec4 bestMean = color;

    for (int sector = 0; sector < 4; sector++) {
      vec4 sectorSum = vec4(0.0);
      float sectorCount = 0.0;

      for (int dx = -2; dx <= 2; dx++) {
        for (int dy = -2; dy <= 2; dy++) {
          bool inSector = false;
          if (sector == 0) inSector = (dx >= 0 && dy >= 0);
          if (sector == 1) inSector = (dx < 0 && dy >= 0);
          if (sector == 2) inSector = (dx >= 0 && dy < 0);
          if (sector == 3) inSector = (dx < 0 && dy < 0);

          if (inSector) {
            vec2 offset = vec2(float(dx), float(dy)) * uTexelSize * 1.5;
            sectorSum += texture(tDiffuse, uv + offset);
            sectorCount += 1.0;
          }
        }
      }

      if (sectorCount < 1.0) continue;

      vec4 sectorMean = sectorSum / sectorCount;

      // Variance pass
      float sectorVar = 0.0;
      for (int dx2 = -2; dx2 <= 2; dx2++) {
        for (int dy2 = -2; dy2 <= 2; dy2++) {
          bool inSector2 = false;
          if (sector == 0) inSector2 = (dx2 >= 0 && dy2 >= 0);
          if (sector == 1) inSector2 = (dx2 < 0 && dy2 >= 0);
          if (sector == 2) inSector2 = (dx2 >= 0 && dy2 < 0);
          if (sector == 3) inSector2 = (dx2 < 0 && dy2 < 0);

          if (inSector2) {
            vec2 offset2 = vec2(float(dx2), float(dy2)) * uTexelSize * 1.5;
            vec4 s = texture(tDiffuse, uv + offset2);
            vec3 diff = s.rgb - sectorMean.rgb;
            sectorVar += dot(diff, diff);
          }
        }
      }

      if (sectorVar < bestVar) {
        bestVar = sectorVar;
        bestMean = sectorMean;
      }
    }

    vec4 smoothed = mix(color, bestMean, uIntensity);

    // ===== Stage 2: Edge detection on smoothed result =====
    float lumaCenter = dot(smoothed.rgb, vec3(0.299, 0.587, 0.114));
    float lumaL = dot(texture(tDiffuse, uv + vec2(-1.0, 0.0) * uTexelSize).rgb, vec3(0.299, 0.587, 0.114));
    float lumaR = dot(texture(tDiffuse, uv + vec2(1.0, 0.0) * uTexelSize).rgb, vec3(0.299, 0.587, 0.114));
    float lumaU = dot(texture(tDiffuse, uv + vec2(0.0, -1.0) * uTexelSize).rgb, vec3(0.299, 0.587, 0.114));
    float lumaD = dot(texture(tDiffuse, uv + vec2(0.0, 1.0) * uTexelSize).rgb, vec3(0.299, 0.587, 0.114));

    float edgeH = abs(lumaL - lumaCenter) + abs(lumaR - lumaCenter);
    float edgeV = abs(lumaU - lumaCenter) + abs(lumaD - lumaCenter);
    float edge = clamp(edgeH + edgeV, 0.0, 1.0);
    edge = smoothstep(0.05, 0.25, edge);

    vec3 edgeResult = mix(smoothed.rgb, smoothed.rgb * 0.7, edge * uEdgeStrength);

    // ===== Stage 3: Paper texture =====
    float grain = hash(floor(uv * 400.0 + uTime * 0.01));
    grain += hash(floor(uv * 180.0)) * 0.45;
    grain += hash(floor(uv * 70.0)) * 0.25;
    grain = grain / 1.7;
    vec3 paper = vec3(0.98, 0.96, 0.92) * (0.93 + grain * 0.07);
    vec3 textured = mix(edgeResult, edgeResult * paper, uPaperOpacity);

    // ===== Stage 4: Color grade =====
    textured.r *= 1.04;
    textured.g *= 1.01;
    textured.b *= 0.93;

    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.22;
    vignette = smoothstep(0.0, 1.0, vignette);

    outputColor = vec4(textured * vignette, color.a);
  }
`

export class CombinedWatercolorEffect extends Effect {
  constructor(options: {
    radius?: number
    intensity?: number
    edgeStrength?: number
    paperOpacity?: number
  } = {}) {
    const uniforms = new Map<string, Uniform>()
    uniforms.set('uTexelSize', new Uniform(new Vector2()))
    uniforms.set('uRadius', new Uniform(options.radius ?? 2))
    uniforms.set('uIntensity', new Uniform(options.intensity ?? 0.6))
    uniforms.set('uEdgeStrength', new Uniform(options.edgeStrength ?? 0.35))
    uniforms.set('uTime', new Uniform(0))
    uniforms.set('uPaperOpacity', new Uniform(options.paperOpacity ?? 0.1))

    super('CombinedWatercolorEffect', fragmentShader, {
      uniforms,
    })
  }

  update(_renderer: any, inputBuffer: any, deltaTime: number): void {
    const texelSize = this.uniforms.get('uTexelSize')!.value
    if (inputBuffer) {
      texelSize.set(1 / inputBuffer.width, 1 / inputBuffer.height)
    }
    const timeU = this.uniforms.get('uTime')!
    timeU.value += deltaTime
  }
}
