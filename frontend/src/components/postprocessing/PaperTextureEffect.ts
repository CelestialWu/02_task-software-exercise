import { Effect } from 'postprocessing'
import { Uniform } from 'three'

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float uTime;
  uniform float uOpacity;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = texture(tDiffuse, uv);

    // Multi-scale paper grain
    float grain = hash(floor(uv * 500.0 + uTime * 0.01));
    grain += hash(floor(uv * 200.0)) * 0.5;
    grain += hash(floor(uv * 80.0)) * 0.3;
    grain = grain / 1.8;

    // Warm paper tone
    vec3 paper = vec3(0.98, 0.96, 0.92) * (0.92 + grain * 0.08);

    // Multiply blend
    vec3 blended = mix(color.rgb, color.rgb * paper, uOpacity);

    outputColor = vec4(blended, color.a);
  }
`

export class PaperTextureEffect extends Effect {
  constructor(options: { opacity?: number } = {}) {
    super('PaperTextureEffect', fragmentShader, {
      uniforms: new Map([
        ['uTime', new Uniform(0)],
        ['uOpacity', new Uniform(options.opacity ?? 0.12)],
      ]),
    })
  }

  update(_renderer: any, _inputBuffer: any, deltaTime: number): void {
    const timeUniform = this.uniforms.get('uTime')!
    timeUniform.value += deltaTime
  }
}
