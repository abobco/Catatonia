import Matter from 'matter-js/build/matter.min.js';
import {PixelateFilter} from '@pixi/filter-pixelate';
import {ColorReplaceFilter} from '@pixi/filter-color-replace';

import { CellularMap } from "./mapGen";
import {Player} from './player.js';
import {Controller, KBController} from './controller.js';
import {ShadowMap} from './shadowMap.js';
import {MyCamera} from './myCamera.js';
import { PlayerButton, ButtonController} from './buttons.js';
import {PauseMenu} from './myMenu.js';

// Aliases
let Engine = Matter.Engine,
World = Matter.World,
Events = Matter.Events;

class Game {  
    constructor(loader, app){
      
        this.app = app;
        // every display object in the game world
        this.worldContainer = new PIXI.Container();

        // every animated sprite in the game
        this.animationContainer = new PIXI.Container();
        
        // physics Engine
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.updateLag = 0;

        // procedural cave generator
        this.tileMap = new CellularMap(25,25,150,6, loader.lightShader, loader.tileset, loader.torchFrames);
        this.allLights = new PIXI.Container();

        // Contains player animations, physics bodies, flags, behavior functionsxc
        let playerPos = this.tileMap.playerSpawn;
        this.player = new Player(playerPos, loader.catAnimations);

        // fill the animation container
        this.tileMap.torchSprites.forEach( (animation) => {
          this.animationContainer.addChild(animation); // add torches
        });
        // this.animationContainer.addChild(this.tileMap.torchContainer);
        this.player.animations.forEach((value) => {
          this.animationContainer.addChild(value);  // add player animations 
        });

        this.buttonController = null;
        if ( "ontouchstart" in document.documentElement )
          this.buttonController = new ButtonController(loader.buttonFrames, playerPos, this.player.handleEvent.bind(this.player));

        // pass the ticker and animation container to pause the game loop
        this.pauseMenu = new PauseMenu(loader.menuButtons, this.app.ticker, playerPos, this.buttonController, this.animationContainer);

        // camera movement control
        this.camera = new MyCamera(playerPos);

        // Add player's rigidbody to matterjs world
        World.add(this.world, this.player.body);

        // Add tile colliders to matterjs engine
        this.tileMap.terrain.forEach((element) => {
            World.add(this.world, element.Collider);
            if ( element.walkBox)
                World.add(this.world, element.walkBox);

            World.add(this.world, element.edgeBoxes)
        });
      

        // Input handlers
            // virtual joystick
        // if ("ontouchstart" in document.documentElement) {
        //     this.customJoystick = new Controller(this.player, this.player.body);
        // }
            // keyboard
        this.KBInput = new KBController(this.player, this.player.body, this.app.ticker, this.camera, this.pauseMenu);

        // resize canvas on window resize
        window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

        // game state changing collision events
        this.collisionEventSetup();

        this.app.stage.position.set(this.app.screen.width/2, this.app.screen.height/2);

        // draw the static light
        this.tileMap.lights.forEach( (light) => {
        light.update(this.app.ticker.speed);
        });

        // Add objects to pixi stage
        this.initLayers();

        this.app.stage.scale.set(0.5)

        // Start the game loop 
        this.app.ticker.add(delta => this.loop(delta));   
    }

    // main game loop, does not update at a constant rate
    loop(delta){
        // update physics bodies at 60 hz constant
        this.updateLag += this.app.ticker.deltaMS;
        while ( this.updateLag >= 16.666 ){
            // apply player input to physics bodies
            this.player.update(this.app.ticker.speed, delta, this.app.ticker.deltaMS);
            Engine.update(this.engine);
            if ( this.player.cameraSnapped)
                this.camera.update(this.player.position, this.player.flip, this.app.ticker.speed);
            else {
                  this.camera.update(this.player.climbTranslation, this.player.flip, this.app.ticker.speed);                
            }
            // increase gravity if player is falling
            if (!this.player.isGrounded && !this.player.inSlide && !this.player.isHanging && this.player.body.velocity.y > 0){
                if ( this.world.gravity.y < 3.5 )
                  this.world.gravity.y += 0.015;
            }
            else {
                this.world.gravity.y = 1;
            }
            // move forward one time step
            this.updateLag -= 16.666
            this.tileMap.lights.forEach( (light) => {
              light.lightContainer.children.forEach( ( mesh ) => {
              mesh.shader.uniforms.time += 0.00003;
              });
          });
        }

        this.pauseMenu.moveButtons(this.camera.position);
            
        // adjust stage for camera movement
        this.app.stage.pivot.copyFrom(this.camera.position);
        this.app.stage.angle = this.camera.angleOffset;

        this.tileMap.parallaxScroll(this.app.stage.pivot, 1.2, 1.2);

 
    }

    // add pixi objects to global renderer, 
    // works like a stack, last element added = top graphics layer
    initLayers() {
        // background / uninteractable tiles
        this.worldContainer.addChild(this.tileMap.backgroundContainer);
        this.worldContainer.addChild(this.tileMap.midContainer);
        
        // add terrain tiles
        this.worldContainer.addChild(this.tileMap.tileContainer);
        this.worldContainer.addChild(this.tileMap.featureContainer);

        // add animations
        this.worldContainer.addChild(this.animationContainer);
      
        this.tileMap.lights.forEach( (light) => {
          this.allLights.addChild(light.lightContainer);
        });
        
        this.worldContainer.addChild(this.allLights);
        
        // makes a mask for shadows
        let shadowMap = new ShadowMap(this.tileMap.lights, this.tileMap, this.app.renderer);
      
        this.worldContainer.addChild(shadowMap.focus);
        this.worldContainer.addChild(shadowMap.mesh);

        this.app.stage.addChild(this.worldContainer);

        // add ui buttons to the top layer
        this.app.stage.addChild(this.pauseMenu.buttonContainer);
        
        // apply filters
        let colorSwapper = new ColorReplaceFilter(0x181000, 0xffa252, 0.001);
        this.worldContainer.filters = [new PixelateFilter(3)];
        this.animationContainer.filters = [colorSwapper];
      }

    // NSFW Spaghetti code
    collisionEventSetup() {
        Events.on(this.engine, 'collisionActive', (event) => {
          var inWalkBox = false;
          var catCollision = false;
          var pairs = event.pairs;
          var physicsCollisions = 0;
        
          // Iterate through collision pairs
          for (var i = 0; i < pairs.length; i++) {
      
            let pair = pairs[i];
            let otherBody;
            // check if the collision involves the cat
            if ( pair.bodyA.id == this.player.body.id )
                otherBody = pair.bodyB;
            else if ( pair.bodyB.id == this.player.body.id )
                otherBody = pair.bodyA;
      
            // ignore collision if player not involved
            else continue;
      
            // check if collision with sensors
            if ( otherBody.isSensor ) {
              // if collding with a ledge climb trigger collider
              if ( otherBody.isEdgeBox ) {
                if ((this.player.lastInput == "right" && !otherBody.isRight) || this.player.lastInput == "left" && otherBody.isRight){
                  this.world.gravity.y = 1;
                  const impactVel = this.player.prevVel;
                  if (impactVel > this.player.fallDamageVel) 
                    this.camera.addTrauma(impactVel / (this.player.fallDamageVel * 2));
                  this.player.startLedgeClimb(otherBody.position, otherBody.isRight)
                  return; // skip the rest of the collision checks for this frame; the player will be locked in place
                }
                else {
                  inWalkBox = false;
                  this.player.isGrounded = false;
                  this.player.inSlide = true;
                }
              }
              // if colliding with a ground trigger collider
              else if (!this.player.isHanging)
                inWalkBox = true;
                
            }
            else  {// if physics collision
              this.player.collisionTimer.stop();
              catCollision = true;
              physicsCollisions++;
              // console.log(physicsCollisions);
            }
                
          }
          // cat is sliding on a wall case
          if (!inWalkBox && catCollision && !this.player.isGrounded ) {
            this.player.wallJumpTimer.stop();
            this.player.xVel = 0;
            this.player.inSlide = true;
            if ( this.player.flip == "right"){
              var slideAnimation = this.player.animations.get("slide");
              slideAnimation.scale.x = -this.player.scale;
              slideAnimation.angle = -90;
              this.player.animations.set("slide", slideAnimation);
            }
            else if ( this.player.flip == "left"){
              var slideAnimation = this.player.animations.get("slide");
              slideAnimation.scale.x = -this.player.scale;
              slideAnimation.angle = 90;
              this.player.animations.set("slide", slideAnimation);
            }
            this.player.setAnimation("slide");
          }
          
          // if landing   
          else if ( !this.player.isGrounded && ( (inWalkBox && catCollision && !this.player.inSlide) || (physicsCollisions >= 2 && inWalkBox ) ) )  {  
            this.world.gravity.y = 1;
            const impactVel = this.player.prevVel;
            if (impactVel > this.player.fallDamageVel) 
              this.camera.addTrauma(impactVel / (this.player.fallDamageVel * 2));
            this.player.prevVel = 0.0;
            this.player.isGrounded = true;
            this.player.inSlide = false;
            if ( this.player.xVel == 0 || this.player.inSlowDown )
              this.player.setAnimation("stop");
            else if ( !this.player.inSlowDown )
              this.player.setAnimation("walk");
            }
        });
      
        // start a timer if the player ends a collision with a physics collider
        Events.on(this.engine, 'collisionEnd', (event) => {
          let pairs = event.pairs;
          // Iterate through collision pairs
          for (var i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            let otherBody;
            // check if the collision involves the cat
            if ( pair.bodyA.id == this.player.body.id )
                otherBody = pair.bodyB;
            else if ( pair.bodyB.id == this.player.body.id )
                otherBody = pair.bodyA;
      
            if (!otherBody.isSensor) {
              this.player.collisionTimer.start();
              if (this.player.body.velocity.y < 0){
                this.player.setAnimation("jump", 5);
                this.player.collisionTimer.stop();
                this.player.isGrounded = false;
                this.player.inSlide = false;
                this.player.jumpInput = false;    
              }
            } 
          }
        });
    }

    // resize and center canvas
    onWindowResize() {
        // Get canvas parent node
        const parent = this.app.view.parentNode;
        
        // Resize the renderer
        this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
        //this.app.renderer.resize(window.innerWidth, window.innerHeight);
        // Lock the camera to the cat's position 
        this.app.stage.position.set(this.app.screen.width/2, this.app.screen.height/2);﻿﻿
          
        this.tileMap.lights.forEach( ( light ) => {
           light.update(this.app.ticker.speed);
           this.worldContainer.addChild(light.lightContainer);
         });       

        this.pauseMenu.onResize();
    }
}

export {Game}