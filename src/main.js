/*
  Written by Austin Bobco, September 2019

    This project is called "Catatonia". Originally designed to be a 2D Stealth/
  Platformer game. You play as a cat, trying to climb furniture while avoiding
  your owners' vision. This should run on all the major browsers ( Chrome, Firefox,
  Safari, IE/Edge, etc.. ) and should run cross platform on iOS, android, windows, mac, 
  and linux. Uses pixi.js for the WebGL/canvas rendering backend. 
  
  Dependencies:
    npm:        package manager
    webpack:    asset bundler
    pixi.js:    2D WebGL renderer
    matter.js:  2D physics engine 
    nipplejs:   virtual joysticks

  Bundling:
    Export settings are in the "webpack.config.js" file
    Build the app from the terminal with this command:
        npm run build

  Art:
      All art for this game was ripped from "Castlevania: Order of Ecclesia", a 
    Nintendo DS exclusive, originally released by Konami on October 21, 2008. If you like the
    art in this game, go support Konami and buy that game! 

    If you want to make your own project with sprites from this game, you can find them here:
      https://www.spriters-resource.com/ds_dsi/castlevaniaorderofecclesia/
*/

import Matter from 'matter-js/build/matter.min.js';
import {PixelateFilter} from '@pixi/filter-pixelate';

import {Player} from './player.js';
import {Controller, KBController} from './controller.js';
import {myLoader} from './myLoader';
import {MazeMap, CellularMap} from './mapGen.js';
import {ShadowMap} from './shadowMap.js';
import {MyTimer} from './myTimer.js'

//============================ Data =========================================//

// Aliases
  // pixi.js 
  let Application = PIXI.Application;

  // matter.js
  let Engine = Matter.Engine,
      World = Matter.World,
      Events = Matter.Events;

// Pixi application object
let app;

// Player Object
let catPlayer;
let collisionTimer = new MyTimer();

// Input
  // Joystick object
  let customJoystick;
  // Keyboard Controller
  let KBInput;

// Renderers
  // Geometry
  let playerColliderRenderer = new PIXI.Graphics(),
      lightBulbs = new PIXI.Graphics(); // geometry renderer

// Physics Engine
  // matterjs engine
  let catEngine = Engine.create(),
      catWorld = catEngine.world;

// procedural maze
let myMaze;

// for shadow masking
let allLights = new PIXI.Container();
//===========================================================================//

//============================ Setup ========================================//

// Create Pixi Application
InitPixi();

// load files, call the setup function, bind the calling context to this file's global scope
let customLoader = new myLoader(setup.bind(this));

// Set up the game after all files load 
function setup() {
  // apply blur filter to light sources
  lightBulbs.filters = [new PIXI.filters.BlurFilter()];

  // generate map, make game objects
  worldInit();

  // Joystick manager
  if ("ontouchstart" in document.documentElement) {
   // messageContent1 = 'Use the joystick to move';
    customJoystick = new Controller(catPlayer, catPlayer.body);
  }

  // Keyboard input manager
  KBInput = new KBController(catPlayer, catPlayer.body, app.ticker);

  // set up world events
  collisionEventSetup();
  window.addEventListener( 'resize', onWindowResize, false );
  preventScroll();  // stops joystick from scrolling page on mobile

  // Lock the camera to the cat's position 
  app.stage.position.set(app.screen.width/2, app.screen.height/2);﻿﻿
  
  // draw the static light
  myMaze.lights.forEach( (light) => {
    light.update(app.ticker.speed);
  });

  // Add objects to pixi stage
  initLayers();

  // lock frame rate at 60 fps max
  app.ticker.maxFPS = 60;
  app.stage.scale.set(0.5)

  // Start the game loop 
  app.ticker.add(delta => gameLoop(delta));   
}

// Should update every 16.66 ms
function gameLoop(delta){// delta is time in ms
  // react to player input
  catPlayer.update(app.ticker.speed);

  // update physics bodies
  Engine.update(catEngine, app.ticker.deltaMS)

  // Move stage origin to simulate camera movement
  if (catPlayer.cameraSnapped){
    app.stage.pivot.copyFrom(catPlayer.position);
  }
  else {
    app.stage.pivot.x += catPlayer.cameraMovement.x;
    app.stage.pivot.y += catPlayer.cameraMovement.y;
  }
  myMaze.parallaxScroll(app.stage.pivot, 1.2, 1.2);
}

//===========================================================================//

//==================== Helper Functions =====================================//

// Initialize Pixi Application
function InitPixi() {
    app = new Application({ 
      width: window.innerWidth, 
      height: window.innerHeight,                       
      antialias: true, 
      transparent: false, 
      resolution: 1,
      backgroundColor: 0x000000 ,
      autoDensity: true
    }
  );
  // Fit the canvas to the window
  app.renderer.view.style.position = "absolute";
  app.renderer.view.style.display = "block";
  // Add the canvas to the document
  document.getElementById('myCanvas').appendChild(app.view);
}

// Setup Collision Events
// NSFW SPAGHETTI CODE
function collisionEventSetup() {
  Events.on(catEngine, 'collisionActive', function(event) {
    var inWalkBox = false;
    var catCollision = false;
    var pairs = event.pairs;
  
    // Iterate through collision pairs
    for (var i = 0; i < pairs.length; i++) {

      let pair = pairs[i];
      let otherBody;
      // check if the collision involves the cat
      if ( pair.bodyA.id == catPlayer.body.id )
          otherBody = pair.bodyB;
      else if ( pair.bodyB.id == catPlayer.body.id )
          otherBody = pair.bodyA;

      // ignore collision if player not involved
      else continue;

      // check if collision with sensors
      if ( otherBody.isSensor ) {
        // if collding with a ledge climb trigger collider
        if ( otherBody.isEdgeBox) {
          catPlayer.startLedgeClimb(otherBody.position, otherBody.isRight)
            return; // skip the rest of the collision checks for this frame; the player will be locked in place
        }
        // if colliding with a ground trigger collider
        else if (!catPlayer.isHanging)
          inWalkBox = true;
      }
      else  {// Check if physics collision
        catPlayer.collisionTimer.stop();
        catCollision = true;
      }
          
    }
    // cat is sliding on a wall case
    if (!inWalkBox && catCollision && !catPlayer.isGrounded ) {
      catPlayer.xVel = 0;
      catPlayer.inSlide = true;
      if ( catPlayer.flip == "right"){
        var slideAnimation = catPlayer.animations.get("slide");
        slideAnimation.scale.x = -catPlayer.scale;
        slideAnimation.angle = -90;
        catPlayer.animations.set("slide", slideAnimation);
      }
      else if ( catPlayer.flip == "left"){
        var slideAnimation = catPlayer.animations.get("slide");
        slideAnimation.scale.x = -catPlayer.scale;
        slideAnimation.angle = 90;
        catPlayer.animations.set("slide", slideAnimation);
      }
      catPlayer.setAnimation("slide");
    }
    
    // if landing   
    else if ( !catPlayer.isGrounded && inWalkBox && catCollision )  {   
        catPlayer.isGrounded = true;
        catPlayer.inSlide = false;
        if ( catPlayer.xVel == 0 || catPlayer.inSlowDown )
          catPlayer.setAnimation("stop");
        else if ( !catPlayer.inSlowDown )
          catPlayer.setAnimation("walk");
      }
  });

  // start a timer if the player ends a collision with a physics collider
  Events.on(catEngine, 'collisionEnd', function(event) {
    let pairs = event.pairs;
    // Iterate through collision pairs
    for (var i = 0; i < pairs.length; i++) {
      let pair = pairs[i];
      let otherBody;
      // check if the collision involves the cat
      if ( pair.bodyA.id == catPlayer.body.id )
          otherBody = pair.bodyB;
      else if ( pair.bodyB.id == catPlayer.body.id )
          otherBody = pair.bodyA;

      if (!otherBody.isSensor) {
        catPlayer.collisionTimer.start();
      } 
    }
  });
}

// Generate game map, player object and
function worldInit() {
  // Init rot.js Eller maze
  // myMaze = new MazeMap(15,15, 150, customLoader.lightShader, lightBulbs);
  // rot.js cellular automata map
  myMaze = new CellularMap(25,25, 150, 6, customLoader.lightShader, lightBulbs, customLoader.tileset);

  // Contains player animations, physics bodies, flags, behavior functionsxc
  let playerPos = myMaze.playerSpawn
  catPlayer = new Player(playerPos, customLoader.catFrameMap, playerColliderRenderer);

  // Add player's rigidbody to matterjs world
  World.add(catWorld, catPlayer.body);
  
  // Add tile colliders to matterjs engine
  myMaze.terrain.forEach(function(element) {
      World.add(catWorld, element.Collider);
      if ( element.walkBox)
        World.add(catWorld, element.walkBox);

      World.add(catWorld, element.edgeBoxes)
  });
}

// Re-center camera
function onWindowResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // Lock the camera to the cat's position 
    app.stage.position.set(app.screen.width/2, app.screen.height/2);﻿﻿
    
   myMaze.lights.forEach( ( light ) => {
     light.update(app.ticker.speed);
     app.stage.addChild(light.lightContainer);
   });
}

// Prevent touch event scrolling on mobile
function preventScroll() {
  document.getElementById('myCanvas').ontouchend = (e) => {
    e.preventDefault();
  };
  document.getElementById('myCanvas').ontouchmove = (e) => {
    e.preventDefault();
  };
  document.getElementById('myCanvas').ontouchstart = (e) => {
    e.preventDefault();
  };
}

// add pixi objects to global renderer, 
// works like a stack, last element added = top graphics layer
function initLayers() {
  // tiling sprites
  // myMaze.backgroundContainer.filters = [new PixelateFilter(6)];
  app.stage.addChild(myMaze.backgroundContainer);
  app.stage.addChild(myMaze.midContainer);

    // Cat Animations
    catPlayer.animations.forEach(function(value, key){
      app.stage.addChild(value);  // add all animations to world
  });

  app.stage.addChild(myMaze.tileContainer);
  app.stage.addChild(myMaze.featureContainer);

  // light renderers
  app.stage.addChild(lightBulbs);
  myMaze.lights.forEach( (light) => {
    allLights.addChild(light.lightContainer);
  });
  app.stage.addChild(allLights);
  
  // makes a mask for shadows
  let shadowMap = new ShadowMap(myMaze.lights, myMaze, app.renderer);

  app.stage.addChild(shadowMap.focus);
  app.stage.addChild(shadowMap.mesh);

  app.stage.filters = [new PixelateFilter(3.5)];

  

}