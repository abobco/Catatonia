import Matter from 'matter-js/build/matter.min.js';
import {PixelateFilter} from '@pixi/filter-pixelate';

import { WangMap } from '../world_gen/WangMap.js';
import { CellularMap } from '../world_gen/CellularMap.js';
import { DebugMap } from '../world_gen/debugMap.js';

import {ParticleSystem} from '../physics/particle.js'

import {Player} from '../entities/player.js';
import { KBController, GamepadController} from '../entities/controller.js';
import {MyCamera} from '../entities/myCamera.js';
import {ButtonController} from '../entities/buttons.js';
import {PauseMenu} from '../entities/myMenu.js';
import {DissolveFilter} from '../filters/DissolveFilter.js';
import {CatnipTrip} from '../filters/catTripState.js'
import {PaletteSwapFilter} from '../filters/paletteSwap.js';
import {MyLoader} from './myLoader.js'
import { PointLight } from '../lighting/PointLight.js';
import { ShadowFilter } from '../filters/ShadowFilter.js';
import { FilterCache} from '../filters/TextureBuffer.js'
import {  Spectre } from '../entities/NPCs/spectre.js';


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
        // disable pixi's default linear interpolation
        PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; 

        this.app = app;
        this.filterCache = new FilterCache();       
        this.filterTicker = new PIXI.Ticker();
        this.filterTicker.add(this.filterCache.update.bind(this.filterCache));
        this.filterTicker.start();

        // display object containers        
        this.worldContainer = new PIXI.Container();        // every display object in the game world
        this.animationContainer = new PIXI.Container();    // every animated sprite in the game
        this.foregroundContainer = new PIXI.Container();   // objects with no parallax scroll
        this.backgroundContainer = new PIXI.Container();   // objects affected by parallax
        this.dynamicLightContainer = new PIXI.Container(); // torch that follows the player around

        this.cursor = new PIXI.Sprite.from( loader.cursor);
        this.cursor.visible = false;
        this.cursor.scale.set(0.125);
        this.mouseData = this.app.renderer.plugins.interaction.mouse;
        this.mouseDown = false;

        this.spectreTextures = loader.spectreTextures;    
     
        this.scale = 0.5; // zoom level of map

        // render texture/sprite for shadows
        this.lightRenderTexture = PIXI.RenderTexture.create(this.app.screen.width, this.app.screen.height);
        console.log("screen dimensions ", this.app.screen.width, this.app.screen.height)
        this.shadowFilter;
        this.dynamicLight = new PIXI.Sprite();
        this.dynamicLight.scale.set(1/this.scale);
        this.filterOffset = new PIXI.Point(0,0);
    
        // palette swap filter
        this.paletteIndex = 2;
        this.paletteSwap = new PaletteSwapFilter( loader.paletteTextures[this.paletteIndex] );

        // dissolve filter noise texture
        this.dissolveSprite = new PIXI.Sprite.from('https://res.cloudinary.com/dvxikybyi/image/upload/v1486634113/2yYayZk_vqsyzx.png');   
        this.dissolveSprite.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.REPEAT;
        this.dissolveSprite.scale.set(0.2);
        this.worldContainer.addChild(this.dissolveSprite);
        
        // physics Engine
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.updateLag = 0;

        this.particleSystem = new ParticleSystem()
        this.torchFrames = loader.torchFrames;

        // static dungeon map for debugging
        // this.tileMap = new DebugMap({
        //   wangImage: loader.wangPic,
        //   perlinNoise: loader.perlinNoise,
        //   tileset: loader.dungeonTextures, 
        //   torchFrames: loader.torchFrames
        // })

        // procedural dungeon map from herringbone wang tiles
        this.tileMap = new WangMap({
          w: 40,
          h: 40, 
          world: this.world,
          wangImage: loader.wangPic,
          perlinNoise: loader.perlinNoise,
          tileset: loader.dungeonTextures, 
          torchFrames: loader.torchFrames,
          spectreTextures: loader.spectreTextures,
          numLights: 2,    
          filterCache: this.filterCache,
          screen: this.app.screen,
          numSpectres: 6,
        });

        // procedural cave map from cellular automata
        // this.tileMap = new CellularMap({
        //   w: 35,
        //   h:35,
        //   tileset: loader.tileset, 
        //   torchFrames: loader.torchFrames,
        //   numLights: 5
        // })

        this.mouseData = this.app.renderer.plugins.interaction.mouse.global;

        // this.dynamicTorch = new PointLight(this.mouseData.x, this.mouseData.y, this.tileMap.edges, this.tileMap.vertices,
        //                                        loader.torchFrames);
   
        this.allLights = new PIXI.Container();

        // Contains player animations, physics bodies, flags, behavior functions
        let playerPos = this.tileMap.playerSpawn;
        this.player = new Player(playerPos, loader.catAnimations, this.filterCache, this.app.screen);
        console.log(this.player);

        // controls all catnip powerups/filters
        this.catnipTrip = new CatnipTrip(this.player, this.tileMap.powerups);

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
        this.GamepadInput = new GamepadController(this.player.handleEvent.bind(this.player), 
                                                  this.pauseMenu.handleEvent.bind(this.pauseMenu),
                                                  this.pauseMenu,
                                                  this.app.ticker);

        // keyboard
        this.KBInput = new KBController(this.player, this.player.body, this.app.ticker, this.camera, this.pauseMenu);

        // resize canvas on window resize
        window.addEventListener( 'resize', this.onWindowResize.bind(this), false );
        

        window.addEventListener("mousedown", () => {
          this.mouseDown = true;
        });
        window.addEventListener("mouseup", () => {
          this.mouseDown = false;
        });

        // game state changing collision events
        this.collisionEventSetup();

        this.app.stage.position.set(this.app.screen.width/2, this.app.screen.height/2);

        // draw the static light
        this.tileMap.lights.forEach( (light) => {
          light.update(this.app.ticker.speed);
        });
        // this.dynamicTorch.update(this.app.ticker.speed);

        // Add objects to pixi stage
        this.initLayers();

        this.app.stage.scale.set(this.scale);

        // Start the game loop 
        this.app.ticker.add(delta => this.loop(delta));  
    }

    /** 
     * main game loop, does not update at a constant rate */
    loop(delta){
      // get new cursor position for particle spawns
      let cursorWorldPosition = this.app.renderer.plugins.interaction.mouse.getLocalPosition(this.worldContainer);
      this.cursor.position.copyFrom(cursorWorldPosition);
     
        // update physics bodies at 60 hz constant
        this.FixedUpdate();
  
        this.GamepadInput.update();

        if ( this.catnipTrip.ticker.started)
          this.worldContainer.rotation = this.catnipTrip.cameraRotation;

        this.pauseMenu.moveButtons(this.camera.position);

        // adjust stage for camera movement
        this.app.stage.pivot.copyFrom(this.camera.position);
        this.app.stage.angle = this.camera.angleOffset;

        this.tileMap.parallaxScroll(this.app.stage.pivot);

        this.catnipTrip.update(delta); 

        this.updateShadows();
        this.particleSystem.drawParticles();

        this.tileMap.update();
    }

    FixedUpdate(){
      this.updateLag += this.app.ticker.deltaMS;
      while ( this.updateLag >= 16.666 ) {     
        // move forward one time step
        this.updateLag -= 16.666
        // apply player input to physics bodies
        this.player.update(this.app.ticker.speed);
        this.tileMap.FixedUpdate();
        if ( this.mouseDown){
          this.particleSystem.addParticle(this.cursor.position, this.world);
        }

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
        this.tileMap.lights.forEach( (light) => {
          //light.visionSource.mesh.shader.uniforms.time += 0.00003;
          light.visionSource.mesh.shader.uniforms.time += 0.003;
        });
        
        // update displacement filter for the catnip trip effect
        this.catnipTrip.FixedUpdate(this.player, 
                                   this.foregroundContainer.filters, 
                                   this.backgroundContainer.filters);  
      }
    }

    /**
     * Add pixi objects to global renderer, 
     * - Works like a stack, last element added = top graphics layer */ 
    initLayers() {
        // background / uninteractable tiles
        this.backgroundContainer.addChild(this.tileMap.backgroundContainer);
        this.worldContainer.addChild(this.backgroundContainer);
        this.dynamicLightContainer.addChild(this.dynamicLight);
        this.foregroundContainer.addChild(this.dynamicLightContainer)
        // add animations
        this.foregroundContainer.addChild(this.animationContainer);

        // add terrain tiles
        this.foregroundContainer.addChild(this.tileMap.tileContainer);
        this.foregroundContainer.addChild(this.tileMap.powerupContainer);
      
        this.tileMap.lights.forEach( (light) => {
          this.allLights.addChild(light.visionSource.mesh);
        });
        
        this.foregroundContainer.addChild(this.allLights);

        this.shadowFilter = new ShadowFilter(this.dynamicLight, 2);

        this.worldContainer.addChild(this.foregroundContainer);

        this.app.stage.addChild(this.worldContainer);

        // add ui buttons to the top layer
        this.app.stage.addChild(this.pauseMenu.buttonContainer);
        this.foregroundContainer.addChild(this.cursor);
        this.foregroundContainer.addChild(this.particleSystem.renderer);
        this.foregroundContainer.addChild(this.catnipTrip.foregroundNoise);
        this.foregroundContainer.addChild(this.catnipTrip.badFilterSolution);
        this.tileMap.backgroundContainer.addChild(this.catnipTrip.backgroundNoise);

        // apply filters to containers
        this.worldContainer.filterArea = this.app.screen;
        this.worldContainer.filters = [this.shadowFilter,new PixelateFilter(2.5) ];
    }

    /** 
     * - Creates a new WebGL mesh for the dynamic light
     * - Draws all the lights to a texture for the shadow filter */
    updateShadows(){

      this.filterOffset.set( -this.camera.position.x + this.app.screen.width, 
                            -this.camera.position.y + this.app.screen.height);

      this.dynamicLight.position.set(-this.filterOffset.x, -this.filterOffset.y);
    
      // camera offset
      let myMatrix = new PIXI.Matrix();
      myMatrix.tx = this.filterOffset.x*this.scale;
      myMatrix.ty = this.filterOffset.y*this.scale;
      myMatrix.a = this.scale;
      myMatrix.d = this.scale;
    
      // draw to shadow mask texture
      this.app.renderer.render(this.allLights, this.lightRenderTexture, true, myMatrix );

      for ( let spectre of this.tileMap.spectres ){
        this.app.renderer.render(spectre.lantern.light.visionSource.mesh, this.lightRenderTexture, false, myMatrix);
      }

      this.dynamicLight.texture = this.lightRenderTexture;
      this.shadowFilter.uniforms.lightSampler = this.lightRenderTexture;
    }

    /** NSFW Spaghetti code */ 
    collisionEventSetup() {
        Events.on(this.engine, 'collisionActive', (event) => {
          var inWalkBox = false;
          var catCollision = false;
          var pairs = event.pairs;
          var physicsCollisions = 0;
          
          let otherBody;
        
          // Iterate through collision pairs
          for (var i = 0; i < pairs.length; i++) {
      
            let pair = pairs[i];
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
                    otherBody.spriteReference.filters = [new DissolveFilter(this.dissolveSprite, 1)];
                    // this.tileMap.tileContainer.removeChild(otherBody.spriteReference);
                    console.log(otherBody.spriteReference)
                    
              }
                
            }
            else if (otherBody.isParticle){
              let vel = Matter.Vector.create( 25 - Math.random() * 50, -10);
              Matter.Body.setVelocity(otherBody, vel);
              otherBody.collisionFilter.mask = 0x0002 | 0x0001;
              otherBody.ticks = 0;
              console.log("particle collision");
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
          
          let otherBody;
          // Iterate through collision pairs
          for (var i = 0; i < pairs.length; i++) {
            let pair = pairs[i];
            // check if the collision involves the cat
            if ( pair.bodyA.id == this.player.body.id )
                otherBody = pair.bodyB;
            else if ( pair.bodyB.id == this.player.body.id )
                otherBody = pair.bodyA;
      
            if (otherBody && !otherBody.isSensor && !otherBody.isParticle) {
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
        this.player.animationContainer.filterArea = this.app.screen;
        this.filterCache.update();
        this.lightRenderTexture.resize(parent.clientWidth, parent.clientHeight)

        // this.filterCache = new FilterCache();       
        // this.filterTicker = new PIXI.Ticker();
        // this.filterTicker.add(this.filterCache.update.bind(this.filterCache));
        // this.filterTicker.start();
        // let filter = new Effect();
        // this.player.animationContainer.filters = [filter];
        // filter.cache = this.filterCache
        // this.player.animationContainer.filterArea = this.app.screen;
        // this.filterCache.clear();
        // this.filterCache.update();
        // this.filterCache.update();
          
        this.tileMap.lights.forEach( ( light ) => {
           light.update(this.app.ticker.speed);
           this.allLights.addChild(light.visionSource.mesh);
         });       

        this.pauseMenu.onResize();
    }
}