import {Vector} from 'matter-js/build/matter.min.js';
export class Corner {
    constructor(mainPt, sidePt1, sidePt2){
        this.pos = mainPt;
        this.vec1 = Vector.sub(mainPt, sidePt1);
        this.vec2 = Vector.sub(sidePt2, mainPt);
    }

    scale(number){
        this.pos.x*= number;
        this.pos.y*= number;

        this.vec1.x*= number;
        this.vec1.y*= number;

        this.vec2.x*= number;
        this.vec2.y*= number;
    }

    
}