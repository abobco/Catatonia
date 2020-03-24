import {ColorReplaceFilter} from '@pixi/filter-color-replace';
/**
 * Retro style pause menu, contains options for:
 * - Palette swapping 
 * - Refreshing the page
 * - Hiding Controller buttons
 * - Disabling screen shake
 * @class
 */
export class PauseMenu{
    /**
     * @param {Map<string, PIXI.Texture>} buttonTextures - button sprites
     * @param {PIXI.Texture[]} colorMaps - array of color map textures for palette swapping
     * @param {PIXI.Point} playerPos - starting position
     * @param {PIXI.Container} animationContainer - all animations to be paused 
     * @param {PIXI.Filter} paletteFilter - palette swap post processing filter
     * @param {PIXI.Container} playerAnimations - lazy fix for player animations being in their own container 
     * @param {PIXI.Ticker} ticker - game update ticker
     * @param {PIXI.Ticker} catnipTicker - ticker for the catnip trip effect
     */
    constructor(buttonTextures, colorMaps,  playerPos, animationContainer, paletteFilter, playerAnimations, ticker, catnipTicker)               
        {
        this.ticker = ticker;
        this.catnipTicker = catnipTicker;
        this.isOpen = false;
        this.inPaletteMenu = false;
        this.inOptionsMenu = false;
        this.toggleButton = new PauseToggleButton([buttonTextures.get("pause"), buttonTextures.get("exit")]);
        this.paletteFilter = paletteFilter;
        this.colorMaps = colorMaps;
        this.playerAnimations = playerAnimations;
        this.cameraShake = true;

        // menu theme colors corresponding to different color palettes
        this.menuColors = [0xffa252, 0x393863, 0xb5d3de, 0x948abd ]
        
        // this.audioCtx = new AudioContext();
        // this.music = document.getElementById("audio");
        // this.music.loop = true;

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
        this.mainMenu = new MenuList(playerPos);
        this.paletteMenu = new PaletteMenuList(playerPos);
        this.optionsMenu = new OptionsMenu(playerPos);

        this.activeMenu = this.mainMenu;
        this.subMenus = [this.mainMenu, this.paletteMenu, this.optionsMenu];

        this.subMenus.forEach( subMenu => {
            this.buttonContainer.addChild(subMenu.displayContainer);
        });
        let colorSwapper = new ColorReplaceFilter(0x181000, 0xffa252, 0.001);
        this.playerAnimations.filters.push(colorSwapper);

        this.changePalette();

        this.subMenus.forEach( subMenu => {
            subMenu.displayContainer.children.forEach( item => {
                item.visible = false;
            });
        });
    }
  
    onClick(ticker){
        // toggle bools
        this.isOpen ^= 1;
        this.toggleButton.sprites.forEach( (sprite) => {
            sprite.visible ^= 1;
        });

        if (this.isOpen){
            this.activeMenu.onToggle(this.isOpen);
            this.inPaletteMenu = false;
        }
        else {
            this.activeMenu.onToggle(this.isOpen);
            this.activeMenu = this.mainMenu;
            this.activeMenu.onToggle(this.isOpen);
        }

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
            this.catnipTicker.speed = 0;
            if (this.controller){ // disable touch controls if applicable
                this.controller.buttonContainer.children.forEach( (button) => {
                    button.interactive = false;
                })
            }
            // pause all animations
            this.animationContainer.children.forEach( ( animation ) => {
                if (animation.stop)
                    animation.stop();
            })
            this.playerAnimations.children.forEach( animation => {
                animation.stop();
            })
        }
        // resume the game
        else {
            // this.music.pause();
            // this.music.currentTime = 0;
            
            ticker.speed = 1;
            this.catnipTicker.speed = 1;
            this.pausedText.visible = false;
            this.pauseTicker.stop();
            if (this.controller){ // enable touch controls if applicable
                this.controller.buttonContainer.children.forEach( (button) => {
                    button.interactive = true;
                })
            }
            // resume all animations
            this.animationContainer.children.forEach( ( animation ) => {
                if (animation.play)
                    animation.play();
            })
            this.playerAnimations.children.forEach( animation => {
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
                        if ( this.activeMenu.currentIndex >= this.activeMenu.options.length - 1)
                            this.activeMenu.currentIndex = 0;
                        else
                            this.activeMenu.currentIndex++;
                        
                        const i = this.activeMenu.currentIndex;
                        this.activeMenu.currentKey = this.activeMenu.options[i].label;

                        if ( this.inPaletteMenu ){
                            this.changePalette();
                        }
                        break;
                    case "left":
                        if (this.activeMenu.currentIndex == 0)
                            this.activeMenu.currentIndex = this.activeMenu.options.length - 1;
                        else
                            this.activeMenu.currentIndex--;

                        const j = this.activeMenu.currentIndex;
                        this.activeMenu.currentKey = this.activeMenu.options[j].label;

                        if ( this.inPaletteMenu ){
                            this.changePalette();
                        }
                        break;
                    case "enter":
                    case "up":
                        noUpdate = true;
                        switch ( this.activeMenu.currentKey ){
                            case "RESUME":
                                this.onClick(this.ticker);
                                break;
                            case "REROLL":
                                this.onReroll();
                                break;
                            case "PALETTE":
                                noUpdate = false;
                                this.togglePalleteMenu(true);
                                // noUpdate = false;
                                break;
                            case "OPTIONS":
                                noUpdate = false;
                                this.toggleOptionsMenu(true);
                                break;
                            case "SWAP MAPS":
                                window.location.replace("http://www.studiostudios.net/catatonia/squad/dungeon/index.html");
                            case "BACK":
                                noUpdate = false;
                                this.toggleOptionsMenu(false);
                                break;
                            case "HIDE   BUTTONS:   ON":
                            case "HIDE   BUTTONS:   OFF":
                                if ( this.controller ){
                                    this.controller.buttonContainer.visible ^= 1;
                                    const visible = this.controller.buttonContainer.visible;
                                    this.toggleButton.buttonContainer.children.forEach( sprite => {
                                        if ( visible) {
                                            sprite.alpha = 0.5;
                                        }
                                        else {
                                            sprite.alpha = 0;
                                        }
                                    })
                                    if ( visible ) {
                                        this.optionsMenu.options[1].inactiveSprite.text = "HIDE   BUTTONS:   OFF";
                                        this.optionsMenu.options[1].activeSprite.text = "HIDE   BUTTONS:   OFF";
                                    }
                                    else {
                                        this.optionsMenu.options[1].inactiveSprite.text = "HIDE   BUTTONS:   ON"
                                        this.optionsMenu.options[1].activeSprite.text = "HIDE   BUTTONS:   ON"
                                    }
                                }
                                noUpdate = false;
                                break;
                            case "CAMERA   SHAKE:   OFF":
                            case "CAMERA   SHAKE:   ON":
                                this.cameraShake ^= 1;
                                if (  this.cameraShake ) {
                                    this.optionsMenu.options[2].inactiveSprite.text = "CAMERA   SHAKE:   ON";
                                    this.optionsMenu.options[2].activeSprite.text = "CAMERA   SHAKE:   ON";
                                }
                                else {
                                    this.optionsMenu.options[2].inactiveSprite.text = "CAMERA   SHAKE:   OFF"
                                    this.optionsMenu.options[2].activeSprite.text = "CAMERA   SHAKE:   OFF"
                                }
                                noUpdate = false;
                                break;
                            default :
                                noUpdate = false;
                                this.togglePalleteMenu(false);
                        }
                        break;
                        
                }
                if (!noUpdate)
                    this.activeMenu.updateOptions();
                break;
            default:
                break;
            
        }
    }

    // refresh the page to generate a new map
    onReroll(){
        window.location.reload();
    }

    changePalette(){
        // this.playerAnimations.filters.length =2;
        let numFilters = this.playerAnimations.filters.length;
        let postFilters = [this.playerAnimations.filters[numFilters-1], this.playerAnimations.filters[numFilters-2]]
        switch ( this.paletteMenu.currentKey ){
            case "SIMBA":   // just use the default sprite
                this.playerAnimations.filters = postFilters;
                break;
            default:       // apply a new color replacement filter
                // color map index is off by 1 cuz the simba palette doesn't have a filter                
                const index = this.paletteMenu.currentIndex-1; 
                this.paletteFilter.uniforms.Palette = this.colorMaps[index]; 
                this.playerAnimations.filters = [
                    this.paletteFilter, postFilters[0], postFilters[1]
                ];
        }
        
        // change the font color
        let newStyle = {
            fill: this.menuColors[this.paletteMenu.currentIndex],
            fontSize: 52,
            fontFamily: 'ARCADECLASSIC'
        };
        // draw new menu text for the palette
        this.subMenus.forEach( subMenu => {
            subMenu.displayContainer.removeChildren();
            subMenu.options.forEach( option => {
                delete option.inactiveSprite;
                option.inactiveSprite = new PIXI.Text(option.label, newStyle);
                subMenu.displayContainer.addChild(option.inactiveSprite);
                subMenu.displayContainer.addChild(option.activeSprite)
            })
        });     
    }

    togglePalleteMenu(isOpen) {
        if (isOpen){
            this.inPaletteMenu = true;
            this.mainMenu.displayContainer.visible = false;
            this.optionsMenu.displayContainer.visible = false;
            this.paletteMenu.onToggle(true, true);
    
            this.activeMenu = this.paletteMenu;
        }
        else {
            this.inPaletteMenu = false;
            this.paletteMenu.displayContainer.visible = false;
            this.mainMenu.displayContainer.visible = true;

            this.mainMenu.currentIndex = 0;
            this.mainMenu.currentKey = "RESUME";

            this.activeMenu = this.mainMenu;
        }
    }

    toggleOptionsMenu(isOpen) {
        if (isOpen){
            this.inOptionsMenu = true;
            this.mainMenu.displayContainer.visible = false;
            this.paletteMenu.displayContainer.visible = false;
            this.optionsMenu.displayContainer.visible = true;
            this.optionsMenu.onToggle(true, false);
    
            this.activeMenu = this.optionsMenu;
        }
        else {
            this.inOptionsMenu = false;
            this.paletteMenu.displayContainer.visible = false;
            this.optionsMenu.displayContainer.visible = false;
            this.mainMenu.displayContainer.visible = true;

            this.mainMenu.currentIndex = 0;
            this.mainMenu.currentKey = "RESUME";

            this.activeMenu = this.mainMenu;
        }
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
        this.mainMenu.moveElements(this.pausedText.position);
        this.paletteMenu.moveElements(this.pausedText.position);
        this.optionsMenu.moveElements(this.pausedText.position);
    }

    
    onResize(){
        this.toggleButtonOffset = new PIXI.Point(window.innerWidth - this.toggleButton.width - 16, -window.innerHeight + 32);
        if ( this.controller)
            this.controller.onResize();
    }
}

/**
 * Touch button for toggling the pause menu
 * @class
 */
class PauseToggleButton{
    /**
     * @param {Map<string, PIXI.Texture>} textures 
     */
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

/**
 * Cascading list of Menu UI elements
 */
class MenuList {
    /**
     * @param {PIXI.Point} position 
     */
    constructor(position) {
        this.displayContainer = new PIXI.Container();
        this.currentIndex = 0;

        this.options = [ new MenuListElement("RESUME"),
                         new MenuListElement("REROLL"),
                         new MenuListElement("PALETTE"),
                         new MenuListElement("OPTIONS"),
                         new MenuListElement("SWAP MAPS")
                       ];
        this.options.forEach(option => {
            this.displayContainer.addChild(option.inactiveSprite);          
            this.displayContainer.addChild(option.activeSprite);
        });  
          
        this.currentKey = this.options[0].label;
        
        this.moveElements(position);
    }

    /** @param {PIXI.Point} position - world position of the camera object */
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


    onToggle(isPauseMenuOpen, keepIndex){
        if ( isPauseMenuOpen ){
            if (!keepIndex)
                this.currentIndex = 0;
            else 
                this.currentKey = this.options[this.currentIndex].label;
            this.displayContainer.visible = true;
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
        this.options.forEach ( (element, index) => {
            element.activeSprite.visible = false;
            if ( index == this.currentIndex ){
                element.activeSprite.visible = true;
            }

        });
    }
}

/**
 * Palette swap submenu, activates different color replacement filters, changes menu text color
 * @class 
 * @extends MenuList
 */
class PaletteMenuList extends MenuList{
    /**
     * @param {PIXI.Point} position 
     */
    constructor(position){
        super(position);

        this.currentIndex = Math.floor(Math.random() * 4);
        this.displayContainer.removeChildren();

        this.options = [ new MenuListElement("SIMBA"),
                         new MenuListElement("VANTA"),
                         new MenuListElement("COCO"),
                         new MenuListElement("PURP"),
                       ];
        this.options.forEach(option => {
            this.displayContainer.addChild(option.inactiveSprite);          
            this.displayContainer.addChild(option.activeSprite);
        });

        this.moveElements(position);
        this.currentKey = this.options[this.currentIndex].label;
    }
}

/**
 * Options submenu, contains toggle switches for :
 * - Hiding touch buttons
 * - disabling screen shake
 * @class 
 * @extends MenuList
 */
class OptionsMenu extends MenuList{
    /**
     * @param {PIXI.Point} position 
     */
    constructor(position){
        super(position);

        this.displayContainer.removeChildren();

        this.options = [ new MenuListElement("BACK"), 
                         new MenuListElement("HIDE   BUTTONS:   OFF"),
                         new MenuListElement("CAMERA   SHAKE:   ON")
                       ];
        this.options.forEach(option => {
            this.displayContainer.addChild(option.inactiveSprite);          
            this.displayContainer.addChild(option.activeSprite);
        });

        this.moveElements(position);
        this.currentKey = this.options[this.currentIndex].label;
    }
}

/**
 * Basic text UI element, lights up when selected
 * @class
 */
class MenuListElement {
    /**
     * @param {string} name 
     */
    constructor(name){
        this.label = name;
        this.style1 = {
            fill: 0xffa252,
            fontSize: 52,
            fontFamily: 'ARCADECLASSIC'
        };
        const style2 = {
            fill: 0xffffff,
            fontSize: 52,
            fontFamily: 'ARCADECLASSIC'
        }
        this.inactiveSprite = new PIXI.Text(name, this.style1);
        this.activeSprite = new PIXI.Text(name, style2);

        this.activeSprite.visible = false;
        this.inactiveSprite.visible = false;
    }   
}