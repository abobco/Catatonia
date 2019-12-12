import {TileCollider} from './tiles.js'
import {Boundary} from './terrain.js'
import {PointLight} from './PointLight'

class MazeMap{
    constructor(w,h,tileSize, numLights, shaderProgram, lightRenderer, tileset){
        this.w = w;
        this.h = h;
        this.tileSize = tileSize;
        this.ellerMaze = new ROT.Map.EllerMaze(w, h);
        this.tileMap = {};
        this.tileset = tileset;  
        
        this.terrain = [];
        this.lights = [];
        // using sets here to filter out duplicate edges/vertices
        this.edges = new Set();
        this.vertices = new Set();
          
        let freeCells = [];

        // callback function for maze creation
        this.ellerMaze.create( (x, y, value) => {
            let key = x+","+y;
            this.tileMap[key] = value;
            if (!value) {
                freeCells.push(key);
            }
        });

        // randomly place lights in empty cells
        this.generateLights(freeCells, numLights);
        
        // make wall cells
        this.addWalls();

        // make PointLight objects 
        this.addLights(shaderProgram, lightRenderer);
    }

    generateLights(freeCells, numLights){
        for (let i=0;i<numLights;i++) {
            let index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
            let key = freeCells.splice(index, 1)[0];
            this.tileMap[key] = "*";
        }
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

    addLights(shaderProgram, lightRenderer){
        for (let key in this.tileMap){
            if (this.tileMap[key] == '*'){
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                this.lights.push(new PointLight(x*this.tileSize, y*this.tileSize, this.edges, this.vertices, shaderProgram, lightRenderer))
            }
        }
    }
}

class CellularMap extends MazeMap{
    constructor(w,h,tileSize, numLights, shaderProgram, lightRenderer, tileset){
        super(0,0,0,shaderProgram, lightRenderer, tileset);
        this.w = w;
        this.h = h;
        this.tileSize = tileSize;
        this.tileMap = {}; 
        this.tileset = tileset; 
        
        this.terrain = [];
        this.lights = [];
        // using sets here to filter out duplicate edges/vertices
        this.edges = new Set();
        this.vertices = new Set();

        this.cellMap = new ROT.Map.Cellular(w, h, {
            born: [4, 5, 6, 7, 8],
            survive: [2, 3, 4, 5]
        });
    
        this.tileContainer = new PIXI.Container();
        
        // holds cells with no walls
        let freeCells = [];

        this.cellMap.randomize(0.5); // 
        
        // generate first iterations
        for (var i=8; i>=0; i--) {
            this.cellMap.create();
        }
        this.cellMap.connect(null, 1);
        this.cellMap.connect((x, y, value) => {
            let key = x+","+y;
            this.tileMap[key] = value;
        });
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
                freeCells.push(key);
        }   
        this.backgroundTiles(freeCells);        

        // randomly place lights in empty cells
        this.generateLights(freeCells, numLights);
        
        // make wall cells
        this.caveWalls();
        console.log(this.vertices.size);

        // make PointLight objects 
        this.addLights(shaderProgram, lightRenderer);

        let index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        let key = freeCells.splice(index, 1)[0];
        let parts = key.split(",");
        this.playerSpawn = new PIXI.Point(parseInt(parts[0])*this.tileSize, parseInt(parts[1])*this.tileSize);

        
        
    }

    caveWalls(){
        for (let key in this.tileMap){
            if (this.tileMap[key] == 1){    
                let parts = key.split(",");
                let x = parseInt(parts[0]);
                let y = parseInt(parts[1]);

                // check for neighbor walls
                let leftNeighbor= false, rightNeighbor= false, topNeighbor= false, botNeighbor= false,
                    TLNeighbor= false, TRNeighbor= false, BRNeighbor= false, BLNeighbor = false;
                if (this.tileMap[ (x-1) +','+  y ] == 1)
                    leftNeighbor = true;
                if (this.tileMap[ (x+1) +','+  y ] == 1)
                    rightNeighbor = true;
                if (this.tileMap[ x     +','+ (y-1)] == 1)
                    topNeighbor = true;
                if (this.tileMap[ x     +','+ (y+1)] == 1)
                    botNeighbor = true;
                if (this.tileMap[ (x-1)   +','+ (y-1)] == 1)
                    TLNeighbor = true;
                if (this.tileMap[ (x+1)   +','+ (y-1)] == 1)
                    TRNeighbor = true;
                if (this.tileMap[ (x+1)  +','+ (y+1)] == 1)
                    BRNeighbor = true;
                if (this.tileMap[ (x -1)  +','+ (y+1)] == 1)
                    BLNeighbor = true;
                
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
                    sprite.width = this.tileSize +2;
                    sprite.height = this.tileSize;
                    sprite.anchor.set(0.5);
                    sprite.position.x = x*this.tileSize;
                    sprite.position.y = y*this.tileSize;  

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

                    this.tileContainer.addChild(sprite);
                    
                }

            }
        }
    }

    backgroundTiles(freeCells){
        freeCells.forEach( (key) => {
            let parts = key.split(",");
            let x = parseInt(parts[0]);
            let y = parseInt(parts[1]);

            let sprite = new PIXI.Sprite.from(this.tileset.get("Background"));
            sprite.width = this.tileSize +2;
            sprite.height = this.tileSize;
            sprite.position.x = x*this.tileSize - this.tileSize/2;
            sprite.position.y = y*this.tileSize - this.tileSize/2;

            this.tileContainer.addChild(sprite);
        })
    }
}

export {MazeMap, CellularMap}