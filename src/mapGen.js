import Matter from 'matter-js/build/matter.min.js';

import {TileCollider} from './tiles.js'
import {Boundary} from './terrain.js'
import {PointLight} from './PointLight'

class MazeMap{
    constructor(w,h,tileSize, shaderProgram, lightRenderer){
        this.w = w;
        this.h = h;
        this.tileSize = tileSize;
        this.ellerMaze = new ROT.Map.EllerMaze(w, h);
        this.tileMap = {};  
        
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
        this.generateLights(freeCells);
        
        // make wall cells
        this.addWalls();

        // make PointLight objects 
        this.addLights(shaderProgram, lightRenderer);
    }

    generateLights(freeCells){
        for (let i=0;i<3;i++) {
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
                    vertex = Matter.Vector.add(vertex, newTile.Collider.position)
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

export {MazeMap}