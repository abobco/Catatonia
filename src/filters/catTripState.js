import {BezierDisplacementFilter} from './BezierDisplacement.js'
import {BezierCurve} from './BezierCurve.js'
import {MyTimer} from '../entities/myTimer.js'

export class CatnipTrip{
    constructor(shader, player){
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

        this.bezierCurve = new BezierCurve();
        this.timer = new MyTimer();
        this.powerupTimer = new MyTimer;
        this.powerupTimer.start();

        this.foregroundNoise = PIXI.Sprite.fromImage('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');
        this.foregroundNoise.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        this.backgroundNoise = PIXI.Sprite.fromImage('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');
        this.backgroundNoise.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;

        this.foregroundNoise.scale.set(0.6);
        this.backgroundNoise.scale.set(0.6);

        this.foregroundFilter = new BezierDisplacementFilter(this.foregroundNoise, shader);
        this.backgroundFilter = new BezierDisplacementFilter(this.backgroundNoise, shader);

        this.badFilterSolution = new PIXI.Graphics()
                                    .beginFill(0,0.0)
                                    .drawRect(-2000,-2000, 8000, 8000)
                                    .endFill();

        
    }

    update(){
        this.foregroundNoise.position.set(this.filterTime, this.filterTime);
        this.backgroundNoise.position.set(this.filterTime, this.filterTime);
    }

    FixedUpdate(player, foregroundFilters, backgroundFilters, powerups ){
        if (this.timer.isRunning){
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

            if ( this.timer.getElapsedTime() < this.filterTransitionMS){   
                this.bezierTime += this.bezierIncrement;
            }
            else if (this.timer.getElapsedTime() > (this.filterTransitionMS + this.filterStaticMS)) {
                this.bezierTime -= this.bezierIncrement;
            }
            if ( this.timer.getElapsedTime() > (2*this.filterTransitionMS + this.filterStaticMS) ) {
                this.filterTime = 0.0;
                this.bezierTime = 0.0;
                this.timer.stop();
                foregroundFilters = [];
                backgroundFilters = [];    
            
                //this.app.ticker.speed = 1.0;
                player.jumpVel = this.playerDefaultJump;
                player.maxVel = this.playerDefaultVel;
            }
        }

        powerups.forEach( (powerup) => {
            powerup.update(this.powerupTimer.getElapsedTime());
        } )
    }

    addToStage(foregroundContainer, backgroundContainer){
        foregroundContainer.addChild(this.foregroundNoise);
        backgroundContainer.addChild(this.backgroundNoise);

        foregroundContainer.addChild(this.badFilterSolution);

    }

    start() {
        //foregroundFilters = [this.foregroundFilter];
       // backgroundFilters = [this.backgroundFilter];
        this.timer.start();
    }
}