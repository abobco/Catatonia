import {Engine, World, Events, Vector} from 'matter-js/build/matter.min.js';

export class CollisionEngine{
    constructor(player, camera, tileMap, worldContainer){
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.updateLag = 0;

        this.player = player;
        this.camera = camera;

        World.add(this.world, this.player.body);

        tileMap.terrain.forEach((tile) => {
            World.add(this.world, tile.Collider);
            if ( tile.walkBox)
                World.add(this.world, tile.walkBox);
  
            World.add(this.world, tile.edgeBoxes)
        }); 
  
        tileMap.powerups.forEach( (powerup) => {
          World.add(this.world, powerup.collider);
        });

        this.setCallbacks(worldContainer);
    }

    setCallbacks(){
        // perlin noise sprite for dissolve effect on powerup collisions
        this.dissolveSprite = new PIXI.Sprite.from('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');   
        this.dissolveSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        this.dissolveSprite.scale.set(0.2);
        worldContainer.addChild(this.dissolveSprite);

        this.onCollisionActive();
        this.onCollisionEnd();
    }
   
    // check if the collision involves the player
    checkCollisionPair(pair){
      if ( pair.bodyA.id == this.player.body.id )
        return pair.bodyB;
      else if ( pair.bodyB.id == this.player.body.id )
        return pair.bodyA;   
      else return null; 
    }

    onCollisionActive() {
      Events.on(this.engine, 'collisionActive', (event) => {
          let inWalkBox, catCollision = false;
          let pairs = event.pairs;
          let playerPhysCollisions = 0;             
          let terrainBodies = [];
        
          // Iterate through collision pairs
          for (var i = 0; i < pairs.length; i++) {    
            let otherBody = this.checkCollisionPair(pairs[i]);
            if (!otherBody)
              continue // ignore collision if player not involved
      
            // Handle sensor collisions
            if ( otherBody.isSensor ) {               
              if ( otherBody.isEdgeBox ) { // ledge climb trigger
                // if the player inputs in the direction of the ledge
                if ((this.player.lastInput == "right" && !otherBody.isRight) 
                    || this.player.lastInput == "left" && otherBody.isRight) 
                {
                  this.world.gravity.y = 1;
                  const impactVel = this.player.prevVel;
                  if (impactVel > this.player.fallDamageVel 
                    && this.pauseMenu.cameraShake) 
                    this.camera.addTrauma(impactVel / (this.player.fallDamageVel * 2));
                  this.player.startLedgeClimb(otherBody.position, otherBody.isRight)
                  return; // skip collision checks during ledge climb
                } else {  // when the player doesn't input towards the ledge
                  inWalkBox = false;
                  this.player.isGrounded = false;
                  this.player.inSlide = true;
                }
              } else if (!this.player.isHanging) // walkbox trigger
                inWalkBox = true;         
              if ( otherBody.isCatnip ){ // catnip trigger
                    this.foregroundContainer.filters = [this.catnipTrip.foregroundFilter];
                    this.tileMap.backgroundContainer.filters = 
                      [this.catnipTrip.backgroundFilter];
                    this.catnipTrip.start();
                    World.remove(this.world, otherBody);
                    otherBody.spriteReference.filters = 
                      [new DissolveFilter(this.dissolveSprite, 1)];                     
              }     
            }

            // Handle rigidbody-particle collisions
            else if (otherBody.isParticle){
              // shoot the particle in a random direction
              let vel = Vector.create( 25 - Math.random() * 50, -10);
              Body.setVelocity(otherBody, vel);
              // tell the particle to temporarily ignore collisions with rigidbodies
              otherBody.collisionFilter.mask = 0x0002 | 0x0001;
              otherBody.ticks = 0;  // reset collision filter timer
            }
            // Accumulate rigidbody-terrain collisions
            else  {
              catCollision = true;
              playerPhysCollisions++;
              terrainBodies.push(otherBody);
            }            
          }

          // Handle rigidbody-terrain collision cases 
          this.player.physicsCollisions = playerPhysCollisions;
          
          // cat is sliding on a wall case
          if ( catCollision && !inWalkBox && !this.player.isGrounded){ 
            this.player.wallJumpTimer.stop();
            this.player.inSlide = true;
            let slideAnimation = this.player.animations.get("slide");
            
            if ( this.player.xVel > 0){
              this.player.setFlip("right");
              slideAnimation.scale.x = -this.player.scale;
              slideAnimation.angle = -90;
              this.player.animations.set("slide", slideAnimation);
            }
            else if ( this.player.xVel < 0 ){
              this.player.setFlip("left");
              slideAnimation.scale.x = -this.player.scale;
              slideAnimation.angle = 90;
              this.player.animations.set("slide", slideAnimation);
            }
            else if ( this.player.flip == "right") {
              slideAnimation.scale.x = -this.player.scale;
              slideAnimation.angle = -90;
              this.player.animations.set("slide", slideAnimation);
            }
            else if ( this.player.flip == "left"){
              slideAnimation.scale.x = -this.player.scale;
              slideAnimation.angle = 90;
              this.player.animations.set("slide", slideAnimation);
            }
            this.player.xVel = 0;
            this.player.setAnimation("slide");
          }
          
          // if landing   
          else if ( !this.player.isGrounded && 
            ( (inWalkBox && catCollision && !this.player.inSlide) || (physicsCollisions >= 2 && inWalkBox ) ) )  {  
            this.world.gravity.y = 1;
            const impactVel = this.player.prevVel;
            if (impactVel > this.player.fallDamageVel && this.pauseMenu.cameraShake) 
              this.camera.addTrauma(impactVel / (this.player.fallDamageVel * 2));
            this.player.prevVel = 0.0;
            this.player.isGrounded = true;
            this.player.inSlide = false;
            if ( this.player.xVel == 0 || this.player.inSlowDown )
              this.player.setAnimation("stop");
            else if ( !this.player.inSlowDown )
              this.player.setAnimation("walk");
          }

            this.player.inWalkBox = inWalkBox;
      });
    }

    onCollisionEnd(){
      // start a timer if the player ends a collision with a physics collider
      Events.on(this.engine, 'collisionEnd', (event) => {
        let pairs = event.pairs;
        
        let otherBody;
        // Iterate through collision pairs
        for (var i = 0; i < pairs.length; i++) {
          let otherBody = this.checkCollisionPair(pairs[i]);
    
          if (otherBody && !otherBody.isSensor && this.player.physicsCollisions == 0) {
              this.player.collisionTimer.start();

              // if the player jumps or slides upwards off a wall
              if (this.player.body.velocity.y < 0 ){
                this.player.setAnimation("jump", 5); 
                this.player.collisionTimer.stop();
                this.player.isGrounded = false;
                this.player.inSlide = false;
                this.player.jumpInput = false;    
              }
              // if the player falls
              else if (this.player.body.velocity.y > 0 ){
                // apply velocity from input when the player slides off a wall
                if (this.buttonController){
                  if ( this.buttonController.buttons.get("right").pressed)
                    this.player.xVel = this.player.maxVel;
                  else if ( this.buttonController.buttons.get("left").pressed)
                    this.player.xVel = -this.player.maxVel;
                }
                else {
                  if ( this.player.lastInput == "right")
                    this.player.xVel = this.player.maxVel;
                  else if ( this.player.lastInput == "left")
                  this.player.xVel = -this.player.maxVel;
                }
                
                
              }
          }
        } 
          
      });
    }
}