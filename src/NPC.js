import Matter from 'matter-js/build/matter.min.js';

import {Player} from './player.js';
import {RaySource} from './raySource.js';

class NPC {

  constructor(x,y, walls, castSegments, endpoints) {
    this.pos = Matter.Vector.create(x,y);
    this.castSegments = castSegments;

    this.visionSource = new RaySource( x, y, walls, castSegments, endpoints );
    this.numStaticRays = this.visionSource.rays.length;
    this.vel = -1.5;
    this.visionSource.look();
    this.visionSource.auxLook();
  }

  update() {
    this.pos.x += this.vel;
    this.visionSource.update(this.pos.x, this.pos.y)
  }
}

export {NPC}