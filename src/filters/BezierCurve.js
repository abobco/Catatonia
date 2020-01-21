export class BezierCurve{
    constructor(){
        this.points = [
                       new PIXI.Point(0.0,0.0),
                       new PIXI.Point(0.5,0.0),
                       new PIXI.Point(0.5,1.0),
                       new PIXI.Point(1.0,1.0)        
                      ];
    }
    
    getY(t){
        let y = Math.pow((1.0 - t),3) * this.points[0].y;
        y += 3 * Math.pow((1.0-t),2) * t * this.points[1].y;
        y += 3 * (1.0 - t ) * Math.pow(t,2) * this.points[2].y;
        y += Math.pow(t,3) * this.points[3].y;

        return y;
    }
}