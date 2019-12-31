import { makeNoise2D } from "open-simplex-noise";

class MyCamera {
    constructor(playerPosition){
        this.targetPos = playerPosition;
        this.position = playerPosition;
        this.offset = new PIXI.Point(0.0,0.0);
        this.angleOffset = 0.0;
        this.maxOffset = 250;
        this.maxAngleOffset = 25;
        
        this.shake = 0.0;
        this.trauma = 0.0;

        this.baseSeed = Date.now();

        this.xNoise = makeNoise2D(this.baseSeed);
        this.yNoise = makeNoise2D(this.baseSeed+1);
        this.rNoise = makeNoise2D(this.baseSeed+2);

        this.noiseIncrement = 0;
    }

    update(playerPosition){
        this.noiseIncrement++;
        this.trauma -= 0.015;
        if ( this.trauma < 0)
            this.trauma = 0;
        this.shake = Math.pow(this.trauma, 2);

        this.simplexShake();

        // this.position.copyFrom(playerPosition);

        this.asymptoticAverage(playerPosition, 0.05);

        this.position.x += this.offset.x;
        this.position.y += this.offset.y;
    }

    addTrauma(trauma){
        this.trauma += trauma;
    }

    randomShake(){
        this.offset.x = this.maxOffset * this.shake * (Math.random()*2 -1);
        this.offset.y = this.maxOffset * this.shake * (Math.random()*2 -1);
        this.angleOffset = this.maxAngleOffset * this.shake * (Math.random()*2 -1);
    }

    simplexShake(){
        this.offset.x = this.maxOffset * this.shake * this.xNoise(this.noiseIncrement, 0);
        this.offset.y = this.maxOffset * this.shake * this.yNoise(this.noiseIncrement, 0);
        this.angleOffset = this.maxAngleOffset * this.shake * this.rNoise(this.noiseIncrement, 0);
    }

    asymptoticAverage(target, weight){
        const inverseWeight = 1.0 - weight;
        this.position.x = inverseWeight * this.position.x + weight*target.x;
        this.position.y = inverseWeight * this.position.y + weight*target.y;
    }

}

export {MyCamera}