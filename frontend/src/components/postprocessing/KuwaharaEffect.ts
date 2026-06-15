import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uTexelSize;
  uniform float uRadius;
  uniform float uIntensity;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = texture(tDiffuse, uv);

    // Simpler Kuwahara-like smoothing
    vec4 sum = vec4(0.0);
    float count = 0.0;
    int radius = int(uRadius);
    float bestVar = 1e10;
    vec4 bestMean = color;

    // Sample 4 sectors and pick the one with lowest variance
    for (int sector = 0; sector < 4; sector++) {
      vec4 sectorSum = vec4(0.0);
      float sectorCount = 0.0;
      vec4 sectorMean = vec4(0.0);
      float sectorVar = 0.0;

      for (int dx = -3; dx <= 3; dx++) {
        for (int dy = -3; dy <= 3; dy++) {
          if (dx > radius || dx < -radius || dy > radius || dy < -radius) continue;

          bool inSector = false;
          if (sector == 0) inSector = (dx >= 0 && dy >= 0);
          if (sector == 1) inSector = (dx < 0 && dy >= 0);
          if (sector == 2) inSector = (dx >= 0 && dy < 0);
          if (sector == 3) inSector = (dx < 0 && dy < 0);

          if (!inSector) continue;

          vec2 offset = vec2(float(dx), float(dy)) * uTexelSize * 2.0;
          vec4 sample = texture(tDiffuse, uv + offset);

          sectorSum += sample;
          sectorCount += 1.0;
        }
      }

      if (sectorCount < 1.0) continue;

      sectorMean = sectorSum / sectorCount;

      // Compute variance
      for (int dx = -3; dx <= 3; dx++) {
        for (int dy = -3; dy <= 3; dy++) {
          if (dx > radius || dx < -radius || dy > radius || dy < -radius) continue;

          bool inSector = false;
          if (sector == 0) inSector = (dx >= 0 && dy >= 0);
          if (sector == 1) inSector = (dx < 0 && dy >= 0);
          if (sector == 2) inSector = (dx >= 0 && dy < 0);
          if (sector == 3) inSector = (dx < 0 && dy < 0);

          if (!inSector) continue;

          vec2 offset = vec2(float(dx), float(dy)) * uTexelSize * 2.0;
          vec4 sample = texture(tDiffuse, uv + offset);
          vec4 diff = sample - sectorMean;
          sectorVar += dot(diff.rgb, diff.rgb);
        }
      }

      if (sectorVar < bestVar) {
        bestVar = sectorVar;
        bestMean = sectorMean;
      }
    }

    outputColor = mix(color, bestMean, uIntensity);
  }
`

export class KuwaharaEffect extends Effect {
  constructor(options: { radius?: number; intensity?: number } = {}) {
    const uniforms = new Map<string, Uniform>()
    uniforms.set('uTexelSize', new Uniform(new Vector2()))
    uniforms.set('uRadius', new Uniform(options.radius ?? 2))
    uniforms.set('uIntensity', new Uniform(options.intensity ?? 0.5))

    super('KuwaharaEffect', fragmentShader, {
      uniforms,
    })
  }

  update(_renderer: any, inputBuffer: any, _deltaTime: number): void {
    const texelSize = this.uniforms.get('uTexelSize')!.value
    if (inputBuffer) {
      texelSize.set(1 / inputBuffer.width, 1 / inputBuffer.height)
    }
  }
}
