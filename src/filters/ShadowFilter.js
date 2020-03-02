/**
 * Post processing filter to apply shadows to the frame,
 * using a render texture of all the lights on the current frame
 * 
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI.Filters
 */

 export class ShadowFilter extends PIXI.Filter {
     /**
      * @param {PIXI.Texture} texture - The light texture used to calculate shadow colors
      * 
      */
     constructor(sprite, program, scale = 1){
        const lightMatrix = new PIXI.Matrix();

        sprite.renderable = false;

        super( program.vert, program.frag,
            {
                lightSampler: sprite._texture,
                //dimensions: [window.innerWidth, window.innerHeight],
                filterMatrix: lightMatrix,
                scale: { x: 1, y: 1 },
                rotation: new Float32Array([1, 0, 0, 1]),    
            }
        );

        this.lightSprite = sprite;
        this.lightMatrix = lightMatrix;

        
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
     apply(filterManager, input, output, clear) {
        // fill lightMatrix with _normalized sprite texture coords_
        this.uniforms.filterMatrix = filterManager.calculateSpriteMatrix(this.lightMatrix, this.lightSprite);
        //this.uniforms.filterMatrix.ty -= 1;
        this.uniforms.scale.x = this.scale.x;
        this.uniforms.scale.y = this.scale.y;

        // Extract rotation from world transform
        const wt = this.lightSprite.transform.worldTransform;
        const lenX = Math.sqrt((wt.a * wt.a) + (wt.b * wt.b));
        const lenY = Math.sqrt((wt.c * wt.c) + (wt.d * wt.d));

        if (lenX !== 0 && lenY !== 0)
        {
            this.uniforms.rotation[0] = wt.a / lenX;
            this.uniforms.rotation[1] = wt.b / lenX;
            this.uniforms.rotation[2] = wt.c / lenY;
            this.uniforms.rotation[3] = wt.d / lenY;
        }

        // draw the filter...
        filterManager.applyFilter(this, input, output, clear);
     }
 }