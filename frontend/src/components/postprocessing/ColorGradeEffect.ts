import { Effect } from 'postprocessing'

const fragmentShader = /* glsl */ `
  uniform sampler2D tDiffuse;

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec4 color = texture(tDiffuse, uv);

    // Warm shift
    color.r *= 1.05;
    color.g *= 1.02;
    color.b *= 0.92;

    // Vignette
    vec2 center = uv - 0.5;
    float vignette = 1.0 - dot(center, center) * 0.25;
    vignette = smoothstep(0.0, 1.0, vignette);

    outputColor = vec4(color.rgb * vignette, color.a);
  }
`

export class ColorGradeEffect extends Effect {
  constructor() {
    super('ColorGradeEffect', fragmentShader, {})
  }
}
