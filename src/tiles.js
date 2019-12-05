import Matter from 'matter-js/build/matter.min.js';

import {Terrain} from './terrain.js'

class Tile {

    constructor(x,y,edgeLength){
        // this.collider = new Terrain(x*edgeLength, y*edgeLength, edgeLength, edgeLength);
        this.collider = new TileCollider(x*edgeLength, y*edgeLength, edgeLength, false, false, true)
    }
}

class TileCollider {
    constructor(x,y,r,leftLedge, rightLedge, hasWalkBox){

        this.x = x * r;
        this.y = y * r;
        this.w = r;
        this.h = r;

        // physics collider
        this.Collider = new Matter.Bodies.rectangle(this.x,this.y,r,r,{ isStatic : true });
        this.edgeBoxes = [];
        this.edgeBoxWidth = 2;
        this.edgeBoxHeight = 2;
        const edgeBoxOffset = 20;
        
        this.walkBoxHeight = 20;

        if ( rightLedge ){

            let triggercollider = new Matter.Bodies.rectangle( this.x + r/2 - this.edgeBoxWidth/2, 
                this.y - r/2 + edgeBoxOffset, 
                this.edgeBoxWidth,
                this.walkBoxHeight, 
                 { 
                   isStatic : true,
                   isSensor : true,
                 }
              );
              triggercollider.isEdgeBox = true;
              triggercollider.isRight = true;
             this.edgeBoxes.push(triggercollider);
             
        }
        if ( leftLedge ){
            let triggercollider = new Matter.Bodies.rectangle( this.x - r/2 + this.edgeBoxWidth/2,
                this.y - r/2 + edgeBoxOffset, 
                this.edgeBoxWidth, 
                this.walkBoxHeight, 
                 { 
                   isStatic : true,
                   isSensor : true 
                 }
              );
              triggercollider.isEdgeBox = true;
              triggercollider.isRight = false;
              this.edgeBoxes.push(triggercollider);
        }
        if ( hasWalkBox ){
            this.walkBox = new Matter.Bodies.rectangle(this.x, this.y - (r/2) - (this.walkBoxHeight/2), 
                                                       r, this.walkBoxHeight, 
                                                        { isStatic : true,
                                                        isSensor : true  
                                                        });
            this.walkBox.isEdgeBox = false;
        }
    }
    // draw rect given input PIXI Graphics object
    drawRect(graphics, debugGraphics) {
        // draw collision box rectangle
        graphics.beginFill(0x6032a8);
        graphics.drawRect( this.x - (this.w/2) , this.y - (this.h/2) -1, this.w , this.h );
        graphics.endFill();
        
        // draw sensor walkBox for debug
        if ( this.walkBox ){
            debugGraphics.beginFill(0x32a842, 0.5);
            debugGraphics.drawRect(this.x - (this.w/2) , this.walkBox.position.y - (this.walkBoxHeight/2), this.w, this.walkBoxHeight);
            debugGraphics.endFill();
        } 


        // draw sensor edgeboxes
        if (this.edgeBoxes.length != 0 ){
            for ( let box of this.edgeBoxes) {
                debugGraphics.beginFill(0xfc0303, 0.8);
                debugGraphics.drawRect( box.position.x - (this.edgeBoxWidth/2) , 
                                   box.position.y - (this.edgeBoxWidth/2), 
                                   this.edgeBoxWidth, 
                                   this.edgeBoxHeight);
                debugGraphics.endFill();
            }  
        }
    }
}

class TileBlob {
    
    constructor(x,y,w,h, tileset){
            this.tiles = [];
            let edgeLength = 100;
            for (let i = 0; i < h, i++; ){
                for (let j =0; j < w, j++; ){
                    
                    // push new Tile to the stack 

                }
            }
        
    }
}

export {TileCollider}