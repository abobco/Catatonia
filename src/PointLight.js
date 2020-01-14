import Matter from 'matter-js/build/matter.min.js';
import {Player} from './player.js';
import {RaySource} from './raySource.js';

class PointLight {

  constructor(x,y, castSegments, endpoints, shaderProgram, torchFrames) {
    this.pos = Matter.Vector.create(x,y);
    this.castSegments = castSegments;

    this.visionSource = new RaySource( x, y, castSegments, endpoints, shaderProgram );
    this.numStaticRays = this.visionSource.rays.length;
    this.vel = -1.5;
    this.visionSource.look();
    this.visionSource.auxLook();
    this.lightContainer = new PIXI.Container();

    this.torch = new TorchAnimation(x,y,torchFrames);
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
  }
}

class TorchAnimation {
  constructor(x,y, frames){
    this.animation = new PIXI.AnimatedSprite(frames);
    this.animation.position.set(x,y);
    this.animation.anchor.set(0.5);
    this.animation.scale.set(1.5,1.5);
    this.animation.animationSpeed = 0.2;
    this.animation.gotoAndPlay(Math.random() * 9);
  }
}

export {PointLight}