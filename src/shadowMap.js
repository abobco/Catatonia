class ShadowMap {
    // constructor(lights, stage){
    //     var canvas = document.createElement('canvas'),
    //     ctx = canvas.getContext('2d');

    //     canvas.width = stage.width; // whatever size your object will be
    //     canvas.height = stage.height;

    //     ctx.fillStyle = "white";
    //     ctx.fillRect(0, 0, stage.width, stage.height); // fill the entire thing with white, meaning nothing is masked

    //     // now draw each hole by clearing that part of the canvas
    //     ctx.fillStyle = 'rgba(0, 0, 0, 0)';

    //     lights.forEach( (light) => {
    //         light.lightContainer.children.forEach( (mesh) =>{
    //             let geometry = mesh.geometry;

    //             let vertices = geometry.getBuffer("aVertexPosition").data;
                
    //             ctx.beginPath();
    //             ctx.moveTo(vertices[0], vertices[1]);
    //             ctx.moveTo(vertices[2], vertices[3]);
    //             ctx.moveTo(vertices[4], vertices[5]);
    //             ctx.closePath();
    //             ctx.fill();

    //         });
    //     });

    //     // context.beginPath();
    //     // ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    //     // ctx.fill();

    //     // context.beginPath();
    //     // ctx.arc(centerX2, centerY2, radius2, 0, 2 * Math.PI, false);
    //     // ctx.fill();

    //     // now use it as a mask for your shape you drew with a graphics object.
    //     this.sprite = new PIXI.Sprite.from(PIXI.Texture.fromCanvas(canvas));

        
    // }

    constructor(lights, tileMap, renderer) {
        let shaper = new PIXI.Graphics();
        this.mesh = new PIXI.Graphics();
        let blurSize = 32;

        let tileSize = tileMap.tileSize
        let w = tileMap.w;
        let h = tileMap.h;
        const bounds = new PIXI.Rectangle(-tileSize/2, -tileSize/2, 
                                          w*tileSize , h*tileSize );

        //const bounds = new PIXI.Rectangle(-tileSize/2, -tileSize/2, 4000,4000);

        shaper.beginFill(0xFFFFFF,1);
        shaper.drawRect(-tileSize/2, -tileSize/2, 
                        w*tileSize , h*tileSize );
        shaper.endFill();


        lights.forEach( (light) => {
            light.lightContainer.children.forEach( (mesh) =>{
                let geometry = mesh.geometry;

                let vertices = geometry.getBuffer("aVertexPosition").data;
                console.log(vertices);
                
                shaper.beginFill(0, 1);
                shaper.moveTo(vertices[0], vertices[1]);
                shaper.lineTo(vertices[2], vertices[3]);
                shaper.lineTo(vertices[4], vertices[5]);
                shaper.lineTo(vertices[0], vertices[1]);
                shaper.endFill();

            });
        });
        // shaper.filters = [new PIXI.filters.BlurFilter(blurSize)]

        const texture = renderer.generateTexture(shaper, PIXI.SCALE_MODES.NEAREST, 1, bounds);
        this.focus = new PIXI.Sprite(texture);
        this.focus.x = -tileSize/2;
        this.focus.y = -tileSize/2;

        this.mesh.beginFill(0x000000, 0.4);
        this.mesh.drawRect(-tileSize/2, -tileSize/2, 
                            w*tileSize , h*tileSize);
        this.mesh.endFill();

        this.mesh.mask = this.focus;
    }
}

export {ShadowMap}