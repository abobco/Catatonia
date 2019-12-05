import Matter from 'matter-js/build/matter.min.js';

import {Player} from './player.js';
import {RaySource} from './raySource.js';

class PointLight {

  constructor(x,y, castSegments, endpoints, shaderProgram, baseRenderer) {
    this.pos = Matter.Vector.create(x,y);
    this.castSegments = castSegments;

    this.visionSource = new RaySource( x, y, castSegments, endpoints, shaderProgram );
    this.numStaticRays = this.visionSource.rays.length;
    this.vel = -1.5;
    this.visionSource.look();
    this.visionSource.auxLook();
    this.lightContainer = new PIXI.Container();
    this.baseRenderer = baseRenderer;
  }

  update(timescale) {
    this.lightContainer.destroy({ "children" : true });
    this.lightContainer = new PIXI.Container();
    this.pos.x += this.vel*timescale;
    this.visionSource.update(this.pos.x, this.pos.y);
    this.visionSource.drawMesh();
    for ( let i = 0; i < this.visionSource.tris.length; i++) {
      this.lightContainer.addChild(this.visionSource.tris[i]);
    }
    this.visionSource.show(this.baseRenderer);
  }
}

export {PointLight}