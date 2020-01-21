precision highp float;
attribute vec2 aVertexPosition;
attribute vec3 aColor;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

uniform vec2 position;
uniform vec2 dimensions;

varying vec3 vColor;

varying vec2 lightPos;

float TriAlpha;

void main() {
    vColor = aColor;
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    // light shading only appear stationary if the translation matrix is divided by 2.
    lightPos = (projectionMatrix * translationMatrix / 2.0 * vec3(position, 1.0)).xy + vec2(0.5, 0.5);
    lightPos.x *= dimensions.x/dimensions.y;
}

