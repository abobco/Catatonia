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

import {FilePaths} from './FilePaths.js'
import {Player} from './player.js';
import {Terrain} from './terrain.js';
import {Controller, KBController} from './controller.js';
import { RaySource } from './raySource.js'
import {PointLight} from './PointLight.js';

//============================ Data =========================================//
// Aliases
    // pixi.js aliases
    let Application = PIXI.Application,
        loader = PIXI.loader,
        resources = PIXI.loader.resources,
        Sprite = PIXI.Sprite,
        Rectangle = PIXI.Rectangle,
        TextureCache = PIXI.utils.TextureCache;
    // matter.js aliases
    let Engine = Matter.Engine,
        Runner = Matter.Runner,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Vector = Matter.Vector,
        Events = Matter.Events;

// strings of files for loader
let loaderFiles = new FilePaths();

// pixi application object
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
  // Text boxes
  let messageRect1 = new PIXI.Graphics(),
      messageRenderer1 = new PIXI.Graphics(),
      messageContent1 = "Use the arrow keys to move"
  
  var HudRect = new PIXI.Graphics(),
      HudRenderer = new PIXI.Text(),
      HudContent = "Bugs Found:",
      BugsFound = 0,
      sitOnLedgeBug = false,
      fallingHang = false,
      windowSizeBug = false;
      let firstRodeo = true;
// Shaders
  let lightFilter,
      filters,
      lightShader,
      uniforms;

// Physics Engine
    // matterjs engine
    let catEngine = Engine.create(),
        catWorld = catEngine.world,
        catRunner = Runner.create();
    // Player collider
    // let catBody,
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

//===========================================================================//

//============================ Setup ========================================//

// Create Pixi Application, load files
InitPixi();

// Set up the game after all files load 
function onLoad() {
  // Load lighting shaders/filters
    let filterVert = resources["shaders/lightFilterVert.GLSL"].data,
        filterFrag = resources["shaders/lightFilterFrag.GLSL"].data,
              vert = resources["shaders/lightVert.GLSL"].data,
              frag = resources["shaders/lightFrag.GLSL"].data;

  // Initialize game objects
    // Player
      let frameMap = loadFrames();
      let playerPos = new PIXI.Point(app.screen.width/2, app.screen.height/2);
      catPlayer = new Player(playerPos, frameMap);

    // light shaders/filters
      lightShader = {
        "vert": vert,
        "frag": frag,
      };
      lightFilter = new PIXI.Filter(filterVert, filterFrag, uniforms );
      lightBulbs.filters = [new PIXI.filters.BlurFilter()];
      filters = [lightFilter, new PIXI.filters.BlurFilter()];

    // Physics engine
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

  // Move stage origin to simulate camera movement
  app.stage.pivot.copyFrom(catPlayer.centerPos);

  // move the dynamic light, update and draw its rays
    if ( movingLight.pos.x < platform.x - 800) 
      movingLight.vel = 1.5;
    else if ( movingLight.pos.x > platform.x - 300) 
      movingLight.vel = -1.5;

     movingLight.update();
     app.stage.addChild(movingLight.lightContainer); 
     // movingLight.visionSource.show(lightBulbs);
    checkBugs();

     drawHud();
}

//===========================================================================//

//==================== Helper Functions =====================================//

// Initialize Pixi Application
function InitPixi() {
    app = new Application({ 
      width: 256, 
      height: 256,                       
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
  app.renderer.resize(window.innerWidth, window.innerHeight);
  // Add the canvas to the document
  document.getElementById('myCanvas').appendChild(app.view);

    uniforms = {
    dimensions:   [app.renderer.screen.width, app.renderer.screen.height] 
  };

  // Start the pixi file loader
  loader
    .add(loaderFiles.array())
    .load(onLoad);

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
        var pair = pairs[i];
        var otherBodyTemp;
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
            if (!catPlayer.isGrounded || catPlayer.inSlide) {
              catPlayer.setAnimation("hang"); 
              let xOffset,   // how far away from the ledge we will anchor the cat
                  yOffset = 0;
              if ( otherBodyTemp.isRight){
                xOffset =15;
                catPlayer.setFlip("left");
              }  
              else{
                xOffset = -15;
                catPlayer.setFlip("right");
              }
                
              // catPlayer.setPosition(otherBodyTemp.position.x + xOffset, otherBodyTemp.position.y);
              Matter.Body.setVelocity(catPlayer.body, new Vector.create(0, 0) );
              Matter.Body.setPosition(catPlayer.body, new Vector.create(otherBodyTemp.position.x + xOffset, otherBodyTemp.position.y + yOffset));
              Matter.Body.setStatic(catPlayer.body, true);
              catPlayer.isHanging = true;
            }     
          }
          else if (!catPlayer.isHanging)
            inWalkBox = true;
        }
            
        else // Check if physics collision
            catCollision = true;
      }
      // cat is sliding on a wall case
      if (!inWalkBox && catCollision && !catPlayer.isGrounded){
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
    slideFrames = 0;
  });
  Events.on(catEngine, 'beforeUpdate', function(event) {
    if ( catPlayer.body.velocity.y == 0 && catPlayer.inSlide ) {
      catPlayer.inSlide = false;
      catPlayer.isGrounded = true;
      catPlayer.setAnimation("stop");
    }
  });
}

// Physics engine setup
function matterSetUp() {
    // Run matterjs engine
    Runner.run(catRunner, catEngine);

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

    platforms.push(new Terrain(platform.x + 125, platform.y - 200, 75, 50));
    platforms.push(new Terrain(platform.x - 125, platform.y - 250, 50,50));
    platforms.push(new Terrain(platform.x + 200, platform.y - 125, 75,50));

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
    bakedLight = new PointLight(platform.x + 25, platform.y - 420, platforms, castSegments, endPoints, lightShader, lightBulbs);
    movingLight = new PointLight(platform.x - 500, platform.y - 420, platforms, castSegments, endPoints, lightShader, lightBulbs);     
}

// Load animation frame images into AnimatedSprites
// this function is global because i dont know of a good way to p
function loadFrames() {
    // Init the anmiation objects
    let walkFrames = [],
        stopFrames = [],
        jumpFrames = [],
        slideFrames = [],
        hangFrames = [];
    // load all them animation frames
    for ( let i = 0; i < 10; i++ ) {
        const val = i;
        walkFrames.push(PIXI.Texture.from(`tile00${val}.png`));
    }
    for ( let i = 0; i < 5; i++ ) {
        const val = i;
        stopFrames.push(PIXI.Texture.from(`stop00${val}.png`));
    }
    for ( let i = 0; i < 8; i++ ) {
        const val = i;
        jumpFrames.push(PIXI.Texture.from(`Jump00${val}.png`));
    }
    for ( let i = 0; i < 4; i++ ) {
      const val = i;
      slideFrames.push(PIXI.Texture.from(`wallSlide00${val}.png`));
    }
    for ( let i = 0; i < 3; i++ ) {
      const val = i;
      hangFrames.push(PIXI.Texture.from(`catHang00${val}.png`));
    }

    let frameMap = new Map ([['walk', walkFrames],
                              ['stop', stopFrames],
                              ['jump', jumpFrames],
                              ['slide',slideFrames],
                              ['hang', hangFrames]]);
    return frameMap;
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
  // light renderers
  app.stage.addChild(lightBulbs);
  app.stage.addChild(bakedLight.lightContainer);
  app.stage.addChild(movingLight.lightContainer);

  // draw big ole rect for shadows
  pDrawRect(shadowGraphics, 0,0, 5000, 5000, 0.3, 0.5);

  // Add hud to the stage
  HudRenderer = textBox(catPlayer.centerPos.x + app.renderer.width/2 - 150, catPlayer.centerPos.y - app.renderer.height/2, 150, 50, HudContent, HudRenderer, HudRect );
}

function drawHud(){
  HudRect.clear();
  HudRect.lineStyle(2, 0xFF00FF, 1);
  HudRect.beginFill(0x650A5A); // fill color
  HudRect.drawRoundedRect(catPlayer.centerPos.x + app.renderer.width/2 - 150, catPlayer.centerPos.y - app.renderer.height/2, 150, 50, 16);
  HudRect.endFill();
  HudContent = "Bugs Found:" + BugsFound.toString();

  HudRenderer.x = catPlayer.centerPos.x + app.renderer.width/2 - 150 +10;
  HudRenderer.y = catPlayer.centerPos.y - app.renderer.height/2 +10;
  HudRenderer.text = HudContent;
  // console.log(HudRenderer.children);
  
}

function checkBugs(){
  if ( catPlayer.currentAnimation != "hang" && catPlayer.body.isStatic && !sitOnLedgeBug ){
    BugsFound++;
    sitOnLedgeBug = true;
  }
    
  if ( catPlayer.currentAnimation == "hang" && !catPlayer.body.isStatic && !fallingHang){
    BugsFound++;
    fallingHang = true;
  }
    
}