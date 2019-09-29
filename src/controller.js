import nipplejs from 'nipplejs/dist/nipplejs.js';
import Matter from 'matter-js/build/matter.min.js';

var Controller = function (catPlayer, catBody) {
    var options = { mode : 'static',
                     position: { left: '25%', top: '80%'},
                     zone : document.getElementById('myCanvas')
                    };
    this.manager = nipplejs.create(options);

    // assign actions to joystick events
    this.init = function(){
        this.manager.on('start', function (evt, nipple) {
            // moonwalk
            if (catPlayer.isGrounded) {
              catPlayer.setAnimation("walk");
            }
            // walk right
            nipple.on('dir:right', function (evt) {
              if (catPlayer.isGrounded)
                catPlayer.setAnimation("walk");
              catPlayer.setFlip("right");
              catPlayer.inSlowDown = false;
              catPlayer.xVel = catPlayer.maxVel;
            });
            // walk left
            nipple.on('dir:left', function (evt) {  
              if (catPlayer.isGrounded)
                catPlayer.setAnimation("walk");
              catPlayer.setFlip("left");
              catPlayer.inSlowDown = false;
              catPlayer.xVel = -catPlayer.maxVel;
            });
            // jump 
            nipple.on('dir:up', function(evt) {
              // jump from ground
              if ( catPlayer.isGrounded ) {
                Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, catPlayer.jumpVel) );
                catPlayer.setAnimation("jump");
                catPlayer.isGrounded = false;
                catPlayer.jumpInput = true;
                catPlayer.inSlide = false;
              }
              // jump from wall
              else if ( catPlayer.inSlide ) {
                // if right side of cat is in contact with wall
                if ( catPlayer.flip == "right" ) {
                  catPlayer.setFlip("left");
                  catPlayer.xVel = -catPlayer.maxVel * 1.5;
                  Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, .85*catPlayer.jumpVel) );
                  catPlayer.setAnimation("jump");
                  catPlayer.inSlide = false;
                  catPlayer.jumpInput = true;
                }
                // if left side of cat is in contact with wall
                else if (catPlayer.flip == "left") {
                  catPlayer.setFlip("right");
                  catPlayer.xVel = catPlayer.maxVel * 1.5;
                  Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, .85*catPlayer.jumpVel) );
                  catPlayer.setAnimation("jump");
                  catPlayer.inSlide = false;
                  catPlayer.jumpInput = true;
                }    
              }
            });
            nipple.on('end', function(evt) {
              if ( catPlayer.isGrounded ) {
                catPlayer.setAnimation("stop");
                catPlayer.xVel = 0;
              }
              else {
                catPlayer.inSlowDown = true;
              }
            });
          })
          /*
          .on('removed', function (evt, nipple) {
            nipple.off('dir:up dir:down dir:right dir:left');
              if (catPlayer.isGrounded) 
                catPlayer.setAnimation("stop");
              catPlayer.xVel = 0;
          });
          */
        }
} 

var KBController = function(catPlayer, catBody) {
    // keyboard controls
    this.rightDown = false;
    this.leftDown = false;
    document.onkeydown = checkKeyDown;
    document.onkeyup = checkKeyUp;
    function checkKeyDown(e) {

        e = e || window.event;

        if (e.keyCode == '38') {
            // up arrow
            // jump from ground
            if ( catPlayer.isGrounded ) {
                Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, catPlayer.jumpVel) );
                catPlayer.setAnimation("jump");
                catPlayer.isGrounded = false;
                catPlayer.jumpInput = true;
                catPlayer.inSlide = false;
            }
            // jump from wall
            else if ( catPlayer.inSlide ) {
                // if right side of cat is in contact with wall
                if ( catPlayer.flip == "right" ) {
                    catPlayer.setFlip("left");
                    catPlayer.xVel = -catPlayer.maxVel * 1.5;
                    Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, .85*catPlayer.jumpVel) );
                    catPlayer.setAnimation("jump");
                    catPlayer.inSlide = false;
                    catPlayer.jumpInput = true;
                }
                // if left side of cat is in contact with wall
                else if (catPlayer.flip == "left") {
                    catPlayer.setFlip("right");
                    catPlayer.xVel = catPlayer.maxVel * 1.5;
                    Matter.Body.setVelocity(catBody, Matter.Vector.create(catPlayer.xVel, .85*catPlayer.jumpVel) );
                    catPlayer.setAnimation("jump");
                    catPlayer.inSlide = false;
                    catPlayer.jumpInput = true;
                }    
            }
        }
        else if (e.keyCode == '40') {
            // down arrow
        }
        else if (e.keyCode == '37' && !this.leftDown) {
            // left arrow
            this.rightDown = false;
            this.leftDown = true;
            if (catPlayer.isGrounded)
                catPlayer.setAnimation("walk");
            catPlayer.setFlip("left");
            catPlayer.inSlowDown = false;
            catPlayer.xVel = -catPlayer.maxVel;
        }
        else if (e.keyCode == '39' && !this.rightDown) {
            // right arrow
            this.leftDown = false;
            this.rightDown = true;
            if (catPlayer.isGrounded)
                catPlayer.setAnimation("walk");
            catPlayer.setFlip("right");
            catPlayer.inSlowDown = false;
            catPlayer.xVel = catPlayer.maxVel;
        }
        }

        function checkKeyUp(e) {

        e = e || window.event;

        if (e.keyCode == '38') {
            // up arrow
        }
        else if (e.keyCode == '40') {
            // down arrow
        }
        else if (e.keyCode == '37' && this.leftDown) {
            this.leftDown = false;
            // left arrow
            if ( catPlayer.isGrounded ) {
                catPlayer.setAnimation("stop");
                catPlayer.xVel = 0;
            }
            else {
                catPlayer.inSlowDown = true;
            }
        }
        else if (e.keyCode == '39' && this.rightDown) {
            this.rightDown = false;
            // left arrow
            if ( catPlayer.isGrounded ) {
                catPlayer.setAnimation("stop");
                catPlayer.xVel = 0;
            }
            else {
                catPlayer.inSlowDown = true;
            }
        }
    }
}

Controller.prototype.constructor = Controller
KBController.prototype.constructor = KBController
export {Controller};
export {KBController};