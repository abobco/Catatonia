import Matter from 'matter-js/build/matter.min.js'; 
import {Boundary} from "./terrain.js";

class Player {
    constructor(rectangle, animationMap) {
    // physics variables
    this.centerPos = new PIXI.Point(rectangle.x, rectangle.y);
    this.scale = 3;
    this.maxVel = 3;
    this.jumpVel = -12;
    this.xVel = 0;
    // collider varibales
    this.colliderWidth = rectangle.width;
    this.colliderHeight = rectangle.height; 
    // action flags
    this.isGrounded = false,
    this.inSlide = false,
    this.inSlowDown = false;
    this.jumpInput = false;

    this.flip = "left";
    // Key-value pairs of strings and animations
    this.animations = animationMap;

    this.A = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
    this.B = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
    this.C = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
    this.D = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));

    this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                   (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                   (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                   (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];
    }

    // Move all sprites
    setPosition(ix,iy) {
        this.centerPos.x = ix;
        this.centerPos.y = iy;

        this.A = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
        this.B = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
        this.C = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
        this.D = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
    
        this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                       (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                       (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                       (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];
    

        //console.log(this.A);

        this.animations.forEach(function (value) {
            value.x = ix;
            value.y = iy;
        })
    }

    // change active animation, play at given frame
    setAnimation(key, frame = 0) {
        // clear all previous animations
        this.animations.forEach(function (value) {
            value.visible = false;
        })
        var activeAnim = this.animations.get(key);
        activeAnim.visible = true;
        activeAnim.gotoAndPlay(frame);
        this.animations.set(key, activeAnim);
    } 
    
    // flip the cat around 
    setFlip(dir) {
        var localScale;
        if ( dir == "right" ) {
            localScale = -3;
            this.scale = -3;
            this.flip = "right";
        }
        else if ( dir == "left") {
            localScale = 3;
            this.scale = 3;
            this.flip = "left";
        }
        this.animations.forEach(function (value) {
            value.scale.x = localScale;
        })        
    };

    slowVelocity() {
        if ( this.xVel > 0 ) {
            this.xVel -= 0.1;
          if ( this.xVel <= 0 ) {
            this.xVel = 0;
            this.inSlowDown = false;
          }
        }
        else if ( this.xVel < 0 ) {
            this.xVel += 0.1
          if ( this.xVel >= 0 ) {
            this.xVel = 0;
            this.inSlowDown = false;
          }
        }
    }
};

export { Player };