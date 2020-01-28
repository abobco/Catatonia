import { makeNoise2D } from "open-simplex-noise";

/**
 * Handles offset calculations for smoothing/shake/etc
 * @class
 */
export class MyCamera {
    /**
     * @param {PIXI.Point} playerPosition - starting position of the player
     */
    constructor(playerPosition){
        this.targetPos = playerPosition;
        this.position = playerPosition;
        this.offset = new PIXI.Point(0.0,0.0);
        this.angleOffset = 0.0;
        this.maxOffset = 250;
        this.maxAngleOffset = 10;
        this.flipOffset = 75;
        
        this.shake = 0.0;
        this.trauma = 0.0;

        this.baseSeed = Date.now();

        this.xNoise = makeNoise2D(this.baseSeed);
        this.yNoise = makeNoise2D(this.baseSeed+1);
        this.rNoise = makeNoise2D(this.baseSeed+2);

        this.noiseIncrement = 0;
    }

    /** calculate camera offset */
    update(playerPosition, flip, timescale){
        this.noiseIncrement += timescale;
        this.trauma -= 0.015 * timescale;
        
        if ( this.trauma < 0)
            this.trauma = 0;
        this.shake = Math.pow(this.trauma, 2);

        this.simplexShake();
        let targetPosition = new PIXI.Point();
        targetPosition.copyFrom(playerPosition);
        if ( flip == "right")
            targetPosition.x += this.flipOffset;
        else
            targetPosition.x -= this.flipOffset;

        // this.position.copyFrom(playerPosition);

        this.asymptoticAverage(targetPosition, 0.05);

        this.position.x += this.offset.x;
        this.position.y += this.offset.y;
    }

    /** Add trauma for camera shake */
    addTrauma(trauma){
        this.trauma += trauma;
        console.log("trauma += ", trauma);
    }

    /** Camera shake from random numbers, won't scale with time */
    randomShake(){
        this.offset.x = this.maxOffset * this.shake * (Math.random()*2 -1);
        this.offset.y = this.maxOffset * this.shake * (Math.random()*2 -1);
        this.angleOffset = this.maxAngleOffset * this.shake * (Math.random()*2 -1);
    }

    /** Camera shake from simplex noise */
    simplexShake(){
        this.offset.x = this.maxOffset * this.shake * this.xNoise(this.noiseIncrement, 0);
        this.offset.y = this.maxOffset * this.shake * this.yNoise(this.noiseIncrement, 0);
        this.angleOffset = this.maxAngleOffset * this.shake * this.rNoise(this.noiseIncrement, 0);
    }

    /** Asymptotic smoothing for all camera movement towards the player */
    asymptoticAverage(target, weight){
        const inverseWeight = 1.0 - weight;
        this.position.x = inverseWeight * this.position.x + weight*target.x;
        this.position.y = inverseWeight * this.position.y + weight*target.y;
    }

}