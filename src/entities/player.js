import {Vector, Body, Bodies} from 'matter-js/build/matter.min.js';
import {MyTimer} from "./myTimer.js";
import {TintedTrail} from '../graphics/filters/TextureBuffer.js'
/**
 * Wrapper object for the cat that the player controls. Contains:
 * - Cat animations
 * - Physics data
 * - Game state flags
 */

export class Player {
    /**
     * 
     * @param {PIXI.Point} position - spawn location, should be calculated during map generation
     * @param {Map<string, PIXI.AnimatedSprite} animationMap - all animations, already set up in the loader
     */
    constructor(position, animationMap, filterCache, screen) {
        // store most recent input for ledge climbing logic
        this.lastInput = null;
        this.prevTimeScale = 1.0;
        this.prevVel = 0.0
        this.animationContainer = new PIXI.Container();
        this.tintedTrail = new TintedTrail();
        this.animationContainer.filters = [this.tintedTrail];
        this.tintedTrail.cache = filterCache
        this.animationContainer.filterArea = screen;

        // physics variables
        this.position = new PIXI.Point(position.x, position.y);
        this.scale = 3.5;
        this.maxVel = 5;
        this.defaultMaxVel = 5;
        this.tripMaxVel = 6.5
        this.jumpVel = -25;
        this.defaultJumpVel = -25;
        this.tripJumpVel = -30;
        this.unScaledJumpVel = -25;
        this.xVel = 0;
        this.physicsCollisions = 0;

        // action flags
        this.isGrounded = false,
        this.inSlide = false,
        this.inSlowDown = false;
        this.jumpInput = false;
        this.isHanging = false;
        this.cameraSnapped = true;
        this.inWalkBox = false;
        this.bouncyBug = 0;

        // collision event timer
        this.collisionTimer = new MyTimer();
        this.wallJumpTimer = new MyTimer();
        this.lateJumpDuration = 225; // how many ms to give the player for a late jump when falling off a ledge
        this.fallDamageMS = 1500;
        this.grappleMS = 125;

        // acceleration linearly increases from 1.0 to 2.5 over the first 75 updates of falling
        this.fallDamageVel = 10; 
        this.idleFrameCount = 0;
        this.maxIdleFrames = 60;

        // help with ledge climbing
        this.climbTranslation = new PIXI.Point(0,0);
        this.cameraMovement = new PIXI.Point(0,0);

        // to check sprite flip conveniently
        this.flip = "left";

        // Key-value pairs of strings and animations
        this.animations = animationMap;
        this.currentAnimation = "none";

        // collider dimensions, set to the dimensions of the walk animation for now
        this.colliderWidth = this.animations.get("walk").width;
        this.colliderHeight = this.animations.get("walk").height; 

        this.body = new Bodies.rectangle(this.position.x, this.position.y, this.colliderWidth, this.colliderHeight, {
                                         density: 0.0005,
                                         frictionAir: 0.06,
                                         restitution: 0,
                                         friction: 0.01,
                                         inertia: Infinity,
                                         collisionFilter: {
                                         category: 0x0004}
                    }); 
        
        this.animations.forEach( animation => {
            this.animationContainer.addChild(animation)
        })
    }

    update(timescale){  
        if ( !this.isGrounded && this.body.velocity.y > 1 ){
            this.prevVel = this.body.velocity.y;
        }
        if ( this.wallJumpTimer.isRunning && this.wallJumpTimer.getElapsedTime() > this.grappleMS )  {
            // console.log( this.lastInput);
            if ( this.lastInput != "up"){
                this.handleEvent({ type: "inputDown",
                                direction: this.lastInput });
                this.wallJumpTimer.stop();
            }
        }     

        if ( this.currentAnimation == "stop" && !this.animations.get("stop").playing){
            this.setAnimation("idle");
        }
        else if ( this.currentAnimation == 'idle' && !this.animations.get("idle").playing){
            this.idleFrameCount++;
            if ( this.idleFrameCount > this.maxIdleFrames ){
                this.idleFrameCount = 0;
                this.setAnimation("idle", 0, true);
                this.maxIdleFrames = Math.random() * 200;
            }
        }    
    
        // transition from end of climb
        if ( this.currentAnimation == "climb"){
            if (this.lastInput != "end" && this.lastInput != this.flip && this.animations.get("climb").currentFrame < 4 ){
                console.log("climb cancel", this.lastInput);
                this.setAnimation("jump", 5);
                this.setFlip(this.lastInput);
                this.isGrounded = false;
                this.inSlide = false;
                this.jumpInput = false;     
                this.cameraSnapped = true;             
                Body.setStatic(this.body, false);  
                this.isHanging = false;

            }
            else if (!this.animations.get("climb").playing) {            
                Body.setPosition(this.body, Vector.create(this.climbTranslation.x, this.climbTranslation.y));
                Body.setVelocity(this.body, Vector.create(0,0));
                if (this.lastInput != this.flip){
                    this.lastInput = "end";
                }

                switch (this.lastInput){
                    case "right":
                        this.setAnimation("walk");
                        this.xVel = this.maxVel;
                        this.inSlowDown = false;
                        break;
                    case "left":
                        this.setAnimation("walk");
                        this.xVel = -this.maxVel;
                        this.inSlowDown = false;
                        break;
                    default:
                        this.setAnimation("stop");
                        this.inSlowDown = true;
                        break;
                }                
                this.lockCamera();

                if (!this.bouncyBug)
                    this.bouncyBug = 1;

                this.isGrounded = true;
                this.inSlide = false;
                this.jumpInput = false;
                this.isHanging = false;
                Body.setStatic(this.body, false);
            }
            
        }
        else // apply velocity from input
        {
            let yVel = this.body.velocity.y;
            if (this.inSlide && yVel >= 0) 
                yVel = this.wallFriction();

            Body.setVelocity(this.body, new Vector.create(this.xVel, yVel) );
        }

        // Move the sprites to follow their physicis body
        this.setPosition(this.body.position.x, this.body.position.y);

        // apply friction if needed
        if ( this.inSlowDown){
            this.slowVelocity();
        }
        
        // change animation speed with timescale
        if (timescale != this.prevTimeScale){
            this.animations.forEach(function (sprite) {
                if (timescale == 0.5)
                    sprite.animationSpeed *= 0.5;
                else
                    sprite.animationSpeed *= 2;
            })
            this.prevTimeScale = timescale;
        }

        // late jump system
        let fallAnimationTime = (this.lateJumpDuration/5) / timescale;
        let waitTime;
        if (this.inSlide){
            fallAnimationTime = fallAnimationTime / 2;
            waitTime = fallAnimationTime;
        }
        else
            waitTime = this.lateJumpDuration / timescale;

        if ( !this.inWalkBox && !this.isHanging && this.collisionTimer.isRunning && this.collisionTimer.getElapsedTime()  > fallAnimationTime ){
            this.setAnimation("jump", 5);
        }     
        if ( !this.isHanging && this.collisionTimer.isRunning && this.collisionTimer.getElapsedTime()  > waitTime ){
            this.collisionTimer.stop();
            this.isGrounded = false;
            this.inSlide = false;
            this.jumpInput = false;           
        }


    }

    // Move all sprites
    setPosition(ix,iy) {
        // move origin point
        this.position.x = ix;
        this.position.y = iy;
        
        // move animation sprites              
        this.animations.forEach(function (sprite) {
            sprite.x = ix;
            sprite.y = iy;
        })
    }

    // change active animation, play at given frame
    setAnimation(key, frame = 0, override = false) {
        // clear all previous animations
        if ( key != this.currentAnimation || override ){
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

    wallFriction(){
        const SLIDE_SPEED = 1;
        const INCREMENT = 0.5;
        let yVel = this.body.velocity.y;

        if ( yVel > SLIDE_SPEED )
            yVel -= INCREMENT * 0.5;
        else if ( yVel < SLIDE_SPEED )
            yVel += INCREMENT;

        return yVel;
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

    startLedgeClimb(ledgePosition, isRightLedge){
        this.inSlide = false;
        this.isGrounded = false;
        this.isHanging = true;
        this.setAnimation("climb"); 
        let xOffset = 40,   // how far away from the ledge we will anchor the cat
            yOffset = 0,
            xClimbOffset = -80,
            yClimbOffset = -52;
        if ( isRightLedge){
          this.setFlip("left");
        }  
        else{
          xOffset *= -1;
          xClimbOffset *= -1;
          this.setFlip("right");
        }
          
        // move the player to grab the ledge
        let hangPosition = Vector.create(ledgePosition.x + xOffset, ledgePosition.y + yOffset);
        Body.setStatic(this.body, true);
        Body.setVelocity(this.body, Vector.create(0, 0) );
        Body.setPosition(this.body, hangPosition);
        this.climbTranslation.set(hangPosition.x + xClimbOffset, hangPosition.y + yClimbOffset);
        this.getClimbDistance(this.climbTranslation.x, this.climbTranslation.y);
        this.cameraSnapped = false;
    }

    lockCamera(){
        this.cameraSnapped = true; 
    }

    handleEvent(event){
        switch(event.type){
            case "inputDown":
                // console.log(event.type, event.direction)
                switch(event.direction){
                    case "up":
                        // jump from ground
                        if ( this.isGrounded  ) {
                            Body.setVelocity(this.body, Vector.create(this.xVel, this.jumpVel) );
                            //Matter.Body.applyForce(this.body, {x: this.position.x, y: this.position.y}, {x: 0.0, y: -0.1})
                            this.setAnimation("jump", 0, true);
                            this.isGrounded = false;
                            this.jumpInput = true;
                            this.inSlide = false;
                        }
                        // jump from wall
                        else if ( this.inSlide ) {
                            this.wallJumpTimer.start();
                            // if right side of cat is in contact with wall
                            if ( this.flip == "right" ) {
                                this.setFlip("left");
                                this.xVel = -this.maxVel * 1.5;
                                Body.setVelocity(this.body, Vector.create(this.xVel, .85*this.jumpVel) );
                                this.setAnimation("jump", 0, true);
                                this.inSlide = false;
                                this.jumpInput = true;
                            }
                            // if left side of cat is in contact with wall
                            else if (this.flip == "left") {
                                this.setFlip("right");
                                this.xVel = this.maxVel * 1.5;
                                Body.setVelocity(this.body, Vector.create(this.xVel, .85*this.jumpVel) );
                                this.setAnimation("jump", 0, true);
                                this.inSlide = false;
                                this.jumpInput = true;
                            }    
                        }
                        break;
                    case "down":
                        break;
                    case "right":
                        if (this.isGrounded &&  this.physicsCollisions > 0)
                            this.setAnimation("walk");
                        this.setFlip("right");
                        this.inSlowDown = false;
                        this.xVel = this.maxVel;
                        this.lastInput = "right";
                        break;
                    case "left":
                        if (this.isGrounded &&  this.physicsCollisions > 0)
                            this.setAnimation("walk");
                        this.setFlip("left");
                        this.inSlowDown = false;
                        this.xVel = -this.maxVel;
                        this.lastInput = "left"
                        break;
                }
                break;
            case "inputUp":
                // console.log(event.type, event.direction)
                switch(event.direction){
                    case "up":
                        break;
                    case "down":
                        break;
                    case "right":
                        this.lastInput = "end"
                        if ( this.isGrounded && this.physicsCollisions > 0) {
                            this.setAnimation("stop");
                            this.xVel = 0;
                        }
                        else {
                            this.inSlowDown = true;
                        }
                        break;
                    case "left":
                        this.lastInput = "end";
                        if ( this.isGrounded && this.physicsCollisions > 0) {
                            this.setAnimation("stop");
                            this.xVel = 0;
                        }
                        else  {
                            this.inSlowDown = true;
                        }
                        break;
                }
                break;
        }
    }
};