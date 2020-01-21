import Matter from 'matter-js/build/matter.min.js';
export class Powerup{
    constructor(x,y,texture){
        this.sprite = new PIXI.Sprite.from(texture);
        this.sprite.position.set(x,y);
        this.sprite.anchor.set(0.5);
        this.sprite.scale.set(2.5);

        this.x = x;
        this.y = y;

        this.timescale = 0.003;
        this.maxOffset = 10;

        this.width = this.sprite.width//* this.sprite.scale.x;
        this.height = this.sprite.height//* this.sprite.scale.y;

        this.ticker = new PIXI.Ticker();
        this.ticker.autoStart = false;

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

    update(ticks){
        let scaledTicks = ticks * this.timescale
        this.sprite.y = this.y + this.maxOffset * Math.sin(scaledTicks);
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