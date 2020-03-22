import vert from '../shaders/dissolve/dissolve.vert'
import frag from '../shaders/dissolve/dissolve.frag'

export class DissolveFilter extends PIXI.Filter
{
    /**
     * @param {PIXI.Sprite} sprite - noise texture for the dissolve effect
     * @param {Object} [shader] - parent object for shader program, must have vert and frag members
     */
    constructor(sprite, scale) {
        const maskMatrix = new PIXI.Matrix();

        sprite.renderable = false;

        let uniforms = {
            mapSampler: sprite._texture,
            filterMatrix: maskMatrix,
            scale: { x: 1, y: 1 },
            DissolveVal: 1.0
        }

        super(vert, frag, uniforms);

        this.maskSprite = sprite;
        this.maskMatrix = maskMatrix;

        if (scale === null || scale === undefined)
        {
            scale = 20;
        }

        /**
         * scaleX, scaleY for displacements
         * @member {PIXI.Point}
         */
        this.scale = new PIXI.Point(scale, scale);
    }

    /**
     * Applies the filter.
     *
     * @param {PIXI.systems.FilterSystem} filterManager - The manager.
     * @param {PIXI.RenderTexture} input - The input target.
     * @param {PIXI.RenderTexture} output - The output target.
     * @param {boolean} clear - Should the output be cleared before rendering to it.
     */
    apply(filterManager, input, output, clear)
    {
        // fill maskMatrix with _normalized sprite texture coords_
        this.uniforms.filterMatrix = filterManager.calculateSpriteMatrix(this.maskMatrix, this.maskSprite);
        this.uniforms.scale.x = this.scale.x;
        this.uniforms.scale.y = this.scale.y;

        // draw the filter...
        filterManager.applyFilter(this, input, output, clear);
    }

    /**
     * The texture used for the displacement map. Must be power of 2 sized texture.
     *
     * @member {PIXI.Texture}
     */
    get map()
    {
        return this.uniforms.mapSampler;
    }

    set map(value) // eslint-disable-line require-jsdoc
    {
        this.uniforms.mapSampler = value;
    }

}