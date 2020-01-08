class PauseToggleButton{
    constructor(textures){
        this.sprites = new Map([['pause', PIXI.Sprite.from(textures[0])],
                                ['exit', PIXI.Sprite.from(textures[1])] 
                               ]);

        this.buttonContainer = new PIXI.Container();

        this.sprites.forEach( (sprite) => {
            sprite.interactive = true;
            sprite.alpha = 0.5;
            sprite.scale.set(3);

            this.buttonContainer.addChild(sprite);
        });

        this.width = this.sprites.get("exit").width;
        this.height = this.sprites.get("exit").height;

        this.sprites.get("exit").visible = false;
    }

    setPosition(position, offset){
        let newPosition = new PIXI.Point();
        newPosition.copyFrom(position);
        newPosition.x += offset.x;
        newPosition.y += offset.y;
        this.buttonContainer.children.forEach( (sprite) => {
            sprite.position.copyFrom(newPosition);
        });
    }
}

class PauseMenu{
    constructor(buttonTextures, ticker, playerPos, controller, animationContainer){
        this.isOpen = false;
        this.toggleButton = new PauseToggleButton([buttonTextures.get("pause"), buttonTextures.get("exit")]);

        // subscribe pause button to click and tap events
        this.toggleButton.sprites.forEach( (sprite) => {
            sprite.on("click", this.onClick.bind(this, ticker));
            sprite.on("tap", this.onClick.bind(this, ticker));
            sprite.position.set(playerPos.x, playerPos.y);
        })

        // blinking paused text
        this.pausedText = this.staticText(buttonTextures);
        this.pauseTicker = new PIXI.Ticker();
        this.pauseTicker.add(this.pauseBlinker.bind(this));
        this.PAUSE_BLINKER_INTERVAL = 500;
        this.pauseBlinkerLag = 0;

        // touch controls
        this.controller = controller;
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.width - 16, -window.innerHeight + 32);
        
        // add all interactive buttons to one container
        this.buttonContainer = new PIXI.Container();
        if ( this.controller )
            this.buttonContainer.addChild(this.controller.buttonContainer)
        this.buttonContainer.addChild( this.toggleButton.buttonContainer, this.pausedText);



        this.animationContainer = animationContainer;

    }

    staticText(buttonTextures) {
        let pauseText = new PIXI.Sprite.from(buttonTextures.get("paused-text"));
        pauseText.visible = false;
        pauseText.scale.set(14);
        pauseText.anchor.set(0.5);
        pauseText.alpha = 0.5;
        return pauseText;
    }


    onResize(){
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.width - 16, -window.innerHeight + 32);
        if ( this.controller)
            this.controller.onResize();
    }

    moveButtons(position){
        if ( this.controller )
            this.controller.moveButtons(position);
        this.toggleButton.setPosition(position, this.toggleButtonOffset);
        this.pausedText.position.copyFrom(position);
        this.pausedText.y -= window.innerHeight - (this.pausedText.height/2 + 6);
    }

    
    onClick(ticker){
        // toggle bools
        this.isOpen ^= 1;
        this.toggleButton.sprites.forEach( (sprite) => {
            sprite.visible ^= 1;
        })

        // pause the game
        if (this.isOpen){
            this.pauseTicker.start();
            this.pausedText.visible = true;
            this.pauseBlinkerLag = 0;
            this.pauseBlinker();
            ticker.speed = 0;
            if (this.controller){ // disable touch controls if applicable
                this.controller.buttonContainer.children.forEach( (button) => {
                    button.interactive = false;
                })
            }
            // pause all animations
            this.animationContainer.children.forEach( ( animation ) => {
                animation.stop();
            })
        }
        // resume the game
        else {
            ticker.speed = 1;
            this.pausedText.visible = false;
            this.pauseTicker.stop();
            this.pauseBlinker()
            if (this.controller){ // enable touch controls if applicable
                this.controller.buttonContainer.children.forEach( (button) => {
                    button.interactive = true;
                })
            }
            // resume all animations
            this.animationContainer.children.forEach( ( animation ) => {
                animation.play();
            })
        }
    }

    pauseBlinker(){
        this.pauseBlinkerLag += this.pauseTicker.deltaMS;

        if (this.pauseBlinkerLag > this.PAUSE_BLINKER_INTERVAL){
            this.pauseBlinkerLag -= this.PAUSE_BLINKER_INTERVAL;
            this.pausedText.visible ^= 1;
        }
    }
}

export { PauseMenu }