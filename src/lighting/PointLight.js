import Matter from 'matter-js/build/matter.min.js';
import {RayCaster} from './RayCaster.js';
import { Boundary } from '../entities/terrain.js';

/**
 * - Handles light animation
 * - Parent object of the actual ray caster
 * @class
 * 
 */
export class PointLight {
  /**
   * 
   * @param {number} x - x position
   * @param {number} y - y position
   * @param {Boundary[]} castSegments - terrain edges for ray casting
   * @param {Corner[]} endpoints - terrain vertices for ray casting
   * @param {Object} shaderProgram - WebGL shader text
   * @param {PIXI.Texture[]} torchFrames - torch animation textures
   */
  constructor(x, y, castSegments, endpoints, shaderProgram, torchFrames) {
    this.pos = Matter.Vector.create(x,y);
    this.castSegments = castSegments;

    this.visionSource = new RayCaster( x, y, castSegments, endpoints, shaderProgram );
    this.numStaticRays = this.visionSource.rays.length;
    this.vel = -1.5;
    this.visionSource.look();
    this.visionSource.auxLook();

    this.torch = new TorchAnimation(x,y,torchFrames);
  }

  update(timescale, position, time) {
    if ( position ){
      this.pos = position;
      this.torch.animation.position.set(position);
    }
    else;
      this.pos.x += this.vel*timescale;
    this.visionSource.update(this.pos.x, this.pos.y, time);
    this.visionSource.drawMesh();
  }
}

class TorchAnimation {
  constructor(x,y, frames){
    this.animation = new PIXI.AnimatedSprite(frames);
    this.animation.position.set(x,y);
    this.animation.anchor.set(0.5);
    this.animation.scale.set(1.5,1.5);
    this.animation.animationSpeed = 0.2;
    this.animation.gotoAndPlay(Math.random() * 9);  // make sure all the torches don't play in sync
  }
}