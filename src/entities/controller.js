export class GamepadController{
  constructor(eventCallback, pauseCallback, pauseMenu, gameTicker){
    this.rightDown = false;
    this.leftDown = false;
    this.controllers = {};
    this.buttons = [];
    this.axis;
    this.eventCallback = eventCallback;
    this.pauseCallback = pauseCallback;
    this.joydir = 0;
    //this.haveEvents = 'ongamepadconnected' in window;
    this.gameTicker = gameTicker;
    this.pauseMenu = pauseMenu;
    this.lastAxisVal = 0;
    this.lastButtonStatus = false;
    this.axisThreshold = 0.3;

    window.addEventListener("gamepadconnected", this.handleConnect.bind(this));
    window.addEventListener("gamepaddisconnected", this.handleDisconnect.bind(this));
  }

  handleConnect(event){
    let gamepad = event.gamepad;
    this.controllers[gamepad.index] = gamepad;
    for ( let i = 0; i < gamepad.buttons.length; i++){
      this.buttons.push(gamepad.buttons[i]);
    }
    this.axis = gamepad.axes[0].toFixed(4);
  }

  handleDisconnect(event){
    delete this.controllers[event.gamepad.index];
  }

  addGamepad(gamepad){
    this.controllers[gamepad.index] = gamepad;
    for ( let i = 0; i < gamepad.buttons.length; i++){
      this.buttons.push(gamepad.buttons[i]);
    }
    this.axis = gamepad.axes[0].toFixed(4);
  }

  printInfo(){
    if ( this.controllers[0])
      console.log(this.controllers[0].axes[0]);
  }

  update(){
    //if (!this.haveEvents)
    this.scanGamepads();
    
    let myEvent = {};
    if ( this.controllers[0]){
      // joystick held to the right
      if ( this.controllers[0].axes[0] >= this.axisThreshold  ){
        myEvent.type = "inputDown";
        myEvent.direction = "right";
        this.joydir = 1;
        if (this.pauseMenu.isOpen && Math.abs(this.lastAxisVal) < this.axisThreshold){
          this.pauseCallback(myEvent);
        }
        else if (!this.pauseMenu.isOpen)
          this.eventCallback(myEvent); 
      }
      // joystick held to the left
      else if ( this.controllers[0].axes[0] <= -this.axisThreshold ){
        myEvent.type = "inputDown";
        myEvent.direction = "left";
        this.joydir = -1;
        if (this.pauseMenu.isOpen && Math.abs(this.lastAxisVal) < this.axisThreshold){
          this.pauseCallback(myEvent);
        }
        else if (!this.pauseMenu.isOpen)
          this.eventCallback(myEvent); 
      }
      // joystick in neutral position
      else if (this.joydir != 0 && !this.pauseMenu.isOpen) {
        myEvent.type = "inputUp";
        myEvent.direction = "right";
        this.joydir = 0;
        this.eventCallback(myEvent); 
      }
     
      console.log(this.controllers[0].buttons[0])
      if ( navigator.webkitGetGamepads){
        if ( this.controllers[0].buttons[0] && !this.lastButtonStatus){
          myEvent.type = "inputDown";
          myEvent.direction = "up";
          if ( !this.pauseMenu.isOpen)
            this.eventCallback(myEvent);
          else {
            myEvent.direction = "enter";
            this.pauseCallback(myEvent);
          }
        }
        // if ( this.controllers[0].buttons[9] && !this.pausePressed){
        //   this.pauseMenu.onClick(this.gameTicker);
        //   this.pausePressed = true;
        // }
        // else if ( !this.controllers[0].buttons[9] && this.pausePressed) {
        //   this.pausePressed = false;
        // }
      }
      else {
        if ( this.controllers[0].buttons[0].pressed && !this.lastButtonStatus){
          myEvent.type = "inputDown";
          myEvent.direction = "up";
          if ( !this.pauseMenu.isOpen)
            this.eventCallback(myEvent);
          else {
            myEvent.direction = "enter";
            this.pauseCallback(myEvent);
          }
        }
        // if ( this.controllers[0].buttons[9].pressed && !this.pausePressed){
        //   this.pauseMenu.onClick(this.gameTicker);
        //   this.pausePressed = true;
        // }
        // else if ( !this.controllers[0].buttons[9].pressed && this.pausePressed) {
        //   this.pausePressed = false;
        // }
     }


      if ( navigator.webkitGetGamepads)
        this.lastButtonStatus = this.controllers[0].buttons[0];
      else
        this.lastButtonStatus = this.controllers[0].buttons[0].pressed;
      this.lastAxisVal = this.controllers[0].axes[0];
    }
  }

  scanGamepads() {
    let gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
    for (var i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        if (gamepads[i].index in this.controllers) 
          this.controllers[gamepads[i].index] = gamepads[i];
        else 
          this.addGamepad(gamepads[i]);  
      }
    }
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