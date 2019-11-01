precision highp float;

uniform vec2 dimensions;  
// uniform vec2 position;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

varying vec3 vColor;
// varying vec4 vCameraPos;
// varying vec2 vDimensions;

// uniform vec2 u_resolution;

// const vec2 aspectRatio = vec2(1920.0, 1080.0);

varying vec2 lightPos;
vec2 normPos;

void main() {
    // test method, calculate based on buffer of light source world positions
    // doesn't work currently
    /*
        normPos.x = position.x - vCameraPos.x;
        normPos.y = position.y - vCameraPos.y;

        normPos.x = ( normPos.x - gl_FragCoord.x ) / dimensions.x;
        normPos.y = ( normPos.y - gl_FragCoord.y ) / dimensions.y;
    */

    // For some reason, the light will only appear stationary if the translation matrix is divided by 2.
    // lightPos = (projectionMatrix * translationMatrix / 2.0 * vec3(position, 1.0)).xy + vec2(0.5, 0.5);

    // this method will lock the lighting shading to radiating from whatever lightPos is set to(0-1.0, 0-1.0)
    normPos = gl_FragCoord.xy / dimensions;
    normPos.x *= dimensions.x/dimensions.y;
    
    float dist = 0.5 - distance(lightPos, normPos);
    dist = dist;

    // float dist = 0.5;
    gl_FragColor = vec4(vColor,dist);

    gl_FragColor.rgb *= dist;
}