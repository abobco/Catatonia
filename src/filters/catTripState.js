import {BezierDisplacementFilter} from './BezierDisplacement.js'
import {BezierCurve} from './BezierCurve.js'
import {MyTimer} from '../entities/myTimer.js'

export class CatnipTrip{
    constructor(shader, player, powerups){
        // physics values that will be toggled during the effect
        this.playerDefaultVel = player.maxVel;
        this.playerTripVel = player.maxVel * 1.3;
        this.playerDefaultJump = player.jumpVel;
        this.playerTripJump = player.jumpVel * 1.2;
        this.cameraRotation = 0;

        // timing
        this.bezierTime = 0;    // t input for a 4 point bezier curve
        this.filterTime = 0;    // time spent in trip effect
        this.filterTransitionMS = 3000.0;   // duration in miliseconds of the bezie curve transition into tripping
        this.filterStaticMS = 10000.0;      // duration of the trip where the bezier value will remain at 1 
        this.displacementIncrement = 0.5;   // how much the noise texture will be moved each frame
        this.bezierIncrement = 1.0 / (this.filterTransitionMS / 16.666);    // how much to step forward the bezier t vallue each update

        this.ticker = new PIXI.Ticker();    // used for the transition phases
        this.tickerMS = 0;
        this.ticker.add( this.onTick.bind(this) );

        // Transition curve, 4 point bezier : [(0,0), (0.5, 0), (0.5, 1), (1,1)]
        this.bezierCurve = new BezierCurve();
        this.powerupTimer = new MyTimer;
        this.powerupTimer.start();

        // noise textures for the displacement filters
        this.foregroundNoise = PIXI.Sprite.fromImage('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');
        this.foregroundNoise.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        // parallax screws up the effect for the background by default, 
        //  using a 2nd texture/filter that will be moved in sync with the background
        this.backgroundNoise = PIXI.Sprite.fromImage('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');
        this.backgroundNoise.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        this.foregroundNoise.scale.set(0.6);
        this.backgroundNoise.scale.set(0.6);

        // actual post processing filters for the effect
        this.foregroundFilter = new BezierDisplacementFilter(this.foregroundNoise, shader);
        this.backgroundFilter = new BezierDisplacementFilter(this.backgroundNoise, shader);

        // giant invisible rectangle that somehow fixes a lighting bug
        this.badFilterSolution = new PIXI.Graphics()
                                    .beginFill(0,0.0)
                                    .drawRect(-2000,-2000, 8000, 8000)
                                    .endFill();
        
        // used to move the catnip leaves up and down for the floating effect
        this.powerups = powerups;
        this.maxCatnipFloatOffset = 10;
        this.floatTimescale = 0.05;
        this.floatTime = 0;    
    }

    onTick(){
        this.tickerMS += this.ticker.deltaMS;
    }

    // called whenever a new frame is drawn
    update(deltaMS){
        this.foregroundNoise.position.set(this.filterTime, this.filterTime);
        this.backgroundNoise.position.set(this.filterTime, this.filterTime);

        this.floatTime += deltaMS * this.floatTimescale;
        const catNipOffset = this.maxCatnipFloatOffset * Math.sin(this.floatTime);
        this.powerups.forEach( (powerup) => {
            powerup.update(catNipOffset);
        } )
    }

    // updated at constant 60 hz
    FixedUpdate(player, foregroundFilters, backgroundFilters ){
        if (this.ticker.started){
            player.maxVel = this.playerTripVel;
            player.jumpVel = this.playerTripJump;

            this.filterTime += this.displacementIncrement;
            let bezierY;
            if ( this.bezierTime > 1){
                this.bezierTime = 1;
                bezierY = 1;
            }
            else {
                bezierY = this.bezierCurve.getY(this.bezierTime);
            }

            this.foregroundFilter.uniforms.bezierVal = bezierY;
            this.backgroundFilter.uniforms.bezierVal = bezierY;

            this.cameraRotation = 0.015 * bezierY*  Math.sin(this.filterTime * 0.02);

            if ( this.tickerMS < this.filterTransitionMS){   
                this.bezierTime += this.bezierIncrement;
            }
            else if (this.tickerMS > (this.filterTransitionMS + this.filterStaticMS)) {
                this.bezierTime -= this.bezierIncrement;
            }
            if ( this.tickerMS > (2*this.filterTransitionMS + this.filterStaticMS) ) {
                this.filterTime = 0.0;
                this.bezierTime = 0.0;
                this.ticker.stop();
                foregroundFilters = [];
                backgroundFilters = [];    
            
                player.jumpVel = this.playerDefaultJump;
                player.maxVel = this.playerDefaultVel;
            }
        }

        // update the dissolve effect on recently touched catnip powerups
        this.powerups.forEach(powerup => {
            powerup.FixedUpdate();
        });
    }

    addToStage(foregroundContainer, backgroundContainer){
        foregroundContainer.addChild(this.foregroundNoise);
        backgroundContainer.addChild(this.backgroundNoise);

        foregroundContainer.addChild(this.badFilterSolution);

    }

    start() {
        this.tickerMS = 0;
        this.ticker.start();
    }
}