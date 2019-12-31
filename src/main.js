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

import {myLoader} from './myLoader';
import {Game} from './game.js';

let app;
let myGame;

// Create Pixi Application
InitPixi();

// load files, call the setup function, bind the calling context to this file's global scope
let customLoader = new myLoader(setup.bind(this));

// Set up the game after all files load 
function setup() {
  myGame = new Game(customLoader, app);

  preventScroll();  // stops joystick from scrolling page on mobile
}

//==================== Helper Functions =====================================//

// Initialize Pixi Application
function InitPixi() {
    app = new PIXI.Application({ 
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

    // lock frame rate 
   // app.ticker.maxFPS =30;
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