import Matter from 'matter-js/build/matter.min.js';

import {Player} from './player.js';
import {RaySource} from './raySource.js';

var NPC = function(x,y, walls, castSegments, endpoints, graphics) {

    this.pos = Matter.Vector.create(x,y);
    this.castSegments = castSegments;

    this.visionSource = new RaySource( x, y, walls, castSegments, endpoints );
    this.numStaticRays = this.visionSource.rays.length;
    this.vel = -1.5;
    this.visionSource.look(this.castSegments, graphics);
    this.visionSource.auxLook(this.castSegments, graphics);

    this.update = function(graphics) {
      this.pos.x += this.vel;
    
        this.visionSource.update(this.pos.x, this.pos.y, graphics)
    }

}

NPC.prototype.constructor = NPC
export {NPC};