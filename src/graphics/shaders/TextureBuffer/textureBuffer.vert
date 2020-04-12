attribute vec2 aVertexPosition;

uniform vec2 movement;
uniform mat3 projectionMatrix;

varying vec2 vTextureCoord;
varying vec2 vPrevTextureCoord;

uniform vec4 inputSize;
uniform vec4 outputFrame;

vec4 filterVertexPosition( vec2 vertex )
{
    vec2 position = vertex * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;

    return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
}

vec2 filterTextureCoord( vec2 vertex )
{
    return vertex * (outputFrame.zw * inputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition(aVertexPosition);
    vTextureCoord = filterTextureCoord(aVertexPosition);
    vPrevTextureCoord = filterTextureCoord(aVertexPosition + (movement)* inputSize.zw );
}