import {TextureBufferFilter} from '../../filters/TextureBuffer.js'
/**
 * Abstract NPC class
 * - Control animations & transitions
 * - Handle pathfinding
 * - 
 */
export class NPC {
    constructor(position, textures, targetContainer, filterCache, screen){
        this.position = new PIXI.Point();
        this.position.copyFrom(position);

        this.animationContainer = new PIXI.Container();

        this.idleAnim = new PIXI.AnimatedSprite(textures.idleFrames);
        this.animationContainer.addChild(this.idleAnim);

        this.idleAnim.anchor.set(0.15, 0.5);
        this.idleAnim.position.copyFrom(this.position);  
        this.idleAnim.loop = true;
        this.idleAnim.animationSpeed = 0.02;
        this.idleAnim.scale.set(5);

        this.idleAnim.play();

        
        let filter = new TextureBufferFilter();
        this.animationContainer.filters = [filter];
        filter.cache = filterCache;
        this.animationContainer.filterArea = screen;
    }
}