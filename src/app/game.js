import Matter from 'matter-js/build/matter.min.js';
import {PixelateFilter} from '@pixi/filter-pixelate';

import { CellularMap, WangMap } from "../entities/mapGen.js";
import {Player} from '../entities/player.js';
import { KBController} from '../entities/controller.js';
import {ShadowMap} from '../lighting/shadowMap.js';
import {MyCamera} from '../entities/myCamera.js';
import {ButtonController} from '../entities/buttons.js';
import {PauseMenu} from '../entities/myMenu.js';
import {DissolveFilter} from '../filters/DissolveFilter.js';
import {CatnipTrip} from '../filters/catTripState.js'
import {PaletteSwapFilter} from '../filters/paletteSwap.js';
import {MyLoader} from './myLoader.js'

// Aliases
let Engine = Matter.Engine,
World = Matter.World,
Events = Matter.Events;

/**
 * Parent object for everything in the game
 * @class
 */
export class Game {  
    /**
      * @param {MyLoader} loader - custom loader object
      * @param {PIXI.Application} app - pixi application
    **/
    constructor(loader, app){

        PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; 

        this.app = app;
        // display object containers        
        this.worldContainer = new PIXI.Container();      // every display object in the game world
        this.animationContainer = new PIXI.Container();  // every animated sprite in the game
        this.foregroundContainer = new PIXI.Container(); // objects with no parallax scroll
        this.backgroundContainer = new PIXI.Container(); // objects affected by parallax
        this.pauseMusic = loader.pauseMusic;

        // palette swap filter
        this.paletteIndex = 2;
        this.paletteSwap = new PaletteSwapFilter(loader.paletteFrag, loader.paletteTextures[this.paletteIndex] );

        // dissolve effect shader
        this.dissolveSprite = new PIXI.Sprite.from('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');   
        this.dissolveSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        this.dissolveSprite.scale.set(0.2);
        this.dissolveShader = loader.dissolveShader;
        this.bezierDisplacementShader = loader.displacementShader;
        this.worldContainer.addChild(this.dissolveSprite);
        
        // physics Engine
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.updateLag = 0;

        // procedural cave generator
         
        // this.tileMap = new MazeMap(25,25,150,6, loader.lightShader, loader.tileset, loader.torchFrames);
        this.tileMap = new CellularMap(25,25,150,6, loader.lightShader, loader.tileset, loader.torchFrames);
         //this.tileMap = new WangMap(32, 32, loader.wangPic, 120,6, loader.lightShader, loader.dungeonTextures, loader.torchFrames, loader.perlinNoise)

        this.allLights = new PIXI.Container();

        // Contains player animations, physics bodies, flags, behavior functionsxc
        let playerPos = this.tileMap.playerSpawn;
        this.player = new Player(playerPos, loader.catAnimations);
        console.log(this.player);

        // controls all catnip powerups/filters
        this.catnipTrip = new CatnipTrip(this.bezierDisplacementShader, this.player, this.tileMap.powerups);

        // fill the animation container
        this.tileMap.torchSprites.forEach( (animation) => {
          this.animationContainer.addChild(animation); // add torches
        });
        this.animationContainer.addChild(this.player.animationContainer);

        // Add player's rigidbody to matterjs world
        World.add(this.world, this.player.body);

        // Add tile colliders to matterjs engine
        this.tileMap.terrain.forEach((element) => {
            World.add(this.world, element.Collider);
            if ( element.walkBox)
                World.add(this.world, element.walkBox);

            World.add(this.world, element.edgeBoxes)
        }); 

        this.tileMap.powerups.forEach( (powerup) => {
          World.add(this.world, powerup.collider);
          //console.log(powerup.collider);
        });

        // camera movement control
        this.camera = new MyCamera(playerPos);

        this.pauseMenu = new PauseMenu( loader.menuButtons, 
                                        loader.paletteTextures,               
                                        playerPos,                
                                        this.animationContainer,  
                                        this.paletteSwap.filter,  
                                        this.player.animationContainer,
                                        this.app.ticker, 
                                        this.catnipTrip.ticker);  

        this.buttonController = null;
        if ( "ontouchstart" in document.documentElement ){
          this.buttonController = new ButtonController(loader.buttonFrames, 
                                                        this.player.position, 
                                                        this.player.handleEvent.bind(this.player), 
                                                        this.pauseMenu.handleEvent.bind(this.pauseMenu),
                                                        this.app.renderer.view
                                                        );
          this.pauseMenu.attachController(this.buttonController);
        }

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

        this.app.stage.scale.set(0.5);

        // Start the game loop 
        this.app.ticker.add(delta => this.loop(delta));   
    }

    // main game loop, does not update at a constant rate
    loop(delta){
        // update physics bodies at 60 hz constant
        this.FixedUpdate();

        if ( this.catnipTrip.ticker.started)
          this.worldContainer.rotation = this.catnipTrip.cameraRotation;

        this.pauseMenu.moveButtons(this.camera.position);
            
        // adjust stage for camera movement
        this.app.stage.pivot.copyFrom(this.camera.position);
        this.app.stage.angle = this.camera.angleOffset;

        //this.tileMap.parallaxScroll(this.app.stage.pivot, 1.2, 1.2);
        this.tileMap.parallaxScroll(this.app.stage.pivot);

        this.catnipTrip.update(delta);
    }

    FixedUpdate(){
      this.updateLag += this.app.ticker.deltaMS;
      while ( this.updateLag >= 16.666 ){
          // apply player input to physics bodies
          this.player.update(this.app.ticker.speed);
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
        
        // update catnip trip effect
        this.catnipTrip.FixedUpdate(this.player, 
                                   this.foregroundContainer.filters, 
                                   this.backgroundContainer.filters,
                                   );
        
      }
    }

    /**
     * Add pixi objects to global renderer, 
     * - Works like a stack, last element added = top graphics layer
    */ 
    initLayers() {
        // background / uninteractable tiles
        this.backgroundContainer.addChild(this.tileMap.backgroundContainer);
        this.worldContainer.addChild(this.backgroundContainer);

        // add animations
        this.foregroundContainer.addChild(this.animationContainer);

        // add terrain tiles
        this.foregroundContainer.addChild(this.tileMap.tileContainer);
      
        this.tileMap.lights.forEach( (light) => {
          this.allLights.addChild(light.lightContainer);
        });
        
        this.foregroundContainer.addChild(this.allLights);
        
        // makes a mask for shadows
        let shadowMap = new ShadowMap(this.tileMap.lights, this.tileMap, this.app.renderer);
      
        this.foregroundContainer.addChild(shadowMap.focus);
        this.foregroundContainer.addChild(shadowMap.mesh);

        this.worldContainer.addChild(this.foregroundContainer);

        this.app.stage.addChild(this.worldContainer);

        // add ui buttons to the top layer
        this.app.stage.addChild(this.pauseMenu.buttonContainer);
        
        this.foregroundContainer.addChild(this.catnipTrip.foregroundNoise);
        this.foregroundContainer.addChild(this.catnipTrip.badFilterSolution);
        this.tileMap.backgroundContainer.addChild(this.catnipTrip.backgroundNoise);

        // apply filters to containers
        this.worldContainer.filters = [new PixelateFilter(3)];
      }

    /** NSFW Spaghetti code */ 
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
                  if (impactVel > this.player.fallDamageVel && this.pauseMenu.cameraShake) 
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
              
            if ( otherBody.isCatnip ){
                  this.foregroundContainer.filters = [this.catnipTrip.foregroundFilter];
                  this.tileMap.backgroundContainer.filters = [this.catnipTrip.backgroundFilter];
                  this.catnipTrip.start();
                  World.remove(this.world, otherBody);
                  otherBody.spriteReference.filters = [new DissolveFilter(this.dissolveSprite, this.dissolveShader, 1)];
                  // this.tileMap.tileContainer.removeChild(otherBody.spriteReference);
                  console.log(otherBody.spriteReference)
                  
            }
                
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
              else {
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

    /** resize and center canvas */ 
    onWindowResize() {
      console.log("resize")
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