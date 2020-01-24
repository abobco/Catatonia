import {FilePaths} from './FilePaths'

// Aliases
let loader = PIXI.loader,
    resources = PIXI.loader.resources;

// Loads textures and shaders from files, stores them as object properties
export class MyLoader {
    constructor(setupFunction)
    {
        this.doneLoading = false;

        let loaderFiles = new FilePaths();

        PIXI.SCALE_MODES.DEFAULT = PIXI.SCALE_MODES.NEAREST;
        PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
        

        loader
            .add(loaderFiles.array())
            .add('pauseMusic', 'sound/tropical jam.mp3')
            .add('ARCADECLASSIC', 'fonts/ARCADECLASSIC.TTF')
            .load(this.onLoad.bind(this, setupFunction));  
    }
    
    // organize data into objects after files load
    onLoad(setupFunction)
    {
       this.lightShader = this.loadShaders();
       this.dissolveShader = this.loadDissolveShader();
       this.displacementShader = this.loadDisplacementShader();
       this.paletteFrag = this.loadPaletteFrag();
       this.paletteTextures = this.loadPalettes();  

       this.catnipFilter = this.loadFilters();

       //this.catFrameMap = this.loadFrames();
       this.catAnimations = this.animationsInit();

       this.tileset = this.loadTiles();

       this.torchFrames = this.loadTorch();

       this.doneLoading = true;

       this.buttonFrames = this.loadButtons();

       this.menuButtons = this.loadMenu();

       this.pauseMusic = this.loadSound();
       this.pauseMusic.loop = true;

       this.menuFont = this.loadFont();
        console.log(this.menuFont.data);

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

    loadPalettes(){
        return [PIXI.Texture.from(resources["sprites/color_map_1.png"].data),
                PIXI.Texture.from(resources["sprites/color_map_2.png"].data),
                PIXI.Texture.from(resources["sprites/color_map_3.png"].data)];
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

    // load dissolve shaders into a {string:string} map
    loadDissolveShader()
    {
        let vert = resources["shaders/dissolve/dissolveVert.GLSL"].data,
        frag = resources["shaders/dissolve/dissolveFrag.GLSL"].data;

    return {
            "vert": vert,
            "frag": frag,
           };
    }

    loadDisplacementShader(){
        let vert = resources["shaders/BezierDisplacementFilter/BezierDispVert.GLSL"].data,
        frag = resources["shaders/BezierDisplacementFilter/BezierDispFrag.GLSL"].data;

    return {
            "vert": vert,
            "frag": frag,
           };
    }

    loadFilters(){
        let vert = resources["shaders/catnip-effect/catnipVert.GLSL"].data,
        frag = resources["shaders/catnip-effect/catnipFrag.GLSL"].data;

    return {
            "vert": vert,
            "frag": frag,
           };
    }

    loadPaletteFrag(){
        return resources["shaders/PaletteSwap/paletteSwap.GLSL"].data;
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

        // console.log(newSprite);
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

    // must change the for loop when new tiles are added
    loadTiles(){
        let textures = [];
        
        for ( let i = 1; i < 24; i++ ) {
            const val = i;       
            let texture = PIXI.Texture.from(`caveTile (${val}).png`); 
            textures.push( texture );
        }
        
        return new Map([['Background', textures[0]],
                        ['TLCorner', textures[1]],
                        ['TopEdge', textures[2]],
                        ['TRCorner', textures[3]],
                        ['LeftEdge', textures[4]],
                        ['Interior', textures[5]],
                        ['RightEdge', textures[6]],
                        ['BLCorner', textures[7]],
                        ['BottomEdge', textures[8]],
                        ['BRCorner', textures[9]],
                        ['Wang', textures[10]],
                        ['Shaft', textures[11]],
                        ['Loner', textures[13]],
                        ['Spikes', textures[14]],
                        ['Moon', textures[15]],
                        ['Sky', textures[16]],
                        ['Stars-1', textures[17]],
                        ['Stars-2', textures[18]],
                        ['Stars-3', textures[19]],
                        ['Grass-1', textures[20]],
                        ['Grass-2', textures[21]],
                        ['catnip', textures[22]],

                    ]);
    }

    loadButtons(){
        // console.log(PIXI.Texture.from('right-key (1).png'))
        let buttonFrames = new Map([['right', [PIXI.Texture.from('right-key (1).png'), PIXI.Texture.from('right-key (2).png')]],
                                    ['left', [PIXI.Texture.from('left-key (1).png'), PIXI.Texture.from('left-key (2).png')]],
                                    ['up', [PIXI.Texture.from('a-key (1).png'), PIXI.Texture.from('a-key (2).png')]],]);
        return buttonFrames;
    }

    loadMenu(){
        let buttonFrames = new Map([['pause', PIXI.Texture.from("pause.png")],
                                    ['exit', PIXI.Texture.from("exit-button.png")],
                                    ['paused-text', PIXI.Texture.from("paused-text.png")]
                                   ]);

        return buttonFrames;
    }

    loadSound(){
        return resources.pauseMusic.data;

    }
    
    loadFont() {
        return resources.ARCADECLASSIC;
    }
}