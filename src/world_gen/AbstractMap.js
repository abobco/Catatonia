
import {PointLight} from '../lighting/PointLight.js'
import {Powerup} from '../entities/powerups.js'
import { Spectre } from '../entities/NPCs/spectre.js';
import { FilterCache, TextureBufferFilter } from '../filters/TextureBuffer.js';
import { Rectangle } from 'pixi.js';

/** Parent of all other procedural generation map classes 
 * @class
*/
export class AbstractMap{
    /**
     * @param {Object} options - options for map generation
     * @param {number} options.w - width of map in tiles
     * @param {number} options.h - height of map in tiles
     * @param {number} options.tileSize - edge length of tiles in pixels
     * @param {number} options.numLights -  number of lights to randomly place in map
     * @param {Map<string,PIXI.Texture>} options.tileset - tile textures
     * @param {PIXI.Texture[]} options.torchFrames - Torch animation textures
     * @param {PIXI.Texture[]} options.spectreTextures - spectre NPC textures
     * @param {Matter.world} options.world - physics world
     * @param {FilterCache} options.filterCache - framebuffer & filter manager
     * @param {Rectangle} options.screen - viewport rectangle
     */
    constructor(options){ 
        this.world = options.world // matterjs physics world
        this.filterCache = options.filterCache
        this.screen = options.screen;

        this.w = options.w;                             // width of map in tiles
        this.h = options.h;                             // width of map in tiles
        this.tileSize = options.tileSize;               // edge length of tiles in pixels

        this.tileMap = {}                       // hashmap of characters representing map features
        this.visited = {}                       // hashmap of visited tiles for connectivity BFS
        this.BFSresult = {}                     // result of checking for largest connected area   
        this.openCount = 0;
        this.tileset = options.tileset;                 // hashmap of textures
        this.numLights = options.numLights;             // number of lights to randomly place in map
        this.freeCells = [];                    // keys for empty map tiles
        this.groundTiles = [];                  // keys for tiles with walkboxes

        this.terrain = [];                      // box colliders for walls
        this.lights = [];                       // light shading meshes 
        this.torchFrames = options.torchFrames;         // torch animation textures
        this.torchSprites = [];                 // torch animated sprites

        this.spectres = [];

        // containers for display objects
        this.tileContainer = new PIXI.Container();
        this.backgroundContainer = new PIXI.Container();
        this.torchContainer = new PIXI.Container();
        this.powerupContainer = new PIXI.Container();
        this.spectreContainer = new PIXI.Container();
        this.lightContainer = new PIXI.Container();

         // spooky ghost trail effect
         this.filter = new TextureBufferFilter();
         this.spectreContainer.filters = [ this.filter];
         this.filter.cache = options.filterCache;
         this.spectreContainer.filterArea = options.screen;

        this.tileContainer.addChild(this.lightContainer);
        this.tileContainer.addChild(this.spectreContainer);

        // spectreTextures 
        this.spectreTextures = options.spectreTextures;

        // using sets here to filter out duplicate edges/vertices
        // feed these into raycasting functions
        this.edges = new Set();
        this.vertices = new Set();

        this.powerups = [];
    }

    generateCatnip(numSpawns){
        for (let i=0;i<numSpawns;i++) {
            let index = Math.floor(ROT.RNG.getUniform() * this.groundTiles.length);
            let key = this.groundTiles.splice(index, 1)[0];

            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);

            y-=1;

            this.tileMap[key] = "N";
        }
    }

    /**
     * 
     * @param {number} numSpawns 
     * @param {Character} value - tilemap character representing the tile
     */
    randomGenFeatures(numSpawns, value){
        for (let i=0;i<numSpawns;i++) {
            let index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
            let key = this.freeCells.splice(index, 1)[0];

            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);

            y-=1;

            this.tileMap[key] = value;
        }
    }

    update(){
        for ( let spectre of this.spectres ){
            spectre.update();
        }
    }

    FixedUpdate() {
        for ( let spectre of this.spectres ){
            spectre.FixedUpdate();
        }
    }

    // add catnip sprites to foreground container
    addCatnip(){
        for (let key in this.tileMap) {
            if (this.tileMap[key] == 'N') {
                let parts = key.split(",");

                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                // this.tileSpriteInit(x,--y, this.tileset.get("catnip"), 3.0);
                let catnip = new Powerup(x*this.tileSize, --y* this.tileSize, this.tileset.get("catnip"));
                //console.log(this.tileset.get("catnip"))

                catnip.sprite.scale.set(1.5);
                this.powerups.push(catnip);

                this.powerupContainer.addChild(catnip.sprite);
            }
        }
    }

    getLiveNeighbors(key){
        let parts = key.split(",");
        let x = parseInt(parts[0]);
        let y = parseInt(parts[1]);
        
        return {
            left:           this.tileMap[ (x-1) +','+  y    ] == 1,
            right:          this.tileMap[ (x+1) +','+  y    ] == 1,
            top:            this.tileMap[  x    +','+ (y-1) ] == 1,
            bottom:         this.tileMap[  x    +','+ (y+1) ] == 1,
            topLeft:        this.tileMap[ (x-1) +','+ (y-1) ]  == 1,
            topRight:       this.tileMap[ (x+1) +','+ (y-1) ]  == 1,
            bottomRight:    this.tileMap[ (x+1) +','+ (y+1) ]  == 1,
            bottomLeft:     this.tileMap[ (x-1) +','+ (y+1) ]  == 1,         
        }
    }

    getNeighbors(key) {
        let parts = key.split(",");
        let x = parseInt(parts[0]);
        let y = parseInt(parts[1]);

        let key1 = (x+1) + ',' + y;
        let key2 = (x-1) + ',' + y;
        let key3 = x + ',' + (y+1);
        let key4 = x + ',' + (y-1);

        return [key1,key2,key3,key4];
    }

    isValid(x,y){
        let key = x + ',' + y;

        if ( x < this.w && y < this.h && x >= 0 && y >=0 ){
            if (this.visited[key] == 0 && this.tileMap[key] == 0) 
                return true; 
            else
                return false; 
        } 
        else
            return false; 
    }

    BFS(x,y, key){

        let parts = key.split(",");
        let j = parseInt(parts[0]);
        let i = parseInt(parts[1]);

        // terminating case for BFS 
        if (x != y) 
        return; 

        this.visited[key] = 1; 
        this.openCount++; 

        // x_move and y_move arrays 
        // are the possible movements 
        // in x or y direction 
        let x_move = [0, 0, 1, -1 ]; 
        let y_move = [ 1, -1, 0, 0 ]; 

        // checks all four points connected with input[i][j] 
        for (let u = 0; u < 4; u++) {     
            if (this.isValid(j + x_move[u],i + y_move[u] )) {
                let newDest = (j + x_move[u]) + ',' + (i + y_move[u]);
                this.BFS(x,y, newDest);
            }         
        }
        
    }

    resetVisited() {
        for (let i = 0; i < this.h; i++) 
            for (let j = 0; j < this.w; j++) {
                let key = j + ',' + i;
                this.visited[key] = 0; 
            }
                
    }

    resetResult() {
        for (let i = 0; i < this.h; i++) { 
            for (let j = 0; j < this.w; j++) { 
                let key = j + ',' + i;
                if (this.visited[key] && this.tileMap[key] == 0) 
                    this.BFSresult[key] = 0; 
                else
                    this.BFSresult[key] = 1; 
            } 
        } 
    }
    
    findLargestConnected(){
        let currentMax = -1;
        let n = this.h,
            m = this.w;

        for (let i = 0; i < n; i++) { 
            for (let j = 0; j < m; j++) { 
                this.resetVisited(); 
                this.openCount = 0; 
                // checking cell to the right 
                if (j + 1 < m) {
                    let key = j + ',' + i;
                    let dest = (j+1) + ',' + i;
                    this.BFS(this.tileMap[key], this.tileMap[dest], key); 
                }
   
                // updating result 
                if (this.openCount >= currentMax) { 
                    currentMax = this.openCount; 
                    this.resetResult(); 
                } 
                this.resetVisited(); 
                this.openCount = 0; 
      
                // checking cell downwards 
                if (i + 1 < n)  {
                    let key = j + ',' + i;
                    let dest = j + ',' + (i+1);
                    this.BFS(this.tileMap[key], this.tileMap[dest], key); 
                }
                   // BFS(input[i][j], input[i + 1][j], i, j, input); 
      
                // updating result 
                if (this.openCount >= currentMax) { 
                    currentMax = this.openCount; 
                    this.resetResult(); 
                } 
            } 
        } 
        //console.log(this.BFSresult);
        //console.log(currentMax);
    }

    /** replace random open cells with lights in the feature hashmap */ 
    generateLights(freeCells, numLights){
        for (let i=0;i<numLights;i++) {
            let index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            let key = freeCells.splice(index, 1)[0];
            this.tileMap[key] = "*";
        }
    }

    /** Make webgl meshes from the light shader & raycasting data */ 
    addLights( scale){
        for (let key in this.tileMap){
            if (this.tileMap[key] == '*'){
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                this.lights.push(new PointLight(x*this.tileSize, y*this.tileSize, this.edges, this.vertices, this.torchFrames))
            }
        }

        this.lights.forEach( (light) =>{
            if ( scale)
                light.torch.animation.scale.set(scale);
            this.torchSprites.push(light.torch.animation);
        })
    }

    addSpectres(){
        for (let key in this.tileMap){
            if (this.tileMap[key] == 'S'){
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);
                
                this.spectres.push(new Spectre({
                    position: new PIXI.Point(x*this.tileSize, y*this.tileSize), 
                    textures: this.spectreTextures, 
                    targetContainer: this.spectreContainer, 
                    lightContainer: this.lightContainer,
                    filterCache: this.filterCache, 
                    screen: this.screen,
                    castSegments: this.edges, 
                    endPoints: this.vertices, 
                    torchFrames: this.torchFrames,
                    world: this.world
                }));
            }
        }



        
    }

    parallaxScroll(cameraCenter, xSpeed, ySpeed){
        // this.backgroundContainer.pivot.copyFrom(cameraCenter);
        this.backgroundContainer.x = cameraCenter.x / xSpeed; //- (this.w * this.tileSize ) / 2;
        this.backgroundContainer.y = cameraCenter.y / ySpeed; //- (this.h * this.tileSize ) / 2;
    }

    tileSpriteInit(x,y,texture, scale = 0){
        let sprite = new PIXI.Sprite.from(texture);

        sprite.width = this.tileSize -6;
        sprite.height = this.tileSize;

        if (scale != 0 )
            sprite.scale.set(scale);
        

        sprite.anchor.set(0.5);
        sprite.position.x = x*this.tileSize;
        sprite.position.y = y*this.tileSize;  

        this.tileContainer.addChild(sprite);
    }

    setPlayerSpawn(playerSpawn){
        if ( playerSpawn)
            this.playerSpawn = new PIXI.Point( playerSpawn.x * this.tileSize, playerSpawn.y * this.tileSize);
        else {
            let index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
            let key = this.freeCells.splice(index, 1)[0];
            let parts = key.split(",");
            this.playerSpawn = new PIXI.Point(parseInt(parts[0])*this.tileSize, parseInt(parts[1])*this.tileSize);
        }

    }
}