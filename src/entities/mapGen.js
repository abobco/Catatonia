import {TileCollider} from './tiles.js'
import {Boundary} from './terrain.js'
import {PointLight} from '../lighting/PointLight.js'
import {Powerup} from './powerups.js'


/** Parent of all other procedural generation map classes 
 * @class
*/
class AbstractMap{
    /**
     * @param {number} w - width of map in tiles
     * @param {number} h - height of map in tiles
     * @param {number} tileSize - edge length of tiles in pixels
     * @param {number} numLights -  number of lights to randomly place in map
     * @param {Object} shaderProgram - vertex and fragment shader strings for kighting
     * @param {Map<string,PIXI.Texture>} tileset - tile textures
     * @param {PIXI.Texture[]} torchFrames - Torch animation textures
     */
    constructor(w,h,tileSize, numLights, shaderProgram, tileset, torchFrames) {
        this.w = w;                             // width of map in tiles
        this.h = h;                             // width of map in tiles
        this.tileSize = tileSize;               // edge length of tiles in pixels

        this.tileMap = {}                       // hashmap of characters representing map features
        this.visited = {}                       // hashmap of visited tiles for connectivity BFS
        this.BFSresult = {}                     // result of checking for largest connected area   
        this.openCount = 0;
        this.tileset = tileset;                 // hashmap of textures
        this.numLights = numLights;             // number of lights to randomly place in map
        this.freeCells = [];                    // keys for empty map tiles
        this.groundTiles = [];                  // keys for tiles with walkboxes

        this.terrain = [];                      // box colliders for walls
        this.lights = [];                       // light shading meshes 
        this.torchFrames = torchFrames;         // torch animation textures
        this.torchSprites = [];                 // torch animated sprites
        this.shaderProgram = shaderProgram;     // light mesh webgl shader 

        // containers for display objects
        this.tileContainer = new PIXI.Container();
        this.backgroundContainer = new PIXI.Container();
        this.torchContainer = new PIXI.Container();

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

    // add catnip sprites to foreground container
    addCatnip(){
        for (let key in this.tileMap) {
            if (this.tileMap[key] == 'N') {
                let parts = key.split(",");

                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                // this.tileSpriteInit(x,--y, this.tileset.get("catnip"), 3.0);
                let catnip = new Powerup(x*this.tileSize, --y* this.tileSize, this.tileset.get("catnip"));
                console.log(this.tileset.get("catnip"))

                catnip.sprite.scale.set(1.5);
                this.powerups.push(catnip);

                this.tileContainer.addChild(catnip.sprite);
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
    addLights(shaderProgram, scale){
        for (let key in this.tileMap){
            if (this.tileMap[key] == '*'){
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                this.lights.push(new PointLight(x*this.tileSize, y*this.tileSize, this.edges, this.vertices, shaderProgram, this.torchFrames))
            }
        }

        this.lights.forEach( (light) =>{
            if ( scale)
                light.torch.animation.scale.set(scale);
            this.torchSprites.push(light.torch.animation);
        })
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

    setPlayerSpawn(){
        let index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
        let key = this.freeCells.splice(index, 1)[0];
        let parts = key.split(",");
        this.playerSpawn = new PIXI.Point(parseInt(parts[0])*this.tileSize, parseInt(parts[1])*this.tileSize);
    }
}
/**
 * Textured dungeon from Wang tiles
 * @class
 * @extends AbstractMap
 */ 
export class WangMap extends AbstractMap{
    /**
     * @param {number} w - width of map in tiles
     * @param {number} h - height of map in tiles
     * @param {number} tileSize - edge length of tiles in pixels
     * @param {number} numLights -  number of lights to randomly place in map
     * @param {Object} shaderProgram - vertex and fragment shader strings for kighting
     * @param {Map<string,PIXI.Texture>} tileset - tile textures
     * @param {PIXI.Texture[]} torchFrames - Torch animation textures
     */
    constructor(w, h, wangImage, tileSize, numLights, shaderProgram,  tileset, torchFrames, perlinNoise ){
        super(w,h,tileSize,numLights,shaderProgram, tileset,torchFrames);

        this.generateDungeon(wangImage)
        
        this.findLargestConnected();
        this.tileMap = this.BFSresult;
        
        for (let y = 0; y < h; y++){
            for (let x = 0; x < w; x++){
                let key = x+","+y;

                if( !this.tileMap[key] )
                    this.freeCells.push(key);
            }
        }
        
        // randomly place lights in empty cells
        this.generateLights(this.freeCells, numLights);

        // make wall cells
        this.dungeonWalls(this.tileMap, true, this.tileContainer, this.tileSize);

         // randomly place catnip on ground cells
         this.generateCatnip(10);

         // add background tiles
         this.backgroundTiling(perlinNoise);
         
         // add chains and cages
         // this.addFeatures(this.freeCells, this.tileMap)  
         // add catnip sprites to the map
         this.addCatnip();
 
         console.log("ray cast vertices: ", this.vertices.size);
 
         // make PointLight objects 
         this.addLights(shaderProgram, 1.2);
 
         this.setPlayerSpawn();

    }

    generateDungeon(wangImage){
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        let img = wangImage;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );
 
        let chunkPos = new PIXI.Point( Math.floor(Math.random() * (img.width / this.w)) ,Math.floor( Math.random() * (img.height / this.h) ) )

        let imgdata = context.getImageData(chunkPos.x * this.w, chunkPos.y * this.h, this.w, this.h).data;
        
        for (let y = 0; y < this.h; y++){
            for (let x = 0; x < this.w; x++){
                let pixelIndex = ( y * this.h + x )*4;
                //console.log(myData.data[pixelIndex], myData.data[pixelIndex+1], myData.data[pixelIndex+2], myData.data[pixelIndex+3] )

                let key = x+","+y;
                // pixel an empty space
                if ( imgdata[pixelIndex] < 254 && x != 0 && y != 0 && x != this.w-1 && y != this.h-1 ){
                    this.tileMap[key] = 0;
                }
                else // pixel represents a wall
                    this.tileMap[key] = 1; 
            }
        }
    }

    dungeonWalls(tileMap, doesCollisions, tileContainer, tileSize){
        for (let key in tileMap) {
            if (tileMap[key] == 1){    
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                // check for neighbor walls
                let neighbors = this.getLiveNeighbors(key);

                if (!neighbors.top && y > 0)
                    this.groundTiles.push(key);

                if ( doesCollisions){
                    // create tile, boolean logic determines if climb/walk trigger colliders need to be made
                    let newTile = new TileCollider(x,y, this.tileSize, 
                        (!neighbors.left  && !neighbors.top), // left ledge
                        (!neighbors.right && !neighbors.top), // right ledge
                        !neighbors.top);                    // walkbox

                    // push tile to linear array of tiles
                    this.terrain.push(newTile);  

                    // push vertices to set of vertices
                    let verts = newTile.Collider.vertices;
                    verts.forEach( (vertex, index) => {
                        // vertex = Matter.Vector.add(vertex, newTile.Collider.position)
                        switch (index){
                            case 0:
                            if ((!neighbors.left && !neighbors.top) || (!neighbors.top && neighbors.topLeft) )
                                this.vertices.add(vertex);
                            break;
                            case 1:
                            if ((!neighbors.right && !neighbors.top) || (!neighbors.top && neighbors.topRight) )
                                this.vertices.add(vertex);
                            break;
                            case 2:
                            if ((!neighbors.right && !neighbors.bottom) || (!neighbors.bottom && neighbors.bottomRight) )
                                this.vertices.add(vertex);
                            break;
                            case 3:
                            if ((!neighbors.left && !neighbors.bottom) || (!neighbors.bottom && neighbors.bottomLeft) )
                                this.vertices.add(vertex);
                            break;
                        }
                    });

                    // push line segments to set of edges
                    if (!neighbors.top)
                        this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[1].x, verts[1].y));   // top edge
                    if (!neighbors.right)
                        this.edges.add(new Boundary(verts[1].x, verts[1].y, verts[2].x, verts[2].y));   // right edge
                    if (!neighbors.bottom)
                        this.edges.add(new Boundary(verts[3].x, verts[3].y, verts[2].x, verts[2].y));   // bot edge
                    if (!neighbors.left)
                        this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[3].x, verts[3].y));   // left edge
                }           
                // decide which sprite to use
                // interior tile
                let tileType;
                if ( neighbors.top && neighbors.bottom && neighbors.right && neighbors.left ){
                    if (!neighbors.topLeft)
                        tileType = "ITLCorner";
                    else if (!neighbors.topRight)
                        tileType = "ITRCorner";
                    else if (!neighbors.bottomLeft)
                        tileType = "IBLCorner";
                    else if (!neighbors.bottomRight)
                        tileType = "IBRCorner";

                    else
                        tileType = "Interior";  
                }
                     
                // top edge
                else if (!neighbors.top && neighbors.left && neighbors.right && neighbors.bottom)
                    tileType = "TopEdge";
                // bot edge
                else if (neighbors.top && neighbors.left && neighbors.right && !neighbors.bottom)
                    tileType = "BottomEdge";
                // right edge
                else if (neighbors.top && neighbors.left && !neighbors.right && neighbors.bottom)
                    tileType = "RightEdge";
                // left edge
                else if (neighbors.top && !neighbors.left && neighbors.right && neighbors.bottom)
                    tileType = "LeftEdge";
                // top left corner
                else if (!neighbors.top && !neighbors.left && neighbors.right && neighbors.bottom)
                    tileType = "TLCorner";
                // top right corner
                else if (!neighbors.top && neighbors.left && !neighbors.right && neighbors.bottom)
                    tileType = "TRCorner";
                // bottom left corner
                else if (neighbors.top && !neighbors.left && neighbors.right && !neighbors.bottom)
                    tileType = "BLCorner";
                // bottom right corner
                else if (neighbors.top && neighbors.left && !neighbors.right && !neighbors.bottom)
                    tileType = "BRCorner";
                // wang
                else if ((neighbors.top + neighbors.left + neighbors.right + neighbors.bottom) == 1)
                    tileType = "Loner";
                // shaft
                else if (((neighbors.top + neighbors.bottom) == 2) || ((neighbors.left + neighbors.right) == 2))
                    tileType = "Shaft";
                // lone tile
                else 
                    tileType = "Loner";

                // adjust dimensions and add to container
                if ( tileType ){
                    let sprite = new PIXI.Sprite.from(this.tileset.get(tileType));
                    sprite.width = tileSize +2;
                    sprite.height = tileSize;
                    sprite.anchor.set(0.5);
                    sprite.position.x = x*tileSize;
                    sprite.position.y = y*tileSize;  

                    switch (tileType) {
                        case "Wang":
                            if (neighbors.left)
                                sprite.angle = 90;    
                            else if (neighbors.top)
                                sprite.angle = 180;
                            else if (neighbors.right)
                                sprite.angle = 270;         
                            break;

                        case "Shaft":
                            if (neighbors.left)
                                sprite.angle = 90;
                            break;
                        default:
                            break;
                    }

                    tileContainer.addChild(sprite);                  
                }
            }
        }
    }

    parallaxScroll(cameraCenter){
        let speed = new PIXI.Point(5,5);
        
        this.backgroundContainer.x = cameraCenter.x / speed.x;
        this.backgroundContainer.y = cameraCenter.y / speed.y; 
    }

    
    backgroundTiling(perlinNoise){
        let BG_WIDTH = 80;
        let BG_HEIGHT = 80;
        this.bgScale = 0.8;
        let threshold = 120;

        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        let img= perlinNoise;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );

        let chunkPos = new PIXI.Point( Math.floor(Math.random() * (img.width - BG_WIDTH)) ,Math.floor( Math.random() * (img.height - BG_HEIGHT) ) )
        //let chunkPos = new PIXI.Point(340, 170);
        console.log( "chunkPos:", chunkPos);
        let imgdata = context.getImageData(chunkPos.x,chunkPos.y,BG_WIDTH,BG_HEIGHT).data;

        // let bgSprite = new PIXI.TilingSprite(this.tileset.get("Background"), this.tileSize* this.w* this.bgScale, this.tileSize* this.h * this.bgScale);
        for ( let i = 0; i < BG_WIDTH; i++){
            for (let j =0; j < BG_HEIGHT; j++){
                let pixelIndex = ( i * BG_WIDTH + j )*4;
                //console.log('imgdata:', imgdata[pixelIndex])
                let bgSprite;
                if (imgdata[pixelIndex] < threshold){  
                        bgSprite = new PIXI.Sprite.from(this.tileset.get('Background-3'));
                }   
                else {
                    if ( imgdata[pixelIndex+4] < threshold && imgdata[pixelIndex + 4*BG_WIDTH] < threshold )
                        bgSprite = new PIXI.Sprite.from(this.tileset.get('TL-Background-corner'));
                    else if (imgdata[pixelIndex+4] < threshold && imgdata[pixelIndex - 4*BG_WIDTH] < threshold)
                        bgSprite = new PIXI.Sprite.from(this.tileset.get('BL-Background-corner'));
                    else if (imgdata[pixelIndex-4] < threshold && imgdata[pixelIndex - 4*BG_WIDTH] < threshold)
                         bgSprite = new PIXI.Sprite.from(this.tileset.get('BR-Background-corner'));
                    else if (imgdata[pixelIndex-4] < threshold && imgdata[pixelIndex + 4*BG_WIDTH] < threshold)
                         bgSprite = new PIXI.Sprite.from(this.tileset.get('TR-Background-corner'));           
                    else
                        bgSprite = new PIXI.Sprite.from(this.tileset.get('Background'));
                }
                    
                // bgSprite.anchor.set(0.5);
                bgSprite.position.set(j*this.tileSize*this.bgScale, i*this.tileSize*this.bgScale );
                bgSprite.x -= (BG_WIDTH * this.tileSize *this.bgScale)/4;
                bgSprite.y -= (BG_HEIGHT * this.tileSize*this.bgScale)/4;
                bgSprite.width = this.tileSize*this.bgScale;
                bgSprite.height = this.tileSize*this.bgScale;
                this.backgroundContainer.addChild(bgSprite);
                this.bgSprite = bgSprite;
               
          
            }
        }
    }

    addFeatures(freeCells, tileMap){
        for ( let key of freeCells){
            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);
            // 1 in x test
            if (Math.floor(ROT.RNG.getUniform() * 3) == 0){
                // if top neighbor tile is a wall
                if (tileMap[ x +','+ (y-1)] == 1 )
                    this.tileSpriteInit(x,y, this.tileset.get("Spikes"));
                 // if bottom neighbor tile is a wall
                else if (tileMap[ x +','+ (y+1)] == 1){
                    // randomly pick between grass sprites
                    switch (Math.floor(ROT.RNG.getUniform() * 2)){
                        case 0:
                            this.tileSpriteInit(x,y, this.tileset.get("Grass-1"));
                            break;
                        case 1:
                            this.tileSpriteInit(x,y, this.tileset.get("Grass-2"),);
                            break;
                    }                    
                }
            }
        }
    }
}

/**
 * Textured cave map from cellular automata
 * @class
 * @extends AbstractMap
 */ 
export class CellularMap extends AbstractMap{
    /**
     * @param {number} w - width of map in tiles
     * @param {number} h - height of map in tiles
     * @param {number} tileSize - edge length of tiles in pixels
     * @param {number} numLights -  number of lights to randomly place in map
     * @param {Object} shaderProgram - vertex and fragment shader strings for kighting
     * @param {Map<string,PIXI.Texture>} tileset - tile textures
     * @param {PIXI.Texture[]} torchFrames - Torch animation textures
     */
    constructor(w,h,tileSize, numLights, shaderProgram,  tileset, torchFrames){
        super(w,h,tileSize,numLights,shaderProgram, tileset,torchFrames);

        this.cellMap = new ROT.Map.Cellular(w, h, {
            born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5]
        });

        this.cellMap.randomize(0.5); // random seed with 50/50 dead/alive cells
        
        // generate first iterations
        for (var i=8; i>=0; i--) {
            this.cellMap.create();
        }
        // connect empty cells
        this.cellMap.connect((x, y, value) => {
            let key = x+","+y;
            // close off edges
            if (x == 0 || y == 0 || x == (w-1) || y == (h-1)){
                this.tileMap[key] = 1;
            }
            else
                this.tileMap[key] = value;
        });
        // do last minute tweaks to the cell map before generating tiling
        for (let key in this.tileMap) {
            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);

            // store all empty cells for placing random objects
            if (!this.tileMap[key])
               this.freeCells.push(key);
        }       

        // randomly place lights in empty cells
        this.generateLights(this.freeCells, numLights);
        
        // make wall cells
        this.caveWalls(this.tileMap, true, this.tileContainer, this.tileSize);
    
        // randomly place catnip on ground cells
        this.generateCatnip(10);

        // add background tiles
        this.backgroundTiling();
        
        // add grass and spikes to random edge tilesS
        this.addFeatures(this.freeCells, this.tileMap)  
        // add catnip sprites to the map
        this.addCatnip();

        console.log("ray cast vertices: ", this.vertices.size);

        // make PointLight objects 
        this.addLights(shaderProgram);

        let index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
        let key = this.freeCells.splice(index, 1)[0];
        let parts = key.split(",");
        this.playerSpawn = new PIXI.Point(parseInt(parts[0])*this.tileSize, parseInt(parts[1])*this.tileSize);
    }

    parallaxScroll(cameraCenter){
        let speed = new PIXI.Point(1.2,1.2);
        
        this.backgroundContainer.x = cameraCenter.x / speed.x;
        this.backgroundContainer.y = cameraCenter.y / speed.y; 
    }

    caveWalls(tileMap, doesCollisions, tileContainer, tileSize){
        for (let key in tileMap){
            if (tileMap[key] == 1){    
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                let neighbors = this.getLiveNeighbors(key);

                if (!neighbors.top && y > 0)
                    this.groundTiles.push(key);

                if ( doesCollisions){
                    // create tile, boolean logic determines if climb/walk trigger colliders need to be made
                    let newTile = new TileCollider(x,y, this.tileSize, 
                        (!neighbors.left  && !neighbors.top), // left ledge
                        (!neighbors.right && !neighbors.top), // right ledge
                        !neighbors.top)                    // walkbox

                    // push tile to linear array of tiles
                    this.terrain.push(newTile);  

                    // push vertices to set of vertices
                    let verts = newTile.Collider.vertices;
                    verts.forEach( (vertex, index) => {
                        // vertex = Matter.Vector.add(vertex, newTile.Collider.position)
                        switch (index){
                            case 0:
                            if ((!neighbors.left && !neighbors.top) || (!neighbors.top && neighbors.topLeft) )
                                this.vertices.add(vertex);
                            break;
                            case 1:
                            if ((!neighbors.right && !neighbors.top) || (!neighbors.top && neighbors.topRight) )
                                this.vertices.add(vertex);
                            break;
                            case 2:
                            if ((!neighbors.right && !neighbors.bottom) || (!neighbors.bottom && neighbors.bottomRight) )
                                this.vertices.add(vertex);
                            break;
                            case 3:
                            if ((!neighbors.left && !neighbors.bottom) || (!neighbors.bottom && neighbors.bottomLeft) )
                                this.vertices.add(vertex);
                            break;
                        }
                    })

                    // push line segments to set of edges
                    if (!neighbors.top)
                        this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[1].x, verts[1].y));   // top edge
                    if (!neighbors.right)
                        this.edges.add(new Boundary(verts[1].x, verts[1].y, verts[2].x, verts[2].y));   // right edge
                    if (!neighbors.bottom)
                        this.edges.add(new Boundary(verts[3].x, verts[3].y, verts[2].x, verts[2].y));   // bot edge
                    if (!neighbors.left)
                        this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[3].x, verts[3].y));   // left edge
                }           
                // decide which sprite to use
                // interior tile
                let tileType;
                if ( neighbors.top && neighbors.bottom && neighbors.right && neighbors.left )
                    tileType = "Interior";   
                // top edge
                else if (!neighbors.top && neighbors.left && neighbors.right && neighbors.bottom)
                    tileType = "TopEdge";
                // bot edge
                else if (neighbors.top && neighbors.left && neighbors.right && !neighbors.bottom)
                    tileType = "BottomEdge";
                // right edge
                else if (neighbors.top && neighbors.left && !neighbors.right && neighbors.bottom)
                    tileType = "RightEdge";
                // left edge
                else if (neighbors.top && !neighbors.left && neighbors.right && neighbors.bottom)
                    tileType = "LeftEdge";
                // top left corner
                else if (!neighbors.top && !neighbors.left && neighbors.right && neighbors.bottom)
                    tileType = "TLCorner";
                // top right corner
                else if (!neighbors.top && neighbors.left && !neighbors.right && neighbors.bottom)
                    tileType = "TRCorner";
                // bottom left corner
                else if (neighbors.top && !neighbors.left && neighbors.right && !neighbors.bottom)
                    tileType = "BLCorner";
                // bottom right corner
                else if (neighbors.top && neighbors.left && !neighbors.right && !neighbors.bottom)
                    tileType = "BRCorner";
                // wang
                else if ((neighbors.top + neighbors.left + neighbors.right + neighbors.bottom) == 1)
                    tileType = "Wang";
                // shaft
                else if (((neighbors.top + neighbors.bottom) == 2) || ((neighbors.left + neighbors.right) == 2))
                    tileType = "Shaft";
                // lone tile
                else 
                    tileType = "Loner";

                // adjust dimensions and add to container
                if ( tileType ){
                    let sprite = new PIXI.Sprite.from(this.tileset.get(tileType));
                    sprite.width = tileSize +2;
                    sprite.height = tileSize;
                    sprite.anchor.set(0.5);
                    sprite.position.x = x*tileSize;
                    sprite.position.y = y*tileSize;  

                    switch (tileType) {
                        case "Wang":
                            if (neighbors.left)
                                sprite.angle = 90;    
                            else if (neighbors.top)
                                sprite.angle = 180;
                            else if (neighbors.right)
                                sprite.angle = 270;         
                            break;

                        case "Shaft":
                            if (neighbors.left)
                                sprite.angle = 90;
                            break;
                        default:
                            break;
                    }

                    tileContainer.addChild(sprite);
                    
                }

            }
        }
    }

    backgroundTiling(){
        this.bgScale = 2;
        let bgSprite = new PIXI.TilingSprite(this.tileset.get("Background"), this.tileSize* this.w* this.bgScale, this.tileSize* this.h * this.bgScale);
        bgSprite.x -= (this.w * this.tileSize *this.bgScale)/2;
        bgSprite.y -= (this.h * this.tileSize*this.bgScale)/2;
        bgSprite.tileScale.x = (this.tileSize / this.tileset.get("Background").width)*.75;
        bgSprite.tileScale.y = (this.tileSize / this.tileset.get("Background").height)*.75;
        this.backgroundContainer.addChild(bgSprite);
        this.bgSprite = bgSprite;
    }

    addFeatures(freeCells, tileMap){
        for ( let key of freeCells){
            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);
            // 1 in x test
            if (Math.floor(ROT.RNG.getUniform() * 3) == 0){
                // if top neighbor tile is a wall
                if (tileMap[ x +','+ (y-1)] == 1 )
                    this.tileSpriteInit(x,y, this.tileset.get("Spikes"));
                 // if bottom neighbor tile is a wall
                else if (tileMap[ x +','+ (y+1)] == 1){
                    // randomly pick between grass sprites
                    switch (Math.floor(ROT.RNG.getUniform() * 2)){
                        case 0:
                            this.tileSpriteInit(x,y, this.tileset.get("Grass-1"));
                            break;
                        case 1:
                            this.tileSpriteInit(x,y, this.tileset.get("Grass-2"),);
                            break;
                    }                    
                }
            }
        }
    }
}

/**
 * Eller maze map
 * - currently this still draws tiles as rectangle graphics primitives
 * @class
 * @extends AbstractMap
 */
export class MazeMap extends AbstractMap {
    /**
     * @param {number} w - width of map in tiles
     * @param {number} h - height of map in tiles
     * @param {number} tileSize - edge length of tiles in pixels
     * @param {number} numLights -  number of lights to randomly place in map
     * @param {Object} shaderProgram - vertex and fragment shader strings for kighting
     * @param {Map<string,PIXI.Texture>} tileset - tile textures
     * @param {PIXI.Texture[]} torchFrames - Torch animation textures
     */
    constructor(w,h,tileSize, numLights, shaderProgram, tileset, torchFrames){
        super(w,h,tileSize, numLights, shaderProgram, tileset, torchFrames)

        this.ellerMaze = new ROT.Map.EllerMaze(w, h);
        this.debugGraphics = new PIXI.Graphics();
        this.tileContainer.addChild(this.debugGraphics);

        // callback function for maze creation
        this.ellerMaze.create( (x, y, value) => {
            let key = x+","+y;
            this.tileMap[key] = value;
            if (!value) {
                this.freeCells.push(key);
            }
        });

        // randomly place lights in empty cells
        this.generateLights(this.freeCells, numLights);
        
        // make wall cells
        this.addWalls();

        // make PointLight objects 
        this.addLights(shaderProgram);

        
        let index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
        let key = this.freeCells.splice(index, 1)[0];
        let parts = key.split(",");
        this.playerSpawn = new PIXI.Point(parseInt(parts[0])*this.tileSize, parseInt(parts[1])*this.tileSize);
    }

    addWalls() {
        for (let key in this.tileMap){
            if (this.tileMap[key] == 1){    
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                let neighbors = this.getLiveNeighbors(key);
                // check for neighbor walls
                //let neighbors.left, neighbors.right, neighbors.top, neighbors.bottom;
                if (this.tileMap[ (x-1) +','+  y ] == 1)
                    neighbors.left = true;
                if (this.tileMap[ (x+1) +','+  y ] == 1)
                    neighbors.right = true;
                if (this.tileMap[ x     +','+ (y-1)] == 1)
                    neighbors.top = true;
                if (this.tileMap[ x     +','+ (y+1)] == 1)
                    neighbors.bottom = true;
                
                // create tile, boolean logic determines if climb/walk trigger colliders need to be made
                let newTile = new TileCollider(x,y, this.tileSize, 
                                              (!neighbors.left  && !neighbors.top), // left ledge
                                              (!neighbors.right && !neighbors.top), // right ledge
                                               !neighbors.top)                    // walkbox
                
                this.debugGraphics.beginFill(0x660066)
                this.debugGraphics.drawRect(x*this.tileSize - this.tileSize/2, y*this.tileSize - this.tileSize/2, this.tileSize, this.tileSize)
                // push tile to linear array of tiles
                this.terrain.push(newTile);  
                
                // push vertices to set of vertices
                let verts = newTile.Collider.vertices;
                
                verts.forEach( (vertex) => {
                    this.vertices.add(vertex);
                })
                
                // push line segments to set of edges
                this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[1].x, verts[1].y));   // top edge
                this.edges.add(new Boundary(verts[1].x, verts[1].y, verts[2].x, verts[2].y));   // right edge
                this.edges.add(new Boundary(verts[3].x, verts[3].y, verts[2].x, verts[2].y));   // bot edge
                this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[3].x, verts[3].y));   // left edge

            }
        }
    }
}