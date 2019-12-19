import Matter from 'matter-js/build/matter.min.js'; 
import {Boundary} from "./terrain.js";

class Player {
    constructor(position, frameMap, debugRenderer) {
        // physics variables
        this.position = new PIXI.Point(position.x, position.y);
        this.scale = 3.5;
        this.maxVel = 4;
        this.jumpVel = -25;
        this.xVel = 0;

        // action flags
        this.isGrounded = false,
        this.inSlide = false,
        this.inSlowDown = false;
        this.jumpInput = false;
        this.isHanging = false;
        this.cameraSnapped = true;
        this.bouncyBug = 0;

        this.showDebug = false;
        this.debugRenderer = debugRenderer;

        this.climbTranslation = new PIXI.Point(0,0);

        this.cameraMovement = new PIXI.Point(0,0);

        // to check sprite flip conveniently
        this.flip = "left";

        // Key-value pairs of strings and animations
        this.animations = this.animationsInit(frameMap);
        this.currentAnimation = "none";

        // collider dimensions, set to the dimensions of the walk animation for now
        this.colliderWidth = this.animations.get("walk").width;
        this.colliderHeight = this.animations.get("walk").height; 

        // collision box line segments
        this.A = Matter.Vector.create(this.position.x - (this.colliderWidth/2), this.position.y - (this.colliderHeight/2));
        this.B = Matter.Vector.create(this.position.x + (this.colliderWidth/2), this.position.y - (this.colliderHeight/2));
        this.C = Matter.Vector.create(this.position.x - (this.colliderWidth/2), this.position.y + (this.colliderHeight/2));
        this.D = Matter.Vector.create(this.position.x + (this.colliderWidth/2), this.position.y + (this.colliderHeight/2));
        // array of the 4 collision box segments
        this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                    (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                    (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                    (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];

        this.body = new Matter.Bodies.rectangle(this.position.x, this.position.y, this.colliderWidth, this.colliderHeight, {
                                         density: 0.0005,
                                         frictionAir: 0.06,
                                         restitution: 0,
                                         friction: 0.01,
                                         inertia: Infinity
                    }); 
    }

    update(timescale){
        // Apply velocity from user inputs        
        if ( this.currentAnimation == "climb"){
            if (!this.animations.get("climb").playing) {

                
                Matter.Body.setPosition(this.body, new Matter.Vector.create(this.climbTranslation.x, this.climbTranslation.y));
                Matter.Body.setVelocity(this.body, new Matter.Vector.create(0,0));
                if (this.xVel == this.maxVel){
                    this.setAnimation("walk");
                    this.inSlowDown = false;
                }     
                else {
                    this.setAnimation("stop");
                    this.inSlowDown = true;
                }
                    
                    
                this.lockCamera();

                if (!this.bouncyBug)
                    this.bouncyBug = 1;

                this.isGrounded = true;
                this.inSlide = false;
                this.jumpInput = false;
                this.isHanging = false;
                Matter.Body.setStatic(this.body, false);
            }
            
        }
        else // apply velocity from input
            Matter.Body.setVelocity(this.body, new Matter.Vector.create(this.xVel*timescale, this.body.velocity.y) );
        // Move the sprites to follow their physicis body
        this.setPosition(this.body.position.x, this.body.position.y);

        // apply friction if needed
        if ( this.inSlowDown){
            this.slowVelocity();
        }
            
        
        // change animation speed with timescale
        this.animations.forEach(function (sprite) {
            if (timescale == 0.5)
                sprite.animationSpeed = 0.1;
            else
                sprite.animationSpeed = 0.2;
        })

    }

    // Move all sprites
    setPosition(ix,iy) {
        // move origin point
        this.position.x = ix;
        this.position.y = iy;

        // create new collision boundaries
        this.A = Matter.Vector.create(this.position.x - (this.colliderWidth/2), this.position.y - (this.colliderHeight/2));
        this.B = Matter.Vector.create(this.position.x + (this.colliderWidth/2), this.position.y - (this.colliderHeight/2));
        this.C = Matter.Vector.create(this.position.x - (this.colliderWidth/2), this.position.y + (this.colliderHeight/2));
        this.D = Matter.Vector.create(this.position.x + (this.colliderWidth/2), this.position.y + (this.colliderHeight/2));
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
        if (this.cameraSnapped){
            if ( dir == "right" ) {
                localScale = -Math.abs(this.scale);
                this.scale = -Math.abs(this.scale);;
                this.flip = "right";
            }
            else if ( dir == "left") {
                localScale = Math.abs(this.scale);
                this.scale = Math.abs(this.scale);
                this.flip = "left";
            }
            this.animations.forEach(function (value) {
                value.scale.x = localScale;
            })       
        }
         
    }

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
            hangAnim = this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("hang"))),
            climbAnim = this.spriteInit(new PIXI.AnimatedSprite(frameMap.get("climb")));
        
        // setup the unique properties of each animation
        slideAnim.anchor.y = 0.3;
        hangAnim.anchor.y = 0.3;

        climbAnim.anchor.y = 0.65;
        climbAnim.anchor.x = 0.85;

        stopAnim.loop = false;  // the game currently starts with the cat falling
        jumpAnim.loop = false;
        slideAnim.loop = false;
        hangAnim.loop = false;
        climbAnim.loop = false;
        jumpAnim.play();
        walkAnim.visible = false;
        stopAnim.visible = false;
        slideAnim.visible = false;
        hangAnim.visible = false;
        climbAnim.visible = false;

        // animation event methods
       // hangAnim.onComplete = this.lockCamera.apply(this);

        let animationMap = new Map([['walk', walkAnim],
                                    ['stop', stopAnim],
                                    ['jump', jumpAnim],
                                    ['slide',slideAnim],
                                    ['hang', hangAnim],
                                    ['climb', climbAnim]]);
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

    drawCollider(renderer){
        renderer.clear();
        renderer.beginFill(0xfc8803, 0.5);
        renderer.drawRect( this.position.x - (this.colliderWidth/2) , 
                           this.position.y - (this.colliderHeight/2) -1, 
                           this.colliderWidth , 
                           this.colliderHeight );
        renderer.endFill();
    }

    // calculate camera movement during climb animation
    getClimbDistance(x,y){
        const frames = this.animations.get("climb").totalFrames;
        this.cameraMovement.x = (x - this.position.x) / (9*5);
        this.cameraMovement.y = (y - this.position.y) / (9*5);
    }

    lockCamera(){
        this.cameraSnapped = true; 
    }

    handleEvent(event){
        switch(event.type){
            case "inputDown":
                console.log(event.type, event.direction)
                switch(event.direction){
                    case "up":
                        // jump from ground
                        if ( this.isGrounded  ) {
                            Matter.Body.setVelocity(this.body, Matter.Vector.create(this.xVel, this.jumpVel) );
                            this.setAnimation("jump");
                            this.isGrounded = false;
                            this.jumpInput = true;
                            this.inSlide = false;
                        }
                        // jump from wall
                        else if ( this.inSlide ) {
                            // if right side of cat is in contact with wall
                            if ( this.flip == "right" ) {
                                this.setFlip("left");
                                this.xVel = -this.maxVel * 1.5;
                                Matter.Body.setVelocity(this.body, Matter.Vector.create(this.xVel, .85*this.jumpVel) );
                                this.setAnimation("jump");
                                this.inSlide = false;
                                this.jumpInput = true;
                            }
                            // if left side of cat is in contact with wall
                            else if (this.flip == "left") {
                                this.setFlip("right");
                                this.xVel = this.maxVel * 1.5;
                                Matter.Body.setVelocity(this.body, Matter.Vector.create(this.xVel, .85*this.jumpVel) );
                                this.setAnimation("jump");
                                this.inSlide = false;
                                this.jumpInput = true;
                            }    
                        }
                        break;
                    case "down":
                        break;
                    case "right":
                        if (this.isGrounded)
                            this.setAnimation("walk");
                        this.setFlip("right");
                        this.inSlowDown = false;
                        this.xVel = this.maxVel;
                        break;
                    case "left":
                        if (this.isGrounded)
                            this.setAnimation("walk");
                        this.setFlip("left");
                        this.inSlowDown = false;
                        this.xVel = -this.maxVel;
                        break;
                }
                break;
            case "inputUp":
                console.log(event.type, event.direction)
                switch(event.direction){
                    case "up":
                        break;
                    case "down":
                        break;
                    case "right":
                        if ( this.isGrounded ) {
                            this.setAnimation("stop");
                            this.xVel = 0;
                        }
                        else {
                            this.inSlowDown = true;
                        }
                    case "left":
                        if ( this.isGrounded ) {
                            this.setAnimation("stop");
                            this.xVel = 0;
                        }
                        else {
                            this.inSlowDown = true;
                        }
                }
                break;
        }
    }


};

export { Player };