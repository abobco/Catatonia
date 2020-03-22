import Matter from 'matter-js/build/matter.min.js';

/**
 * Individual particle base class
 * @class
 */

export class Particle{
    /**
     * @param {PIXI.Point} spawnPoint
     */
    constructor(spawnPoint){
        this.dimensions = new PIXI.Point(10,10);
        this.r = 5;
        this.position = spawnPoint;
        // this.body = Matter.Bodies.rectangle(this.position.x, this.position.y, this.dimensions.x, this.dimensions.y,{
        //     inertia: Infinity,
        //     friction: 0.0
        // });
        this.body = Matter.Bodies.circle(this.position.x, this.position.y, this.r);
        this.body.isParticle = true;
        this.ticks = 60;
        
    }
}

/**
 * draws the array of particles
 */

 export class ParticleSystem {
     /**
      * @param {PIXI.Graphics} renderer 
      */
     constructor(){
         
         this.color = 0x1755ff;
         this.particles = [];
         this.renderer = new PIXI.Graphics();
     }

     drawParticles(){
         this.renderer.clear();
         for ( let p of this.particles){     
            this.renderer.beginFill(this.color, 0.5 )
            .drawRect(p.body.position.x, p.body.position.y,
                p.dimensions.x, p.dimensions.y)
            .endFill();
            p.body.ticks++;
            if ( p.body.ticks > 50 ){
                p.body.collisionFilter.mask = 0x0001 | 0x0004;
            }
         }
     }

     /**
      * 
      * @param {PIXI.Point} position 
      * @param {Matter.World} world
      */
     addParticle(position, world ){
         this.particles.push(new Particle(position));
         Matter.World.add(world, this.particles[this.particles.length - 1 ].body );
     }
 }

