class MyButton {
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
    }
}

class PlayerButton extends MyButton {
    constructor(textures, type, position, eventCallback){
        super(textures);
        this.type = type;
        this.eventCallback = eventCallback;


        this.sprites.get("unpressed").on('touchstart', this.onPress.bind(this));
        this.sprites.get("pressed").on('touchend', this.onEnd.bind(this));
        //this.sprites.get("pressed").on('pointerout', this.onEnd.bind(this));
        //this.sprites.get("unpressed").on('pointerout', this.onEnd.bind(this));

        this.sprites.forEach( (sprite) => {
            sprite.position.copyFrom(position);
            sprite.alpha = 0.5;
        });

        this.height = this.sprites.get("unpressed").height;
        this.width = this.sprites.get("unpressed").width;
    }

    onPress(){
        this.swapButtons();
        this.eventCallback({
            type: "inputDown",
            direction: this.type
        });
        this.pressed = true;
    }

    onEnd(){
        this.swapButtons();
        this.eventCallback({
            type: "inputUp",
            direction: this.type
        })
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
        console.log(position.x, posistion.y);
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

class ButtonController{
    constructor( buttonFrames, playerPos, eventCallback ){
        this.buttonContainer = new PIXI.Container();
        this.buttons = new Map([["left", new PlayerButton(buttonFrames.get("left"), "left",playerPos, eventCallback)],
                                ["right", new PlayerButton(buttonFrames.get("right"), "right",playerPos, eventCallback)],
                                ["up", new PlayerButton(buttonFrames.get("up"), "up",playerPos, eventCallback)]])

        this.buttons.forEach( (button) => {
            button.sprites.forEach( (sprite ) => {
                this.buttonContainer.addChild( sprite );
            });
        });

        this.leftButtonOffset = new PIXI.Point(-window.innerWidth + 10, window.innerHeight- (this.buttons.get("left").height + 10));
        this.rightButtonOffset = new PIXI.Point(this.leftButtonOffset.x + this.buttons.get("left").width + 5, this.leftButtonOffset.y);
        this.upButtonOffset = new PIXI.Point(window.innerWidth - this.buttons.get("left").width -  5, this.leftButtonOffset.y);

        
        // this.sprites.get("unpressed").on('touchmove', this.onMove.bind(this));
        // this.sprites.get("pressed").on('touchmove', this.onMove.bind(this));

        this.buttonContainer.children.forEach( (sprite) => {
            sprite.on('touchmove', this.onMove.bind(this));
        })
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

        console.log(position.x, posistion.y);
    }

    moveButtons(cameraPos){
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

export {PlayerButton , MyButton, ButtonController};