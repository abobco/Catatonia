import nipplejs from 'nipplejs/dist/nipplejs.js';
import Matter from 'matter-js/build/matter.min.js';

class Controller{
    // pass by reference for dummies
    constructor(catPlayer, catBody) {
        // init joystick
        var options = { mode : 'static',
        position: { left: '25%', top: '80%'},
        zone : document.getElementById('myCanvas')
      };
        this.manager = nipplejs.create(options);

        // bind joystick events to game actions
        this.manager.on('start', function (evt, nipple) {
          // if (catPlayer.isHanging){
          //   catPlayer.isHanging = false;
          //   Matter.Body.setStatic(catBody, false);
          // }
          // moonwalk
          if (catPlayer.isGrounded) {
            catPlayer.setAnimation("walk");
          }
          // walk right
          nipple.on('dir:right', function (evt) {
            if (!catPlayer.isHanging){
              if (catPlayer.isGrounded)
                catPlayer.setAnimation("walk");
              catPlayer.setFlip("right");
              catPlayer.inSlowDown = false;
              catPlayer.xVel = catPlayer.maxVel;
            }
            catPlayer.lastInput = "right";
          });
          // walk left
          nipple.on('dir:left', function (evt) { 
            if (!catPlayer.isHanging){ 
              if (catPlayer.isGrounded)
                catPlayer.setAnimation("walk");
              catPlayer.setFlip("left");
              catPlayer.inSlowDown = false;
              catPlayer.xVel = -catPlayer.maxVel;
            }
            catPlayer.lastInput = "left";
          });
          // jump 
          nipple.on('dir:up', function(evt) {
            // jump from ground
            if (!catPlayer.isHanging){ 
              if ( catPlayer.isGrounded && catPlayer.cameraSnapped ) {
                Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, catPlayer.jumpVel) );
                catPlayer.setAnimation("jump", 0, true);
                catPlayer.isGrounded = false;
                catPlayer.jumpInput = true;
                catPlayer.inSlide = false;
              }
              // jump from wall
              else if ( catPlayer.inSlide && catPlayer.cameraSnapped ) {
                // if right side of cat is in contact with wall
                catPlayer.wallJumpTimer.start();
                if ( catPlayer.flip == "right" ) {
                  catPlayer.setFlip("left");
                  catPlayer.xVel = -catPlayer.maxVel * 1.5;
                  Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, .85*catPlayer.jumpVel) );
                  catPlayer.setAnimation("jump", 0, true);
                  catPlayer.inSlide = false;
                  catPlayer.jumpInput = true;
                }
                // if left side of cat is in contact with wall
                else if (catPlayer.flip == "left") {
                  catPlayer.setFlip("right");
                  catPlayer.xVel = catPlayer.maxVel * 1.5;
                  Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, .85*catPlayer.jumpVel) );
                  catPlayer.setAnimation("jump", 0, true);
                  catPlayer.inSlide = false;
                  catPlayer.jumpInput = true;
                }    
              }
            }
          });
          nipple.on('end', function(evt) {
              catPlayer.lastInput = "end";
              if ( catPlayer.isGrounded ) {
                catPlayer.setAnimation("stop");
                catPlayer.xVel = 0;
              }
              else {
                catPlayer.inSlowDown = true;
              }
            
          });
        })
    }
} 

// using old syntax for now
var KBController = function(catPlayer, catBody, gameTicker, camera, pauseMenu) {
    // keyboard controls
    this.rightDown = false;
    this.leftDown = false;
    document.onkeydown = checkKeyDown;
    document.onkeyup = checkKeyUp;
    function checkKeyDown(e) {
        e = e || window.event;
        let myEvent = {
          type: "inputDown"};

        if (e.keyCode == '38') 
          myEvent.direction = "up"

        else if (e.keyCode == '40') 
          myEvent.direction = "down"; 

        else if (e.keyCode == '37' && !this.leftDown ) {
          myEvent.direction = "left";
          this.rightDown = false;
          this.leftDown = true;
        }

        else if (e.keyCode == '39' && !this.rightDown ) {
          myEvent.direction = "right";
          this.leftDown = false;
          this.rightDown = true;
        }
        // spacebar
        else if (e.keyCode == '32'){
          gameTicker.speed = 0.5;
        }
        // 'x' key
        else if (e.keyCode == '88') {
          catPlayer.showDebug  ^= true;
        }
        // 'f' key
        else if (e.keyCode == '70') {
          camera.addTrauma(1);
        }
        // esc key
        else if (e.keyCode == '27'){
          pauseMenu.onClick(gameTicker);
        }
        catPlayer.handleEvent(myEvent);
    }

        function checkKeyUp(e) {

        e = e || window.event;
        let myEvent = {
          type: "inputUp"};

        if (e.keyCode == '38') {
            // up arrow
            myEvent.direction = "up"
        }
        else if (e.keyCode == '40') {
            // down arrow
            myEvent.direction = "down"
        }
        else if (e.keyCode == '37' && this.leftDown) {
          myEvent.direction = "left"
            this.leftDown = false;

        }
        else if (e.keyCode == '39' && this.rightDown) {
            this.rightDown = false;
            myEvent.direction = "right"

        }
        else if (e.keyCode == '32'){
          gameTicker.speed = 1;
        }
        catPlayer.handleEvent(myEvent);
    }
}

Controller.prototype.constructor = Controller
KBController.prototype.constructor = KBController
export {Controller};
export {KBController};