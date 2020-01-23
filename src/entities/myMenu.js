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

export class PauseMenu{
    constructor(buttonTextures, ticker, playerPos, animationContainer, sound, font) {
        this.ticker = ticker;
        this.isOpen = false;
        this.toggleButton = new PauseToggleButton([buttonTextures.get("pause"), buttonTextures.get("exit")]);
        //this.audioCtx = new AudioContext();
       // this.music = document.getElementById("audio");
      //  this.music.loop = true;

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
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.width - 16, -window.innerHeight + 32);
        
        // add all interactive buttons to one container
        this.buttonContainer = new PIXI.Container();
           
        this.buttonContainer.addChild( this.toggleButton.buttonContainer, this.pausedText);

        this.animationContainer = animationContainer;

        // make menu list object
        this.menuList = new MenuList(playerPos, font);

        this.menuList.options.forEach( element => {
            this.buttonContainer.addChild(element.inactiveSprite);       
            this.buttonContainer.addChild(element.activeSprite);
        }) 

    }
  
    onClick(ticker){
        // toggle bools
        this.isOpen ^= 1;
        this.toggleButton.sprites.forEach( (sprite) => {
            sprite.visible ^= 1;
        })

        this.menuList.onToggle(this.isOpen);

        if ( this.controller ) {
            this.controller.buttons.forEach( button => {
                button.inPause = this.isOpen;
            })
        }

        // pause the game
        if (this.isOpen){
           // this.music.play();  
           // this.music.loop = true;
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
          //  this.music.pause();
            //this.music.currentTime = 0;
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

    handleEvent(event){
        let noUpdate = false;
        switch (event.type){
            case "inputDown":
                switch (event.direction) {
                    case "right":
                        if ( this.menuList.currentIndex >= this.menuList.options.length - 1)
                            this.menuList.currentIndex = 0;
                        else
                            this.menuList.currentIndex++;
                        
                        const i = this.menuList.currentIndex;
                        this.menuList.currentKey = this.menuList.options[i].label;
                        break;
                    case "left":
                        if (this.menuList.currentIndex == 0)
                            this.menuList.currentIndex = this.menuList.options.length - 1;
                        else
                            this.menuList.currentIndex--;

                        const j = this.menuList.currentIndex;
                        this.menuList.currentKey = this.menuList.options[j].label;
                        break;
                    case "enter":
                    case "up":
                        noUpdate = true;
                        switch ( this.menuList.currentKey ){
                            case "RESUME":
                            this.onClick(this.ticker);
                            break;
                            case "REROLL":
                            this.onReroll();
                            break;
                        }
                        break;
                        
                }
                if (!noUpdate)
                    this.menuList.updateOptions();
                break;
            default:
                break;
            
        }
    }

    onReroll(){
        /*
            delete all:
                - display objects
                - physics objects
                - map object
                - Pixi application
                - canvas element
            
            call setup function in main.js

            OR

            just refresh the page
        */

        window.location.reload();
    }

    attachController(controller) {
        this.controller = controller;
        this.buttonContainer.addChild(this.controller.buttonContainer);
    }

    staticText(buttonTextures) {
        const style = {
            fill: 0xffffff,
            fontSize: 52,
            fontFamily: 'ARCADECLASSIC'
        };
        let pauseText = new PIXI.Text("PAUSED", style)
        pauseText.visible = false;
        //pauseText.scale.set(14);
        pauseText.anchor.set(0.5);
        //pauseText.alpha = 0.5;
        return pauseText;
    }


    pauseBlinker(){
        this.pauseBlinkerLag += this.pauseTicker.deltaMS;

        if (this.pauseBlinkerLag > this.PAUSE_BLINKER_INTERVAL){
            this.pauseBlinkerLag -= this.PAUSE_BLINKER_INTERVAL;
            this.pausedText.visible ^= 1;
        }
    }

    
    moveButtons(position){
        if ( this.controller )
            this.controller.moveButtons(position);
        this.toggleButton.setPosition(position, this.toggleButtonOffset);
        this.pausedText.position.copyFrom(position);
        this.pausedText.y -= window.innerHeight - (this.pausedText.height/2 + 6);
        this.menuList.moveElements(this.pausedText.position);
    }

    
    onResize(){
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.width - 16, -window.innerHeight + 32);
        if ( this.controller)
            this.controller.onResize();
    }
}

class MenuList {
    constructor(position, font) {
        
        this.currentIndex = 0;

        this.options = [ new MenuListElement("RESUME", "placeholder", font),
                         new MenuListElement("REROLL", "placeholder", font),
                         new MenuListElement("PALETTE", "placeholder", font),
                         new MenuListElement("OPTIONS", "placeholder", font),
                       ];
          
        this.currentKey = this.options[0].label;
        
        this.moveElements(position);

    }



    moveElements(position){
        const indent = 40;
        const offset = 100;
        
        this.options.forEach( ( element, index ) => {
            element.activeSprite.position.copyFrom(position);
            element.inactiveSprite.position.copyFrom(position);

            element.activeSprite.y += offset;
            element.inactiveSprite.y += offset;

            element.inactiveSprite.x -= (200);
            element.activeSprite.x -= (200);

            element.activeSprite.x += indent * index;
            element.activeSprite.y += element.activeSprite.height * index;

            element.inactiveSprite.x += indent * index;
            element.inactiveSprite.y += element.activeSprite.height * index;       

            const activeOffset = 5;

            element.activeSprite.x += activeOffset;
            element.activeSprite.y -= activeOffset;
        });
    }

    onToggle(isPauseMenuOpen){
        if ( isPauseMenuOpen ){
            this.currentIndex = 0;

            this.options.forEach ( (element, index) => {
                element.inactiveSprite.visible = true;
                element.activeSprite.visible = false;
                if (index == 0){
                    element.activeSprite.visible = true;
                }
            });
        }
        else {
            this.options.forEach ( element => {
                element.inactiveSprite.visible = false;
                element.activeSprite.visible = false;
            });
        }
    }

    updateOptions() {
        console.log("successful pause menu event");
        this.options.forEach ( (element, index) => {
            element.activeSprite.visible = false;
            if ( index == this.currentIndex ){
                element.activeSprite.visible = true;
            }

        });
    }
}

class MenuListElement {
    constructor(name, callback, font){
        this.label = name;
        this.callback = callback;
        const style1 = {
            fill: 0xffa252,
            fontSize: 52,
            fontFamily: 'ARCADECLASSIC'
        };
        const style2 = {
            fill: 0xffffff,
            fontSize: 52,
            fontFamily: 'ARCADECLASSIC'
        }
        this.inactiveSprite = new PIXI.Text(name, style1);
        this.activeSprite = new PIXI.Text(name, style2);

        this.inactiveSprite.cacheAsBitmap = true;  
        this.activeSprite.cacheAsBitmap = true;  

        this.activeSprite.visible = false;
        this.inactiveSprite.visible = false;
    }
    
    
}