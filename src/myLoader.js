import Matter from 'matter-js/build/matter.min.js';

import {FilePaths} from './FilePaths.js'

// Aliases
let loader = PIXI.loader,
    resources = PIXI.loader.resources;

// Loads sprites and shaders from files, stores them as object properties
class myLoader {
    constructor(setupFunction)
    {
        this.doneLoading = false;

        let loaderFiles = new FilePaths();

        loader
            .add(loaderFiles.array())
            .load(this.onLoad.bind(this, setupFunction));  
    }
    
    // organize data into objects after files load
    onLoad(setupFunction)
    {
       this.lightShader = this.loadShaders();

       //this.catFrameMap = this.loadFrames();
       this.catAnimations = this.animationsInit();

       this.tileset = this.loadTiles();

       this.torchFrames = this.loadTorch();

       this.doneLoading = true;

       // this.checkLoad();

       setupFunction();
    }

    // debugging for dummies
    checkLoad() 
    {
        console.log(this.lightShader);
        console.log(this.catAnimations);
        console.log(this.doneLoading);
    }

    // load light shaders into a {string:string} map
    loadShaders()
    {
        let vert = resources["shaders/lightVert.GLSL"].data,
            frag = resources["shaders/lightFrag.GLSL"].data;

        return {
                "vert": vert,
                "frag": frag,
               };
    }
    
    /*
        Init animated sprite objects, load into a hashmap
        
        The texture atlas must have keys of the form :
        
            `{key} ({frameNumber}).png` 
        
        where the {key} for each animation matches the strings that we provide in this function as keys to each animation of the map
        
        The {frameNumber} must start at 1, this is only because that's how batch renaming works in windows by default.
    */
    animationsInit(){
        let animationMap = new Map([['walk', this.loadSprite("walk", 10, true)],
                                    ['stop', this.loadSprite("stop", 4, false)],
                                    ['idle', this.loadSprite("idle", 9, false)],
                                    ['jump', this.loadSprite("jump", 8, false)],
                                    ['slide',this.loadSprite("slide", 4, false)],
                                    ['hang', this.loadSprite("hang", 3, false)],
                                    ['climb', this.loadSprite("climb", 9, false)],
                                    ['fall', this.loadSprite("fall", 6, true)]]);
        
        // set unique properties for some animations
        animationMap.get("slide").anchor.y = 0.3;
        animationMap.get("hang").anchor.y = 0.3;
        animationMap.get("climb").anchor.y = 0.65;
        animationMap.get("climb").anchor.x = 0.85;

        animationMap.get("idle").animationSpeed = 0.15;

        animationMap.forEach((value, key) => {
            if ( key != "jump")
                value.visible = false; // since the game starts with the cat falling, hide other animations
        });

        animationMap.get("jump").play();

        return animationMap;
    }

    // load textures from memory into animated sprite objects
    loadSprite(key, frameCount, doesLoop, animationSpeed = 0.2 ){
        let frames = [];
        for ( let i = 1; i < (frameCount+1); i++ ) {
            const val = i;
            const keyString = `${key} (${val}).png`;
            frames.push(PIXI.Texture.from(keyString));
        }

        let newSprite = new PIXI.AnimatedSprite(frames);
        newSprite.x = window.innerWidth / 2;
        newSprite.y = window.innerHeight / 2;
        newSprite.vx = 0;
        newSprite.vy = 0;
        newSprite.scale.set(3.5, 3.5);
        newSprite.anchor.set(0.5);
        newSprite.animationSpeed = animationSpeed;
        newSprite.loop = doesLoop;

        console.log(newSprite);
        return newSprite;
    }

    loadTorch(){
        let frames = [];
        for ( let i = 1; i < 10; i++){
            const val = i;
            frames.push(PIXI.Texture.from(`torch (${val}).png`));
        }
        return frames;
    }

    loadTiles(){
        let sprites = [];
        
        for ( let i = 1; i < 23; i++ ) {
            const val = i;       
            let texture = PIXI.Texture.from(`caveTile (${val}).png`); 
            sprites.push( texture );
        }
        
        return new Map([['Background', sprites[0]],
                        ['TLCorner', sprites[1]],
                        ['TopEdge', sprites[2]],
                        ['TRCorner', sprites[3]],
                        ['LeftEdge', sprites[4]],
                        ['Interior', sprites[5]],
                        ['RightEdge', sprites[6]],
                        ['BLCorner', sprites[7]],
                        ['BottomEdge', sprites[8]],
                        ['BRCorner', sprites[9]],
                        ['Wang', sprites[10]],
                        ['Shaft', sprites[11]],
                        ['Loner', sprites[13]],
                        ['Spikes', sprites[14]],
                        ['Moon', sprites[15]],
                        ['Sky', sprites[16]],
                        ['Stars-1', sprites[17]],
                        ['Stars-2', sprites[18]],
                        ['Stars-3', sprites[19]],
                        ['Grass-1', sprites[20]],
                        ['Grass-2', sprites[21]],

                    ]);
    }
}

export {myLoader}