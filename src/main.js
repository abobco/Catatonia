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
import {Terrain} from './terrain.js';
import {Controller, KBController} from './controller.js';
import {PointLight} from './PointLight.js';
import {myLoader} from './myLoader';

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
  let Erector = new PIXI.Graphics();
  let playerColliderRenderer = new PIXI.Graphics();
  let uniforms;
  // Text boxes
  let messageRect1 = new PIXI.Graphics(),
      messageRenderer1 = new PIXI.Graphics(),
      messageContent1 = "Use the arrow keys to move"
  // Hud renders 
  let HudRect = new PIXI.Graphics(),
      HudRenderer = new PIXI.Text(),
      HudContent = "Bugs Found:";

// Physics Engine
  // matterjs engine
  let catEngine = Engine.create(),
      catWorld = catEngine.world;
      // catRunner = Runner.create();
      
  // Terrain colliders
  let terrain = new Array(),
      platform,
      platforms = new Array();
  // raycaster
  let bakedLight, // baked lighting
      movingLight,  // dynamic lighting
      castSegments = [],  // array of line segments
      endPoints = [],   // array of vertices
      lightBulbs = new PIXI.Graphics(), // geometry renderer
      shadowGraphics = new PIXI.Graphics();

// Debug minigame flags
let BugsFound = 0,
    bouncyBug = false,
    windowSizeBug = false;

//===========================================================================//

//============================ Setup ========================================//

// Create Pixi Application
InitPixi();

// load files, call the setup function, bind the calling context to this file's global scope
let customLoader = new myLoader(setup.bind(this));

// Set up the game after all files load 
function setup() {

  // Contains player animations, physics bodies, flags, behavior functions
  let playerPos = new PIXI.Point(app.screen.width/2, app.screen.height/2);
  catPlayer = new Player(playerPos, customLoader.catFrameMap);

  // apply blur filter to light sources
  lightBulbs.filters = [new PIXI.filters.BlurFilter()];

  // Start the physics engine
  matterSetUp();

  // Joystick manager
  if ("ontouchstart" in document.documentElement) {
    messageContent1 = 'Use the joystick to move';
    customJoystick = new Controller(catPlayer, catPlayer.body);
  }

  // Keyboard input manager
  KBInput = new KBController(catPlayer, catPlayer.body);

  // Add objects to Pixi world
  // Terrain
  terrain.forEach(function (value) {
    value.drawRect(Erector);
  });

  // Init world events
  collisionEventSetup();
  window.addEventListener( 'resize', onWindowResize, false );
  preventScroll();  // stops joystick from scrolling page on mobile

  // Lock the camera to the cat's position 
  app.stage.position.set(app.screen.width/2, app.screen.height/2);﻿﻿
  
  // draw the static light
  bakedLight.update();

  // Add objects to pixi stage
  initLayers();

  // Start the game loop 
  app.ticker.add(delta => gameLoop(delta)); 

}

// Updates every 16.66 ms
function gameLoop(delta){// delta is in ms
  // clear and redraw light sources
  lightBulbs.clear();
  bakedLight.visionSource.show(lightBulbs);
  
  // move player sprites & physics body from input
  catPlayer.update();

  Engine.update(catEngine, app.ticker.deltaMS)
  console.log(app.ticker.deltaMS);

  // Move stage origin to simulate camera movement
  if (catPlayer.cameraSnapped)
    app.stage.pivot.copyFrom(catPlayer.position);
  else {
    app.stage.pivot.x += catPlayer.cameraMovement.x;
    app.stage.pivot.y += catPlayer.cameraMovement.y;
  }
  // console.log(catPlayer.cameraSnapped)

  // move the dynamic light, update and draw its rays
  if ( movingLight.pos.x < platform.x - 800) 
    movingLight.vel = 1.5;
  else if ( movingLight.pos.x > platform.x - 300) 
    movingLight.vel = -1.5;

  movingLight.update();
  // add the dynamic light to the pixi application, cuz it gets deleted every frame
  app.stage.addChild(movingLight.lightContainer); 

  checkBugs();  // mainly a joke for QA testers

  drawHud();
  // catPlayer.drawCollider(playerColliderRenderer);
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

    uniforms = {
    dimensions:   [app.renderer.screen.width, app.renderer.screen.height] 
  };

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
         // console.log("edgeBox collision");
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

// Physics engine setup
function matterSetUp() {
    // Run matterjs engine
    // Runner.run(catRunner, catEngine);
    // Engine.run(catEngine);
    

    // Add the player's rigidbody
    World.add(catWorld, catPlayer.body);

    // Initialize terrain
    // would like to replace this code with a visual editor or procedural generation code
    platform = new Terrain(window.innerWidth / 2, window.innerHeight * .8, 800, 50 )
    platforms.push(platform);

    platforms.push(new Terrain(platform.x - 800, platform.y - 75 , 800, 200));
    platforms.push(new Terrain(platform.x + 400, platform.y - 225 , 50, 500));
    //platforms.push(new Terrain(platform.x - 800, platform.y - 75, 600, 200));
    platforms.push(new Terrain(platform.x + 25, platform.y - 475, 800, 50));

    // platforms.push(new Terrain(platform.x - 250, platform.y - 275, 50, 350));

    platforms.push(new Terrain(platform.x + 100, platform.y - 250, 75, 50));
    platforms.push(new Terrain(platform.x - 125, platform.y - 275, 75, 50));
    platforms.push(new Terrain(platform.x + 225, platform.y - 125, 75, 50));

    platforms.push(new Terrain(platform.x - 700, platform.y - 475, 700, 50));
    platforms.push(new Terrain(platform.x - 500, platform.y - 325, 100, 50));
    platforms.push(new Terrain(platform.x - 700, platform.y - 325, 100, 50));
    platforms.push(new Terrain(platform.x - 1000, platform.y - 325, 50, 500));
    
    // Add terrain to matterjs engine
    platforms.forEach(function(element) {
        World.add(catWorld, element.Collider);
        World.add(catWorld, element.walkBox);
        for (let edgeBox of element.edgeBoxes){
          World.add(catWorld, edgeBox);
        }
        element.drawRect(Erector); 
    });

    // Push all terrain vertices to an array for raycasting
    platforms.forEach( function(rectangle) {
      rectangle.bounds.forEach( function(bound) {
        castSegments.push(bound);
      });
      endPoints.push(rectangle.A);
      endPoints.push(rectangle.B);
      endPoints.push(rectangle.C);
      endPoints.push(rectangle.D);
    });

    // Initialize Lights
    bakedLight = new PointLight(platform.x + 25, platform.y - 420, platforms, castSegments, endPoints, customLoader.lightShader, lightBulbs);
    movingLight = new PointLight(platform.x - 500, platform.y - 420, platforms, castSegments, endPoints, customLoader.lightShader, lightBulbs); 
    
   // catEngine.world = catWorld;
}

// Re-center camera
function onWindowResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // Lock the camera to the cat's position 
    app.stage.position.set(app.screen.width/2, app.screen.height/2);﻿﻿

    bakedLight.update();
    app.stage.addChild(bakedLight.lightContainer); 
    if (!windowSizeBug){
      BugsFound++;
      windowSizeBug = true;
    }
    
}

// Draw text box
function textBox(x,y,w,h, content, mRenderer, TextRectangle) {
  // font style
  let style = new PIXI.TextStyle({
    fill: "white",
    fontSize: 18,
  })
  // box border style
  TextRectangle.lineStyle(2, 0xFF00FF, 1);
  TextRectangle.beginFill(0x650A5A); // fill color
  TextRectangle.drawRoundedRect(x, y, w, h, 16);
  TextRectangle.endFill();
  mRenderer = new PIXI.Text(content, style);
  mRenderer.position.set(x+10, y+10);
  app.stage.addChild(TextRectangle);
  app.stage.addChild(mRenderer);

  return mRenderer;
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

// draw rectangle primitives
function pDrawRect(renderer, x, y, w, h, color, alpha) {

  renderer.beginFill(color, alpha);
  renderer.drawRect(x - (w/2) , y - (h/2) -1, w , h );
  renderer.endFill();

}

// add pixi objects to global renderer, 
// works like a stack, last element added = top graphics layer
function initLayers() {

  // Textboxes 
  textBox(platform.x - 140, platform.y - 145, 250, 40, 
  messageContent1, messageRenderer1, messageRect1);
    
  // Cat Animations
  catPlayer.animations.forEach(function(value, key){
      app.stage.addChild(value);  // add all animations to world
  });
  // Shadow renderer
  app.stage.addChild(shadowGraphics); 
  // Geometry Renderer
  app.stage.addChild(Erector);
  app.stage.addChild(playerColliderRenderer);
  // light renderers
  app.stage.addChild(lightBulbs);
  app.stage.addChild(bakedLight.lightContainer);
  app.stage.addChild(movingLight.lightContainer);

  // draw big ole rect for shadows
  pDrawRect(shadowGraphics, 0,0, 5000, 5000, 0.3, 0.5);

  // Add hud to the stage
  HudRenderer = textBox(catPlayer.position.x + app.renderer.width/2 - 150, catPlayer.position.y - app.renderer.height/2, 150, 50, HudContent, HudRenderer, HudRect );
}

function drawHud(){
  HudRect.clear();
  HudRect.lineStyle(2, 0xFF00FF, 1);
  HudRect.beginFill(0x650A5A); // fill color
  HudRect.drawRoundedRect(app.stage.pivot.x + app.renderer.width/2 - 150, app.stage.pivot.y - app.renderer.height/2, 150, 50, 16);
  HudRect.endFill();
  HudContent = "Bugs Found:" + BugsFound.toString();

  HudRenderer.x = app.stage.pivot.x + app.renderer.width/2 - 150 +10;
  HudRenderer.y = app.stage.pivot.y - app.renderer.height/2 +10;
  HudRenderer.text = HudContent;
  // console.log(HudRenderer.children);
  
}

function checkBugs(){
    if (catPlayer.bouncyBug && !bouncyBug) {
      BugsFound++;
      bouncyBug = true;
    }
}