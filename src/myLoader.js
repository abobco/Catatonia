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

       this.catFrameMap = this.loadFrames();

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
        console.log(this.catFrameMap);
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

    // load animation sprites for the player into a {string:Texture[]} map
    loadFrames() 
    {
        // Init the anmiation objects
        let walkFrames = [],
            stopFrames = [],
            jumpFrames = [],
            slideFrames = [],
            hangFrames = [],
            climbFrames = [];
        // load all them animation frames
        // frame counts are hardcoded cuz idk how to get that info from the loader
        for ( let i = 1; i < 11; i++ ) {
            const val = i;
            walkFrames.push(PIXI.Texture.from(`walk (${val}).png`));
        }
        for ( let i = 0; i < 5; i++ ) {
            const val = i;
            stopFrames.push(PIXI.Texture.from(`stop00${val}.png`));
        }
        for ( let i = 0; i < 8; i++ ) {
            const val = i;
            jumpFrames.push(PIXI.Texture.from(`Jump00${val}.png`));
        }
        for ( let i = 0; i < 4; i++ ) {
          const val = i;
          slideFrames.push(PIXI.Texture.from(`wallSlide00${val}.png`));
        }
        for ( let i = 0; i < 3; i++ ) {
          const val = i;
          hangFrames.push(PIXI.Texture.from(`catHang00${val}.png`));
        }
        for ( let i = 0; i < 9; i++) {
          const val = i;
          climbFrames.push(PIXI.Texture.from(`climb00${val}.png`));
        }
    
        let frameMap = new Map ([['walk', walkFrames],
                                  ['stop', stopFrames],
                                  ['jump', jumpFrames],
                                  ['slide',slideFrames],
                                  ['hang', hangFrames],
                                  ['climb', climbFrames]]);
        return frameMap;
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
        let tileSize = 150;
        let sprites = []
     
        // let texture = resources['sprites/caveTiles.png'].texture;
        
        for ( let i = 1; i < 23; i++ ) {
            const val = i;       
            let texture = PIXI.Texture.from(`caveTile (${val}).png`); 
            //let sprite = new PIXI.Sprite.from( PIXI.Texture.from(`caveTile (${val}).png`) );
            //sprite.width = sprite.height = tileSize
            //let sprite = new PIXI.TilingSprite( texture, tileSize, tileSize );
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