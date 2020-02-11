import { PauseMenu } from "./myMenu";

/** Virtual touch controller with 3 buttons for left, right, and jump/enter
 *  @class
 */
export class ButtonController{
    /**
     * @param {PIXI.Texture[]} buttonFrames 
     * @param {PIXI.Point} playerPos 
     * @param {function} eventCallback 
     * @param {function} pauseCallback 
     * @param {HTMLCanvasElement} canvasContext 
     * @param {PauseMenu} pauseMenu 
     */
    constructor( buttonFrames, playerPos, eventCallback, pauseCallback, canvasContext, pauseMenu){
        this.clientTopLeft = new PIXI.Point(playerPos.x - window.innerWidth, playerPos.y - window.innerHeight);
       // console.log(this.clientTopLeft)

        // add button event listeners to canvas
        canvasContext.addEventListener("touchstart", this.handleTouches.bind(this));
        canvasContext.addEventListener("touchend", this.handleTouches.bind(this));
        canvasContext.addEventListener("touchmove", this.handleTouches.bind(this));
        canvasContext.addEventListener("click", (event) => {
            console.log("click: x: ", event.clientX, "y: ", event.clientY);
        })
        
        // make button display objects
        this.buttonContainer = new PIXI.Container();
        this.buttons = new Map([["left", new PlayerButton(buttonFrames.get("left"), "left",playerPos, eventCallback, pauseCallback)],
                                ["right", new PlayerButton(buttonFrames.get("right"), "right",playerPos, eventCallback, pauseCallback)],
                                ["up", new PlayerButton(buttonFrames.get("up"), "up",playerPos, eventCallback, pauseCallback)]])
        

        // add to one parent container
        this.buttons.forEach( (button) => {
            button.sprites.forEach( (sprite ) => {
                this.buttonContainer.addChild( sprite );
            });
        });

        // window offsets for buttons
        this.leftButtonOffset = new PIXI.Point(-window.innerWidth + 10, window.innerHeight- (this.buttons.get("left").height + 10));
        this.rightButtonOffset = new PIXI.Point(this.leftButtonOffset.x + this.buttons.get("left").width + 5, this.leftButtonOffset.y);
        this.upButtonOffset = new PIXI.Point(window.innerWidth - this.buttons.get("left").width -  5, this.leftButtonOffset.y);

        // test button bounds
        let leftButton = this.buttons.get("left").sprites.get("unpressed");
        console.log(leftButton.getBounds());
    }

    handleTouches(event) {
        console.log("touches: ", event.touches.length);
        this.buttons.forEach( (button) => {
            let touchInButton = false;
            let touchID = null;
            for ( let i = 0; i < event.touches.length; i++){
                let touch = event.touches.item(i);
                if ( button.interactionRectangle.contains(touch.clientX, touch.clientY) ) {
                    touchInButton = true;
                }
            }
            if ( touchInButton != button.pressed ){
                button.pressed = touchInButton;
                if ( button.pressed ){
                    button.onPress();
                }  
                else {
                    button.onEnd();
                    if (button.type == "left" && this.buttons.get("right").pressed )
                        this.buttons.get("right").onPress();
                    else if (button.type == "right" && this.buttons.get("left").pressed )
                        this.buttons.get("left").onPress();
                }   
            }  
        })
        let lightTouch = false;
        for ( let i = 0; i < event.touches.length; i++ ){
            let touchInButton = false;
            let touch = event.touches.item(i);
            this.buttons.forEach( (button) => {
                if ( button.interactionRectangle.contains(touch.clientX, touch.clientY) ) {
                    touchInButton = true;
                }
            })
            if ( !touchInButton )
                this.lightTouch = new PIXI.Point(touch.clientX, touch.clientY);
        }
    }

    onMove(event){
        let position = event.data.global;
        
        this.buttons.forEach( (button) => {
            if ( button.pressed) {
                if (!button.sprites.get("pressed").getBounds().contains(position.x,position.y))
                    button.onEnd();
            }
            else {
                if ( button.sprites.get("unpressed").getBounds().contains(position.x,position.y))
                    button.onPress();
            }
        })
    }

    moveButtons(cameraPos){
        this.buttons.get("left").interactionRectangle = this.buttons.get("left").sprites.get("unpressed").getBounds();
        this.buttons.get("right").interactionRectangle = this.buttons.get("right").sprites.get("unpressed").getBounds();
        this.buttons.get("up").interactionRectangle = this.buttons.get("up").sprites.get("unpressed").getBounds();

        this.buttons.get("left").setPosition(cameraPos, this.leftButtonOffset);
        this.buttons.get("right").setPosition(cameraPos, this.rightButtonOffset);
        this.buttons.get("up").setPosition(cameraPos, this.upButtonOffset);


    }

    onResize(){
        this.leftButtonOffset = new PIXI.Point(-window.innerWidth + 10, window.innerHeight- (this.buttons.get("left").height + 10));
        this.rightButtonOffset = new PIXI.Point(this.leftButtonOffset.x + this.buttons.get("left").width + 5, this.leftButtonOffset.y);
        this.upButtonOffset = new PIXI.Point(window.innerWidth - this.buttons.get("left").width -  5, this.leftButtonOffset.y);
    }
}


/** Retro style virtual button for touch devices
 * @class
 */
class MyButton {
    /**
     * @param {PIXI.Texture[]} textures 
     */
    constructor(textures){
        this.pressed = false;
        this.sprites = new Map([["unpressed",new PIXI.Sprite.from(textures[0])],
                                ["pressed", new PIXI.Sprite.from(textures[1])]]);
        
        this.sprites.forEach( (sprite) => {
            sprite.interactive = true;
            sprite.visible = false;
            sprite.scale.set(7);
        })
        this.sprites.get("unpressed").visible = true;

        this.interactionRectangle = new PIXI.Rectangle();
        console.log("hello");
    }
}

/** Sends game events to appropriate handlers on button presses
 * @class
 * @extends MyButton
 */
class PlayerButton extends MyButton {
    constructor(textures, type, position, eventCallback, pauseCallback){
        super(textures);
        this.type = type;
        this.eventCallback = eventCallback;
        this.pauseCallback = pauseCallback;

        this.inPause = false;

        this.sprites.forEach( (sprite) => {
            sprite.position.copyFrom(position);
            sprite.alpha = 0.5;
        });

        this.height = this.sprites.get("unpressed").height;
        this.width = this.sprites.get("unpressed").width;
    }

    onPress(){
        this.swapButtons();
        const event = {
            type: "inputDown",
            direction: this.type
        }
        if (this.inPause){
            if ( event.direction == "up" ){
                event.direction = "enter";
            }
            this.pauseCallback(event);
        }       
        else
            this.eventCallback(event);
        this.pressed = true;    
    }

    onEnd(){
        this.swapButtons();
        const event = {
            type: "inputUp",
            direction: this.type
        }
        if (this.inPause)
            this.pauseCallback(event);
        else
            this.eventCallback(event);
        this.pressed = false;
    }

    onMove(event){
        let position = event.data.global;
        if ( this.pressed) {
            if (!this.sprites.get("pressed").getBounds().contains(position.x,position.y))
                this.onEnd();
        }
        else {
            if ( this.sprites.get("unpressed").getBounds().contains(position.x,position.y))
                this.onPress();
        }
        // console.log(position.x, posistion.y);
    }

    swapButtons(){
        if (this.sprites.get("unpressed").visible){
            this.sprites.get("unpressed").visible = false;
            this.sprites.get("pressed").visible = true;
        }
        else{
            this.sprites.get("unpressed").visible = true;
            this.sprites.get("pressed").visible = false;
        }
    }

    setPosition(position, offset){
        let newPosition = new PIXI.Point();
        newPosition.copyFrom(position);
        newPosition.x += offset.x;
        newPosition.y += offset.y;
        this.sprites.forEach((sprite) => {
            sprite.position.copyFrom(newPosition);
        } )
    }
}