import { Effect } from 'postprocessing'
import { Uniform, Vector2 } from 'three'

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 uTexelSize;
  uniform float uEdgeStrength;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = texture(tDiffuse, uv);

    // Sample surrounding pixels for Sobel operator
    vec4 tl = texture(tDiffuse, uv + vec2(-1.0, -1.0) * uTexelSize);
    vec4 t  = texture(tDiffuse, uv + vec2( 0.0, -1.0) * uTexelSize);
    vec4 tr = texture(tDiffuse, uv + vec2( 1.0, -1.0) * uTexelSize);
    vec4 l  = texture(tDiffuse, uv + vec2(-1.0,  0.0) * uTexelSize);
    vec4 r  = texture(tDiffuse, uv + vec2( 1.0,  0.0) * uTexelSize);
    vec4 bl = texture(tDiffuse, uv + vec2(-1.0,  1.0) * uTexelSize);
    vec4 b  = texture(tDiffuse, uv + vec2( 0.0,  1.0) * uTexelSize);
    vec4 br = texture(tDiffuse, uv + vec2( 1.0,  1.0) * uTexelSize);

    // Sobel Gx and Gy on luminance
    float gx = -dot(tl.rgb, vec3(0.299, 0.587, 0.114)) - 2.0 * dot(l.rgb, vec3(0.299, 0.587, 0.114)) - dot(bl.rgb, vec3(0.299, 0.587, 0.114))
              + dot(tr.rgb, vec3(0.299, 0.587, 0.114)) + 2.0 * dot(r.rgb, vec3(0.299, 0.587, 0.114)) + dot(br.rgb, vec3(0.299, 0.587, 0.114));
    float gy = -dot(tl.rgb, vec3(0.299, 0.587, 0.114)) - 2.0 * dot(t.rgb, vec3(0.299, 0.587, 0.114)) - dot(tr.rgb, vec3(0.299, 0.587, 0.114))
              + dot(bl.rgb, vec3(0.299, 0.587, 0.114)) + 2.0 * dot(b.rgb, vec3(0.299, 0.587, 0.114)) + dot(br.rgb, vec3(0.299, 0.587, 0.114));

    float edge = sqrt(gx * gx + gy * gy);
    edge = smoothstep(0.15, 0.3, edge);
    float edgeFactor = 1.0 - edge * uEdgeStrength;

    // Slightly darken edges
    vec3 darkenedColor = color.rgb * edgeFactor;

    outputColor = vec4(darkenedColor, color.a);
  }
`

export class SobelEdgeEffect extends Effect {
  constructor(options: { edgeStrength?: number } = {}) {
    const uniforms = new Map<string, Uniform>()
    uniforms.set('uTexelSize', new Uniform(new Vector2()))
    uniforms.set('uEdgeStrength', new Uniform(options.edgeStrength ?? 0.3))

    super('SobelEdgeEffect', fragmentShader, {
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
