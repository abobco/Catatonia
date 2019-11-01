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
import { RaySource } from './raySource.js'
import {NPC} from './NPC.js';


// var fs = require("fs");

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
    var Engine = Matter.Engine,
        Runner = Matter.Runner,
        World = Matter.World,
        Bodies = Matter.Bodies,
        Vector = Matter.Vector,
        Events = Matter.Events;

// Player Object
    // Animator
    const playerScale = 3;
    var catPlayer,
        animMap,
        walkAnim,
        stopAnim,
        jumpAnim,
        slideAnim,
        slideFrames = 0;

// Input
  // Joystick object
  var customJoystick;
  // Keyboard Controller
  var KBInput;

// Renderers
  // Geometry
  var Erector = new PIXI.Graphics();
  // Text boxes
  var messageRect1 = new PIXI.Graphics(),
      messageRenderer1 = new PIXI.Graphics(),
      messageContent1 = "Use the arrow keys to move",
      messageRect2 = new PIXI.Graphics(),
      messageRenderer2 = new PIXI.Graphics(),
      messageContent2 = "Jump from wall to wall to climb";
// Shaders
  // const lightVertShader = fs.readFile("./shaders/lightVert.GLSL").toString('utf-8'),
  //       lightFragShader = fs.readFile('./shaders/lightFrag.GLSL').toString('utf-8'),
  //       lightUniforms = {};
  //       console.log(lightVertShader);
  //       console.log(lightFragShader);
  let lightFilter;
  let filters;
  let lightShader;

  let lightContainer = new PIXI.Container();
  let stageFilterBounds;

// Physics Engine
    // matterjs engine
    var catEngine = Engine.create(),
        catWorld = catEngine.world,
        catRunner = Runner.create();
    // Player collider
    var catBody,
    // Terrain colliders
        terrain = new Array(),
        platform,
        platforms = new Array();
    // raycaster
    var bakedLight; // baked lighting
    var movingLight;  // dynamic lighting
    var castSegments = [];  // array of line segments
    var endPoints = [];   // array of vertices
    var corners = []; // array of corner vectors
    var castGraphics = new PIXI.Graphics(); // geometry renderer

    let cameraPosBuffer,
        cameraPos,
        cameraPosArray;
    
//===========================================================================//

//============================ Setup ========================================//

// Create Pixi Application
let app = new Application({ 
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

let uniforms = {
  dimensions:   [app.renderer.screen.width, app.renderer.screen.height] 
};

// Add the canvas to the document
document.getElementById('myCanvas').appendChild(app.view);

// Make an array of sprite file paths
var filePaths = [];
filePaths.push("sprites/catWalk.json");
filePaths.push("sprites/catStop.json");
filePaths.push("sprites/catJump.json");
filePaths.push("sprites/wallSlide.json");
filePaths.push("sprites/cathouse_r1.png");
// shader text files
filePaths.push("shaders/lightFilterVert.GLSL");
filePaths.push("shaders/lightFilterFrag.GLSL");
filePaths.push("shaders/lightVert.GLSL");
filePaths.push("shaders/lightFrag.GLSL");

// Start the pixi file loader
loader
  .add(filePaths)
  .load(setup)

// Start game after images load 
function setup() {
  // Load lighting shaders/filters
    var filterVert = PIXI.loader.resources["shaders/lightFilterVert.GLSL"].data;
    var filterFrag = PIXI.loader.resources["shaders/lightFilterFrag.GLSL"].data;
    var vert = PIXI.loader.resources["shaders/lightVert.GLSL"].data;
    var frag = PIXI.loader.resources["shaders/lightFrag.GLSL"].data;

  // Load images into AnimatedSprite objects  
    loadAnimations();

  // Initialize game objects
    // Player
    var playerRect = new Rectangle(walkAnim.x, walkAnim.y, walkAnim.width, walkAnim.height);

    animMap = new Map ([['walk', walkAnim],
                        ['stop', stopAnim],
                        ['jump', jumpAnim],
                        ['slide',slideAnim]]);
    catPlayer = new Player(playerRect, animMap);

    cameraPosArray = new Float32Array(catPlayer.centerPos.x, catPlayer.centerPos.y);
    // cameraPosBuffer = new PIXI.Buffer.from(cameraPosArray);
    cameraPosBuffer = new PIXI.Buffer(cameraPosArray.buffer, false);
    cameraPos = new PIXI.Attribute(cameraPosBuffer,2);

    lightShader = {
      "vert": vert,
      "frag": frag,
      "cameraPos" : cameraPosBuffer };
    lightFilter = new PIXI.Filter(filterVert, filterFrag, uniforms );

    castGraphics.filters = [new PIXI.filters.BlurFilter()];
    filters = [lightFilter, new PIXI.filters.BlurFilter()];

    // Physics engine
    matterSetUp();

    // Joystick manager
    if ("ontouchstart" in document.documentElement) {
      messageContent1 = 'Use the joystick to move';
      customJoystick = new Controller(catPlayer, catBody);
    }

    // Keyboard input manager
    KBInput = new KBController(catPlayer, catBody);

  // Add objects to Pixi world
    // Terrain
    terrain.forEach(function (value) {
      value.drawRect(Erector);
    });
    
    // Textboxes 
    textBox(platform.x - 140, platform.y - 145, 250, 40, 
    messageContent1, messageRenderer1, messageRect1);
 
    // Cat Animations
    catPlayer.animations.forEach(function(value, key){
        app.stage.addChild(value);  // add all animations to world
    });
    
    // add the light to the stage
    app.stage.addChild(lightContainer);

    // Geometry Renderer
    app.stage.addChild(Erector);

    // raycast debug graphics 
    app.stage.addChild(castGraphics);

    // Init world events
    collisionEventSetup();
    window.addEventListener( 'resize', onWindowResize, false );
    preventScroll();  // stops joystick from scrolling page on mobile

    // Lock the camera to the cat's position 
    app.stage.position.set(app.screen.width/2, app.screen.height/2);﻿﻿
    
    bakedLight.show(castGraphics);
    bakedLight.look();
    bakedLight.auxLook();

    bakedLight.drawMesh([]);

    // add light to stage
    for ( let i = 0; i < bakedLight.tris.length; i++) {
      lightContainer.addChild(bakedLight.tris[i]);
    }

    app.stage.addChild(movingLight.lightContainer);

    // let myBlurFilter = new PIXI.filters.BlurFilter();
    // myBlurFilter.autoFit = false;
    // lightContainer.filters = [myBlurFilter]; 
                                                                                                                          
    // lightContainer.filterArea = app.renderer.screen;
    // lightContainer.filterArea.fit(app.renderer.screen);

    // let radialBlur = new RadialBlurFilter(60, 9)
    // lightFilter.filterArea= app.renderer.screen;
     
    lightContainer.filters = [lightFilter];

    // Start the game loop 
    app.ticker.add(delta => gameLoop(delta)); 
}

// Updates every 16.66 ms
function gameLoop(delta){// delta is in ms
  castGraphics.clear();

  // Apply velocity from user inputs
  Matter.Body.setVelocity(catBody, new Vector.create(catPlayer.xVel, catBody.velocity.y) );
  // Move the sprites to follow their physicis body
  catPlayer.setPosition(catBody.position.x, catBody.position.y);
  //console.log(catBody.position.x, catBody.position.y);
  //console.log(bakedLight.pos);
  // Move stage origin to simulate camera movement
  app.stage.pivot.copyFrom(catPlayer.centerPos);

  cameraPosArray[0] = catPlayer.centerPos.x;
  cameraPosArray[1] = catPlayer.centerPos.y;

  cameraPosBuffer.update(cameraPosArray.buffer);

  // apply friction
  if ( catPlayer.inSlowDown ) 
    catPlayer.slowVelocity();

  // draw the static light
  // bakedLight.drawLight(castGraphics);
   bakedLight.show(castGraphics);

  // move the dynamic light, update and draw its rays
    if ( movingLight.pos.x < platform.x - 800) {
      movingLight.vel = 1.5;
    } 
    else if ( movingLight.pos.x > platform.x - 300) {
      movingLight.vel = -1.5;
    }
     movingLight.update(); 
  // movingLight.visionSource.drawLight(castGraphics);
  movingLight.visionSource.show(castGraphics);

  
  // var bakedTris = bakedLight.drawMesh([lightFilter, new PIXI.filters.BlurFilter()]);
  // var movingTris = movingLight.visionSource.drawMesh([lightFilter, new PIXI.filters.BlurFilter()]);
  // console.log(bakedTris);
  // console.log(movingTris);
  // for ( let tri in bakedTris) {
  //   app.stage.addChild(tri);
  // }
  // for ( let tri in movingTris) {
  //   app.stage.addChild(tri);
  // }
}

//===========================================================================//

//==================== Helper Functions =====================================//

// Setup Collision Events
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
        if ( pair.bodyA.id == catBody.id )
            otherBodyTemp = pair.bodyB;
        else if ( pair.bodyB.id == catBody.id )
            otherBodyTemp = pair.bodyA;
        // go to next pair if cat not involved
        else continue;
        // check if collision with walkBox
        if ( otherBodyTemp.isSensor ) 
            inWalkBox = true;
        else // Check if physics collision
            catCollision = true;
      }
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
    if ( catBody.velocity.y == 0 && catPlayer.inSlide ) {
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
    // Add the cat's rigidbody
    catBody = new Bodies.rectangle(catPlayer.centerPos.x, catPlayer.centerPos.y, catPlayer.colliderWidth, catPlayer.colliderHeight, {
      density: 0.0005,
      frictionAir: 0.06,
      restitution: 0,
      friction: 0.01,
      inertia: Infinity
  }); 
    World.add(catWorld, catBody);

    // Add terrain
    platform = new Terrain(window.innerWidth / 2, window.innerHeight * .8, 800, 50 )
    platforms.push(platform);

    platforms.push(new Terrain(platform.x - 500, platform.y - 75 , 200, 200));
    platforms.push(new Terrain(platform.x + 400, platform.y - 225 , 50, 500));
    platforms.push(new Terrain(platform.x - 800, platform.y - 75, 600, 200));
    platforms.push(new Terrain(platform.x + 25, platform.y - 475, 800, 50));

    platforms.push(new Terrain(platform.x - 250, platform.y - 275, 50, 350));

    platforms.push(new Terrain(platform.x + 125, platform.y - 200, 75, 50));
    platforms.push(new Terrain(platform.x - 125, platform.y - 250, 50,50));
    platforms.push(new Terrain(platform.x + 200, platform.y - 125, 75,50));

    platforms.push(new Terrain(platform.x - 700, platform.y - 475, 700, 50));
    platforms.push(new Terrain(platform.x - 500, platform.y - 325, 100, 50));
    platforms.push(new Terrain(platform.x - 700, platform.y - 325, 100, 50));
    platforms.push(new Terrain(platform.x - 1000, platform.y - 325, 50, 500));

    platforms.forEach(function(element) {
        World.add(catWorld, element.Collider);
        World.add(catWorld, element.walkBox);
        element.drawRect(Erector); 
    });

    platforms.forEach( function(rectangle) {
      //console.log(rectangle);
      rectangle.bounds.forEach( function(bound) {
        castSegments.push(bound);
      });
      endPoints.push(rectangle.A);
      endPoints.push(rectangle.B);
      endPoints.push(rectangle.C);
      endPoints.push(rectangle.D);
    });

    // init Raycaster2
    bakedLight = new RaySource(platform.x + 25, platform.y - 420, platforms, castSegments, endPoints, lightShader);
    movingLight = new NPC(platform.x - 500, platform.y - 420, platforms, castSegments, endPoints, lightShader);     
}

// Load animation frame images into AnimatedSprites
function loadAnimations() {
    // Init the anmiation objects
    let frames = [],
    stopFrames = [],
    jumpFrames = [],
    slideFrames = [];
    // load all them animation frames
    for ( let i = 0; i < 10; i++ ) {
        const val = i;
        frames.push(PIXI.Texture.from(`tile00${val}.png`));
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
    
   // init all the animation objects 
    walkAnim =  catInit(new PIXI.AnimatedSprite(frames));
    stopAnim =  catInit(new PIXI.AnimatedSprite(stopFrames));
    jumpAnim =  catInit(new PIXI.AnimatedSprite(jumpFrames));
    slideAnim =  catInit(new PIXI.AnimatedSprite(slideFrames));
    slideAnim.anchor.y = 0.3;
    stopAnim.loop = false;  // the game currently starts with the cat falling
    jumpAnim.loop = false;
    slideAnim.loop = false;
    jumpAnim.play();
    walkAnim.visible = false;
    stopAnim.visible = false;
    slideAnim.visible = false;
}

// Sprite setup
function catInit(newSprite) {
    newSprite.x = app.screen.width / 2;
    newSprite.y = app.screen.height / 2;
    newSprite.vx = 0;
    newSprite.vy = 0;
    newSprite.scale.set(playerScale,playerScale);
    newSprite.anchor.set(0.5);
    newSprite.animationSpeed = 0.2;
    return newSprite;
}

// Air friction for dummies
function slowVelocity() {
    if ( catPlayer.xVel > 0 ) {
      catPlayer.xVel -= 0.1;
      if ( catPlayer.xVel <= 0 ) {
        catPlayer.xVel = 0;
        catPlayer.inSlowDown = false;
      }
    }
    else if ( catPlayer.xVel < 0 ) {
      catPlayer.xVel += 0.1
      if ( catPlayer.xVel >= 0 ) {
        catPlayer.xVel = 0;
        catPlayer.inSlowDown = false;
      }
    }
}

// Re-center camera
function onWindowResize() {
    app.renderer.resize(window.innerWidth, window.innerHeight);
    // Lock the camera to the cat's position 
    app.stage.position.set(app.screen.width/2, app.screen.height/2);﻿﻿
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