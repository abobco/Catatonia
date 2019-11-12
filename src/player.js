import Matter from 'matter-js/build/matter.min.js'; 
import {Boundary} from "./terrain.js";

class Player {
    constructor(position, frameMap) {
        // physics variables
        this.centerPos = new PIXI.Point(position.x, position.y);
        this.scale = 3;
        this.maxVel = 3;
        this.jumpVel = -12;
        this.xVel = 0;

        // action flags
        this.isGrounded = false,
        this.inSlide = false,
        this.inSlowDown = false;
        this.jumpInput = false;
        this.isHanging = false;

        // to check sprite flip conveniently
        this.flip = "left";

        // Key-value pairs of strings and animations
        this.animations = this.animationsInit(frameMap);
        this.currentAnimation = "none";

        // collider dimensions, set to the dimensions of the walk animation for now
        this.colliderWidth = this.animations.get("walk").width;
        this.colliderHeight = this.animations.get("walk").height; 

        // collision box line segments
        this.A = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
        this.B = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
        this.C = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
        this.D = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
        // array of the 4 collision box segments
        this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                    (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                    (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                    (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];

        this.body = new Matter.Bodies.rectangle(this.centerPos.x, this.centerPos.y, this.colliderWidth, this.colliderHeight, {
                                         density: 0.0005,
                                         frictionAir: 0.06,
                                         restitution: 0,
                                         friction: 0.01,
                                         inertia: Infinity
                    }); 
    }

    update(){
        // Apply velocity from user inputs
        Matter.Body.setVelocity(this.body, new Matter.Vector.create(this.xVel, this.body.velocity.y) );

        // Move the sprites to follow their physicis body
        this.setPosition(this.body.position.x, this.body.position.y);

        // apply friction if needed
        if ( this.inSlowDown)
            this.slowVelocity();
    }

    // Move all sprites
    setPosition(ix,iy) {
        // move origin point
        this.centerPos.x = ix;
        this.centerPos.y = iy;

        // create new collision boundaries
        this.A = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
        this.B = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y - (this.colliderHeight/2));
        this.C = Matter.Vector.create(this.centerPos.x - (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
        this.D = Matter.Vector.create(this.centerPos.x + (this.colliderWidth/2), this.centerPos.y + (this.colliderHeight/2));
        this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                       (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                       (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                       (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];
        
        // move animation sprites              
        this.animations.forEach(function (sprite) {
            sprite.x = ix;
            sprite.y = iy;
        })
    }

    // change active animation, play at given frame
    setAnimation(key, frame = 0) {
        // clear all previous animations
        if ( key != this.currentAnimation ){
            this.currentAnimation = key;
            this.animations.forEach(function (value) {
                value.visible = false;
            })
            var activeAnim = this.animations.get(key);
            activeAnim.visible = true;
            activeAnim.gotoAndPlay(frame);
            this.animations.set(key, activeAnim);
        }
    } 
    
    // flip sprites around y axis 
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

    // Air friction for dummies
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

    animationsInit(frameMap){
        // init all the animation objects 
        
        let walkAnim =  this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("walk"))),
            stopAnim =  this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("stop"))),
            jumpAnim =  this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("jump"))),
            slideAnim =  this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("slide"))),
            hangAnim = this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("hang")));
        
        // setup the unique properties of each animation
        slideAnim.anchor.y = 0.3;
        // hangAnim.anchor.y = 0.3;
        stopAnim.loop = false;  // the game currently starts with the cat falling
        jumpAnim.loop = false;
        slideAnim.loop = false;
        hangAnim.loop = false;
        jumpAnim.play();
        walkAnim.visible = false;
        stopAnim.visible = false;
        slideAnim.visible = false;
        hangAnim.visible = false;

        let animationMap = new Map([['walk', walkAnim],
                                    ['stop', stopAnim],
                                    ['jump', jumpAnim],
                                    ['slide',slideAnim],
                                    ['hang', hangAnim]]);
        return animationMap;

    }

    // resize and set anchor points for new sprites
    spriteInit(newSprite){
        newSprite.x = window.innerWidth / 2;
        newSprite.y = window.innerHeight / 2;
        newSprite.vx = 0;
        newSprite.vy = 0;
        newSprite.scale.set(this.scale,this.scale);
        newSprite.anchor.set(0.5);
        newSprite.animationSpeed = 0.2;
        return newSprite;
    }

};

export { Player };