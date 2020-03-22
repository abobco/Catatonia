import {AbstractMap} from './AbstractMap.js';

import {TileCollider} from '../entities/tiles.js'
import {Boundary} from '../entities/terrain.js'
import {Corner} from '../lighting/geometry.js'

/**
 * Textured cave map from cellular automata
 * @class
 * @extends AbstractMap
 */ 
export class CellularMap extends AbstractMap{
    /**
     * @param {Object} options - options for map generation
     * @param {number} [options.w = 25] - width of map in tiles
     * @param {number} [options.h = 25] - height of map in tiles
     * @param {number} [options.tileSize = 150] - edge length of tiles in pixels
     * @param {number} [options.numLights = 5] -  number of lights to randomly place in map
     * @param {Map<string,PIXI.Texture>} options.tileset - tile textures
     * @param {PIXI.Texture[]} options.torchFrames - Torch animation textures
     */
    constructor(options){
        let defaults = {
            w : 25,
            h: 25,
            tileSize: 150,
            numLights: 5
        }
        let params = Object.assign( {}, defaults, options)


        super(params);

        this.cellMap = new ROT.Map.Cellular(params.w, params.h, {
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
            if (x == 0 || y == 0 || x == (params.w-1) || y == (params.h-1)){
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
        this.generateLights(this.freeCells, params.numLights);
        
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
        this.addLights();

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
                               this.vertices.add(new Corner(vertex, verts[3], verts[1])); // this.vertices.add(vertex);
                            break;
                            case 1:
                            if ((!neighbors.right && !neighbors.top) || (!neighbors.top && neighbors.topRight) )
                                this.vertices.add(new Corner(vertex, verts[0], verts[2])); // this.vertices.add(vertex);
                            break;
                            case 2:
                            if ((!neighbors.right && !neighbors.bottom) || (!neighbors.bottom && neighbors.bottomRight) )
                                this.vertices.add(new Corner(vertex, verts[1], verts[3])); // this.vertices.add(vertex);
                            break;
                            case 3:
                            if ((!neighbors.left && !neighbors.bottom) || (!neighbors.bottom && neighbors.bottomLeft) )
                                this.vertices.add(new Corner(vertex, verts[2], verts[0])); // this.vertices.add(vertex);
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