'use client'

import * as THREE from 'three'

// ============== TOON SHADER ==============
// Cel-shaded comic book style with stepped shading
// Supports instanced rendering via instanceMatrix

const toonVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    #ifdef USE_INSTANCING
      mat4 instanceModelMatrix = instanceMatrix;
      vec4 worldPosition = instanceModelMatrix * vec4(position, 1.0);
      vec4 mvPosition = modelViewMatrix * worldPosition;
      mat3 instanceNormalMatrix = mat3(instanceModelMatrix);
      vNormal = normalize(normalMatrix * instanceNormalMatrix * normal);
    #else
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
    #endif

    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const toonFragmentShader = `
  uniform vec3 uColor;
  uniform vec3 uLightDirection;
  uniform float uSteps;
  uniform vec3 uHighlightColor;
  uniform vec3 uShadowColor;

  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDirection);

    // Calculate diffuse lighting with bias for brighter look
    float NdotL = dot(normal, lightDir);
    float diffuse = NdotL * 0.5 + 0.5;

    // Hard quantization for clean cel-shading bands
    float steps = max(2.0, uSteps);
    float quantized = floor(diffuse * steps) / (steps - 1.0);
    quantized = clamp(quantized, 0.0, 1.0);

    // Create distinct color bands
    vec3 shadedColor;
    if (quantized > 0.66) {
      shadedColor = mix(uColor, uHighlightColor, 0.3);
    } else if (quantized > 0.33) {
      shadedColor = uColor;
    } else {
      shadedColor = mix(uColor, uShadowColor, 0.5);
    }

    // Subtle rim lighting for depth
    vec3 viewDir = normalize(vViewPosition);
    float rim = 1.0 - max(0.0, dot(normal, viewDir));
    rim = smoothstep(0.5, 1.0, rim) * 0.1;
    shadedColor += rim * uHighlightColor;

    gl_FragColor = vec4(shadedColor, 1.0);
  }
`

// ============== OUTLINE SHADER ==============

const outlineVertexShader = `
  uniform float uOutlineWidth;

  void main() {
    vec3 pos = position + normal * uOutlineWidth;

    #ifdef USE_INSTANCING
      mat4 instanceModelMatrix = instanceMatrix;
      vec4 worldPosition = instanceModelMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * worldPosition;
    #else
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    #endif
  }
`

const outlineFragmentShader = `
  uniform vec3 uOutlineColor;

  void main() {
    gl_FragColor = vec4(uOutlineColor, 1.0);
  }
`

// ============== MATERIAL FACTORY ==============

export function createToonMaterial(
  color: string,
  steps: number = 3
): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(color)

  // Create shadow by darkening and slightly desaturating
  const shadowColor = baseColor.clone()
  const hsl = { h: 0, s: 0, l: 0 }
  shadowColor.getHSL(hsl)
  shadowColor.setHSL(hsl.h, hsl.s * 0.9, hsl.l * 0.6)

  // Create highlight by lightening
  const highlightColor = baseColor.clone()
  highlightColor.getHSL(hsl)
  highlightColor.setHSL(hsl.h, hsl.s * 0.8, Math.min(hsl.l * 1.3, 0.95))

  return new THREE.ShaderMaterial({
    vertexShader: toonVertexShader,
    fragmentShader: toonFragmentShader,
    uniforms: {
      uColor: { value: baseColor },
      uLightDirection: { value: new THREE.Vector3(0.6, 1, 0.4).normalize() },
      uSteps: { value: steps },
      uHighlightColor: { value: highlightColor },
      uShadowColor: { value: shadowColor },
    },
  })
}

export function createOutlineMaterial(
  outlineColor: string = '#1a1a2e',
  outlineWidth: number = 0.025
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    uniforms: {
      uOutlineColor: { value: new THREE.Color(outlineColor) },
      uOutlineWidth: { value: outlineWidth },
    },
    side: THREE.BackSide,
  })
}
