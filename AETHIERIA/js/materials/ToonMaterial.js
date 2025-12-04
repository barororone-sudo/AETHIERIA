import * as THREE from 'three';

export class ToonMaterial extends THREE.ShaderMaterial {
    constructor(parameters) {
        const uniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib.common,
            THREE.UniformsLib.lights,
            THREE.UniformsLib.fog,
            {
                uColor: { value: new THREE.Color(0xffffff) },
                uRimColor: { value: new THREE.Color(0xffffff) },
                uRimAmount: { value: 0.6 },
                uRimThreshold: { value: 0.2 },
                map: { value: null }
            }
        ]);

        super({
            uniforms: uniforms,
            lights: true,
            fog: true, // ACTIVÉ IMPÉRATIVEMENT
            skinning: true, // ACTIVÉ IMPÉRATIVEMENT
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                #include <common>
                #include <skinning_pars_vertex>
                #include <fog_pars_vertex> // <--- AJOUT CRITIQUE

                void main() {
                    vUv = uv;
                    
                    // Initialisation des variables standards pour le skinning
                    #include <skinbase_vertex>
                    #include <begin_vertex>
                    #include <beginnormal_vertex>
                    #include <defaultnormal_vertex>

                    // Application du Skinning
                    #include <skinning_vertex>
                    
                    // Calcul de la position monde
                    vec4 worldPosition = modelMatrix * vec4( transformed, 1.0 );
                    vec4 mvPosition = viewMatrix * worldPosition; 
                    
                    gl_Position = projectionMatrix * mvPosition;
                    
                    // Recalcul de la normale après skinning
                    vNormal = normalize( normalMatrix * transformedNormal ); 
                    vViewPosition = - mvPosition.xyz;

                    #include <fog_vertex> // <--- AJOUT CRITIQUE
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform vec3 uRimColor;
                uniform float uRimAmount;
                uniform float uRimThreshold;
                uniform sampler2D map;

                varying vec2 vUv;
                varying vec3 vNormal;
                varying vec3 vViewPosition;

                #include <common>
                #include <lights_pars_begin>
                #include <fog_pars_fragment> // <--- AJOUT CRITIQUE

                void main() {
                    // Couleur de base (Texture * Couleur)
                    vec4 texColor = texture2D(map, vUv);
                    vec3 baseColor = texColor.rgb * uColor;

                    // Direction de la lumière (Directionnelle principale)
                    vec3 lightDir = vec3(0.5, 0.5, 1.0);
                    #if NUM_DIR_LIGHTS > 0
                        lightDir = normalize(directionalLights[0].direction);
                    #endif

                    // Cel-Shading (N dot L)
                    float NdotL = dot(vNormal, lightDir);
                    float intensity = smoothstep(-0.1, 0.1, NdotL);
                    float lightIntensity = 0.5 + 0.5 * intensity;

                    // Rim Light
                    vec3 viewDir = normalize(vViewPosition);
                    float rimDot = 1.0 - dot(viewDir, vNormal);
                    float rim = smoothstep(uRimThreshold, 1.0, rimDot) * uRimAmount;
                    rim *= intensity;

                    // Ambient (Approximation simple)
                    vec3 ambient = vec3(0.4);

                    // Combinaison
                    vec3 finalColor = baseColor * (lightIntensity + ambient) + (uRimColor * rim);

                    gl_FragColor = vec4(finalColor, texColor.a);

                    #include <fog_fragment> // <--- AJOUT CRITIQUE
                }
            `
        });

        // Gestion manuelle des paramètres pour éviter les warnings
        if (parameters) {
            if (parameters.uColor !== undefined) this.uniforms.uColor.value.set(parameters.uColor);
            if (parameters.uRimColor !== undefined) this.uniforms.uRimColor.value.set(parameters.uRimColor);
            if (parameters.uRimAmount !== undefined) this.uniforms.uRimAmount.value = parameters.uRimAmount;
            if (parameters.uRimThreshold !== undefined) this.uniforms.uRimThreshold.value = parameters.uRimThreshold;
            if (parameters.map !== undefined) this.uniforms.map.value = parameters.map;

            const safeParams = {};
            for (const key in parameters) {
                if (!['uColor', 'uRimColor', 'uRimAmount', 'uRimThreshold', 'map'].includes(key)) {
                    safeParams[key] = parameters[key];
                }
            }
            this.setValues(safeParams);
        }
    }
}
