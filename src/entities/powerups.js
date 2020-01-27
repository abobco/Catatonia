import Matter from 'matter-js/build/matter.min.js';
/**
 * Interactable object that applies a Displacement filter to the screen when the player collides with it.
 * 
 * - Controlled by the catTripState class
 * - Make it float up and down by passing an offset value into the update function 
 * @class
 */
export class Powerup{
    /**
     * 
     * @param {number} x - x position
     * @param {number} y - y position
     * @param {PIXI.Texture} texture - Sprite texture for the powerup
     */
    constructor(x,y,texture){
        this.sprite = new PIXI.Sprite.from(texture);
        this.sprite.position.set(x,y);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(2.5);

        this.x = x;
        this.y = y;

        this.width = this.sprite.width//* this.sprite.scale.x;
        this.height = this.sprite.height//* this.sprite.scale.y;


        this.DissolveValue = 0.8;

        this.collider = new Matter.Bodies.rectangle( 
            x, 
            y, 
            this.width,
            this.height, 
             { 
               isStatic : true,
               isSensor : true,
             }
        );
        this.collider.isCatnip = true;
        this.collider.spriteReference = this.sprite;
    }

    /**  Calculate the offset from the parent object to avoid redundant calls to Math.sin on duplicate powerups */
    update(offset){
        this.sprite.y = this.y + offset;
    }

    /** update the dissolve filter until the sprite disappears */ 
    FixedUpdate(){
        if ( this.sprite.filters){
            this.DissolveValue -= 0.01;
            this.sprite.filters[0].uniforms.DissolveVal = this.DissolveValue;

            if ( this.DissolveValue <= 0){             
                this.sprite.renderable = false;
                this.sprite.filters[0].uniforms.DissolveVal = 0.75;
                this.sprite.filters = null;
            }
        }
    }
}