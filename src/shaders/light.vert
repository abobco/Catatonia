precision highp float;
attribute vec2 aVertexPosition;

uniform mat3 translationMatrix;
uniform mat3 projectionMatrix;

uniform vec2 position;
uniform vec2 dimensions;

varying vec2 lightPos;
varying vec2 vertPos;

float TriAlpha;

void main() {
    gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

    // convert the light source's world position to gl coordinates
    lightPos = (projectionMatrix * translationMatrix / 2.0 * vec3(position, 1.0)).xy + vec2(0.5, 0.5);
    lightPos *= dimensions;
}

