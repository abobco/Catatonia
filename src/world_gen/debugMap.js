import {TileCollider} from '../entities/tiles.js'
import {Boundary} from '../entities/terrain.js'
import {Corner} from '../lighting/geometry.js'

import {AbstractMap} from './AbstractMap.js';

/**
 * Textured dungeon from Wang tiles
 * @class
 * @extends AbstractMap
 */ 
export class DebugMap extends AbstractMap{
     /**
     * @param {Object} options - options for map generation
     * @param {number} [options.w = 25] - width of map in tiles
     * @param {number} [options.h = 25] - height of map in tiles
     * @param {number} [options.tileSize = 120] - edge length of tiles in pixels
     * @param {number} [options.numLights = 5] -  number of lights to randomly place in map
     * @param {Object} options.shaderProgram - vertex and fragment shader strings for kighting
     * @param {Map<string,PIXI.Texture>} options.tileset - tile textures
     * @param {PIXI.Texture[]} options.torchFrames - Torch animation textures
     * @param {HTMLImageElement} options.wangImage - Wang tile image for map generation
     * @param {PIXI.Texture} options.perlinNoise - noise texture for background generation
     * @param {PIXI.Point} options.customChunk - map generation seed
     * @param {PIXI.Point} options.playerSpawn - custom player spawn location
     */
    constructor(options ){
        let defaults = {
            w : 40,
            h: 40,
            tileSize: 120,
            numLights: 30,
            customChunk: new PIXI.Point(0,0),
            playerSpawn: new PIXI.Point(5,5)
        }
        let params = Object.assign( {}, defaults, options)
        super(params);
        this.generateDungeon(params.wangImage, params.customChunk)
        
        this.findLargestConnected();
        this.tileMap = this.BFSresult;
        
        for (let y = 0; y < params.h; y++){
            for (let x = 0; x < params.w; x++){
                let key = x+","+y;

                if( !this.tileMap[key] )
                    this.freeCells.push(key);
            }
        }
        
        // randomly place lights in empty cells
        this.generateLights(this.freeCells, params.numLights);

        // make wall cells
        this.dungeonWalls(this.tileMap, true, this.tileContainer, this.tileSize);

         // randomly place catnip on ground cells
         this.generateCatnip(10);

         // add background tiles
         this.backgroundTiling(params.perlinNoise);
         
         // add chains and cages
         // this.addFeatures(this.freeCells, this.tileMap)  
         // add catnip sprites to the map
         this.addCatnip();
 
         console.log("ray cast vertices: ", this.vertices.size);
 
         // make PointLight objects 
         this.addLights(params.shaderProgram, 1.2);
        
         this.setPlayerSpawn(params.playerSpawn);

    }

    generateDungeon(wangImage, customChunk){
        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        let img = wangImage;
        canvas.width = img.width;
        canvas.height = img.height;
        context.drawImage(img, 0, 0 );
 
        let chunkPos;
        if ( customChunk )
            chunkPos = customChunk;
        else 
            chunkPos = new PIXI.Point( Math.floor(Math.random() * (img.width / this.w)) ,Math.floor( Math.random() * (img.height / this.h) ) )

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