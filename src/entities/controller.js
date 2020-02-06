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
          //this.rightDown = false;
          this.leftDown = true;
        }

        else if (e.keyCode == '39' && !this.rightDown ) {
          myEvent.direction = "right";
          //this.leftDown = false;
          this.rightDown = true;
        }
        // spacebar
        else if (e.keyCode == '32'){
          if (pauseMenu.isOpen)
            myEvent.direction = "enter"
          else
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
        if (pauseMenu.isOpen){
          
          if (myEvent.direction == "up")
            myEvent.direction = "left";
          else if (myEvent.direction == "down")
            myEvent.direction = "right";
          pauseMenu.handleEvent(myEvent);
        }
        else
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
          if ( this.rightDown )
            myEvent = {
              type: "inputDown",
              direction: "right"
            };

        }
        else if (e.keyCode == '39' && this.rightDown) {
            this.rightDown = false;
            myEvent.direction = "right"
            if ( this.leftDown )
            myEvent = {
              type: "inputDown",
              direction: "left"
            };

        }
        else if (e.keyCode == '32'){
          if (!pauseMenu.isOpen)
            gameTicker.speed = 1;
        }
        catPlayer.handleEvent(myEvent);
    }
}

KBController.prototype.constructor = KBController
export {KBController};