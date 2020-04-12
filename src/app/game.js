// physics engine
import {Engine, World, Events, Vector, Body} from 'matter-js/build/matter.min.js';
// wrapper for pixi.js loader
import {MyLoader} from './myLoader.js'
// selects maps
import {MapManager} from '../world_gen/MapManager.js'
// interactive ui
import { KBController, GamepadController} from '../entities/controller.js';
import {ButtonController} from '../entities/buttons.js';
// menu
import {PauseMenu} from '../entities/myMenu.js';
// cat player
import {Player} from '../entities/player.js';
import {MyCamera} from '../entities/myCamera.js';
// post processing filters
import {PixelateFilter} from '@pixi/filter-pixelate';
import {DissolveFilter} from '../graphics/filters/DissolveFilter.js';
import {CatnipTrip} from '../graphics/filters/catTripState.js'
import {PaletteSwapFilter} from '../graphics/filters/paletteSwap.js';
import { ShadowFilter } from '../graphics/filters/ShadowFilter.js';
import { FilterCache} from '../graphics/filters/TextureBuffer.js'

/**
 * Parent object for everything in the game
 * 
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

        // Pixi application object
        this.app = app;

        // physics Engine
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.updateLag = 0;

        // display object containers        
        this.worldContainer = new PIXI.Container();        // every display object in the game world
        this.animationContainer = new PIXI.Container();    // every animated sprite in the game
        this.foregroundContainer = new PIXI.Container();   // objects with no parallax scroll
        this.backgroundContainer = new PIXI.Container();   // objects affected by parallax
        this.dynamicLightContainer = new PIXI.Container(); // torch that follows the player around     
        this.staticLights = new PIXI.Container();
     
        this.scale = 0.5; // zoom level of map
        this.app.stage.scale.set(this.scale);

        this.initFilters(loader);

        let resources = {
          world: this.world,
          loader: loader,
          screen: this.app.screen,
          filterCache: this.filterCache
        }

        // static dungeon map for debugging
        this.tileMap = MapManager(resources, "wang");
        // draw the static light
        this.tileMap.lights.forEach( (light) => {
          light.update(this.app.ticker.speed);
        });

        // Contains player animations, physics bodies, flags, behavior functions
        this.player = new Player(this.tileMap.playerSpawn, loader.catAnimations, this.filterCache, this.app.screen);       
        this.camera = new MyCamera(this.player.position);

        // controls all catnip powerups/filters
        this.catnipTrip = new CatnipTrip(this.player, this.tileMap.powerups);

        // detect input hardware, init event handlers & UI elements
        this.initInput(loader);
  
        // add objects to physics world, setup collision events
        this.initPhysics();

        // resize canvas on window resize
        window.addEventListener( 'resize', this.onWindowResize.bind(this), false );

        this.app.stage.position.set(this.app.screen.width/2, this.app.screen.height/2);

        // Add objects to pixi stage
        this.initLayers();

        // Start the game loop 
        this.app.ticker.add(delta => this.loop(delta));  
    }

    /** 
     * main game loop, does not update at a constant rate */
    loop(delta){
        let prevPosition = Vector.create(this.camera.position.x, this.camera.position.y);
        // update physics bodies at 60 hz constant
        this.FixedUpdate();
        let frameMovement = Vector.sub(this.camera.position, prevPosition);
        this.updateUniforms(frameMovement);
  
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
     * - create post processing filters
     * - create necessary textures, sprites
     * @param {MyLoader} loader - custom file loader
     */
    initFilters(loader){
      // Filter manager for effects that use previous frame data
      this.filterCache = new FilterCache();       
      this.filterTicker = new PIXI.Ticker();
      this.filterTicker.add(this.filterCache.update.bind(this.filterCache));
      this.filterTicker.start();   

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
    }

    /**
     * Add pixi objects to global renderer, 
     * - Works like a stack, last element added = top graphics layer */ 
    initLayers() {       
        // fill the animation container
        this.tileMap.torchSprites.forEach( (animation) => {
          this.animationContainer.addChild(animation); // add torches
        });
        this.animationContainer.addChild(this.player.animationContainer);

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
          this.staticLights.addChild(light.visionSource.mesh);
        });
        
        this.foregroundContainer.addChild(this.staticLights);

        this.shadowFilter = new ShadowFilter(this.dynamicLight, 2);

        this.worldContainer.addChild(this.foregroundContainer);

        this.app.stage.addChild(this.worldContainer);

        // add ui buttons to the top layer
        this.app.stage.addChild(this.pauseMenu.buttonContainer);
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
      let viewTransform = new PIXI.Matrix();
      viewTransform.tx = this.filterOffset.x*this.scale;
      viewTransform.ty = this.filterOffset.y*this.scale;
      viewTransform.a = this.scale;
      viewTransform.d = this.scale;
    
      // draw to shadow mask texture
      this.app.renderer.render(this.staticLights, this.lightRenderTexture, true, viewTransform );

      this.app.renderer.render(this.tileMap.lightContainer, this.lightRenderTexture, false, viewTransform );

      this.dynamicLight.texture = this.lightRenderTexture;
      this.shadowFilter.uniforms.lightSampler = this.lightRenderTexture;
    }

    updateUniforms(frameMovement){
      this.tileMap.filter.uniforms.movement = [frameMovement.x*this.scale, frameMovement.y*this.scale];
      this.player.tintedTrail.uniforms.movement = this.tileMap.filter.uniforms.movement;
      this.player.tintedTrail.uniforms.alpha = this.catnipTrip.bezierY*0.6;
    }

    initPhysics(){
      // Add player's rigidbody to matterjs world
      World.add(this.world, this.player.body);

      // Add tile colliders to matterjs engine
      this.tileMap.terrain.forEach((element) => {
          World.add(this.world, element.Collider);
          if ( element.walkBox)
              World.add(this.world, element.walkBox);

          World.add(this.world, element.edgeBoxes)
      }); 

      // add catnip trigger colliders 
      this.tileMap.powerups.forEach( (powerup) => {
        World.add(this.world, powerup.collider);
      });

      // define collision event callbacks
      this.collisionEventSetup();
    }

    /** NSFW Spaghetti code */ 
    collisionEventSetup() {
      Events.on(this.engine, 'collisionActive', (event) => {
        var inWalkBox = false;
        var catCollision = false;
        var pairs = event.pairs;
        var physicsCollisions = 0;
        
        let otherBody;
        let terrainBodies = [];
      
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
                  // this.player.tintedTrail.uniforms.alpha = 0.9;
                  this.catnipTrip.start();
                  World.remove(this.world, otherBody);
                  otherBody.spriteReference.filters = [new DissolveFilter(this.dissolveSprite, 1)];
                  
            }
              
          }
          else if (otherBody.isParticle){
            let vel = Vector.create( 25 - Math.random() * 50, -10);
            Body.setVelocity(otherBody, vel);
            otherBody.collisionFilter.mask = 0x0002 | 0x0001;
            otherBody.ticks = 0;
          }
          else  {// if physics collision
            catCollision = true;
            physicsCollisions++;
            terrainBodies.push(otherBody);
          }            
        }

        this.player.physicsCollisions = physicsCollisions;

        // Handle collision cases 
        // cat is sliding on a wall
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

    initInput(loader){
      // pause menu ui elements
      this.pauseMenu = new PauseMenu( loader.menuButtons, 
        loader.paletteTextures,               
        this.player.position,                
        this.animationContainer,  
        this.paletteSwap.filter,  
        this.player.animationContainer,
        this.app.ticker, 
        this.catnipTrip.ticker);  

      this.buttonController = null;

      // touch controller
      if ( "ontouchstart" in document.documentElement ){
        this.buttonController = new ButtonController(loader.buttonFrames, 
                                this.player.position, 
                                this.player.handleEvent.bind(this.player), 
                                this.pauseMenu.handleEvent.bind(this.pauseMenu),
                                this.app.renderer.view
                                );
        this.pauseMenu.attachController(this.buttonController);
      }

      // gamepad controller
      this.GamepadInput = new GamepadController(this.player.handleEvent.bind(this.player), 
                        this.pauseMenu.handleEvent.bind(this.pauseMenu),
                        this.pauseMenu,
                        this.app.ticker);

      // keyboard
      this.KBInput = new KBController(this.player, this.player.body, this.app.ticker, this.camera, this.pauseMenu);

    }

    /** resize and center canvas */ 
    onWindowResize() {
        // Get canvas parent node
        const parent = this.app.view.parentNode;
        
        // Resize the renderer
        this.app.renderer.resize(parent.clientWidth, parent.clientHeight);
        // Lock the camera to the cat's position 
        this.app.stage.position.set(this.app.screen.width/2, this.app.screen.height/2);﻿﻿
        
        // resize shadow render texture
        this.lightRenderTexture.resize(parent.clientWidth, parent.clientHeight)
        
        // update static lights
        this.tileMap.lights.forEach( ( light ) => {
           light.update(this.app.ticker.speed);
           this.staticLights.addChild(light.visionSource.mesh);
         });     
        
        // resize old frames in the filtercache
        this.filterCache.entries.forEach( entry => {
          entry.texture.resize(parent.clientWidth, parent.clientHeight);
          entry.texture.filterFrame = this.app.screen;
        }) 

        // move ui elements
        this.pauseMenu.onResize();
    }
}