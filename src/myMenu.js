import {ButtonController} from './buttons.js'


class PauseToggleButton{
    constructor(texture){
        this.sprite = new PIXI.Sprite.from(texture);

        this.sprite.interactive = true;
        this.sprite.alpha = 0.5;
        this.sprite.scale.set(3);
    }

    setPosition(position, offset){
        let newPosition = new PIXI.Point();
        newPosition.copyFrom(position);
        newPosition.x += offset.x;
        newPosition.y += offset.y;
        this.sprite.position.copyFrom(newPosition);
    }

}
class PauseMenu{
    constructor(buttonTextures, ticker, playerPos, controller, animationContainer){
        this.isOpen = false;
        this.toggleButton = new PauseToggleButton(buttonTextures.get("pause"));

        this.toggleButton.sprite.on("click", this.onClick.bind(this, ticker));
        this.toggleButton.sprite.on("tap", this.onClick.bind(this, ticker));
        this.toggleButton.sprite.position.set(playerPos.x, playerPos.y);

        this.pausedText = new PIXI.Sprite.from(buttonTextures.get("paused-text"));
        this.pausedText.visible = false;
        this.pausedText.scale.set(14);
        this.pausedText.anchor.set(0.5);
        this.pausedText.alpha = 0.5;

        this.controller = controller;
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.sprite.width - 16, -window.innerHeight + 32);
        
        this.buttonContainer = new PIXI.Container();
        if ( this.controller )
            this.buttonContainer.addChild(this.controller.buttonContainer)
        this.buttonContainer.addChild( this.toggleButton.sprite, this.pausedText);

        this.pauseTicker = new PIXI.Ticker();
        this.pauseTicker.add(this.pauseBlinker.bind(this));
        this.PAUSE_BLINKER_INTERVAL = 500;
        this.pauseBlinkerLag = 0;

        this.animationContainer = animationContainer;

    }

    onResize(){
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.sprite.width - 16, -window.innerHeight + 32);
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
        this.isOpen ^= 1;

        if (this.isOpen){
            this.pauseTicker.start();
            this.pausedText.visible = true;
            this.pauseBlinkerLag = 0;
            this.pauseBlinker();
            console.log( ticker.lastTime);
            ticker.speed = 0;
            if (this.controller){
                this.controller.buttonContainer.children.forEach( (button) => {
                    button.visible = false;
                })
            }

            this.animationContainer.children.forEach( ( animation ) => {
                animation.stop();
            })
        }
        else {
            console.log( ticker.lastTime);
            ticker.speed = 1;
            this.pausedText.visible = false;
            this.pauseTicker.stop();
            this.pauseBlinker()
            if (this.controller){
                this.controller.buttons.forEach( (button) => {
                    button.sprites.forEach( (sprite, key) => {
                        if ( key == "unpressed" ){
                            sprite.visible = true;
                        }
                    })
                })
            }

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