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

import {Player} from './player.js';
import {Controller, KBController} from './controller.js';
import {myLoader} from './myLoader';
import {MazeMap, CellularMap} from './mapGen.js';

//============================ Data =========================================//

// Aliases
  // pixi.js 
  let Application = PIXI.Application;

  // matter.js
  let Engine = Matter.Engine,
      Runner = Matter.Runner,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Vector = Matter.Vector,
      Events = Matter.Events;

// Pixi application object
let app;

// Player Object
let catPlayer;

// Input
  // Joystick object
  let customJoystick;
  // Keyboard Controller
  let KBInput;

// Renderers
  // Geometry
  let playerColliderRenderer = new PIXI.Graphics(),
      lightBulbs = new PIXI.Graphics(), // geometry renderer
      shadowGraphics = new PIXI.Graphics();

// Physics Engine
  // matterjs engine
  let catEngine = Engine.create(),
      catWorld = catEngine.world;

// procedural maze
let myMaze;
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
    messageContent1 = 'Use the joystick to move';
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

// Updates every 16.66 ms
function gameLoop(delta){// delta is in ms
  // clear and redraw light sources
  lightBulbs.clear();
  myMaze.lights.forEach( (light) => {
    light.visionSource.show(lightBulbs);
  });
  
  // move player sprites & physics body from input
  catPlayer.update(app.ticker.speed);

  // update physics bodies
  Engine.update(catEngine, app.ticker.deltaMS)

  // Move stage origin to simulate camera movement
  if (catPlayer.cameraSnapped)
    app.stage.pivot.copyFrom(catPlayer.position);
  else {
    app.stage.pivot.x += catPlayer.cameraMovement.x;
    app.stage.pivot.y += catPlayer.cameraMovement.y;
  }
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
      backgroundColor: 0x3b3836,
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
      let otherBodyTemp;
      // check if the collision involves the cat
      if ( pair.bodyA.id == catPlayer.body.id )
          otherBodyTemp = pair.bodyB;
      else if ( pair.bodyB.id == catPlayer.body.id )
          otherBodyTemp = pair.bodyA;

      // go to next pair if cat not involved
      else continue;

      // check if collision with sensors
      if ( otherBodyTemp.isSensor ) {
        // if collding with a ledge grab trigger collider
        if ( otherBodyTemp.isEdgeBox) {
          console.log("edgeBox collision");
         //if (catPlayer.currentAnimation != 'climb') {
            catPlayer.inSlide = false;
            catPlayer.isGrounded = false;
            catPlayer.isHanging = true;
            catPlayer.setAnimation("climb"); 
            let xOffset = 35,   // how far away from the ledge we will anchor the cat
                yOffset = 0,
                xClimbOffset = -60,
                yClimbOffset = -48;
            if ( otherBodyTemp.isRight){
              catPlayer.setFlip("left");
            }  
            else{
              xOffset *= -1;
              xClimbOffset *= -1;
              catPlayer.setFlip("right");
            }
              
            // move the player to grab the ledge
            Matter.Body.setStatic(catPlayer.body, true);
            Matter.Body.setVelocity(catPlayer.body, new Vector.create(0, 0) );
            Matter.Body.setPosition(catPlayer.body, new Vector.create(otherBodyTemp.position.x + xOffset, otherBodyTemp.position.y + yOffset));
            catPlayer.climbTranslation.set(otherBodyTemp.position.x + xOffset + xClimbOffset, otherBodyTemp.position.y + yOffset + yClimbOffset);
            catPlayer.getClimbDistance(catPlayer.climbTranslation.x, catPlayer.climbTranslation.y);
            catPlayer.cameraSnapped = false;
            return; // the player body will be static for the next few frames, no more collision checks are neccessary
            
        // }     
        }
        else if (!catPlayer.isHanging)
          inWalkBox = true;
      }
          
      else // Check if physics collision
          catCollision = true;
    }
    // cat is sliding on a wall case
    if (!inWalkBox && catCollision && !catPlayer.isGrounded ) {
      catPlayer.xVel = 0;
      //console.log('this triggers');
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
  Events.on(catEngine, 'collisionEnd', function(event) {
      catPlayer.isGrounded = false;
      catPlayer.inSlide = false;
      catPlayer.jumpInput = false;    
  });
  // Events.on(catEngine, 'beforeUpdate', function(event) {
  //   if ( catPlayer.body.velocity.y == 0 && catPlayer.inSlide ) {
  //     catPlayer.inSlide = false;
  //     catPlayer.isGrounded = true;
  //     catPlayer.setAnimation("stop");
  //   }
  // });
}

// Generate game map, player object and
function worldInit() {
  // Init rot.js Eller maze
  // myMaze = new MazeMap(15,15, 150, customLoader.lightShader, lightBulbs);
  // rot.js cellular automata map
  myMaze = new CellularMap(30,30, 150, 6, customLoader.lightShader, lightBulbs, customLoader.tileset);

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
  app.stage.addChild(myMaze.tileContainer);

  // Cat Animations
  catPlayer.animations.forEach(function(value, key){
      app.stage.addChild(value);  // add all animations to world
  });
  // Shadow renderer
  app.stage.addChild(shadowGraphics); 

  // light renderers
  app.stage.addChild(lightBulbs);
  myMaze.lights.forEach( (light) => {
    app.stage.addChild(light.lightContainer);
  });

}