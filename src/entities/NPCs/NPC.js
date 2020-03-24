import {TextureBufferFilter} from '../../filters/TextureBuffer.js'
/**
 * Abstract NPC class
 * - Control animations & transitions
 * - Handle pathfinding
 * - 
 */
export class NPC {
    /**
     * 
     * @param {*} options.position 
     * @param {*} options.textures 
     * @param {*} options.targetContainer 
     * @param {*} options.filterCache 
     * @param {*} options.screen 
     */
    constructor(options){

        this.position = new PIXI.Point();
        this.position.copyFrom(options.position);

        this.animationContainer = new PIXI.Container();

        this.idleAnim = new PIXI.AnimatedSprite(options.textures.idleFrames);
        this.animationContainer.addChild(this.idleAnim);

        this.idleAnim.anchor.set(0.15, 0.5);
        this.idleAnim.position.copyFrom(this.position);  
        this.idleAnim.loop = true;
        this.idleAnim.animationSpeed = 0.02;
        this.idleAnim.scale.set(5);

        this.idleAnim.play();

        // spooky ghost trail effect
        // let filter = new TextureBufferFilter();
        // this.animationContainer.filters = [filter];
        // filter.cache = options.filterCache;
        // this.animationContainer.filterArea = options.screen;
    }
}