precision highp float;
attribute vec2 aVertexPosition;
attribute vec3 aColor;
// attribute vec2 aDimensions;

// passed as the world coordinates of the player object
// attribute vec2 aCameraPos;


uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

uniform vec2 position;
uniform vec2 dimensions;

varying vec3 vColor;

// varying vec4 vCameraPos;
varying vec2 lightPos;
// varying vec2 vDimensions;

vec4 firstVert = vec4(0,0,0,0);

float TriAlpha;

void main() {
    // vCameraPos = aCameraPos;
    vColor = aColor;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    // not really sure what this does currently
    // vCameraPos =  vec4((projectionMatrix * translationMatrix * vec3(position + aCameraPos, 1.0)).xy, 0.0, 1.0);

    // For some reason, the light will only appear stationary if the translation matrix is divided by 2.
    lightPos = (projectionMatrix * translationMatrix / 2.0 * vec3(position, 1.0)).xy + vec2(0.5, 0.5);
    lightPos.x *= dimensions.x/dimensions.y;
}