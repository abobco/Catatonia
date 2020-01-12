import {TileCollider} from './tiles.js'
import {Boundary} from './terrain.js'
import {PointLight} from './PointLight'


// parent of all other procedural generation map classes
class AbstractMap{
    constructor(w,h,tileSize, numLights, shaderProgram, tileset, torchFrames) {
        this.w = w;                             // width of map in tiles
        this.h = h;                             // height of map in tiles
        this.tileSize = tileSize;               // edge length of tiles in pixels

        this.tileMap = {}                       // hashmap of characters representing map features
        this.tileset = tileset;                 // hashmap of textures
        this.numLights = numLights;             // number of lights to randomly place in map
        this.freeCells = [];                    // indices of empty map tiles

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

    }

    // replace random open cells with lights in the feature hashmap
    generateLights(freeCells, numLights){
        for (let i=0;i<numLights;i++) {
            let index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            let key = freeCells.splice(index, 1)[0];
            this.tileMap[key] = "*";
        }
    }

    // Make webgl meshes from the light shader & raycasting data
    addLights(shaderProgram){
        for (let key in this.tileMap){
            if (this.tileMap[key] == '*'){
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                this.lights.push(new PointLight(x*this.tileSize, y*this.tileSize, this.edges, this.vertices, shaderProgram, this.torchFrames))
            }
        }

        this.lights.forEach( (light) =>{
            this.torchSprites.push(light.torch.animation);
        })
    }

    parallaxScroll(cameraCenter, xSpeed, ySpeed){
        // this.backgroundContainer.pivot.copyFrom(cameraCenter);
        this.backgroundContainer.x = cameraCenter.x / xSpeed; //- (this.w * this.tileSize ) / 2;
        this.backgroundContainer.y = cameraCenter.y / ySpeed; //- (this.h * this.tileSize ) / 2;
    }

    tileSpriteInit(x,y,texture){
        let sprite = new PIXI.Sprite.from(texture);
        sprite.width = this.tileSize -6;
        sprite.height = this.tileSize;
        sprite.anchor.set(0.5);
        sprite.position.x = x*this.tileSize;
        sprite.position.y = y*this.tileSize;  

        this.tileContainer.addChild(sprite);
    }
}

// eller maze map
// currently this still draws tiles as rectangle graphics primitives
class MazeMap extends AbstractMap {
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

                // check for neighbor walls
                let leftNeighbor, rightNeighbor, topNeighbor, botNeighbor;
                if (this.tileMap[ (x-1) +','+  y ] == 1)
                    leftNeighbor = true;
                if (this.tileMap[ (x+1) +','+  y ] == 1)
                    rightNeighbor = true;
                if (this.tileMap[ x     +','+ (y-1)] == 1)
                    topNeighbor = true;
                if (this.tileMap[ x     +','+ (y+1)] == 1)
                    botNeighbor = true;
                
                // create tile, boolean logic determines if climb/walk trigger colliders need to be made
                let newTile = new TileCollider(x,y, this.tileSize, 
                                              (!leftNeighbor  && !topNeighbor), // left ledge
                                              (!rightNeighbor && !topNeighbor), // right ledge
                                               !topNeighbor)                    // walkbox
                
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

// textured cave map from cellular automata
class CellularMap extends AbstractMap{
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
        // connect walls, then connect empty cells
        this.cellMap.connect(null, 1);
        this.cellMap.connect((x, y, value) => {
            let key = x+","+y;
            this.tileMap[key] = value;
        });
        // do last minute tweaks to the cell map before generating tiling
        for (let key in this.tileMap){
            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);

            // close off edges
            if (x == 0 || y == 0 || x == (w-1) || y == (h-1)){
                this.tileMap[key] = 1;
            }

            // store all empty cells for placing random objects
            if (!this.tileMap[key])
               this.freeCells.push(key);
        }       
        this.backgroundTiling();

        // randomly place lights in empty cells
        this.generateLights(this.freeCells, numLights);
        
        // make wall cells
        this.caveWalls(this.tileMap, true, this.tileContainer, this.tileSize);
        
        // add grass and spikes to random edge tilesS
        this.addFeatures(this.freeCells, this.tileMap)  
        console.log("ray cast vertices: ", this.vertices.size);

        // make PointLight objects 
        this.addLights(shaderProgram);

        let index = Math.floor(ROT.RNG.getUniform() * this.freeCells.length);
        let key = this.freeCells.splice(index, 1)[0];
        let parts = key.split(",");
        this.playerSpawn = new PIXI.Point(parseInt(parts[0])*this.tileSize, parseInt(parts[1])*this.tileSize);
    }

    caveWalls(tileMap, doesCollisions, tileContainer, tileSize){
        for (let key in tileMap){
            if (tileMap[key] == 1){    
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                // check for neighbor walls
                let leftNeighbor= false, rightNeighbor= false, topNeighbor= false, botNeighbor= false,
                    TLNeighbor= false, TRNeighbor= false, BRNeighbor= false, BLNeighbor = false;
                if (tileMap[ (x-1) +','+  y ] == 1)
                    leftNeighbor = true;
                if (tileMap[ (x+1) +','+  y ] == 1)
                    rightNeighbor = true;
                if (tileMap[ x     +','+ (y-1)] == 1)
                    topNeighbor = true;
                if (tileMap[ x     +','+ (y+1)] == 1)
                    botNeighbor = true;
                if (tileMap[ (x-1)   +','+ (y-1)] == 1)
                    TLNeighbor = true;
                if (tileMap[ (x+1)   +','+ (y-1)] == 1)
                    TRNeighbor = true;
                if (tileMap[ (x+1)  +','+ (y+1)] == 1)
                    BRNeighbor = true;
                if (tileMap[ (x -1)  +','+ (y+1)] == 1)
                    BLNeighbor = true;

                if ( doesCollisions){
                    // create tile, boolean logic determines if climb/walk trigger colliders need to be made
                    let newTile = new TileCollider(x,y, this.tileSize, 
                        (!leftNeighbor  && !topNeighbor), // left ledge
                        (!rightNeighbor && !topNeighbor), // right ledge
                        !topNeighbor)                    // walkbox

                    // push tile to linear array of tiles
                    this.terrain.push(newTile);  

                    // push vertices to set of vertices
                    let verts = newTile.Collider.vertices;
                    verts.forEach( (vertex, index) => {
                        // vertex = Matter.Vector.add(vertex, newTile.Collider.position)
                        switch (index){
                            case 0:
                            if ((!leftNeighbor && !topNeighbor) || (!topNeighbor && TLNeighbor) )
                                this.vertices.add(vertex);
                            break;
                            case 1:
                            if ((!rightNeighbor && !topNeighbor) || (!topNeighbor && TRNeighbor) )
                                this.vertices.add(vertex);
                            break;
                            case 2:
                            if ((!rightNeighbor && !botNeighbor) || (!botNeighbor && BRNeighbor) )
                                this.vertices.add(vertex);
                            break;
                            case 3:
                            if ((!leftNeighbor && !botNeighbor) || (!botNeighbor && BLNeighbor) )
                                this.vertices.add(vertex);
                            break;
                        }
                    })

                    // push line segments to set of edges
                    if (!topNeighbor)
                        this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[1].x, verts[1].y));   // top edge
                    if (!rightNeighbor)
                        this.edges.add(new Boundary(verts[1].x, verts[1].y, verts[2].x, verts[2].y));   // right edge
                    if (!botNeighbor)
                        this.edges.add(new Boundary(verts[3].x, verts[3].y, verts[2].x, verts[2].y));   // bot edge
                    if (!leftNeighbor)
                        this.edges.add(new Boundary(verts[0].x, verts[0].y, verts[3].x, verts[3].y));   // left edge
                }           
                // decide which sprite to use
                // interior tile
                let tileType;
                if ( topNeighbor && botNeighbor && rightNeighbor && leftNeighbor )
                    tileType = "Interior";   
                // top edge
                else if (!topNeighbor && leftNeighbor && rightNeighbor && botNeighbor)
                    tileType = "TopEdge";
                // bot edge
                else if (topNeighbor && leftNeighbor && rightNeighbor && !botNeighbor)
                    tileType = "BottomEdge";
                // right edge
                else if (topNeighbor && leftNeighbor && !rightNeighbor && botNeighbor)
                    tileType = "RightEdge";
                // left edge
                else if (topNeighbor && !leftNeighbor && rightNeighbor && botNeighbor)
                    tileType = "LeftEdge";
                // top left corner
                else if (!topNeighbor && !leftNeighbor && rightNeighbor && botNeighbor)
                    tileType = "TLCorner";
                // top right corner
                else if (!topNeighbor && leftNeighbor && !rightNeighbor && botNeighbor)
                    tileType = "TRCorner";
                // bottom left corner
                else if (topNeighbor && !leftNeighbor && rightNeighbor && !botNeighbor)
                    tileType = "BLCorner";
                // bottom right corner
                else if (topNeighbor && leftNeighbor && !rightNeighbor && !botNeighbor)
                    tileType = "BRCorner";
                // wang
                else if ((topNeighbor + leftNeighbor + rightNeighbor + botNeighbor) == 1)
                    tileType = "Wang";
                // shaft
                else if (((topNeighbor + botNeighbor) == 2) || ((leftNeighbor + rightNeighbor) == 2))
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
                            if (leftNeighbor)
                                sprite.angle = 90;    
                            else if (topNeighbor)
                                sprite.angle = 180;
                            else if (rightNeighbor)
                                sprite.angle = 270;         
                            break;

                        case "Shaft":
                            if (leftNeighbor)
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

export {MazeMap, CellularMap}